"""Backend tests for new Typinger features: daily challenge, difficulty, achievements, leaderboard filtering."""
import os
import time
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@typinger.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def admin_token():
    if not ADMIN_PASSWORD:
        pytest.skip("ADMIN_PASSWORD not configured")
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def fresh_user():
    email = f"test_nf_{uuid.uuid4().hex[:10]}@typinger.com"
    r = requests.post(f"{API}/auth/register", json={"name": "NF Tester", "email": email, "password": "test1234"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


def _h(tok): return {"Authorization": f"Bearer {tok}"}


# ---------- Daily endpoint ----------
class TestDaily:
    def test_daily_no_auth(self):
        r = requests.get(f"{API}/daily")
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "game_id", "difficulty", "seed", "resets_in"):
            assert k in d
        assert d["my_best"] is None
        assert d["my_attempts"] == 0
        assert d["difficulty"] in ("easy", "medium", "hard")

    def test_daily_deterministic(self):
        a = requests.get(f"{API}/daily").json()
        b = requests.get(f"{API}/daily").json()
        assert a["game_id"] == b["game_id"]
        assert a["difficulty"] == b["difficulty"]
        assert a["seed"] == b["seed"]
        assert a["date"] == b["date"]

    def test_daily_with_auth(self, admin_token):
        r = requests.get(f"{API}/daily", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "my_best" in d
        assert "my_attempts" in d
        assert isinstance(d["my_attempts"], int)


# ---------- POST /results difficulty & daily validation ----------
class TestResultsValidation:
    def test_invalid_difficulty(self, fresh_user):
        r = requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                          json={"game_id": "speed-test", "score": 10, "wpm": 10, "accuracy": 90,
                                "duration": 30, "difficulty": "insane"})
        assert r.status_code == 400
        assert "difficulty" in r.text.lower()

    def test_daily_mismatch(self, fresh_user):
        d = requests.get(f"{API}/daily").json()
        # pick a wrong game id
        wrong_game = "code-typer" if d["game_id"] != "code-typer" else "speed-test"
        r = requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                          json={"game_id": wrong_game, "score": 10, "wpm": 10, "accuracy": 90,
                                "duration": 30, "difficulty": d["difficulty"], "daily": True})
        assert r.status_code == 400
        assert "today" in r.text.lower() or "challenge" in r.text.lower()

    def test_daily_match_ok(self, fresh_user):
        d = requests.get(f"{API}/daily").json()
        r = requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                          json={"game_id": d["game_id"], "score": 50, "wpm": 50, "accuracy": 95,
                                "duration": 30, "difficulty": d["difficulty"], "daily": True})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["daily_date"] == d["date"]
        assert body["difficulty"] == d["difficulty"]
        assert "new_achievements" in body
        # 'daily' achievement should be in new_achievements (new user)
        ach_ids = {a["id"] for a in body["new_achievements"]}
        assert "daily" in ach_ids


# ---------- Achievements ----------
class TestAchievements:
    def test_speed_test_hard_wpm85_unlocks(self, fresh_user):
        tok = fresh_user["token"]
        r = requests.post(f"{API}/results", headers=_h(tok),
                          json={"game_id": "speed-test", "score": 85, "wpm": 85, "accuracy": 100,
                                "duration": 30, "difficulty": "hard"})
        assert r.status_code == 200, r.text
        ids = {a["id"] for a in r.json()["new_achievements"]}
        expected = {"first-game", "wpm-40", "wpm-60", "wpm-80", "perfect", "hard-mode"}
        assert expected.issubset(ids), f"missing: {expected - ids}"
        assert "wpm-100" not in ids

        # Posting same again -> no new
        r2 = requests.post(f"{API}/results", headers=_h(tok),
                           json={"game_id": "speed-test", "score": 85, "wpm": 85, "accuracy": 100,
                                 "duration": 30, "difficulty": "hard"})
        assert r2.status_code == 200
        assert r2.json()["new_achievements"] == []

    def test_achievements_me_list(self, fresh_user):
        r = requests.get(f"{API}/achievements/me", headers=_h(fresh_user["token"]))
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 13
        for item in items:
            for k in ("id", "title", "desc", "icon", "unlocked_at"):
                assert k in item
            # fresh user -> all locked
            assert item["unlocked_at"] is None

    def test_iron_fingers_and_code_master(self, fresh_user):
        tok = fresh_user["token"]
        r = requests.post(f"{API}/results", headers=_h(tok),
                          json={"game_id": "sudden-death", "score": 260, "wpm": 55, "accuracy": 90,
                                "duration": 30, "difficulty": "medium"})
        ids = {a["id"] for a in r.json()["new_achievements"]}
        assert "iron-fingers" in ids

        r = requests.post(f"{API}/results", headers=_h(tok),
                          json={"game_id": "code-typer", "score": 40, "wpm": 40, "accuracy": 96,
                                "duration": 30, "difficulty": "medium"})
        ids = {a["id"] for a in r.json()["new_achievements"]}
        assert "code-master" in ids


# ---------- Leaderboard filtering ----------
class TestLeaderboard:
    def test_leaderboard_no_difficulty(self):
        r = requests.get(f"{API}/leaderboard", params={"game_id": "speed-test"})
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        for row in rows:
            assert "difficulty" in row

    def test_leaderboard_hard_only(self, fresh_user):
        # ensure at least one hard row for speed-test from previous test
        requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                      json={"game_id": "speed-test", "score": 70, "wpm": 70, "accuracy": 95,
                            "duration": 30, "difficulty": "hard"})
        r = requests.get(f"{API}/leaderboard", params={"game_id": "speed-test", "difficulty": "hard"})
        assert r.status_code == 200
        rows = r.json()
        for row in rows:
            assert row["difficulty"] == "hard"

    def test_leaderboard_easy_filter(self):
        r = requests.get(f"{API}/leaderboard", params={"game_id": "speed-test", "difficulty": "easy"})
        assert r.status_code == 200
        rows = r.json()
        for row in rows:
            assert row["difficulty"] == "easy"

    def test_daily_leaderboard(self, fresh_user):
        d = requests.get(f"{API}/daily").json()
        requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                      json={"game_id": d["game_id"], "score": 55, "wpm": 55, "accuracy": 95,
                            "duration": 30, "difficulty": d["difficulty"], "daily": True})
        r = requests.get(f"{API}/daily/leaderboard")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # Should have at least our row
        assert len(rows) >= 1


# ---------- Regression ----------
class TestRegression:
    def test_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == "admin@typinger.com"

    def test_results_me_has_difficulty(self, fresh_user):
        requests.post(f"{API}/results", headers=_h(fresh_user["token"]),
                      json={"game_id": "speed-test", "score": 10, "wpm": 10, "accuracy": 80,
                            "duration": 30, "difficulty": "easy"})
        r = requests.get(f"{API}/results/me", headers=_h(fresh_user["token"]))
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        for row in rows:
            assert "difficulty" in row
            assert "daily_date" in row

    def test_stats_me(self, admin_token):
        r = requests.get(f"{API}/stats/me", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("total_games", "best_wpm", "avg_wpm", "avg_accuracy", "per_game"):
            assert k in d
