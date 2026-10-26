from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import hashlib
import logging
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, List
from urllib.parse import urlsplit

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from admin import (
    ADMIN_COOKIE,
    ADMIN_ROLES,
    AdminConfig,
    create_admin_router,
    record_audit,
    validate_admin_session,
)
from content import (
    CONTENT_FORMAT_LEGACY,
    CONTENT_FORMAT_RICH,
    CONTENT_FORMATS,
    ContentValidationError,
    excerpt_from_doc,
    first_text_from_doc,
    lead_text_from_doc,
    reading_time_from_text,
    rich_text_from_doc,
    validate_legacy_content,
    validate_rich_doc,
)

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
JWT_ALGORITHM = "HS256"
GAME_IDS = {"speed-test", "falling-words", "zombie-typing", "space-shooter", "type-racer",
            "sudden-death", "key-reflex", "word-scramble", "balloon-pop", "code-typer"}
GAME_LIST = sorted(GAME_IDS)
DIFFICULTIES = ["easy", "medium", "hard"]

ACHIEVEMENTS = [
    {"id": "first-game", "title": "First Steps", "desc": "Finish your first game", "icon": "Footprints"},
    {"id": "wpm-40", "title": "Warming Up", "desc": "Hit 40 WPM in any game", "icon": "Gauge"},
    {"id": "wpm-60", "title": "Speedster", "desc": "Hit 60 WPM in any game", "icon": "Zap"},
    {"id": "wpm-80", "title": "Lightning Hands", "desc": "Hit 80 WPM in any game", "icon": "Flame"},
    {"id": "wpm-100", "title": "Century Club", "desc": "Hit 100 WPM in any game", "icon": "Crown"},
    {"id": "perfect", "title": "Flawless", "desc": "Finish a game with 100% accuracy (20+ WPM)", "icon": "Target"},
    {"id": "iron-fingers", "title": "Iron Fingers", "desc": "Type 25+ words in Sudden Death without a typo", "icon": "HeartCrack"},
    {"id": "hard-mode", "title": "No Mercy", "desc": "Finish any game on Hard", "icon": "Skull"},
    {"id": "games-10", "title": "Regular", "desc": "Play 10 games", "icon": "Gamepad2"},
    {"id": "games-50", "title": "Veteran", "desc": "Play 50 games", "icon": "Medal"},
    {"id": "all-games", "title": "Explorer", "desc": "Play all 10 games", "icon": "Compass"},
    {"id": "daily", "title": "Daily Challenger", "desc": "Complete a daily challenge", "icon": "CalendarCheck"},
    {"id": "code-master", "title": "Code Master", "desc": "95%+ accuracy in Code Typer", "icon": "Code"},
]

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude={"id"})
        if self.id:
            d["_id"] = ObjectId(self.id)
        return d


class User(BaseDocument):
    name: str
    email: str
    role: str = "user"
    status: str = "active"
    last_login_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    suspended_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Result(BaseDocument):
    user_id: str
    user_name: str
    game_id: str
    score: int
    wpm: int
    accuracy: float
    duration: int
    difficulty: str = "medium"
    daily_date: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ResultIn(BaseModel):
    game_id: str
    score: int = Field(ge=0, le=1_000_000)
    wpm: int = Field(ge=0, le=400)
    accuracy: float = Field(ge=0, le=100)
    duration: int = Field(ge=0, le=36000)
    difficulty: str = "medium"
    daily: bool = False


class Passage(BaseDocument):
    title: str
    text: str
    language: str = "en"
    difficulty: str = "medium"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PassageIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=10, max_length=20000)
    language: str = "en"
    difficulty: str = "medium"


