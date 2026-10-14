"""Backend tests for Typinger typing site."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
API = f"{BASE_URL}/api"

GAME_IDS = ["speed-test", "falling-words", "zombie-typing", "space-shooter",
            "type-racer", "sudden-death", "key-reflex", "word-scramble",
            "balloon-pop", "code-typer"]


@pytest.fixture(scope="session")
def test_user():
    email = f"TEST_{uuid.uuid4().hex[:10]}@typinger.com"
    return {"name": "Test User", "email": email, "password": "test1234"}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    return s


@pytest.fixture(scope="session")
def auth(session, test_user):
    r = session.post(f"{API}/auth/register", json=test_user)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == test_user["email"].lower()
    return data


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("message") == "Typinger API"


# ---------- Auth ----------
def test_register_and_me(auth, session):
    token = auth["token"]
    r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == auth["user"]["email"]


def test_register_duplicate(session, auth, test_user):
    r = session.post(f"{API}/auth/register", json=test_user)
    assert r.status_code == 400


def test_login_success(session, test_user):
    r = session.post(f"{API}/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_bad_password(session, test_user):
    r = session.post(f"{API}/auth/login",
                     json={"email": test_user["email"], "password": "wrongpw999"})
    assert r.status_code == 401


def test_me_unauthorized():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_admin_login_seed(session):
    r = session.post(f"{API}/auth/login",
                     json={"email": "admin@typinger.com", "password": "admin123"})
    assert r.status_code == 200, f"Admin seed failed: {r.text}"
    assert r.json()["user"]["role"] == "admin"


# ---------- Results ----------
def test_create_result_requires_auth():
    r = requests.post(f"{API}/results",
                     json={"game_id": "speed-test", "score": 10, "wpm": 50, "accuracy": 95.0, "duration": 15})
    assert r.status_code == 401


def test_create_result_unknown_game(session, auth):
    headers = {"Authorization": f"Bearer {auth['token']}"}
    r = session.post(f"{API}/results", json={
        "game_id": "nonexistent-game", "score": 100, "wpm": 60, "accuracy": 95.0, "duration": 30
    }, headers=headers)
    assert r.status_code == 400


def test_create_results_all_games_and_retrieve(session, auth):
    headers = {"Authorization": f"Bearer {auth['token']}"}
    created = []
    for i, gid in enumerate(GAME_IDS):
        r = session.post(f"{API}/results", json={
            "game_id": gid, "score": 100 + i * 10, "wpm": 50 + i, "accuracy": 90.0 + i * 0.5, "duration": 15 + i
        }, headers=headers)
        assert r.status_code == 200, f"Create {gid}: {r.text}"
        d = r.json()
        assert d["game_id"] == gid
        assert d["score"] == 100 + i * 10
        assert d["user_name"] == auth["user"]["name"]
        created.append(d)

    # GET /results/me verify persistence
    r = session.get(f"{API}/results/me", headers=headers)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= len(GAME_IDS)
    game_ids_returned = {row["game_id"] for row in rows}
    for gid in GAME_IDS:
        assert gid in game_ids_returned


def test_result_validation(session, auth):
    headers = {"Authorization": f"Bearer {auth['token']}"}
    # Negative score
    r = session.post(f"{API}/results", json={
        "game_id": "speed-test", "score": -1, "wpm": 50, "accuracy": 90.0, "duration": 15
    }, headers=headers)
    assert r.status_code == 422
    # Accuracy > 100
    r = session.post(f"{API}/results", json={
        "game_id": "speed-test", "score": 10, "wpm": 50, "accuracy": 150.0, "duration": 15
    }, headers=headers)
    assert r.status_code == 422


# ---------- Stats ----------
def test_my_stats(session, auth):
    headers = {"Authorization": f"Bearer {auth['token']}"}
    r = session.get(f"{API}/stats/me", headers=headers)
    assert r.status_code == 200
    d = r.json()
    assert d["total_games"] >= len(GAME_IDS)
    assert d["best_wpm"] >= 50
    assert isinstance(d["per_game"], list)
    assert len(d["per_game"]) >= 1


# ---------- Leaderboard ----------
def test_leaderboard_per_game(session, auth):
    for gid in GAME_IDS:
        r = session.get(f"{API}/leaderboard", params={"game_id": gid})
        assert r.status_code == 200, f"{gid}: {r.text}"
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert "best_score" in rows[0] and "name" in rows[0]


def test_leaderboard_missing_param():
    r = requests.get(f"{API}/leaderboard")
    assert r.status_code == 422


# ---------- Logout ----------
def test_logout(session, auth):
    r = session.post(f"{API}/auth/logout")
    assert r.status_code == 200
    assert r.json().get("ok") is True
