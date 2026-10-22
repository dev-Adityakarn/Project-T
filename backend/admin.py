"""Administrative API for Typinger.

This module owns the /api/admin surface: dedicated admin authentication,
server-managed sessions, RBAC, user management, audit logging and dashboard
aggregates. It is intentionally independent from the consumer auth flow while
reusing the project's bcrypt password format and JWT secret.

Security notes
--------------
* The session token lives only in an HttpOnly cookie. It is never returned in
  a JSON response and never written to browser storage by the frontend.
* Sessions are server-managed: a JWT must match an active row in
  ``admin_sessions`` (by ``jti`` and token hash) on every request. Logout and
  suspension revoke sessions immediately.
* Authorization is enforced here, on the server. The SPA guards are only a UX
  convenience.
* Login failures are rate limited per client IP + email and always return the
  same generic error, so the endpoint cannot be used to enumerate accounts.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger("typinger.admin")

ROLE_USER = "user"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"
ALL_ROLES = (ROLE_USER, ROLE_ADMIN, ROLE_SUPER_ADMIN)
ADMIN_ROLES = {ROLE_ADMIN, ROLE_SUPER_ADMIN}
ADMIN_COOKIE = "admin_session"
JWT_ALGORITHM = "HS256"

STATUS_ACTIVE = "active"
STATUS_SUSPENDED = "suspended"
ALL_STATUSES = (STATUS_ACTIVE, STATUS_SUSPENDED)

AUDIT_ACTIONS = [
    "ADMIN_LOGIN",
    "ADMIN_LOGIN_FAILED",
    "ADMIN_LOGIN_DENIED",
    "ADMIN_LOGOUT",
    "ADMIN_CREATED",
    "ADMIN_ROLE_CHANGED",
    "USER_SUSPENDED",
    "USER_REACTIVATED",
    "ROLE_CHANGED",
    "PASSAGE_CREATED",
    "PASSAGE_UPDATED",
    "PASSAGE_DELETED",
    "POST_CREATED",
    "POST_UPDATED",
    "POST_DELETED",
    "RESULT_FLAGGED",
    "RESULT_DELETED",
]


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _iso(value: Optional[datetime]) -> Optional[str]:
    value = _aware(value)
    return value.isoformat() if value else None


def _oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(404, "Not found")
    return ObjectId(value)


def _client_ip(request: Optional[Request]) -> str:
    if request is None or request.client is None:
        return "unknown"
    return request.client.host


def _user_agent(request: Optional[Request]) -> str:
    if request is None:
        return ""
    return (request.headers.get("user-agent") or "")[:300]


def _status(doc: dict) -> str:
    value = doc.get("status") or STATUS_ACTIVE
    return value if value in ALL_STATUSES else STATUS_ACTIVE


def serialize_admin_user(doc: dict) -> dict:
    """Admin-facing user shape. Never includes password_hash."""
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", ROLE_USER),
        "status": _status(doc),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at") or doc.get("created_at")),
        "last_login_at": _iso(doc.get("last_login_at")),
        "suspended_at": _iso(doc.get("suspended_at")),
        "suspended_reason": doc.get("suspended_reason"),
    }


def serialize_audit(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id")),
        "admin_id": doc.get("admin_id"),
        "admin_email": doc.get("admin_email", ""),
        "admin_name": doc.get("admin_name", ""),
        "action": doc.get("action", ""),
        "target_type": doc.get("target_type"),
        "target_id": doc.get("target_id"),
        "metadata": doc.get("metadata") or {},
        "ip_address": doc.get("ip_address"),
        "created_at": _iso(doc.get("created_at")),
    }


async def record_audit(
    db,
    admin,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Append an immutable audit event. Audit failures never break the action."""
    if isinstance(admin, dict):
        admin_id = str(admin.get("_id")) if admin.get("_id") else None
        admin_email = admin.get("email", "")
        admin_name = admin.get("name", "")
    else:
        admin_id = getattr(admin, "id", None)
        admin_email = getattr(admin, "email", "")
        admin_name = getattr(admin, "name", "")

    doc = {
        "admin_id": admin_id,
        "admin_email": admin_email,
        "admin_name": admin_name,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "metadata": metadata or {},
        "ip_address": _client_ip(request),
        "user_agent": _user_agent(request),
        "created_at": utcnow(),
    }
    try:
        await db.audit_logs.insert_one(doc)
    except Exception:  # pragma: no cover - defensive
        logger.exception("audit_write_failed action=%s admin_id=%s", action, admin_id)
    logger.info(
        "admin_audit action=%s admin_id=%s target=%s/%s",
        action,
        admin_id,
        target_type,
        target_id,
    )


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------
class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class StatusIn(BaseModel):
    status: Literal["active", "suspended"]
    reason: Optional[str] = Field(default=None, max_length=300)


