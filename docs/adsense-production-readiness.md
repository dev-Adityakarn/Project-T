# AdSense Production Readiness Audit

**Verdict: NOT READY to submit for AdSense review.**

At the time of the audit, the live site was still serving the previous deployment. The frontend was deployed on 16 November 2026; the current production verification is recorded in the addendum below. The production database migration has not been run, and authenticated admin/backend workflows and the AdSense consent setup could not be verified without owner credentials and account access.

> **Post-deployment addendum — 16 November 2026**
>
> The audit commit was fast-forwarded to `main` and Cloudflare production build `be9f679c-1562-4af3-b1d2-5c2d797c124e` completed successfully. Post-deployment checks:
>
> - `robots.txt` now returns the `*`, `Googlebot` and `Mediapartners-Google` groups with `/admin`, `/api`, `/dashboard`, `/login` and `/register` disallowed.
> - `sitemap.xml` now contains 33 canonical URLs and no retired slugs.
> - All six retired URLs return `301` to their canonical destinations, and every destination returns `200`.
> - The live blog index contains 14 article links and no longer links either retired slug.
> - The AdSense verification meta tag, `ads.txt`, canonical home URL and HTTP 404 behavior remain correct.
>
> Still outstanding: the production database migration, authenticated admin/backend workflows, and the AdSense CMP/slot configuration. The deployment rows in sections 2, 3 and 9 below describe the current post-deployment state; the audit-time failure is noted only where it explains the remediation history.

- **Audit date:** 13 November 2026
- **Repository:** `Project-T-blog-editor`
- **Branch:** `adsense-quality-remediation`, merged to `main` on 16 November 2026
- **Audited base commit:** `273e25c` (`fix(content): remediate AdSense low-value content`)
- **Audit fixes:** commit `aa1c268`; deployed to production on 16 November 2026
- **Live origin:** `https://typinger.in`
- **API origin:** `https://typinger.onrender.com`
- **Production data:** no production writes were made

## 1. Scope and method

The audit checked the claims in `docs/adsense-quality-remediation.md` against the actual diff, generated build and live site. It covered:

- the frontend production build, sitemap, robots file, canonicals, `noindex` directives, redirects and internal links;
- all 14 blog articles, their metadata, sources and exam claims;
- desktop and mobile interaction on typing tests, lessons, practice, code practice, the exam calculator, blog, contact, login, registration, admin and the 404 page;
- the production database migration script in dry-run, apply, idempotency and rollback modes against a throwaway MongoDB;
- AdSense verification, publisher ID consistency, script gating, `ads.txt`, privacy disclosures and placement policy.

**Status key:** `PASS` = verified; `FAIL` = verified defect or live mismatch; `NOT TESTED` = not verifiable in this environment; `REQUIRES OWNER ACTION` = cannot be completed without production/account access or approval.

## 2. Deployment and repository state

| Check | Evidence | Status |
|---|---|---|
| Branch and base commit | `adsense-quality-remediation` at `273e25c`; audit fixes are in the audit commit that adds this report | PASS |
| Frontend production build | `npm run build` completed; **56 static HTML files** written | PASS |
| Build breakdown | 33 indexable sitemap pages + 22 intentionally `noindex` app/utility pages + `404.html` = 56 | PASS |
| Documentation file-count claim | `docs/adsense-quality-remediation.md` said 47; corrected to the verified 56-file breakdown | PASS |
| Production deployment contains the remediation | Deployed 16 Nov 2026; live `robots.txt`, 33-URL sitemap and six 301 redirects verified | PASS (post-deploy) |
| Cloudflare Worker source | `frontend/worker.js` and `_redirects` contain the new redirects and 404 handling; production build succeeded | PASS |
| Production cache/deployment verification | Cloudflare build `be9f679c-1562-4af3-b1d2-5c2d797c124e` succeeded; live HTML reflects the new release | PASS |

### 2.1 The 33-versus-47-versus-56 discrepancy

The old note counted “47 prerendered HTML files plus 404,” which matched neither the generated output nor a stable subset of it. The verified build contains **56 files**:

- **33** canonical pages listed in `sitemap.xml`;
- **12** intentionally `noindex` utility/game pages: 10 individual games, `/daily/` and `/leaderboard/`;
- **10** private app shells: seven `/admin/*` pages, `/dashboard/`, `/login/` and `/register/`;
- **1** `404.html`.

`prerender.js` now counts unique files actually written rather than incrementing a route counter, and logs `56`. The remediation document has been corrected.