class Post(BaseDocument):
    title: str
    slug: str
    content: str = ""
    content_format: str = CONTENT_FORMAT_LEGACY
    content_json: Optional[dict] = None
    excerpt: str = ""
    meta_title: str = ""
    meta_description: str = ""
    author: str = "Typinger Team"
    published: bool = False
    date_published: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PostIn(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    slug: str = Field(min_length=3, max_length=140, pattern=r"^[a-z0-9-]+$")
    content: Optional[str] = None
    content_format: str = CONTENT_FORMAT_LEGACY
    content_json: Optional[dict] = None
    excerpt: str = ""
    meta_title: str = ""
    meta_description: str = ""
    author: str = "Typinger Team"
    published: bool = False


class PostUpdate(BaseModel):
    """Partial update payload. Body fields are only touched when they are sent."""

    title: Optional[str] = Field(default=None, min_length=3, max_length=140)
    slug: Optional[str] = Field(default=None, min_length=3, max_length=140, pattern=r"^[a-z0-9-]+$")
    content: Optional[str] = None
    content_format: Optional[str] = None
    content_json: Optional[dict] = None
    excerpt: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    author: Optional[str] = None
    published: Optional[bool] = None


class FlagIn(BaseModel):
    flagged: bool = True


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=10, max_length=5000)
    # Honeypot field. A real browser leaves it empty.
    website: str = Field(default="", max_length=200)


def post_blocks(content: str) -> list:
    blocks = []
    for chunk in [c.strip() for c in content.split("\n\n") if c.strip()]:
        if chunk.startswith("## "):
            lines = chunk.split("\n")
            blocks.append({"h2": lines[0][3:].strip(), "p": [l.strip() for l in lines[1:] if l.strip()]})
        elif chunk.startswith("- "):
            blocks.append({"ul": [l[2:].strip() for l in chunk.split("\n") if l.strip().startswith("- ")]})
        else:
            blocks.append({"p": [chunk]})
    return blocks


def rich_doc_for_read(p: Post) -> Optional[dict]:
    """Return the stored rich document only when it is safe to render.

    Writes are validated, but documents can also arrive through scripts or
    manual database edits.  Invalid stored documents fall back to the legacy
    text rather than reaching the public renderer unchecked.
    """
    if p.content_format != CONTENT_FORMAT_RICH or not isinstance(p.content_json, dict):
        return None
    try:
        return validate_rich_doc(p.content_json)
    except ContentValidationError:
        logger.warning("Ignoring invalid rich content for post %s", p.slug)
        return None


def public_post(p: Post, *, summary: bool = False) -> dict:
    rich_doc = rich_doc_for_read(p)
    if rich_doc is not None:
        body_text = rich_text_from_doc(rich_doc)
        lead = lead_text_from_doc(rich_doc)
        excerpt = p.excerpt or excerpt_from_doc(rich_doc) or first_text_from_doc(rich_doc)
    else:
        body_text = p.content
        lead = None
        excerpt = p.excerpt

    data = {
        "slug": p.slug,
        "title": p.meta_title or p.title,
        "h1": p.title,
        "description": p.meta_description or excerpt or p.title,
        "excerpt": excerpt,
        "lead": lead,
        "author": p.author,
        "datePublished": p.date_published,
        "dateModified": p.updated_at.strftime("%Y-%m-%d"),
        "readingTime": reading_time_from_text(body_text),
        "contentFormat": CONTENT_FORMAT_RICH if rich_doc is not None else CONTENT_FORMAT_LEGACY,
        "faqs": [],
        "related": [],
    }
    if not summary:
        if rich_doc is not None:
            data["body"] = {"format": CONTENT_FORMAT_RICH, "doc": rich_doc}
        else:
            data["blocks"] = post_blocks(p.content)
    return data


def _post_oid(post_id: str) -> ObjectId:
    try:
        return ObjectId(post_id)
    except Exception:
        raise HTTPException(404, "Post not found") from None


def _content_error(exc: ContentValidationError) -> HTTPException:
    return HTTPException(422, detail=exc.as_detail())


