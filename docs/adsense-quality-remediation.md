# AdSense “Low value content” remediation

Date: 12 November 2026  
Branch: `adsense-quality-remediation`  
Scope: public content, indexable routes, trust pages, navigation, test engines, publishing safeguards, tests and deployment notes.

## 1. Why this work was needed

The AdSense review reported **Low value content**. The site had four related problems:

1. Several near-duplicate articles competed for the same search intent.
2. Some pages were extremely short, including a one-minute SSC CGL DEST stub.
3. A few drafts still contained editorial instructions, prompt residue or references to publishing strategy in public copy.
4. Tool and exam pages repeated the same WPM formula and did not consistently show where a claim came from.

This release fixes the content and the publishing process that produced it. It does not claim that AdSense approval is guaranteed, and it does not invent traffic, reviews, cut-offs or credentials.

## 2. Result summary

- Blog collection reduced from **15 to 14** posts by merging five thin/duplicate pairs into five canonical articles.
- No post has a **1-minute read time** or fewer than **500 words** of content.
- Six retired URLs now return **permanent 301 redirects** to the canonical article.
- All public article ledes render once, sources render once at the end of the article, and headings follow a consistent H2/H3 structure.
- Lesson 1 and the beginner home-row drill now use only the keys introduced in lesson 1.
- Every core test route has its own original prose passage; the old repetitive 5-minute “word salad” is gone.
- Tool pages have page-specific reference tables instead of repeated formula blocks.
- A browser-only custom code practice mode and an exam net-speed study calculator were added.
- Typing Tests, Lessons and Blog are now in the single primary navigation; the duplicate mobile navigation was removed.
- Admin post editing warns about duplicate slugs, missing metadata, leaked editorial text and short drafts.
- `robots.txt` has dedicated `Googlebot` and `Mediapartners-Google` groups.
- A dry-run-first MongoDB migration retires the five live database duplicates with an automatic JSON backup.

## 3. Article consolidation map

| Retired / duplicate URL | Canonical destination |
| --- | --- |
| `/blog/touch-typing-guide-for-beginners/` | `/blog/touch-typing-for-beginners/` |
| `/blog/what-is-a-good-wpm-score/` | `/blog/what-is-a-good-typing-speed/` |
| `/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide/` | `/blog/ssc-chsl-typing-test-2026/` |
| `/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections/` | `/blog/ssc-chsl-typing-test-2026/` |
| `/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description/` | `/blog/how-to-increase-typing-speed/` |
| `/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide/` | `/blog/english-typing-test-1-5-10-minute/` |

Unique material was merged before redirecting; the old pages were not simply thrown away.

The SSC CGL DEST article is now a full guide on the canonical URL:

`/blog/ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan/`

It explains what the DEST counts, how key depressions relate to WPM, who takes it, how to practise for 15 minutes and what the notice does and does not say.

## 4. Content and editorial fixes

- Removed editorial/prompt residue such as “Do not present the historical…”, “This is where a site like Typinger…” and “META DESCRIPTION” from public copy.
- Rewrote article excerpts so the header lead is not repeated as the first paragraph.
- Consolidated each article’s sources into one list at the bottom.
- Connected the five canonical articles with internal links and removed links to retired slugs.
- Added non-affiliation and independent-practice notes to SSC CHSL, SSC CGL, RRB NTPC, government-jobs and Hindi exam pages.
- Corrected the Hindi matra and conjunct instructions:
  - InScript/Unicode: consonant, then the i-matra key, even though the matra is displayed to its left.
  - Remington GAIL typewriter-style layouts: the visual order is used for the i-matra.
  - Added a comparison table for `कि`, `की`, `के`, `क्ष`, `त्र`, `ज्ञ` and `श्र`.
- Added published reference tables for SSC CHSL, SSC CGL DEST, MP CPCT and RRB NTPC. Each row says which notice or cycle it belongs to and reminds the reader to check their own notification.
- Added the support address `support@typinger.in`, configurable owner/author fields, Indian jurisdiction and the affiliation disclaimer in `frontend/src/seo/site.json`.
- Updated the contact form and footer to show the real support address.

## 5. Technical fixes

### Typing engine and lessons

- `frontend/src/lib/testText.js`
  - `HOME_ROW` contains only `a s d f j k l ;` and spaces.
  - `ROUTE_PASSAGES` gives distinct prose to home, typing-test, 1-minute, 3-minute, 5-minute, practice and exam routes.
  - The 5-minute passage is long, coherent prose rather than a repeated list of random words.
- `TypingTool.jsx` passes the route’s `config.passage` into `makeTestText`.
- `lessons.json` lesson IDs and titles are unchanged. Lesson texts 1–8 now use cumulative taught keys only. Lesson 1 and 2 were corrected after a key-scope test caught an out-of-scope `r`.
- `HomeRowDrill` shuffles only lesson-one keys.

### Rendering

- `SeoArticle.jsx`
  - Drops a first paragraph that duplicates the header lead.
  - Renders `h3` blocks.
  - Collects all block sources into one `Sources` section at the article bottom.
  - Registers the new custom-code and exam-calculator widgets.
- `prerender.js` applies the same lead dedupe and source consolidation to static HTML, strips the `noscript` banner, and includes static widget explanations for crawlers.
- `public/index.html` no longer contains the `noscript` “enable JavaScript” snippet.

### Navigation and components