## 3. Crawlability and indexing

### 3.1 `robots.txt`

| Check | Local build | Live `https://typinger.in/robots.txt` | Status |
|---|---|---|---|
| Crawler groups | `*`, `Googlebot`, `Mediapartners-Google` | Same three groups | PASS |
| Private-route disallows | `/admin`, `/api`, `/dashboard`, `/login`, `/register` in every group | Same set in every group | PASS |
| Sitemap declaration | `Sitemap: https://typinger.in/sitemap.xml` | Same line | PASS |
| Public routes blocked by mistake | None of `/typing-test`, `/blog`, `/typing-practice` blocked | None | PASS |

The generated and live `robots.txt` files now match and are correct.

### 3.2 Sitemap and canonicals

| Check | Local build | Live site | Status |
|---|---|---|---|
| Sitemap URL count | 33 | 33 | PASS |
| Retired slugs in sitemap | 0 | 0 | PASS |
| Sitemap uses production origin and trailing slashes | Yes | Yes | PASS |
| Canonical tags on indexable pages | Self-referential, 33 canonical URLs | New deployment uses the same prerendered tags | PASS |
| No canonical points at a retired URL | Verified by `verify:seo` and link graph | Post-deployment spot checks pass | PASS |
| `noindex` on app/utility pages | 22 pages, plus `404.html` | Login/admin/dashboard return `noindex`; admin also sends `x-robots-tag: noindex, nofollow` | PASS |
| `noindex` on 404 | Yes, `noindex,nofollow` | Live `/definitely-not-a-page` returns 404 | PASS |

### 3.3 Redirects for the six retired URLs

Local production-like server results:

| Retired URL | Local status | Local `Location` | Destination status |
|---|---|---|---|
| `/blog/touch-typing-guide-for-beginners/` | 301 | `/blog/touch-typing-for-beginners/` | 200 |
| `/blog/what-is-a-good-wpm-score/` | 301 | `/blog/what-is-a-good-typing-speed/` | 200 |
| `/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide/` | 301 | `/blog/ssc-chsl-typing-test-2026/` | 200 |
| `/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections/` | 301 | `/blog/ssc-chsl-typing-test-2026/` | 200 |
| `/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description/` | 301 | `/blog/how-to-increase-typing-speed/` | 200 |
| `/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide/` | 301 | `/blog/english-typing-test-1-5-10-minute/` | 200 |

All six local redirects are permanent 301s, all destinations are canonical 200 pages, and no loop or extra hop was found. The Worker route resolver handles both trailing-slash and non-trailing-slash forms, and `_redirects` lists both explicitly.

**Live result after the 16 November deployment: all six retired URLs return 301 to the canonical locations in the table, and every destination returns 200.** At audit time (13 November) all six returned 200; that was the deployment blocker described in the addendum.

### 3.4 SPA fallback, 404 and internal links

| Check | Evidence | Status |
|---|---|---|
| Valid client-side routes without a prerendered file | Served the SPA shell with HTTP 200 | PASS (local) |
| Unknown route | Branded 404 with HTTP 404, not an HTTP 200 SPA fallback | PASS (local and live) |
| 404 page recovery links | Six links to home, 1-minute test, practice, lessons, games and blog | PASS |
| Internal anchor graph | 0 broken internal targets across all 56 HTML files | PASS |
| Retired links inside the new content | None; internal-link graph and SEO regression pass | PASS |

## 4. Content audit: all 14 articles

All 14 articles were read in full. The blog index renders 14 article cards locally. At audit time the live blog index still contained 15 article links, including the two retired slugs; after the 16 November deployment it contains 14 article links and no retired slug.

| Check | Evidence | Status |
|---|---|---|
| Canonical article count | 14 locally | PASS |
| Minimum length | 690–1,840 visible words per article; the shortest body-paragraph count is 503 words, so every article exceeds the 500-word claim | PASS |
| Titles | 42–59 characters, unique | PASS |
| Meta descriptions | 125–160 characters, unique, no duplicated lead text | PASS |
| H1 and heading structure | One H1 per article; H2/H3 hierarchy used consistently | PASS |
| Authorship | `Typinger Team` on every article; no invented named author or credential | PASS |
| Dates | `datePublished` and `dateModified` present; revised articles show an updated date | PASS |
| Duplicate body paragraphs | None across articles; the only repeated text is the standard “not affiliated with SSC/RRB/MP CPCT” disclaimer in the exam articles, which is intentional | PASS |
| Reading-time labels | 6–9 minutes; these are conservative relative to the visible word counts and are not a policy defect | PASS |
| Source lists render once | Verified in article rendering and prerendered HTML | PASS |
| Lead/excerpt repetition | Renderer and prerenderer de-duplicate a lead repeated as the first paragraph | PASS |
| Internal links | Every article’s internal links resolve to a known route | PASS |