def _prepare_post_create(body: PostIn) -> dict:
    content_format = body.content_format or CONTENT_FORMAT_LEGACY
    if content_format not in CONTENT_FORMATS:
        raise HTTPException(422, "Unsupported content format.")

    data = body.model_dump()
    data["content_format"] = content_format
    if content_format == CONTENT_FORMAT_RICH:
        if body.content_json is None:
            raise HTTPException(422, "Rich posts need a content_json document.")
        try:
            doc = validate_rich_doc(body.content_json)
        except ContentValidationError as exc:
            raise _content_error(exc) from None
        data["content_json"] = doc
        # The rich document is authoritative.  The plain-text copy is always
        # derived for new rich posts so callers cannot inject unrelated text.
        data["content"] = rich_text_from_doc(doc)
    else:
        if body.content_json is not None:
            raise HTTPException(422, "content_json is only valid for rich-json-v1 posts.")
        try:
            data["content"] = validate_legacy_content(body.content)
        except ContentValidationError as exc:
            raise _content_error(exc) from None
        data["content_json"] = None
    return data


async def _prepare_post_update(post_id: str, body: PostUpdate) -> tuple[Post, dict]:
    oid = _post_oid(post_id)
    doc = await db.posts.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Post not found")
    current = Post.from_mongo(doc)

    updates = body.model_dump(exclude_unset=True)
    for field in ("title", "slug", "excerpt", "meta_title", "meta_description", "author", "published"):
        if field in updates and updates[field] is None:
            updates.pop(field)

    content_format = updates.get("content_format")
    if content_format is not None and content_format not in CONTENT_FORMATS:
        raise HTTPException(422, "Unsupported content format.")

    body_keys = {"content", "content_format", "content_json"} & set(updates)
    if body_keys:
        if content_format is None:
            if "content_json" in updates:
                content_format = CONTENT_FORMAT_RICH
            elif "content" in updates:
                content_format = CONTENT_FORMAT_LEGACY
            else:
                content_format = current.content_format

        if content_format == CONTENT_FORMAT_RICH:
            doc_json = updates.get("content_json", current.content_json)
            if doc_json is None:
                raise HTTPException(422, "Rich posts need a content_json document.")
            try:
                normalized = validate_rich_doc(doc_json)
            except ContentValidationError as exc:
                raise _content_error(exc) from None
            updates["content_format"] = CONTENT_FORMAT_RICH
            updates["content_json"] = normalized
            # The rich document is authoritative.  Converted legacy posts keep
            # their original text; otherwise keep or derive a plain-text copy.
            updates.pop("content", None)
            if not (current.content or "").strip():
                updates["content"] = rich_text_from_doc(normalized)
        else:
            if updates.get("content_json") is not None:
                raise HTTPException(422, "content_json is only valid for rich-json-v1 posts.")
            content = updates.get("content", current.content)
            try:
                updates["content"] = validate_legacy_content(content)
            except ContentValidationError as exc:
                raise _content_error(exc) from None
            updates["content_format"] = CONTENT_FORMAT_LEGACY
            updates["content_json"] = None

    if "slug" in updates and updates["slug"] != current.slug:
        existing = await db.posts.find_one({"slug": updates["slug"], "_id": {"$ne": oid}})
        if existing:
            raise HTTPException(400, "Slug already used")

    updates["updated_at"] = datetime.now(timezone.utc)
    return current, updates


def public_user(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role}


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def daily_for(date_str: str) -> dict:
    h = int(hashlib.sha256(date_str.encode()).hexdigest(), 16)
    return {"date": date_str, "game_id": GAME_LIST[h % len(GAME_LIST)],
            "difficulty": DIFFICULTIES[(h >> 8) % 3], "seed": (h >> 16) & 0x7FFFFFFF}


def seconds_to_reset() -> int:
    now = datetime.now(timezone.utc)
    nxt = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((nxt - now).total_seconds())


def achievement_rules(r: Result, total: int, distinct: int) -> dict:
    return {
        "first-game": total >= 1,
        "wpm-40": r.wpm >= 40,
        "wpm-60": r.wpm >= 60,
        "wpm-80": r.wpm >= 80,
        "wpm-100": r.wpm >= 100,
        "perfect": r.accuracy >= 100 and r.wpm >= 20,
        "iron-fingers": r.game_id == "sudden-death" and r.score >= 250,
        "hard-mode": r.difficulty == "hard",
        "games-10": total >= 10,
        "games-50": total >= 50,
        "all-games": distinct >= len(GAME_IDS),
        "daily": r.daily_date is not None,
        "code-master": r.game_id == "code-typer" and r.accuracy >= 95,
    }