- `Navbar.jsx` now renders one primary navigation list: Typing Tests, Lessons, Blog, Games, Daily, Leaderboard.
- The duplicate mobile `<nav>` and `mnav-*` test IDs are gone.
- `ArticleHeader.jsx` uses `SITE.author` by default, so owner/author data is configurable in one place.
- `ContactForm.jsx` shows the configured support email.
- `CustomCodePractice.jsx` lets a visitor paste a snippet and practise it entirely client-side. The snippet is held in component state and is not uploaded.
- `ExamNetSpeedCalculator.jsx` estimates a net speed from user-entered gross speed or character count, duration, full and half mistakes, per-mistake penalties and a target. It describes itself as a study tool, not an official scoring engine.

### Tool page content

- 1-minute, 3-minute and 5-minute tests have duration-specific reference tables instead of repeated WPM formulas.
- Practice, beginner and lesson pages have completion checkpoints instead of formula blocks.
- Number, punctuation, code and Hindi pages have page-specific reference tables.
- The government exam page has its own duration, a published-reference table, the net-speed calculator and source/disclaimer sections.

## 6. Indexing, redirects and sitemap

- `routes.json` no longer lists the two retired static slugs and now includes the CGL article.
- `appRoutes.js` and `public/_redirects` contain the permanent redirects in the table above.
- `generate-seo-files.js` excludes retired URLs defensively and writes:
  - a `User-agent: *` group;
  - a `Googlebot` group;
  - a `Mediapartners-Google` group;
  - the production sitemap reference.
- Sitemap output after this change: **33 canonical URLs**.
- Login, register, dashboard, admin, daily, leaderboard and individual game detail pages remain noindex/out of the sitemap.
- Public content pages remain indexable, and every sitemap page has one canonical, one title, one meta description and one H1.

## 7. Publishing safeguards

`PostEditor.jsx` shows non-blocking warnings before publishing when:

- the slug already belongs to a code-shipped article or another database post;
- excerpt, meta title, meta description or author is empty;
- public copy contains known editorial/prompt residue;
- the draft body is under 300 words.

The warnings use stable test IDs (`post-warning-duplicate-slug`, `post-warning-metadata`, `post-warning-editorial`, `post-warning-stub`) and do not prevent an intentional save.

## 8. Database migration

The live database could not be reached from this environment. The migration script is therefore provided but **has not been run against production**.

Script: `backend/scripts/migrate_adsense_content.py`

What it does:

- reads `MONGO_URL` and `DB_NAME` from `backend/.env`;
- defaults to a dry run;
- on `--apply`, writes a complete JSON backup of the `posts` collection to `backend/backups/` before the first write;
- sets the five duplicate records to `published: false` with `retired_at`, `retired_reason` and `retired_target`;
- never hard-deletes a post;
- repairs known exact artefacts (`META DESCRIPTION`, the old citation bracket) and retired internal links;
- reports any remaining editorial pattern for human review;
- is idempotent: a second run reports zero changes.

Commands:

```bash
cd backend
./venv/bin/python scripts/migrate_adsense_content.py            # preview
./venv/bin/python scripts/migrate_adsense_content.py --apply    # backup + write
```

After applying, run it once more to confirm `retired=0 repaired=0`.

The CGL database record is retired even though the public URL stays the same, because the static CGL article is now the canonical source of that page.

## 9. Verification performed

```bash
cd frontend
CI=true npm test -- --watchAll=false --runInBand
npm run build
npm run verify:seo
```

Results:

- Jest: **18 suites, 129 tests passed**.
- Production build: compiled successfully, **56 prerendered HTML files**: 33 indexable sitemap pages, 22 intentionally `noindex` app/utility pages, and `404.html`.
- SEO regression: **33 sitemap URLs**, all checks passed.
- Python migration script compiles (`python3 -m py_compile`); it requires the backend virtualenv for `pymongo`/`bson` at runtime.

New regression coverage includes:

- retired slugs absent from content, routes and sitemap;
- permanent redirects present in both the Worker map and `_redirects`;
- one source list per article and lead de-duplication;
- no leaked editorial residue;
- minimum reading time and word count;
- lesson key scope for lessons 1–8;
- distinct route passages;
- single primary navigation;
- admin publishing warnings;
- custom code practice and exam calculator widgets;
- robots groups and noscript removal.

## 10. Deployment checklist

1. Review the branch diff.
2. Run the frontend tests, build and SEO verification above.
3. Deploy the frontend build so the new prerendered files replace the retired ones.
4. Run the database migration dry run, then `--apply`, then dry run again.
5. Confirm redirects on the live site for the six retired URLs.
6. Check `https://typinger.in/robots.txt` and `https://typinger.in/sitemap.xml`.
7. In Google Search Console, request validation of the fixes. Do not expect a causal traffic change from this release alone; the previous sample was small.
8. Submit for AdSense review after the deployed site has been crawled and the retired URLs resolve correctly.

## 11. Honest limitations

- AdSense approval is not guaranteed by this remediation.
- No production database write was performed here.
- No fabricated testimonials, reviews, exam cut-offs, official affiliations or user counts were added.
- Exam figures are attributed to named notices and cycles. Where a rule varies by post, the copy says so.
- The exam calculator is a study aid. It does not reproduce SSC, RRB or CPCT software, rounding or qualification rules.
- Search performance attribution needs a post-deployment observation window in Search Console.