### 4.1 Source accuracy

Thirteen unique external URLs are cited across the 14 articles and tool pages:

- 12 return HTTP 200, including the official SSC CGL/CHSL notices, RRB CEN PDFs, the PIB release, the MP CPCT rulebook, the archived RRB CBTST instructions and the CHI keystroke study.
- `https://doi.org/10.1145/3491101.3519641` returns HTTP 403 to `curl`. ACM blocks non-browser clients; this is a verification limitation, not a broken citation. It should be checked in a normal browser.

Content corrections verified in the diff:

- MP CPCT citations now point to the current Rulebook V1.5 (`CPCT_Rule_book_7_Years_Validity.pdf`), not V1.3;
- RRB CEN 06/2025, 06/2026 and 07/2026 links now point to official `rrbapply.gov.in` PDFs instead of third-party copies;
- CEN 06/2025’s 10-minute duration is no longer presented as a CEN rule; the copy attributes duration to the separate CBTST instructions;
- the SSC CGL 2026 DEST source link uses the official SSC notice;
- the unsupported CGL row was removed from the government-jobs excerpt;
- the “recover in a fortnight” claim in `how-to-type-faster` was replaced with a non-numeric, learner-dependent statement.

No fabricated pass marks, cut-offs, testimonials, user counts or official affiliations were found.

## 5. Interactive product audit

A Puppeteer run against the local production build exercised **26 scenarios** (20 desktop, 6 mobile) and **79 checks**. Result: **79/79 passed**, with **0 page errors** and **0 local asset failures**.

The only browser console errors were expected local-preview 404s for `/api/auth/me`, `/api/posts` and `/api/daily` because the static preview has no backend, plus the deliberate 404 test. No local JavaScript or asset request failed.

| Area | Checks | Status |
|---|---|---|
| Homepage | Hero, typing tool, 10 game tiles, typing registers (`HUD WPM 240`) | PASS |
| 1-minute test | Timer starts at `1:00`, typing registers, accuracy updates | PASS |
| 3-minute test | Timer starts at `3:00`, typing registers, accuracy updates | PASS |
| 5-minute test | Timer starts at `5:00`, typing registers, accuracy updates | PASS |
| Hindi typing | Devanagari tool present, keystrokes register (`HUD WPM 96`), `<html lang="hi">` | PASS |
| Lessons | 12 lessons, lesson switch to Lesson 2, lesson typing registers | PASS |
| Practice | Practice tool present and registers typing | PASS |
| Code practice | Widget present; pasted snippet stays local; snippet drill starts and types; main test does not capture snippet keys (main HUD remains 0) | PASS |
| Exam calculator | Defaults to 35.0; 5 full + 2 half errors gives 34.4 net; status updates | PASS |
| Blog index | 14 article cards | PASS |
| SSC CHSL article | Title, 12,454-character body, 8 FAQs, calculator widget, official SSC source link | PASS |
| SSC CGL article | 7,812-character body, official CGL notice linked | PASS |
| Government-jobs article | 10,464-character body, reference table with 5 rows | PASS |
| Contact | Form present; empty form blocked by native validation; completed form valid | PASS (validation only) |
| Login | Form present; two fields; empty form blocked; switch link reaches registration | PASS (validation only) |
| Registration | Form present; three fields; empty form blocked | PASS (validation only) |
| Guest dashboard | Redirects to `/login/` and shows the login form | PASS |
| Guest admin | Redirects to `/admin/login`, admin form appears, page is `noindex`, empty submit shows field errors | PASS (unauthenticated only) |
| 404 | Heading visible, `noindex`, recovery links present, HTTP 404 | PASS |
| `robots.txt` | Googlebot group, Mediapartners-Google group, sitemap line | PASS (local) |
| Mobile home | No horizontal overflow, typing tool visible, typing registers | PASS |
| Mobile 1-minute test | No horizontal overflow, typing tool visible | PASS |
| Mobile lessons | No horizontal overflow, lesson list visible | PASS |
| Mobile article | No horizontal overflow, body renders, calculator widget present | PASS |
| Mobile calculator | No horizontal overflow, calculator present | PASS |
| Mobile blog index | No horizontal overflow, 14 cards | PASS |

