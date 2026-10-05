# KeyQuest — Typing Games Website (PRD)

## Original problem statement
Build a typing website (MERN). 3D keyboard animation on home page. 10 typing games for practice. Follow SDLC. Use UI UX Pro Max skill for UI/UX. Build frontend first, then backend.

## User choices
- Full JWT auth, WPM history, per-game stats, leaderboard
- Mix of classic + arcade games
- Dark neon (default) + clean light theme (toggle)
- 3D keyboard: interactive CSS 3D keyboard (auto demo + lights on real keypress + mouse parallax)
- Difficulty: separate leaderboard per difficulty (All/Easy/Medium/Hard tabs + badge per row)
- Daily challenge: rotates through all 10 games; text games get identical words via daily seed; arcade games share game+difficulty
- Sounds: Web Audio synthesized, ON by default, navbar mute toggle (localStorage kq_muted)
- Badges: 13 achievements, unlocked server-side, shown on result screen + dashboard

## Architecture
- Frontend: React (CRA/craco), Tailwind, shadcn, lucide, recharts. Design from UI UX Pro Max design system (arcade/pixel accents: Press Start 2P, Chakra Petch, IBM Plex Sans, JetBrains Mono)
- Backend: FastAPI + MongoDB (platform runs FastAPI instead of Express/Node)
- Auth: bcrypt + JWT (Bearer in localStorage + httpOnly cookies), brute-force lockout, admin seed
- Collections: users, results {user_id, game_id, score, wpm, accuracy, duration, difficulty, daily_date}, achievements {user_id, achievement_id, unlocked_at}, login_attempts

## Implemented
### 2026-06 (iteration 1)
- SDLC: requirements -> design (uipro) -> frontend -> backend -> testing (100% pass, iteration_1)
- Home with 3D keyboard hero, value strip, bento games grid, CTA
- 10 games: Speed Test, Falling Words, Zombie Typing, Space Shooter, Type Racer (vs bots), Sudden Death, Key Reflex, Word Scramble, Balloon Pop, Code Typer
- Results saved per user; Dashboard (stats, WPM chart, personal bests, recent); Leaderboard per game
- APIs: /api/auth/{register,login,logout,me}, /api/results, /api/results/me, /api/stats/me, /api/leaderboard

### 2026-06 (iteration 2) — 100% pass, iteration_2
- Difficulty levels (easy/medium/hard) on all 10 games: word pools, speed/spawn/lives, bot WPM, reflex windows+symbol keys, leveled code snippets. Picker on game intro (persisted kq_diff), per-difficulty leaderboards (`GET /api/leaderboard?difficulty=`), badge on rows/results/dashboard
- Daily Challenge: `GET /api/daily` (deterministic game/difficulty/seed from UTC date, countdown, my_best), `GET /api/daily/leaderboard`, `POST /api/results {daily:true}` validated server-side. Page /daily, home banner, `/games/:id?daily=1` locks difficulty + seeds text
- Sound effects: /lib/sound.js (click, error, zap, pop, splat, hit, miss, finish, unlock), hooked into typing hooks + games; navbar mute toggle
- Achievements: 13 badges (ACHIEVEMENTS in server.py), `GET /api/achievements/me`, new unlocks returned by POST /results and shown on result screen with jingle; dashboard badge grid

## Backlog
- P1: Forgot/reset password
- P1: Custom word lists / practice specific keys
- P2: Multiplayer race (realtime), weekly streaks, share result card, set explicit CORS origin for prod