class RoleIn(BaseModel):
    role: Literal["user", "admin", "super_admin"]


class AdminCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Literal["admin", "super_admin"] = "admin"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_date(value: str, end_of_day: bool = False) -> datetime:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(400, "Invalid date; expected YYYY-MM-DD")
    return parsed + timedelta(days=1) if end_of_day else parsed


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass(frozen=True)
class AdminConfig:
    jwt_secret: str
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    session_minutes: int = 480
    idle_minutes: int = 120
    max_attempts: int = 5
    lock_minutes: int = 15

    def __post_init__(self):
        if self.cookie_samesite not in {"lax", "strict", "none"}:
            raise ValueError("ADMIN_COOKIE_SAMESITE must be lax, strict or none")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None admin cookies require ADMIN_COOKIE_SECURE=true")


async def validate_admin_session(db, config: AdminConfig, token: str) -> dict:
    """Validate a server-managed admin session token and return its user.

    Shared by the dedicated admin router and the legacy ``/api/admin`` content
    endpoints so cookie-authenticated requests behave identically everywhere.
    """
    try:
        payload = jwt.decode(token, config.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid session")

    if payload.get("type") != "admin_access":
        raise HTTPException(401, "Invalid session")
    subject = payload.get("sub")
    jti = payload.get("jti")
    if not subject or not jti or not ObjectId.is_valid(subject):
        raise HTTPException(401, "Invalid session")

    session = await db.admin_sessions.find_one({"jti": jti})
    if not session or session.get("revoked_at"):
        raise HTTPException(401, "Session revoked")
    if session.get("user_id") != subject:
        raise HTTPException(401, "Invalid session")
    if session.get("token_hash") != _token_hash(token):
        raise HTTPException(401, "Invalid session")

    now = utcnow()
    expires_at = _aware(session.get("expires_at"))
    if not expires_at or expires_at <= now:
        await db.admin_sessions.delete_one({"_id": session["_id"]})
        raise HTTPException(401, "Session expired")

    last_used = _aware(session.get("last_used_at")) or expires_at
    if now - last_used > timedelta(minutes=config.idle_minutes):
        await db.admin_sessions.update_one(
            {"_id": session["_id"]}, {"$set": {"revoked_at": now}}
        )
        raise HTTPException(401, "Session timed out")

    doc = await db.users.find_one({"_id": ObjectId(subject)})
    if not doc:
        raise HTTPException(401, "Invalid session")
    if doc.get("role") not in ADMIN_ROLES:
        raise HTTPException(403, "Admin access required")
    if _status(doc) == STATUS_SUSPENDED:
        await db.admin_sessions.update_many(
            {"user_id": subject, "revoked_at": None},
            {"$set": {"revoked_at": now}},
        )
        raise HTTPException(403, "Account suspended")

    # Throttle last_seen writes.
    if now - last_used > timedelta(minutes=5):
        await db.admin_sessions.update_one(
            {"_id": session["_id"]}, {"$set": {"last_used_at": now}}
        )

    return doc


def create_admin_router(
    db,
    *,
    config: AdminConfig,
    hash_password,
    verify_password,
) -> APIRouter:
    router = APIRouter(prefix="/admin", tags=["admin"])
    dummy_hash = hash_password(secrets.token_urlsafe(24))

    def set_session_cookie(response: Response, token: str, max_age: int) -> None:
        response.set_cookie(
            ADMIN_COOKIE,
            token,
            max_age=max_age,
            httponly=True,
            secure=config.cookie_secure,
            samesite=config.cookie_samesite,
            path="/",
        )

    def clear_session_cookie(response: Response) -> None:
        response.delete_cookie(
            ADMIN_COOKIE,
            path="/",
            secure=config.cookie_secure,
            samesite=config.cookie_samesite,
        )

    async def revoke_user_sessions(user_id: str) -> None:
        await db.admin_sessions.update_many(
            {"user_id": user_id, "revoked_at": None},
            {"$set": {"revoked_at": utcnow()}},
        )

    # ------------------------------------------------------------------
    # Authentication dependency (server-side RBAC)
    # ------------------------------------------------------------------
    async def current_admin(request: Request) -> dict:
        token = request.cookies.get(ADMIN_COOKIE)
        if not token:
            raise HTTPException(401, "Not authenticated")
        doc = await validate_admin_session(db, config, token)
        request.state.admin = doc
        return doc

    async def require_super_admin(admin: dict = Depends(current_admin)) -> dict:
        if admin.get("role") != ROLE_SUPER_ADMIN:
            raise HTTPException(403, "Super administrator access required")
        return admin

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------
    @router.post("/auth/login")
    async def admin_login(body: AdminLoginIn, request: Request, response: Response):
        email = body.email.strip().lower()
        now = utcnow()
        identifier = f"{_client_ip(request)}:{email}"

        attempt = await db.admin_login_attempts.find_one({"_id": identifier})
        if attempt and attempt.get("count", 0) >= config.max_attempts:
            last = _aware(attempt.get("last")) or now
            elapsed = now - last
            if elapsed < timedelta(minutes=config.lock_minutes):
                retry_after = int(
                    (timedelta(minutes=config.lock_minutes) - elapsed).total_seconds()
                )
                raise HTTPException(
                    429,
                    "Too many failed attempts. Please try again later.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )
            await db.admin_login_attempts.delete_one({"_id": identifier})

        doc = await db.users.find_one({"email": email})
        candidate_hash = doc.get("password_hash") if doc else dummy_hash
        try:
            password_ok = verify_password(body.password, candidate_hash)
        except (ValueError, TypeError):
            password_ok = False

        role_ok = bool(doc) and doc.get("role") in ADMIN_ROLES
        status_ok = bool(doc) and _status(doc) != STATUS_SUSPENDED

        if not doc or not password_ok or not role_ok or not status_ok:
            await db.admin_login_attempts.update_one(
                {"_id": identifier},
                {"$inc": {"count": 1}, "$set": {"last": now}},
                upsert=True,
            )
            reason = "invalid_credentials"
            if doc and password_ok and not role_ok:
                reason = "not_admin"
            elif doc and password_ok and not status_ok:
                reason = "suspended"
            if doc:
                await record_audit(
                    db,
                    doc,
                    "ADMIN_LOGIN_DENIED",
                    "admin_auth",
                    str(doc["_id"]),
                    {"reason": reason},
                    request,
                )
            logger.warning(
                "admin_login_failed email=%s ip=%s reason=%s",
                email,
                _client_ip(request),
                reason,
            )
            raise HTTPException(401, "Invalid credentials")

        await db.admin_login_attempts.delete_one({"_id": identifier})

        jti = secrets.token_urlsafe(32)
        expires_at = now + timedelta(minutes=config.session_minutes)
        token = jwt.encode(
            {
                "sub": str(doc["_id"]),
                "email": doc["email"],
                "role": doc.get("role"),
                "type": "admin_access",
                "jti": jti,
                "exp": expires_at,
            },
            config.jwt_secret,
            algorithm=JWT_ALGORITHM,
        )
        await db.admin_sessions.insert_one(
            {
                "jti": jti,
                "user_id": str(doc["_id"]),
                "token_hash": _token_hash(token),
                "created_at": now,
                "last_used_at": now,
                "expires_at": expires_at,
                "ip_address": _client_ip(request),
                "user_agent": _user_agent(request),
                "revoked_at": None,
            }
        )
        # Opportunistic cleanup; the TTL index is the primary reaper.
        await db.admin_sessions.delete_many({"expires_at": {"$lt": now}})

        await db.users.update_one(
            {"_id": doc["_id"]},
            {"$set": {"last_login_at": now, "updated_at": now, "status": _status(doc)}},
        )
        doc["last_login_at"] = now
        doc["updated_at"] = now

        set_session_cookie(response, token, config.session_minutes * 60)
        response.headers["Cache-Control"] = "no-store"
        await record_audit(
            db, doc, "ADMIN_LOGIN", "admin_auth", str(doc["_id"]), None, request
        )
        logger.info(
            "admin_login_success admin_id=%s role=%s ip=%s",
            doc["_id"],
            doc.get("role"),
            _client_ip(request),
        )
        return {"user": serialize_admin_user(doc)}

    @router.post("/auth/logout")
    async def admin_logout(request: Request, response: Response):
        token = request.cookies.get(ADMIN_COOKIE)
        if token:
            try:
                payload = jwt.decode(
                    token, config.jwt_secret, algorithms=[JWT_ALGORITHM]
                )
                if payload.get("type") == "admin_access":
                    session = await db.admin_sessions.find_one(
                        {"jti": payload.get("jti"), "revoked_at": None}
                    )
                    if session:
                        await db.admin_sessions.update_one(
                            {"_id": session["_id"]},
                            {"$set": {"revoked_at": utcnow()}},
                        )
                        doc = await db.users.find_one(
                            {"_id": ObjectId(session["user_id"])}
                        )
                        if doc:
                            await record_audit(
                                db,
                                doc,
                                "ADMIN_LOGOUT",
                                "admin_auth",
                                str(doc["_id"]),
                                None,
                                request,
                            )
            except (jwt.InvalidTokenError, ValueError):
                pass
        clear_session_cookie(response)
        response.headers["Cache-Control"] = "no-store"
        return {"ok": True}

    @router.get("/auth/me")
    async def admin_me(admin: dict = Depends(current_admin)):
        return {"user": serialize_admin_user(admin)}

    # ------------------------------------------------------------------
    # Dashboard overview (all numbers come from real queries)
    # ------------------------------------------------------------------
    @router.get("/dashboard")
    async def dashboard(_: dict = Depends(current_admin)):
        now = utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today - timedelta(days=6)
        month_start = today.replace(day=1)
        active_cutoff = now - timedelta(days=30)
        series_start = today - timedelta(days=13)

        async def count(coll, q):
            return await coll.count_documents(q)

        counts = await asyncio.gather(
            count(db.users, {}),
            count(db.users, {"created_at": {"$gte": today}}),
            count(db.users, {"created_at": {"$gte": week_start}}),
            count(db.users, {"created_at": {"$gte": month_start}}),
            count(
                db.users,
                {
                    "last_login_at": {"$gte": active_cutoff},
                    "status": {"$ne": STATUS_SUSPENDED},
                },
            ),
            count(db.users, {"status": STATUS_SUSPENDED}),
            count(db.results, {}),
            count(db.results, {"created_at": {"$gte": today}}),
            count(db.posts, {}),
            count(db.posts, {"published": True}),
            count(db.passages, {}),
            count(
                db.users,
                {
                    "role": {"$in": list(ADMIN_ROLES)},
                    "status": {"$ne": STATUS_SUSPENDED},
                },
            ),
            count(db.audit_logs, {}),
        )

        signup_rows, result_rows, top_games, recent_users, recent_audit = (
            await asyncio.gather(
                db.users.aggregate(
                    [
                        {"$match": {"created_at": {"$gte": series_start}}},
                        {
                            "$group": {
                                "_id": {
                                    "$dateToString": {
                                        "format": "%Y-%m-%d",
                                        "date": "$created_at",
                                    }
                                },
                                "count": {"$sum": 1},
                            }
                        },
                    ]
                ).to_list(20),
                db.results.aggregate(
                    [
                        {"$match": {"created_at": {"$gte": series_start}}},
                        {
                            "$group": {
                                "_id": {
                                    "$dateToString": {
                                        "format": "%Y-%m-%d",
                                        "date": "$created_at",
                                    }
                                },
                                "count": {"$sum": 1},
                            }
                        },
                    ]
                ).to_list(20),
                db.results.aggregate(
                    [
                        {
                            "$group": {
                                "_id": "$game_id",
                                "plays": {"$sum": 1},
                                "avg_wpm": {"$avg": "$wpm"},
                                "best_wpm": {"$max": "$wpm"},
                            }
                        },
                        {"$sort": {"plays": -1}},
                        {"$limit": 6},
                    ]
                ).to_list(6),
                db.users.find({}, {"password_hash": 0}).sort("created_at", -1).limit(6).to_list(6),
                db.audit_logs.find({}).sort("created_at", -1).limit(8).to_list(8),
            )
        )

        def series(rows):
            by_day = {row["_id"]: row["count"] for row in rows}
            days = []
            for offset in range(14):
                day = (series_start + timedelta(days=offset)).strftime("%Y-%m-%d")
                days.append({"date": day, "count": by_day.get(day, 0)})
            return days

        return {
            "users": {
                "total": counts[0],
                "new_today": counts[1],
                "new_this_week": counts[2],
                "new_this_month": counts[3],
                "active_30d": counts[4],
                "suspended": counts[5],
                "admins": counts[11],
            },
            "activity": {
                "total_results": counts[6],
                "results_today": counts[7],
            },
            "content": {
                "posts": counts[8],
                "published_posts": counts[9],
                "passages": counts[10],
            },
            "audit": {"total_events": counts[12]},
            "series": {
                "signups": series(signup_rows),
                "results": series(result_rows),
            },
            "top_games": [
                {
                    "game_id": row["_id"],
                    "plays": row["plays"],
                    "avg_wpm": round(row.get("avg_wpm") or 0, 1),
                    "best_wpm": row.get("best_wpm", 0),
                }
                for row in top_games
            ],
            "recent_users": [serialize_admin_user(d) for d in recent_users],
            "recent_audit": [serialize_audit(d) for d in recent_audit],
            "generated_at": _iso(now),
        }

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    @router.get("/users")
    async def list_users(
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
        search: str = Query("", max_length=120),
        role: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        date_from: Optional[str] = Query(None),
        date_to: Optional[str] = Query(None),
        sort: str = Query("created_at"),
        order: str = Query("desc"),
        _: dict = Depends(current_admin),
    ):
        if role and role not in ALL_ROLES:
            raise HTTPException(400, "Invalid role filter")
        if status and status not in ALL_STATUSES:
            raise HTTPException(400, "Invalid status filter")
        sort_fields = {
            "created_at": "created_at",
            "last_login_at": "last_login_at",
            "name": "name",
            "email": "email",
            "role": "role",
            "status": "status",
        }
        if sort not in sort_fields:
            raise HTTPException(400, "Invalid sort field")
        if order not in {"asc", "desc"}:
            raise HTTPException(400, "Invalid sort order")

        query: dict = {}
        and_clauses = []
        search = search.strip()
        if search:
            regex = {"$regex": re.escape(search), "$options": "i"}
            search_or = [{"name": regex}, {"email": regex}]
            if ObjectId.is_valid(search):
                search_or.append({"_id": ObjectId(search)})
            and_clauses.append({"$or": search_or})
        if role:
            query["role"] = role
        if status == STATUS_ACTIVE:
            and_clauses.append(
                {"$or": [{"status": STATUS_ACTIVE}, {"status": {"$exists": False}}]}
            )
        elif status == STATUS_SUSPENDED:
            query["status"] = STATUS_SUSPENDED

        created_filter = {}
        if date_from:
            created_filter["$gte"] = _parse_date(date_from)
        if date_to:
            created_filter["$lt"] = _parse_date(date_to, end_of_day=True)
        if created_filter:
            query["created_at"] = created_filter
        if and_clauses:
            query["$and"] = and_clauses

        skip = (page - 1) * limit
        direction = -1 if order == "desc" else 1
        total, docs = await asyncio.gather(
            db.users.count_documents(query),
            db.users.find(query, {"password_hash": 0})
            .sort(sort_fields[sort], direction)
            .skip(skip)
            .limit(limit)
            .to_list(limit),
        )

        ids = [str(doc["_id"]) for doc in docs]
        stats = {}
        if ids:
            rows = await db.results.aggregate(
                [
                    {"$match": {"user_id": {"$in": ids}}},
                    {
                        "$group": {
                            "_id": "$user_id",
                            "games_played": {"$sum": 1},
                            "best_wpm": {"$max": "$wpm"},
                            "last_played_at": {"$max": "$created_at"},
                        }
                    },
                ]
            ).to_list(len(ids))
            stats = {row["_id"]: row for row in rows}

        items = []
        for doc in docs:
            uid = str(doc["_id"])
            row = stats.get(uid, {})
            items.append(
                {
                    **serialize_admin_user(doc),
                    "games_played": row.get("games_played", 0),
                    "best_wpm": row.get("best_wpm", 0),
                    "last_played_at": _iso(row.get("last_played_at")),
                }
            )

        pages = (total + limit - 1) // limit if total else 0
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    @router.get("/users/{user_id}")
    async def user_detail(user_id: str, _: dict = Depends(current_admin)):
        target = _oid(user_id)
        doc = await db.users.find_one({"_id": target}, {"password_hash": 0})
        if not doc:
            raise HTTPException(404, "User not found")
        uid = str(target)

        overall, per_game, recent_results, achievements, recent_audit = (
            await asyncio.gather(
                db.results.aggregate(
                    [
                        {"$match": {"user_id": uid}},
                        {
                            "$group": {
                                "_id": None,
                                "games_played": {"$sum": 1},
                                "best_wpm": {"$max": "$wpm"},
                                "avg_wpm": {"$avg": "$wpm"},
                                "avg_accuracy": {"$avg": "$accuracy"},
                                "total_score": {"$sum": "$score"},
                                "last_played_at": {"$max": "$created_at"},
                            }
                        },
                    ]
                ).to_list(1),
                db.results.aggregate(
                    [
                        {"$match": {"user_id": uid}},
                        {
                            "$group": {
                                "_id": "$game_id",
                                "plays": {"$sum": 1},
                                "best_score": {"$max": "$score"},
                                "best_wpm": {"$max": "$wpm"},
                            }
                        },
                        {"$sort": {"plays": -1}},
                    ]
                ).to_list(20),
                db.results.find({"user_id": uid})
                .sort("created_at", -1)
                .limit(10)
                .to_list(10),
                db.achievements.find(
                    {"user_id": uid},
                    {"achievement_id": 1, "unlocked_at": 1, "_id": 0},
                ).to_list(100),
                db.audit_logs.find({"target_type": "user", "target_id": uid})
                .sort("created_at", -1)
                .limit(10)
                .to_list(10),
            )
        )

        stats = overall[0] if overall else {}
        return {
            "user": serialize_admin_user(doc),
            "stats": {
                "games_played": stats.get("games_played", 0),
                "best_wpm": stats.get("best_wpm", 0),
                "avg_wpm": round(stats.get("avg_wpm") or 0, 1),
                "avg_accuracy": round(stats.get("avg_accuracy") or 0, 1),
                "total_score": stats.get("total_score", 0),
                "last_played_at": _iso(stats.get("last_played_at")),
                "achievements": len(achievements),
            },
            "per_game": [
                {
                    "game_id": row["_id"],
                    "plays": row["plays"],
                    "best_score": row["best_score"],
                    "best_wpm": row["best_wpm"],
                }
                for row in per_game
            ],
            "recent_results": [
                {
                    "id": str(row["_id"]),
                    "game_id": row.get("game_id"),
                    "score": row.get("score"),
                    "wpm": row.get("wpm"),
                    "accuracy": row.get("accuracy"),
                    "difficulty": row.get("difficulty"),
                    "daily_date": row.get("daily_date"),
                    "flagged": bool(row.get("flagged")),
                    "created_at": _iso(row.get("created_at")),
                }
                for row in recent_results
            ],
            "achievements": [
                {
                    "achievement_id": row.get("achievement_id"),
                    "unlocked_at": _iso(row.get("unlocked_at")),
                }
                for row in achievements
            ],
            "recent_audit": [serialize_audit(row) for row in recent_audit],
        }

    @router.patch("/users/{user_id}/status")
    async def update_user_status(
        user_id: str,
        body: StatusIn,
        request: Request,
        admin: dict = Depends(current_admin),
    ):
        target = _oid(user_id)
        actor_id = str(admin["_id"])
        if user_id == actor_id:
            raise HTTPException(400, "You cannot change your own account status")

        doc = await db.users.find_one({"_id": target}, {"password_hash": 0})
        if not doc:
            raise HTTPException(404, "User not found")
        target_role = doc.get("role", ROLE_USER)
        if target_role == ROLE_SUPER_ADMIN:
            raise HTTPException(403, "Super administrators cannot be suspended")
        if target_role == ROLE_ADMIN and admin.get("role") != ROLE_SUPER_ADMIN:
            raise HTTPException(403, "Only a super administrator can suspend an admin")

        now = utcnow()
        fields = {"status": body.status, "updated_at": now}
        if body.status == STATUS_SUSPENDED:
            fields["suspended_at"] = now
            fields["suspended_reason"] = (body.reason or "").strip() or None
            await revoke_user_sessions(user_id)
        else:
            fields["suspended_at"] = None
            fields["suspended_reason"] = None

        await db.users.update_one({"_id": target}, {"$set": fields})
        action = "USER_SUSPENDED" if body.status == STATUS_SUSPENDED else "USER_REACTIVATED"
        await record_audit(
            db,
            admin,
            action,
            "user",
            user_id,
            {"email": doc.get("email"), "reason": fields.get("suspended_reason")},
            request,
        )
        doc.update(fields)
        return {"user": serialize_admin_user(doc)}

    @router.patch("/users/{user_id}/role")
    async def update_user_role(
        user_id: str,
        body: RoleIn,
        request: Request,
        admin: dict = Depends(require_super_admin),
    ):
        target = _oid(user_id)
        actor_id = str(admin["_id"])
        if user_id == actor_id:
            raise HTTPException(400, "You cannot change your own role")

        doc = await db.users.find_one({"_id": target}, {"password_hash": 0})
        if not doc:
            raise HTTPException(404, "User not found")
        previous = doc.get("role", ROLE_USER)
        if previous == body.role:
            return {"user": serialize_admin_user(doc)}

        if previous == ROLE_SUPER_ADMIN and body.role != ROLE_SUPER_ADMIN:
            remaining = await db.users.count_documents({"role": ROLE_SUPER_ADMIN})
            if remaining <= 1:
                raise HTTPException(400, "Cannot remove the last super administrator")

        now = utcnow()
        await db.users.update_one(
            {"_id": target}, {"$set": {"role": body.role, "updated_at": now}}
        )
        if body.role == ROLE_USER:
            await revoke_user_sessions(user_id)
        action = "ADMIN_ROLE_CHANGED" if previous in ADMIN_ROLES else "ROLE_CHANGED"
        await record_audit(
            db,
            admin,
            action,
            "user",
            user_id,
            {"email": doc.get("email"), "from": previous, "to": body.role},
            request,
        )
        doc["role"] = body.role
        doc["updated_at"] = now
        return {"user": serialize_admin_user(doc)}

    # ------------------------------------------------------------------
    # Administrator management (super admin only for mutations)
    # ------------------------------------------------------------------
    @router.get("/admins")
    async def list_admins(admin: dict = Depends(require_super_admin)):
        docs = (
            await db.users.find({"role": {"$in": list(ADMIN_ROLES)}})
            .sort("created_at", -1)
            .to_list(200)
        )
        actor_id = str(admin["_id"])
        return {
            "items": [
                {**serialize_admin_user(doc), "is_self": str(doc["_id"]) == actor_id}
                for doc in docs
            ]
        }

    @router.post("/admins")
    async def create_admin(
        body: AdminCreateIn,
        request: Request,
        admin: dict = Depends(require_super_admin),
    ):
        email = body.email.strip().lower()
        if await db.users.find_one({"email": email}):
            raise HTTPException(400, "Email already registered")

        now = utcnow()
        doc = {
            "name": body.name.strip(),
            "email": email,
            "role": body.role,
            "status": STATUS_ACTIVE,
            "password_hash": hash_password(body.password),
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }
        result = await db.users.insert_one(doc)
        doc["_id"] = result.inserted_id
        await record_audit(
            db,
            admin,
            "ADMIN_CREATED",
            "user",
            str(result.inserted_id),
            {"email": email, "role": body.role},
            request,
        )
        return {"user": serialize_admin_user(doc)}

    @router.patch("/admins/{user_id}/role")
    async def update_admin_role(
        user_id: str,
        body: RoleIn,
        request: Request,
        admin: dict = Depends(require_super_admin),
    ):
        target = _oid(user_id)
        actor_id = str(admin["_id"])
        if user_id == actor_id:
            raise HTTPException(400, "You cannot change your own role")

        doc = await db.users.find_one({"_id": target}, {"password_hash": 0})
        if not doc:
            raise HTTPException(404, "User not found")
        previous = doc.get("role", ROLE_USER)
        if previous not in ADMIN_ROLES:
            raise HTTPException(400, "Target is not an administrator")
        if previous == body.role:
            return {"user": serialize_admin_user(doc)}
        if previous == ROLE_SUPER_ADMIN and body.role != ROLE_SUPER_ADMIN:
            remaining = await db.users.count_documents({"role": ROLE_SUPER_ADMIN})
            if remaining <= 1:
                raise HTTPException(400, "Cannot remove the last super administrator")

        now = utcnow()
        await db.users.update_one(
            {"_id": target}, {"$set": {"role": body.role, "updated_at": now}}
        )
        if body.role == ROLE_USER:
            await revoke_user_sessions(user_id)
        await record_audit(
            db,
            admin,
            "ADMIN_ROLE_CHANGED",
            "user",
            user_id,
            {"email": doc.get("email"), "from": previous, "to": body.role},
            request,
        )
        doc["role"] = body.role
        doc["updated_at"] = now
        return {"user": serialize_admin_user(doc)}

    # ------------------------------------------------------------------
    # Audit log (append-only; no update/delete endpoints exist)
    # ------------------------------------------------------------------
    @router.get("/audit-logs")
    async def audit_logs(
        page: int = Query(1, ge=1),
        limit: int = Query(25, ge=1, le=100),
        action: Optional[str] = Query(None, max_length=80),
        admin_id: Optional[str] = Query(None, max_length=40),
        target_type: Optional[str] = Query(None, max_length=40),
        target_id: Optional[str] = Query(None, max_length=80),
        date_from: Optional[str] = Query(None),
        date_to: Optional[str] = Query(None),
        _: dict = Depends(current_admin),
    ):
        query: dict = {}
        if action:
            query["action"] = action
        if admin_id:
            query["admin_id"] = admin_id
        if target_type:
            query["target_type"] = target_type
        if target_id:
            query["target_id"] = target_id
        created = {}
        if date_from:
            created["$gte"] = _parse_date(date_from)
        if date_to:
            created["$lt"] = _parse_date(date_to, end_of_day=True)
        if created:
            query["created_at"] = created

        skip = (page - 1) * limit
        total, docs = await asyncio.gather(
            db.audit_logs.count_documents(query),
            db.audit_logs.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
            .to_list(limit),
        )
        pages = (total + limit - 1) // limit if total else 0
        return {
            "items": [serialize_audit(doc) for doc in docs],
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    @router.get("/audit-logs/actions")
    async def audit_actions(_: dict = Depends(current_admin)):
        try:
            existing = set(await db.audit_logs.distinct("action"))
        except Exception:  # pragma: no cover - defensive
            existing = set()
        return {"items": sorted(existing | set(AUDIT_ACTIONS))}

    return router