### 5.1 Code-practice defect found and fixed

On `/typing-test/code/`, the main typing test’s global `keydown` handler consumed characters intended for the custom-snippet `<textarea>`. The textarea received nothing, and after the snippet drill started, both typing surfaces applied the same keys.

Fix:

- `useCharTyper` now ignores keystrokes whose target is an `INPUT`, `TEXTAREA`, `SELECT` or `contenteditable` element.
- A module-level single-owner coordinator ensures only the typing surface the visitor interacted with receives keystrokes. `TypingTool` claims ownership on `mousedown`/`touchstart`; `CustomCodePractice` mounts its drill with `autoClaim`.
- Regression tests cover the form-control guard and two mounted typing surfaces. Targeted suites pass: 11 tests across `useCharTyper.test.js` and `SeoWidgets.test.jsx`.

Re-test: the textarea accepts the full snippet, the snippet HUD registers 216 WPM, and the main test HUD stays at 0.

## 6. Admin, authentication and backend

| Check | Evidence | Status |
|---|---|---|
| Guest redirected from `/dashboard/` | Yes | PASS |
| Guest redirected from `/admin/` | Yes, to `/admin/login` | PASS |
| Admin login client-side validation | Empty submit shows email/password errors | PASS |
| Admin page `noindex` | Yes | PASS |
| Authenticated login/registration | No test credentials or running production auth flow available | **NOT TESTED** |
| Authenticated admin CRUD | Cannot sign in without credentials | **NOT TESTED** |
| Admin publish warnings, moderation, audit logs | Code present; not exercised with a session | **NOT TESTED** |
| Contact form delivery | Native validation checked; no message was sent | **NOT TESTED** |
| Production read-only API probe | `/api/auth/me` → 401; `/api/posts` → 200; `/api/health` → 404 | PASS (read-only) |
| Production writes | None made | PASS |

The production `/api/posts` response contains exactly the five duplicate posts the migration is designed to retire:

- `ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide`
- `ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan`
- `ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections`
- `how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description`
- `english-typing-test-for-10-minutes-a-government-exam-practice-guide`

The API does not expose `content` or `published` in that list response, so the live probe proves the duplicate slugs exist but does not replace a production migration dry run.

`/api/health` returning 404 is not a frontend defect: the application does not use a health endpoint. It simply means no health route is deployed.

## 7. AdSense verification and policy

| Check | Evidence | Status |
|---|---|---|
| Verification meta tag | `frontend/public/index.html` and live homepage contain `<meta name="google-adsense-account" content="ca-pub-4755033920004677">` | PASS |
| Publisher ID consistency | Meta tag, `ads.txt`, `ADSENSE_CONFIG` default and `.env.example` all use `ca-pub-4755033920004677` | PASS |
| `ads.txt` | Local build and live site both contain `google.com, pub-4755033920004677, DIRECT, f08c47fec0942fa0` | PASS |
| Script gating | `canLoadAdSenseScript()` requires enabled build + valid publisher ID + configured CMP; no script loads on app/game/auth/error routes | PASS (code and local build) |
| Ad slot IDs | None configured; no placeholder or fake slot IDs ship | PASS (safe default) |
| CMP configured | No `REACT_APP_CMP_PROVIDER` and no Google-certified CMP configured | **REQUIRES OWNER ACTION** |
| Ads enabled | `REACT_APP_ADSENSE_ENABLED` is not set, so ads are off by design | PASS (safe default); **REQUIRES OWNER ACTION** to monetize |
| Placement policy | Ads are blocked on `/dashboard`, `/login`, `/register`, `/games*`, `/daily*`, `/leaderboard*`, `/admin*` and `/404`; eligible only on editorial pages or completed results; never inside an active test/lesson/game | PASS (code-level) |
| Live ad behavior | No ad script is requested in the disabled configuration | **NOT TESTED** by design |
| Privacy disclosures | Privacy policy explains AdSense cookies, Google’s role, opt-out links, consent timing and the no-ads-during-active-test rule; live page contains the same disclosure | PASS |
| AdSense review submission | Deliberately not submitted; owner approval required | **NOT TESTED / REQUIRES OWNER ACTION** |

The site is technically ready to be verified by AdSense, but it is not ready to be submitted for review while the production database still contains the duplicate records and the consent path is unconfigured.