async def unlock_achievements(user_id: str, r: Result) -> list:
    total = await db.results.count_documents({"user_id": user_id})
    distinct = len(await db.results.distinct("game_id", {"user_id": user_id}))
    have = {a["achievement_id"] for a in await db.achievements.find({"user_id": user_id}).to_list(100)}
    rules = achievement_rules(r, total, distinct)
    new = [a for a in ACHIEVEMENTS if rules[a["id"]] and a["id"] not in have]
    if new:
        now = datetime.now(timezone.utc)
        await db.achievements.insert_many([{"user_id": user_id, "achievement_id": a["id"], "unlocked_at": now} for a in new])
    return new


def board_rows(rows: list) -> list:
    return [{"user_id": r["_id"], "name": r["name"], "best_score": r["best_score"], "wpm": r["wpm"],
             "accuracy": r["accuracy"], "difficulty": r.get("difficulty", "medium")} for r in rows]


async def best_per_user(match: dict, limit: int) -> list:
    rows = await db.results.aggregate([
        {"$match": {**match, "flagged": {"$ne": True}}},
        {"$sort": {"score": -1, "wpm": -1}},
        {"$group": {"_id": "$user_id", "name": {"$first": "$user_name"}, "best_score": {"$first": "$score"},
                    "wpm": {"$first": "$wpm"}, "accuracy": {"$first": "$accuracy"}, "difficulty": {"$first": "$difficulty"}}},
        {"$sort": {"best_score": -1, "wpm": -1}},
        {"$limit": limit},
    ]).to_list(limit)
    return board_rows(rows)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id: str, email: str, kind: str, delta: timedelta) -> str:
    payload = {"sub": user_id, "email": email, "type": kind, "exp": datetime.now(timezone.utc) + delta}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def auth_response(response: Response, user: User) -> dict:
    access = make_token(user.id, user.email, "access", timedelta(days=7))
    refresh = make_token(user.id, user.email, "refresh", timedelta(days=30))
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=2592000, path="/")
    return {"user": public_user(user), "token": access}


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


async def get_optional_user(request: Request) -> Optional[User]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def get_admin_user(request: Request) -> User:
    """Authenticate the legacy content-management endpoints.

    The admin console uses the dedicated HttpOnly ``admin_session`` cookie.
    A consumer bearer token is still accepted for backwards compatibility with
    existing integrations and tests, but it must belong to an active admin.
    """
    token = request.cookies.get(ADMIN_COOKIE)
    if token:
        doc = await validate_admin_session(db, admin_config, token)
        return User.from_mongo(doc)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")

    user = await get_current_user(request)
    if user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Admin access required")
    if user.status == "suspended":
        raise HTTPException(403, "Account suspended")
    return user


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


admin_config = AdminConfig(
    jwt_secret=os.environ["JWT_SECRET"],
    cookie_secure=env_bool("ADMIN_COOKIE_SECURE", False),
    cookie_samesite=os.environ.get("ADMIN_COOKIE_SAMESITE", "lax").lower(),
    session_minutes=env_int("ADMIN_SESSION_MINUTES", 480),
    idle_minutes=env_int("ADMIN_SESSION_IDLE_MINUTES", 120),
    max_attempts=env_int("ADMIN_LOGIN_MAX_ATTEMPTS", 5),
    lock_minutes=env_int("ADMIN_LOGIN_LOCK_MINUTES", 15),
)

api.include_router(
    create_admin_router(
        db,
        config=admin_config,
        hash_password=hash_password,
        verify_password=verify_password,
    )
)


@api.get("/")
async def root():
    return {"message": "Typinger API"}


