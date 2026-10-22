"""End-to-end security and RBAC tests for the Typinger admin console.

These tests run against a live API (default http://localhost:8000) and a real
MongoDB instance, using a dedicated throw-away super administrator. They verify
server-side enforcement, not just HTTP shapes: cookies, revocation, rate limits,
role checks and audit records.
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_API = f"{API}/admin"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "typinger")
JWT_SECRET = os.environ.get("JWT_SECRET", "")

SUFFIX = uuid.uuid4().hex[:10]
TEST_ADMIN_EMAIL = f"admin_test_{SUFFIX}@example.com"
TEST_ADMIN_PASSWORD = f"Adm!n-{secrets.token_urlsafe(18)}"
TEST_USER_EMAIL = f"user_test_{SUFFIX}@example.com"
TEST_USER_PASSWORD = "Test-pass-1234"
SECOND_USER_EMAIL = f"user2_test_{SUFFIX}@example.com"


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _login(email: str, password: str) -> requests.Session:
    session = requests.Session()
    response = session.post(
        f"{ADMIN_API}/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    assert response.status_code == 200, response.text
    return session


def _register(name: str, email: str, password: str) -> dict:
    response = requests.post(
        f"{API}/auth/register",
        json={"name": name, "email": email, "password": password},
        timeout=20,
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture(scope="module", autouse=True)
def test_accounts():
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)

    db.users.insert_one(
        {
            "name": "Test Super Admin",
            "email": TEST_ADMIN_EMAIL,
            "role": "super_admin",
            "status": "active",
            "password_hash": _hash(TEST_ADMIN_PASSWORD),
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
        }
    )
    _register("AAA Test User", TEST_USER_EMAIL, TEST_USER_PASSWORD)
    _register("ZZZ Second User", SECOND_USER_EMAIL, TEST_USER_PASSWORD)

    yield {"db": db}

    emails = [TEST_ADMIN_EMAIL, TEST_USER_EMAIL, SECOND_USER_EMAIL]
    users = list(db.users.find({"email": {"$in": emails}}, {"_id": 1}))
    ids = [str(user["_id"]) for user in users]
    db.admin_sessions.delete_many({"user_id": {"$in": ids}})
    db.users.delete_many({"email": {"$in": emails}})
    db.audit_logs.delete_many(
        {
            "$or": [
                {"admin_email": {"$in": emails}},
                {"metadata.email": {"$in": emails}},
            ]
        }
    )
    for email in emails:
        db.admin_login_attempts.delete_many({"_id": {"$regex": email}})
    client.close()


@pytest.fixture()
def admin_session():
    return _login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
def test_visitor_cannot_call_admin_api():
    response = requests.get(f"{ADMIN_API}/dashboard", timeout=20)
    assert response.status_code == 401


def test_normal_user_cannot_use_admin_api_or_admin_login():
    login = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    )
    assert login.status_code == 200
    token = login.json()["token"]

    # A consumer bearer token must never satisfy the admin session dependency.
    response = requests.get(
        f"{ADMIN_API}/dashboard",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    assert response.status_code == 401

    response = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_invalid_and_unknown_credentials_return_the_same_generic_error():
    invalid = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": "wrong-password"},
        timeout=20,
    )
    unknown = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": f"ghost_{SUFFIX}@example.com", "password": "wrong-password"},
        timeout=20,
    )
    assert invalid.status_code == unknown.status_code == 401
    assert invalid.json()["detail"] == unknown.json()["detail"] == "Invalid credentials"


def test_admin_login_sets_httponly_cookie_without_exposing_token(admin_session):
    me = admin_session.get(f"{ADMIN_API}/auth/me", timeout=20)
    assert me.status_code == 200
    body = me.json()
    assert body["user"]["role"] == "super_admin"
    assert body["user"]["email"] == TEST_ADMIN_EMAIL
    assert "password_hash" not in body["user"]

    cookie = admin_session.cookies.get("admin_session")
    assert cookie
    # The session token must not appear in any JSON response.
    assert cookie not in me.text

    set_cookie = me.request.headers.get("Cookie", "")
    assert "admin_session=" in set_cookie


def test_login_cookie_attributes(admin_session):
    # requests does not expose cookie flags on the session; inspect a fresh login.
    fresh = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
        timeout=20,
    )
    assert fresh.status_code == 200
    header = fresh.headers.get("set-cookie", "")
    assert "HttpOnly" in header
    assert "SameSite" in header
    assert f"admin_session={fresh.cookies.get('admin_session')}" not in fresh.text


def test_csrf_origin_check_rejects_cross_site_mutation():
    response = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
        headers={"Origin": "https://evil.example"},
        timeout=20,
    )
    assert response.status_code == 403


def test_dashboard_returns_real_aggregates(admin_session):
    response = admin_session.get(f"{ADMIN_API}/dashboard", timeout=20)
    assert response.status_code == 200
    data = response.json()
    assert data["users"]["total"] >= 1
    assert isinstance(data["activity"]["total_results"], int)
    assert len(data["series"]["signups"]) == 14
    assert len(data["series"]["results"]) == 14
    assert data["generated_at"]


def test_cookie_session_authorizes_content_management(admin_session):
    # These legacy endpoints previously accepted only a consumer bearer token;
    # the cookie-authenticated console must be able to use them too.
    for path in ("/passages", "/posts", "/results"):
        response = admin_session.get(f"{ADMIN_API}{path}", timeout=20)
        assert response.status_code == 200, f"{path}: {response.text}"
        assert isinstance(response.json(), list)

    created = admin_session.post(
        f"{ADMIN_API}/passages",
        json={
            "title": f"Cookie auth passage {uuid.uuid4().hex[:8]}",
            "text": "This passage proves that the admin cookie can create content.",
            "language": "english",
            "difficulty": "easy",
        },
        timeout=20,
    )
    assert created.status_code == 200, created.text
    passage_id = created.json()["id"]
    try:
        deleted = admin_session.delete(f"{ADMIN_API}/passages/{passage_id}", timeout=20)
        assert deleted.status_code == 200, deleted.text
    finally:
        admin_session.delete(f"{ADMIN_API}/passages/{passage_id}", timeout=20)


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------
def test_user_search_filter_sort_and_pagination(admin_session):
    search = admin_session.get(
        f"{ADMIN_API}/users",
        params={"search": TEST_USER_EMAIL},
        timeout=20,
    )
    assert search.status_code == 200
    data = search.json()
    assert data["total"] == 1
    assert data["items"][0]["email"] == TEST_USER_EMAIL
    assert data["items"][0]["id"]

    filtered = admin_session.get(
        f"{ADMIN_API}/users",
        params={"role": "user", "status": "active", "limit": 100},
        timeout=20,
    )
    assert filtered.status_code == 200
    assert all(item["role"] == "user" for item in filtered.json()["items"])
    assert all(item["status"] == "active" for item in filtered.json()["items"])

    paged = admin_session.get(f"{ADMIN_API}/users", params={"limit": 1, "page": 1}, timeout=20)
    assert paged.status_code == 200
    assert len(paged.json()["items"]) == 1
    assert paged.json()["pages"] >= 1

    sorted_response = admin_session.get(
        f"{ADMIN_API}/users",
        params={"sort": "name", "order": "asc", "limit": 100},
        timeout=20,
    )
    names = [item["name"] for item in sorted_response.json()["items"]]
    assert names == sorted(names)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dated = admin_session.get(
        f"{ADMIN_API}/users",
        params={"date_from": today, "date_to": today, "limit": 100},
        timeout=20,
    )
    assert dated.status_code == 200
    assert any(item["email"] == TEST_USER_EMAIL for item in dated.json()["items"])

    # Invalid filter/sort input is rejected rather than silently ignored.
    assert admin_session.get(f"{ADMIN_API}/users", params={"role": "root"}).status_code == 400
    assert admin_session.get(f"{ADMIN_API}/users", params={"sort": "password_hash"}).status_code == 400


def test_user_detail_and_idor_protection(admin_session):
    listing = admin_session.get(
        f"{ADMIN_API}/users", params={"search": TEST_USER_EMAIL}, timeout=20
    ).json()
    user_id = listing["items"][0]["id"]

    detail = admin_session.get(f"{ADMIN_API}/users/{user_id}", timeout=20)
    assert detail.status_code == 200
    data = detail.json()
    assert data["user"]["email"] == TEST_USER_EMAIL
    assert "stats" in data and "recent_results" in data
    assert "password_hash" not in detail.text

    assert admin_session.get(f"{ADMIN_API}/users/not-an-object-id").status_code == 404

    normal_login = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    ).json()
    response = requests.get(
        f"{ADMIN_API}/users/{user_id}",
        headers={"Authorization": f"Bearer {normal_login['token']}"},
        timeout=20,
    )
    assert response.status_code == 401


def test_suspend_reactivate_and_audit_trail(admin_session):
    user = admin_session.get(
        f"{ADMIN_API}/users", params={"search": TEST_USER_EMAIL}, timeout=20
    ).json()["items"][0]

    suspended = admin_session.patch(
        f"{ADMIN_API}/users/{user['id']}/status",
        json={"status": "suspended", "reason": "Automated test suspension"},
        timeout=20,
    )
    assert suspended.status_code == 200
    assert suspended.json()["user"]["status"] == "suspended"

    blocked = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    )
    assert blocked.status_code == 403

    found = admin_session.get(
        f"{ADMIN_API}/users",
        params={"status": "suspended", "search": TEST_USER_EMAIL},
        timeout=20,
    ).json()
    assert found["total"] == 1

    reactivated = admin_session.patch(
        f"{ADMIN_API}/users/{user['id']}/status",
        json={"status": "active"},
        timeout=20,
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["user"]["status"] == "active"

    login = requests.post(
        f"{API}/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        timeout=20,
    )
    assert login.status_code == 200

    audit = admin_session.get(
        f"{ADMIN_API}/audit-logs",
        params={"target_type": "user", "target_id": user["id"]},
        timeout=20,
    )
    assert audit.status_code == 200
    actions = [item["action"] for item in audit.json()["items"]]
    assert "USER_SUSPENDED" in actions
    assert "USER_REACTIVATED" in actions
    assert all(item["admin_email"] == TEST_ADMIN_EMAIL for item in audit.json()["items"])


def test_super_admin_can_promote_and_revoke_admin_but_admin_cannot_escalate(admin_session):
    listing = admin_session.get(
        f"{ADMIN_API}/users", params={"search": SECOND_USER_EMAIL}, timeout=20
    ).json()
    user_id = listing["items"][0]["id"]

    promoted = admin_session.patch(
        f"{ADMIN_API}/users/{user_id}/role",
        json={"role": "admin"},
        timeout=20,
    )
    assert promoted.status_code == 200
    assert promoted.json()["user"]["role"] == "admin"

    second_admin = _login(SECOND_USER_EMAIL, TEST_USER_PASSWORD)

    # Admin can read operational data...
    assert second_admin.get(f"{ADMIN_API}/users", timeout=20).status_code == 200

    # ...but cannot list or create administrators, change roles or touch a super admin.
    assert second_admin.get(f"{ADMIN_API}/admins", timeout=20).status_code == 403
    assert second_admin.post(
        f"{ADMIN_API}/admins",
        json={
            "name": "Escalation Attempt",
            "email": f"escalate_{SUFFIX}@example.com",
            "password": "Escalation-pass-123",
            "role": "super_admin",
        },
        timeout=20,
    ).status_code == 403
    assert second_admin.patch(
        f"{ADMIN_API}/users/{user_id}/role", json={"role": "super_admin"}, timeout=20
    ).status_code == 403

    me = second_admin.get(f"{ADMIN_API}/auth/me", timeout=20).json()["user"]
    assert second_admin.patch(
        f"{ADMIN_API}/users/{me['id']}/status",
        json={"status": "suspended"},
        timeout=20,
    ).status_code == 400

    # Demoting the admin revokes its server sessions immediately.
    revoked = admin_session.patch(
        f"{ADMIN_API}/admins/{user_id}/role", json={"role": "user"}, timeout=20
    )
    assert revoked.status_code == 200
    assert revoked.json()["user"]["role"] == "user"
    assert second_admin.get(f"{ADMIN_API}/auth/me", timeout=20).status_code == 401


def test_self_protection_and_last_super_admin_guard(admin_session):
    me = admin_session.get(f"{ADMIN_API}/auth/me", timeout=20).json()["user"]
    assert admin_session.patch(
        f"{ADMIN_API}/users/{me['id']}/role", json={"role": "admin"}, timeout=20
    ).status_code == 400
    assert admin_session.patch(
        f"{ADMIN_API}/users/{me['id']}/status",
        json={"status": "suspended"},
        timeout=20,
    ).status_code == 400


def test_audit_log_filters_and_actions(admin_session):
    actions = admin_session.get(f"{ADMIN_API}/audit-logs/actions", timeout=20)
    assert actions.status_code == 200
    assert "USER_SUSPENDED" in actions.json()["items"]

    filtered = admin_session.get(
        f"{ADMIN_API}/audit-logs",
        params={"action": "ADMIN_LOGIN", "limit": 10},
        timeout=20,
    )
    assert filtered.status_code == 200
    assert all(item["action"] == "ADMIN_LOGIN" for item in filtered.json()["items"])
    assert filtered.json()["items"]


# ---------------------------------------------------------------------------
# Session lifecycle and brute force
# ---------------------------------------------------------------------------
def test_expired_session_is_rejected(admin_session):
    token = admin_session.cookies.get("admin_session")
    payload = jwt.decode(token, options={"verify_signature": False})
    db = MongoClient(MONGO_URL)[DB_NAME]
    db.admin_sessions.update_one(
        {"jti": payload["jti"]},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(minutes=1)}},
    )
    assert admin_session.get(f"{ADMIN_API}/auth/me", timeout=20).status_code == 401
    db.client.close()


def test_logout_revokes_the_server_session():
    session = _login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
    stolen = session.cookies.get("admin_session")

    logout = session.post(f"{ADMIN_API}/auth/logout", timeout=20)
    assert logout.status_code == 200
    assert session.get(f"{ADMIN_API}/dashboard", timeout=20).status_code == 401

    replay = requests.get(
        f"{ADMIN_API}/dashboard",
        cookies={"admin_session": stolen},
        timeout=20,
    )
    assert replay.status_code == 401


def test_admin_login_is_rate_limited():
    email = f"bruteforce_{SUFFIX}@example.com"
    statuses = []
    for _ in range(6):
        response = requests.post(
            f"{ADMIN_API}/auth/login",
            json={"email": email, "password": "definitely-wrong"},
            timeout=20,
        )
        statuses.append(response.status_code)
    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429
    blocked = requests.post(
        f"{ADMIN_API}/auth/login",
        json={"email": email, "password": "definitely-wrong"},
        timeout=20,
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