## 8. Production database migration

The script is `backend/scripts/migrate_adsense_content.py`. It was validated end to end against a throwaway MongoDB at `127.0.0.1:27019`, database `typinger_audit_test`, seeded with nine posts: the five duplicate slugs, one live post needing copy repair, one clean published post, one clean unpublished post and one already-retired post.

| Check | Evidence | Status |
|---|---|---|
| Dry run is the default | No `--apply` → no writes | PASS |
| Dry run made no writes | Snapshot SHA-256 was identical before and after; backup directory remained empty | PASS |
| Targeting | Dry run identified all five retired slugs plus one repair; `retired=5 repaired=1 unchanged=3` | PASS |
| Backup before first write | Apply wrote a 9-post Extended JSON backup before changes | PASS |
| Backup permissions | Directory mode `0700`, file mode `0600` | PASS |
| Soft retirement, no deletes | Retired records receive `published: false`, `retired_at`, `retired_reason: adsense-quality-consolidation` and `retired_target`; document count stays 9 | PASS |
| Idempotency | Second dry run after apply: `retired=0 repaired=0 unchanged=9` | PASS |
| Rollback | Original command failed with `cannot decode array into primitive.D` and imported 0 documents. Fixed by adding `--jsonArray`; the corrected command imported the changed documents, restored original content and `published: true`, and removed all retirement fields | PASS (after fix) |
| Private storage | `backend/backups/` is git-ignored; backups contain full post documents and unpublished copy | PASS |
| Production dry run | Not run; requires the owner’s production `MONGO_URL`/`DB_NAME` and approval | **NOT TESTED / REQUIRES OWNER ACTION** |
| Production apply | Not run | **REQUIRES OWNER ACTION** |

The synthetic test also confirmed that the CGL database record is intentionally retired even though its public URL remains live: the static CGL article is the canonical page, and the duplicate database record should not be published again.

### 8.1 Migration commands (owner, after approval)

Run from `backend/`, with the production `MONGO_URL` and `DB_NAME` in `backend/.env`:

```bash
# 1. Dry run. Review every "would retire" and "would repair" line.
./venv/bin/python scripts/migrate_adsense_content.py --backup-dir backups

# 2. Apply. This writes the private backup first.
./venv/bin/python scripts/migrate_adsense_content.py --apply --backup-dir backups

# 3. Idempotency check. Expect retired=0 repaired=0.
./venv/bin/python scripts/migrate_adsense_content.py --backup-dir backups
```

Do not run step 2 until the dry-run output matches the expected five duplicates and any named copy repairs.

### 8.2 Rollback

The backup is a JSON array. The restore command must include `--jsonArray`:

```bash
mongoimport --uri "$MONGO_URL" --db "$DB_NAME" --collection posts \
  --mode upsert --jsonArray \
  --file backend/backups/adsense_content_backup_<stamp>.json
```

This restores every backed-up post by `_id` and does not delete posts created after the backup. After restoring, rerun the dry run; the changes that were rolled back should appear again as planned changes.

## 9. Tests, build and regression checks

| Check | Result | Status |
|---|---|---|
| Full Jest suite | 18 suites, **129 tests passed** | PASS |
| Production build | Compiled successfully; **56 HTML files** | PASS |
| SEO regression | **33 sitemap URLs**, all checks passed | PASS |
| Internal-link graph | 0 broken internal targets across 56 files | PASS |
| Python migration syntax | `python3 -m py_compile` passed | PASS |
| Browser audit | 26 scenarios, 79/79 checks passed | PASS |
| Redirects locally | Six 301s, all destinations 200 | PASS |
| Redirects live | Six 301s, all destinations 200 (verified 16 Nov) | PASS |

## 10. Defects found and fixed during the audit

1. **Code-practice keystroke capture** — the main typing test swallowed textarea input and both surfaces received the same keys. Added the form-control guard, single-owner coordinator and regression tests.
2. **Rollback command** — the documented `mongoimport` command omitted `--jsonArray`, so it imported zero documents. Fixed in the script docstring/help and verified by restoring the test backup.
3. **Prerender file count** — the build reported 47 files plus 404; it actually writes 56. Changed the counter to a set of unique written paths.
4. **Migration backup privacy** — backups are now created with `0700`/`0600` permissions, and `backend/backups/` is git-ignored.
5. **Migration scan accuracy** — the editorial-pattern scan now reviews the post-repair preview, so a repaired artefact is not falsely reported as remaining.
6. **Content corrections** — CPCT Rulebook V1.5, official RRB/SSC PDFs, CEN 06/2025 duration attribution, official SSC CGL 2026 notice and removal of unsupported claims.
7. **SEO regression coverage** — added a full internal-link graph check and the corrected file-count report.