@api.post("/contact")
async def contact(body: ContactIn, request: Request):
    """Store a contact message without publishing a support mailbox.

    The owner reviews these records through the admin API. The honeypot and
    per-IP cap keep the public endpoint from becoming an easy spam target.
    """
    if body.website.strip():
        return {"ok": True}

    now = datetime.now(timezone.utc)
    ip = request.client.host if request.client else "unknown"
    recent = await db.contact_messages.count_documents(
        {"ip": ip, "created_at": {"$gte": now - timedelta(hours=1)}}
    )
    if recent >= 5:
        raise HTTPException(429, "Too many messages. Try again later.")

    await db.contact_messages.insert_one(
        {
            "name": body.name.strip(),
            "email": str(body.email).lower(),
            "subject": body.subject.strip(),
            "message": body.message.strip(),
            "ip": ip,
            "user_agent": request.headers.get("user-agent", "")[:300],
            "created_at": now,
        }
    )
    return {"ok": True}


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    user = User(name=body.name.strip(), email=email)
    doc = user.to_mongo()
    doc["password_hash"] = hash_password(body.password)
    user.id = str((await db.users.insert_one(doc)).inserted_id)
    return auth_response(response, user)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= 5:
        locked_at = attempt["last"].replace(tzinfo=timezone.utc)
        if now - locked_at < timedelta(minutes=15):
            raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": ident})
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": now}}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    if doc.get("status") == "suspended":
        raise HTTPException(403, "This account is suspended")
    await db.login_attempts.delete_one({"identifier": ident})
    await db.users.update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_login_at": now, "updated_at": now}},
    )
    doc["last_login_at"] = now
    doc["updated_at"] = now
    return auth_response(response, User.from_mongo(doc))


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    response.delete_cookie("refresh_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return public_user(user)


@api.post("/results")
async def create_result(body: ResultIn, user: User = Depends(get_current_user)):
    if body.game_id not in GAME_IDS:
        raise HTTPException(400, "Unknown game")
    if body.difficulty not in DIFFICULTIES:
        raise HTTPException(400, "Unknown difficulty")
    daily_date = None
    if body.daily:
        d = daily_for(today_str())
        if body.game_id != d["game_id"] or body.difficulty != d["difficulty"]:
            raise HTTPException(400, "Result does not match today's challenge")
        daily_date = d["date"]
    data = body.model_dump(exclude={"daily"})
    r = Result(user_id=user.id, user_name=user.name, daily_date=daily_date, **data)
    r.id = str((await db.results.insert_one(r.to_mongo())).inserted_id)
    new = await unlock_achievements(user.id, r)
    return {**r.model_dump(), "new_achievements": new}


@api.get("/results/me")
async def my_results(limit: int = Query(50, ge=1, le=200), user: User = Depends(get_current_user)):
    docs = await db.results.find({"user_id": user.id}).sort("created_at", -1).to_list(limit)
    return [Result.from_mongo(d).model_dump() for d in docs]


@api.get("/achievements/me")
async def my_achievements(user: User = Depends(get_current_user)):
    docs = await db.achievements.find({"user_id": user.id}).to_list(100)
    unlocked = {d["achievement_id"]: d["unlocked_at"] for d in docs}
    return [{**a, "unlocked_at": unlocked.get(a["id"])} for a in ACHIEVEMENTS]


@api.get("/daily")
async def daily(user: Optional[User] = Depends(get_optional_user)):
    d = daily_for(today_str())
    out = {**d, "resets_in": seconds_to_reset(), "my_best": None, "my_attempts": 0}
    if user:
        mine = await db.results.find({"user_id": user.id, "daily_date": d["date"]}).sort("score", -1).to_list(100)
        out["my_attempts"] = len(mine)
        if mine:
            out["my_best"] = {"score": mine[0]["score"], "wpm": mine[0]["wpm"], "accuracy": mine[0]["accuracy"]}
    return out


@api.get("/daily/leaderboard")
async def daily_leaderboard(limit: int = Query(20, ge=1, le=100)):
    return await best_per_user({"daily_date": today_str()}, limit)


@api.get("/stats/me")
async def my_stats(user: User = Depends(get_current_user)):
    overall = await db.results.aggregate([
        {"$match": {"user_id": user.id}},
        {"$group": {"_id": None, "total": {"$sum": 1}, "best_wpm": {"$max": "$wpm"},
                    "avg_wpm": {"$avg": "$wpm"}, "avg_acc": {"$avg": "$accuracy"}}},
    ]).to_list(1)
    per_game = await db.results.aggregate([
        {"$match": {"user_id": user.id}},
        {"$group": {"_id": "$game_id", "plays": {"$sum": 1}, "best_score": {"$max": "$score"}, "best_wpm": {"$max": "$wpm"}}},
    ]).to_list(20)
    o = overall[0] if overall else {}
    return {
        "total_games": o.get("total", 0),
        "best_wpm": o.get("best_wpm", 0),
        "avg_wpm": round(o.get("avg_wpm") or 0),
        "avg_accuracy": round(o.get("avg_acc") or 0, 1),
        "per_game": [{"game_id": g["_id"], "plays": g["plays"], "best_score": g["best_score"], "best_wpm": g["best_wpm"]} for g in per_game],
    }


@api.get("/leaderboard")
async def leaderboard(game_id: str, difficulty: Optional[str] = None, limit: int = Query(20, ge=1, le=100)):
    match = {"game_id": game_id}
    if difficulty in DIFFICULTIES:
        match["difficulty"] = difficulty
    return await best_per_user(match, limit)


@api.get("/posts")
async def list_posts():
    docs = await db.posts.find({"published": True}).sort("date_published", -1).to_list(200)
    return [public_post(Post.from_mongo(d), summary=True) for d in docs]


@api.get("/posts/{slug}")
async def get_post(slug: str):
    doc = await db.posts.find_one({"slug": slug, "published": True})
    if not doc:
        raise HTTPException(404, "Post not found")
    return public_post(Post.from_mongo(doc))


@api.get("/passages")
async def list_passages(language: Optional[str] = None, difficulty: Optional[str] = None, limit: int = Query(20, ge=1, le=100)):
    q = {}
    if language:
        q["language"] = language
    if difficulty:
        q["difficulty"] = difficulty
    docs = await db.passages.find(q).sort("created_at", -1).to_list(limit)
    return [Passage.from_mongo(d).model_dump() for d in docs]


@api.get("/admin/passages")
async def admin_list_passages(_: User = Depends(get_admin_user)):
    docs = await db.passages.find().sort("created_at", -1).to_list(500)
    return [Passage.from_mongo(d).model_dump() for d in docs]


@api.post("/admin/passages")
async def admin_create_passage(body: PassageIn, request: Request, admin: User = Depends(get_admin_user)):
    p = Passage(**body.model_dump())
    p.id = str((await db.passages.insert_one(p.to_mongo())).inserted_id)
    await record_audit(db, admin, "PASSAGE_CREATED", "passage", p.id, {"title": p.title}, request)
    return p.model_dump()


@api.put("/admin/passages/{passage_id}")
async def admin_update_passage(passage_id: str, body: PassageIn, request: Request, admin: User = Depends(get_admin_user)):
    res = await db.passages.update_one({"_id": ObjectId(passage_id)}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(404, "Passage not found")
    await record_audit(db, admin, "PASSAGE_UPDATED", "passage", passage_id, {"title": body.title}, request)
    return {"ok": True}


@api.delete("/admin/passages/{passage_id}")
async def admin_delete_passage(passage_id: str, request: Request, admin: User = Depends(get_admin_user)):
    res = await db.passages.delete_one({"_id": ObjectId(passage_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Passage not found")
    await record_audit(db, admin, "PASSAGE_DELETED", "passage", passage_id, None, request)
    return {"ok": True}


@api.get("/admin/posts")
async def admin_list_posts(_: User = Depends(get_admin_user)):
    docs = await db.posts.find().sort("date_published", -1).to_list(500)
    return [Post.from_mongo(d).model_dump() for d in docs]


@api.post("/admin/posts")
async def admin_create_post(body: PostIn, request: Request, admin: User = Depends(get_admin_user)):
    data = _prepare_post_create(body)
    if await db.posts.find_one({"slug": body.slug}):
        raise HTTPException(400, "Slug already used")
    p = Post(**data)
    try:
        p.id = str((await db.posts.insert_one(p.to_mongo())).inserted_id)
    except Exception as exc:
        if "duplicate key" in str(exc).lower():
            raise HTTPException(400, "Slug already used") from None
        raise
    await record_audit(db, admin, "POST_CREATED", "post", p.id, {"slug": p.slug, "title": p.title}, request)
    return p.model_dump()


@api.put("/admin/posts/{post_id}")
async def admin_update_post(post_id: str, body: PostUpdate, request: Request, admin: User = Depends(get_admin_user)):
    current, data = await _prepare_post_update(post_id, body)
    res = await db.posts.update_one({"_id": _post_oid(post_id)}, {"$set": data})
    if not res.matched_count:
        raise HTTPException(404, "Post not found")
    await record_audit(
        db,
        admin,
        "POST_UPDATED",
        "post",
        post_id,
        {"slug": data.get("slug", current.slug), "title": data.get("title", current.title)},
        request,
    )
    return {"ok": True}


@api.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, request: Request, admin: User = Depends(get_admin_user)):
    res = await db.posts.delete_one({"_id": _post_oid(post_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Post not found")
    await record_audit(db, admin, "POST_DELETED", "post", post_id, None, request)
    return {"ok": True}


@api.get("/admin/contact-messages")
async def admin_contact_messages(limit: int = Query(50, ge=1, le=200), _: User = Depends(get_admin_user)):
    docs = await db.contact_messages.find({}).sort("created_at", -1).to_list(limit)
    return [
        {
            "id": str(doc["_id"]),
            "name": doc.get("name", ""),
            "email": doc.get("email", ""),
            "subject": doc.get("subject", ""),
            "message": doc.get("message", ""),
            "created_at": doc.get("created_at"),
        }
        for doc in docs
    ]


@api.get("/admin/results")
async def admin_results(game_id: Optional[str] = None, limit: int = Query(50, ge=1, le=200), _: User = Depends(get_admin_user)):
    q = {"game_id": game_id} if game_id else {}
    docs = await db.results.find(q).sort("created_at", -1).to_list(limit)
    return [{**Result.from_mongo(d).model_dump(), "flagged": bool(d.get("flagged"))} for d in docs]


@api.post("/admin/results/{result_id}/flag")
async def admin_flag_result(result_id: str, body: FlagIn, request: Request, admin: User = Depends(get_admin_user)):
    res = await db.results.update_one({"_id": ObjectId(result_id)}, {"$set": {"flagged": body.flagged}})
    if not res.matched_count:
        raise HTTPException(404, "Result not found")
    await record_audit(db, admin, "RESULT_FLAGGED", "result", result_id, {"flagged": body.flagged}, request)
    return {"ok": True, "flagged": body.flagged}


@api.delete("/admin/results/{result_id}")
async def admin_delete_result(result_id: str, request: Request, admin: User = Depends(get_admin_user)):
    doc = await db.results.find_one({"_id": ObjectId(result_id)})
    if not doc:
        raise HTTPException(404, "Result not found")
    await db.results.delete_one({"_id": ObjectId(result_id)})
    await record_audit(db, admin, "RESULT_DELETED", "result", result_id,
                       {"user_id": doc.get("user_id"), "game_id": doc.get("game_id"), "score": doc.get("score")}, request)
    return {"ok": True}



app.include_router(api)

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_exception path=%s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.middleware("http")
async def admin_csrf_guard(request: Request, call_next):
    """Reject cross-site state changes on the cookie-authenticated admin API.

    The admin session cookie is SameSite=Lax by default, which already blocks
    cross-site POSTs in modern browsers. This Origin/Referer check is defence
    in depth and also protects deployments configured with SameSite=None.
    Non-browser clients (curl, monitoring) that send neither header still work.
    """
    path = request.url.path
    if path.startswith("/api/admin") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        source = request.headers.get("origin")
        if not source:
            referer = request.headers.get("referer")
            if referer:
                parts = urlsplit(referer)
                source = f"{parts.scheme}://{parts.netloc}"
        if source and source.rstrip("/") not in allowed_origins:
            logger.warning(
                "admin_csrf_rejected path=%s origin=%s ip=%s",
                path,
                source,
                request.client.host if request.client else "unknown",
            )
            return JSONResponse(status_code=403, content={"detail": "Request origin not allowed"})
    return await call_next(request)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "unhandled_request_error path=%s request_id=%s", request.url.path, request_id
        )
        response = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    duration_ms = round((time.perf_counter() - started) * 1000, 1)
    response.headers.setdefault("X-Request-ID", request_id)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.url.path.startswith("/api/admin"):
        response.headers["Cache-Control"] = "no-store"
        logger.info(
            "admin_request method=%s path=%s status=%s duration_ms=%s request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
    return response


# Added last so CORS is the outermost middleware and headers are applied to
# auth failures, CSRF rejections and error responses as well.
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Auth / user indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("role", 1), ("status", 1)])
    await db.users.create_index([("created_at", -1)])
    await db.users.create_index([("last_login_at", -1)])
    await db.login_attempts.create_index("identifier")
    await db.admin_login_attempts.create_index("last", expireAfterSeconds=86400)

    # Server-managed admin sessions
    await db.admin_sessions.create_index("jti", unique=True)
    await db.admin_sessions.create_index("user_id")
    await db.admin_sessions.create_index("expires_at", expireAfterSeconds=0)

    # Append-only audit trail
    await db.audit_logs.create_index([("created_at", -1)])
    await db.audit_logs.create_index([("admin_id", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("action", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("target_type", 1), ("target_id", 1)])

    # Application data / dashboard reads
    await db.results.create_index([("game_id", 1), ("score", -1)])
    await db.results.create_index([("user_id", 1), ("created_at", -1)])
    await db.results.create_index([("daily_date", 1), ("score", -1)])
    await db.results.create_index([("created_at", -1)])
    await db.results.create_index([("game_id", 1), ("created_at", -1)])
    await db.achievements.create_index([("user_id", 1), ("achievement_id", 1)], unique=True)
    await db.posts.create_index("slug", unique=True)
    await db.passages.create_index([("language", 1), ("difficulty", 1)])

    # First-run bootstrap only. Existing accounts are never silently promoted
    # and passwords are never reset at boot; use scripts/create_admin.py for
    # secure provisioning and rotation.
    bootstrap_email = (
        os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL") or ""
    ).strip().lower()
    bootstrap_password = (
        os.environ.get("BOOTSTRAP_ADMIN_PASSWORD") or os.environ.get("ADMIN_PASSWORD") or ""
    )
    if bootstrap_email and bootstrap_password:
        existing_admin = await db.users.find_one({"role": {"$in": list(ADMIN_ROLES)}})
        if existing_admin:
            logger.info("bootstrap_admin_not_needed")
        else:
            existing_user = await db.users.find_one({"email": bootstrap_email})
            if existing_user:
                logger.warning(
                    "bootstrap_admin_skipped email=%s reason=existing_user_run_create_admin_script",
                    bootstrap_email,
                )
            else:
                now = datetime.now(timezone.utc)
                doc = User(
                    name=os.environ.get("BOOTSTRAP_ADMIN_NAME", "Administrator"),
                    email=bootstrap_email,
                    role="super_admin",
                    status="active",
                    created_at=now,
                    updated_at=now,
                ).to_mongo()
                doc["password_hash"] = hash_password(bootstrap_password)
                await db.users.insert_one(doc)
                logger.info("bootstrap_super_admin_created email=%s", bootstrap_email)


@app.on_event("shutdown")
async def shutdown():
    client.close()