## 11. Remaining defects and limitations

| Item | Impact | Status |
|---|---|---|
| Production frontend deployment | Deployed 16 Nov; 301 redirects, 33-URL sitemap, three robots groups and 14-article blog verified live | PASS |
| Production migration not run | Five duplicate records remain published in the production database | **REQUIRES OWNER ACTION — blocker** |
| Authenticated admin/backend flows untested | Login, registration, post creation/editing, moderation and contact delivery are unverified in production | **NOT TESTED — blocker for a production-readiness claim** |
| CMP and ad slots unconfigured | Ads are intentionally disabled; cannot validate live ad rendering or consent flow | **REQUIRES OWNER ACTION** |
| ACM DOI returns 403 to `curl` | Citation is browser-only; not a broken link | NOT TESTED (browser check recommended) |
| Reading-time labels are conservative | 6–9 minutes for 690–1,840 visible words; cosmetic, not a policy issue | Observation only |
| No `/api/health` endpoint | Not used by the frontend; not a functional defect | Observation only |

## 12. Owner actions before AdSense submission

Steps 1–3 were completed on 16 November 2026 and verified live. Complete steps 4–9 in order. Do not submit for review before step 9, and not before steps 4–7 are complete.

1. **Review and deploy the audit commit. ✅ Completed 16 Nov 2026.** Build with the production environment (`REACT_APP_BACKEND_URL=https://typinger.onrender.com` without a trailing slash or `/api`, plus the publisher ID), run `npm run build` and `npm run verify:seo` from `frontend/`, then deploy `frontend/build` and `frontend/worker.js` through the Cloudflare Workers pipeline configured in `frontend/wrangler.jsonc`. Purge the Cloudflare cache afterward.
2. **Verify the deployment before touching the database. ✅ Completed 16 Nov 2026:**
   ```bash
   for u in \
     /blog/touch-typing-guide-for-beginners/ \
     /blog/what-is-a-good-wpm-score/ \
     /blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide/ \
     /blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections/ \
     /blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description/ \
     /blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide/; do
     curl -sS -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://typinger.in$u"
   done
   ```
   Expect six `301` responses with the canonical locations listed in section 3.3.
3. **Verify crawlability live. ✅ Completed 16 Nov 2026:** `https://typinger.in/robots.txt` shows all three crawler groups and the sitemap line; `https://typinger.in/sitemap.xml` contains exactly 33 canonical URLs and no retired slug.
4. **Run the production migration dry run** using `backend/.env`; review the five retirements and any repairs; confirm the backup directory is private.
5. **Apply the migration with explicit approval**, then rerun the dry run and expect `retired=0 repaired=0`. Keep the backup until the site has been observed for at least one indexing cycle.
6. **Exercise authenticated and backend workflows** with owner-approved test accounts: login, registration, admin post create/edit/publish, moderation, audit log, contact form delivery, password/account flows and API error handling.
7. **Configure AdSense operationally:** complete Google’s consent message or a Google-certified CMP, create real ad units, set `REACT_APP_ADSENSE_ENABLED=true` only when ready, set `REACT_APP_CMP_PROVIDER` and the numeric slot IDs, rebuild and redeploy. Keep Auto ads off until placements have been reviewed.
8. **Check Search Console:** submit the 33-URL sitemap, request validation of the retired-URL fixes, and monitor 404/soft-404 and canonical reports after Google recrawls.
9. **Re-run this audit against the deployed site.** Only then should the site be described as production-verified or submitted to AdSense.

## 13. Final recommendation

**Do not submit for AdSense review yet.**

The repository remediation is internally coherent and locally verified: content, redirects, sitemap, robots, canonicals, internal links, interactive tools and the migration script all pass. The audit also found and fixed two genuine defects that would otherwise have shipped (the code-practice key capture and the broken rollback command).

The frontend is now deployed, and the live redirect, sitemap, robots and article checks pass. The production database still has the five duplicate records, and the authenticated/consent paths are unverified. Those are remaining owner actions, not reasons to rewrite the content again. Once sections 12.4–12.9 are complete, the site can be re-audited with a realistic expectation of readiness.
