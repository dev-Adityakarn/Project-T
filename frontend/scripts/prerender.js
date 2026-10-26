/* Post-build prerender: writes static HTML (head tags + readable content) for every
   public marketing route so crawlers receive the full page in the first response. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUILD = path.join(ROOT, "build");
const SEO = path.join(ROOT, "src/seo");

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(SEO, f), "utf8"));
const readEnv = () => {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  return fs.readFileSync(file, "utf8").split("\n").reduce((acc, line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) acc[m[1]] = m[2].trim();
    return acc;
  }, {});
};

const env = { ...readEnv(), ...process.env };
const PRODUCTION_ORIGIN = "https://typinger.in";
const SITE_URL = PRODUCTION_ORIGIN;
const GSC = env.REACT_APP_GSC_VERIFICATION || "";

const SITE = readJson("site.json");
const PAGES = [
  ...readJson("pages.tests.json"),
  ...readJson("pages.practice.json"),
  ...readJson("pages.special.json"),
  ...readJson("pages.static.json"),
];
const POSTS = readJson("blog.json");
const LESSONS = readJson("lessons.json");
const GAMES = readJson("games.json");

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (p) => {
  if (!p || p === "/") return `${PRODUCTION_ORIGIN}/`;
  const clean = String(p).split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  return `${PRODUCTION_ORIGIN}/${clean}/`;
};

const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const organization = () => ({
  "@context": "https://schema.org", "@type": "Organization", name: SITE.name, legalName: SITE.legalName,
  url: `${PRODUCTION_ORIGIN}/`, logo: `${PRODUCTION_ORIGIN}${SITE.logo}`,
  ...(SITE.email ? { email: SITE.email } : {}),
  ...(SITE.founded ? { foundingDate: SITE.founded } : {}),
  ...(SITE.sameAs?.length ? { sameAs: SITE.sameAs } : {}),
});
const website = () => ({
  "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: `${PRODUCTION_ORIGIN}/`,
  description: SITE.description, inLanguage: "en",
  publisher: { "@type": "Organization", name: SITE.name, url: `${PRODUCTION_ORIGIN}/` },
});
const webApp = (page) => ({
  "@context": "https://schema.org", "@type": "WebApplication", name: page.title, url: abs(page.path),
  description: page.description, applicationCategory: "EducationalApplication", operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a physical keyboard",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE.name, url: `${PRODUCTION_ORIGIN}/` },
});
const faqPage = (faqs) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
const breadcrumbs = (crumbs) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((c, i) => ({
    "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path || "/"),
  })),
});
const article = (post) => ({
  "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.description,
  datePublished: post.datePublished, dateModified: post.dateModified || post.datePublished,
  author: { "@type": "Organization", name: post.author || SITE.name },
  publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${PRODUCTION_ORIGIN}${SITE.logo}` } },
  image: `${PRODUCTION_ORIGIN}${SITE.ogImage}`, mainEntityOfPage: { "@type": "WebPage", "@id": abs(`/blog/${post.slug}`) }, inLanguage: "en",
});

const blocksHtml = (blocks = []) => blocks.map((b) => {
  const out = [];
  if (b.h2) out.push(`<h2>${esc(b.h2)}</h2>`);
  (b.p || []).forEach((p) => out.push(`<p>${esc(p)}</p>`));
  if (b.ul) out.push(`<ul>${b.ul.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`);
  if (b.steps) out.push(b.steps.map((s) => `<h3>${esc(s.h3)}</h3><p>${esc(s.p)}</p>`).join(""));
  if (b.sources && b.sources.length) {
    out.push(`<section><h3>Sources</h3><ul>${b.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join("")}</ul></section>`);
  }
  return `<section>${out.join("")}</section>`;
}).join("");

const faqHtml = (faqs = []) => (faqs.length
  ? `<section><h2>Frequently asked questions</h2><dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl></section>`
  : "");

const linksHtml = (links = [], heading = "Keep practising") => (links.length
  ? `<nav aria-label="${esc(heading)}"><h2>${esc(heading)}</h2><ul>${links.map((l) => {
      const cleanTo = l.to === "/" ? "/" : `/${l.to.replace(/^\/+/, "").replace(/\/+$/, "")}/`;
      return `<li><a href="${esc(cleanTo)}">${esc(l.label)}</a></li>`;
    }).join("")}</ul></nav>`
  : "");

const crumbHtml = (crumbs = []) => (crumbs.length
  ? `<nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li>${crumbs.map((c) => {
      const cleanPath = c.path ? (c.path === "/" ? "/" : `/${c.path.replace(/^\/+/, "").replace(/\/+$/, "")}/`) : "";
      return `<li>${cleanPath ? `<a href="${esc(cleanPath)}">${esc(c.name)}</a>` : esc(c.name)}</li>`;
    }).join("")}</ol></nav>`
  : "");

const FOOTER = `<footer><h2>Typinger typing tests</h2><ul>${
  JSON.parse(fs.readFileSync(path.join(SEO, "routes.json"), "utf8"))
    .filter((r) => r.nav)
    .map((r) => {
      const clean = r.path === "/" ? "/" : `/${r.path.replace(/^\/+/, "").replace(/\/+$/, "")}/`;
      return `<li><a href="${esc(clean)}">${esc(r.nav)}</a></li>`;
    }).join("")
}</ul></footer>`;

const head = ({ path: p, title, description, lang = "en", type = "website", noindex = false, schemas = [], alternates = [] }) => {
  let robotsContent = "index,follow,max-image-preview:large";
  if (noindex === true) {
    robotsContent = "noindex,follow";
  } else if (typeof noindex === "string") {
    robotsContent = noindex;
  }
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}"/>`,
    `<meta name="robots" content="${robotsContent}"/>`,
    `<link rel="canonical" href="${abs(p)}"/>`,
    `<meta property="og:title" content="${esc(title)}"/>`,
    `<meta property="og:description" content="${esc(description)}"/>`,
    `<meta property="og:type" content="${type}"/>`,
    `<meta property="og:url" content="${abs(p)}"/>`,
    `<meta property="og:image" content="${PRODUCTION_ORIGIN}${SITE.ogImage}"/>`,
    `<meta property="og:image:width" content="1200"/>`,
    `<meta property="og:image:height" content="630"/>`,
    `<meta property="og:site_name" content="${esc(SITE.name)}"/>`,
    `<meta property="og:locale" content="${lang === "hi" ? "hi_IN" : SITE.locale}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${esc(title)}"/>`,
    `<meta name="twitter:description" content="${esc(description)}"/>`,
    `<meta name="twitter:image" content="${PRODUCTION_ORIGIN}${SITE.ogImage}"/>`,
    SITE.twitter ? `<meta name="twitter:site" content="${esc(SITE.twitter)}"/>` : "",
    GSC ? `<meta name="google-site-verification" content="${esc(GSC)}"/>` : "",
    ...alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${abs(a.path)}"/>`),
    ...schemas.map(ld),
  ].filter(Boolean).join("\n");
};

const ALTERNATES = {
  "/hindi-typing-test": [
    { hreflang: "en", path: "/typing-test/5-minute" },
    { hreflang: "hi", path: "/hindi-typing-test" },
    { hreflang: "x-default", path: "/typing-test/5-minute" },
  ],
  "/typing-test/5-minute": [
    { hreflang: "en", path: "/typing-test/5-minute" },
    { hreflang: "hi", path: "/hindi-typing-test" },
    { hreflang: "x-default", path: "/typing-test/5-minute" },
  ],
};

if (!fs.existsSync(path.join(BUILD, "index.html"))) {
  console.error("prerender: build/index.html missing — run the build first");
  process.exit(1);
}

// Read pristine SPA template once before any writes overwrite build/index.html
const SPA_TEMPLATE = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");

const write = (route, headHtml, bodyHtml, lang = "en") => {
  let html = SPA_TEMPLATE
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="robots"[^>]*>/gi, "")
    .replace("</head>", `${headHtml}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  if (lang !== "en") html = html.replace('<html lang="en">', `<html lang="${lang}">`);

  const clean = route === "/" ? "" : route.replace(/^\/+/, "").replace(/\/+$/, "");
  const target = route === "/404" ? path.join(BUILD, "404.html") : path.join(BUILD, clean === "" ? "index.html" : `${clean}/index.html`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
};

let count = 0;

// Marketing content pages
PAGES.forEach((page) => {
  const schemas = [organization(), website()];
  if (page.tool) schemas.push(webApp(page));
  if (page.faqs && page.faqs.length) schemas.push(faqPage(page.faqs));
  if (page.breadcrumbs && page.breadcrumbs.length) schemas.push(breadcrumbs(page.breadcrumbs));
  const body = `<main>${crumbHtml(page.breadcrumbs)}<h1>${esc(page.h1)}</h1><p>${esc(page.lead)}</p>${blocksHtml(page.blocks)}${faqHtml(page.faqs)}${linksHtml(page.related)}</main>${FOOTER}`;
  write(page.path, head({
    path: page.path, title: page.title, description: page.description, lang: page.lang || "en",
    schemas, alternates: ALTERNATES[page.path] || [],
  }), body, page.lang || "en");
  count += 1;
});

// Typing lessons page
const lessonsPage = PAGES.find((p) => p.path === "/typing-lessons");
if (!lessonsPage) {
  const lp = readJson("pages.practice.json").find((p) => p.path === "/typing-lessons");
  if (lp) {
    const body = `<main>${crumbHtml(lp.breadcrumbs)}<h1>${esc(lp.h1)}</h1><p>${esc(lp.lead)}</p><ol>${LESSONS.map((l) => `<li><h2>Lesson ${l.id}: ${esc(l.title)}</h2><p>${esc(l.goal)} — keys ${esc(l.keys)}</p></li>`).join("")}</ol>${blocksHtml(lp.blocks)}${faqHtml(lp.faqs)}${linksHtml(lp.related)}</main>${FOOTER}`;
    write(lp.path, head({ path: lp.path, title: lp.title, description: lp.description, schemas: [organization(), website(), webApp(lp), faqPage(lp.faqs), breadcrumbs(lp.breadcrumbs)] }), body);
    count += 1;
  }
}

// Blog articles
POSTS.forEach((post) => {
  const crumbs = [{ name: "Blog", path: "/blog/" }, { name: post.title }];
  const schemas = [organization(), website(), article(post), breadcrumbs(crumbs)];
  if (post.faqs && post.faqs.length) schemas.push(faqPage(post.faqs));
  const updated = post.dateModified && post.dateModified !== post.datePublished
    ? `<p><small>Updated ${esc(post.dateModified)}</small></p>`
    : "";
  const body = `<article>${crumbHtml(crumbs)}<h1>${esc(post.h1 || post.title)}</h1><p>${esc(post.excerpt)}</p>${updated}${blocksHtml(post.blocks)}${faqHtml(post.faqs)}${linksHtml(post.related)}</article>${FOOTER}`;
  write(`/blog/${post.slug}/`, head({ path: `/blog/${post.slug}/`, title: post.title, description: post.description, type: "article", schemas }), body);
  count += 1;
});

// Blog index
const blogIndex = PAGES.find((p) => p.path === "/blog");
if (blogIndex) {
  const body = `<main>${crumbHtml(blogIndex.breadcrumbs)}<h1>${esc(blogIndex.h1)}</h1><p>${esc(blogIndex.lead)}</p><ul>${
    POSTS.map((p) => `<li><h2><a href="/blog/${p.slug}/">${esc(p.title)}</a></h2><p>${esc(p.excerpt)}</p></li>`).join("")
  }</ul>${blocksHtml(blogIndex.blocks)}${linksHtml(blogIndex.related)}</main>${FOOTER}`;
  write("/blog/", head({ path: "/blog/", title: blogIndex.title, description: blogIndex.description, schemas: [organization(), website(), breadcrumbs(blogIndex.breadcrumbs)] }), body);
  count += 1;
}

// Games index
const gamesIndexCrumbs = [{ name: "Typing games" }];
const gamesIndexBody = `<main>${crumbHtml(gamesIndexCrumbs)}<h1>Typing Games: 10 Free Games to Build Typing Speed</h1><p>Play ten free typing games, from a classic speed test to zombie defence and space shooting. Three difficulty levels and global leaderboards.</p><section><h2>Available Typing Games</h2><ul>${GAMES.map((g) => `<li><h3><a href="/games/${g.id}/">${esc(g.title)}</a></h3><p>${esc(g.description)}</p></li>`).join("")}</ul></section></main>${FOOTER}`;
write("/games/", head({
  path: "/games/",
  title: "Typing Games: 10 Free Games to Build Typing Speed",
  description: "Play ten free typing games, from a classic speed test to zombie defence and space shooting. Three difficulty levels and global leaderboards.",
  schemas: [organization(), website(), breadcrumbs(gamesIndexCrumbs)],
}), gamesIndexBody);
count += 1;

// Individual game pages
GAMES.forEach((game) => {
  const gamePath = `/games/${game.id}/`;
  const gameCrumbs = [{ name: "Typing games", path: "/games/" }, { name: game.title }];
  const gameTitle = `${game.title} — Free Typing Game to Practise ${game.category === "Arcade" ? "Speed" : "Accuracy"}`.slice(0, 60);
  const gameDesc = `${game.description} Play free on Typinger in easy, medium or hard mode and climb the leaderboard.`.slice(0, 155);
  const gamePage = { path: gamePath, title: gameTitle, description: gameDesc };
  const howToHtml = (game.howTo || []).map((h) => `<li>${esc(h)}</li>`).join("");
  const gameBody = `<main>${crumbHtml(gameCrumbs)}<h1>${esc(game.title)}</h1><p>${esc(game.description)}</p><section><h2>How to play</h2><ol>${howToHtml}</ol></section><p><a href="/games/">Back to all games</a></p></main>${FOOTER}`;

  write(gamePath, head({
    path: gamePath,
    title: gameTitle,
    description: gameDesc,
    noindex: "noindex,follow",
    schemas: [organization(), website(), webApp(gamePage), breadcrumbs(gameCrumbs)],
  }), gameBody);
  count += 1;
});

// Daily challenge page
const dailyCrumbs = [{ name: "Daily challenge" }];
const dailyBody = `<main>${crumbHtml(dailyCrumbs)}<h1>Daily Typing Challenge: One Game, Everyone, Each Day</h1><p>Every day Typinger picks one game, one difficulty and one shared word seed. Compete against every other player on exactly the same challenge.</p><p><a href="/games/">Explore all games</a></p></main>${FOOTER}`;
write("/daily/", head({
  path: "/daily/",
  title: "Daily Typing Challenge: One Game, Everyone, Each Day",
  description: "Every day Typinger picks one game, one difficulty and one shared word seed. Compete against every other player on exactly the same challenge.",
  noindex: "noindex,follow",
  schemas: [organization(), website(), breadcrumbs(dailyCrumbs)],
}), dailyBody);
count += 1;

// Leaderboard page
const leaderboardCrumbs = [{ name: "Leaderboard" }];
const leaderboardBody = `<main>${crumbHtml(leaderboardCrumbs)}<h1>Typing Leaderboard: Fastest Typists by Game and Level</h1><p>See the fastest Typinger typists for every game and difficulty level, with WPM, accuracy and best scores updated as results come in.</p><p><a href="/games/">Play games to join leaderboard</a></p></main>${FOOTER}`;
write("/leaderboard/", head({
  path: "/leaderboard/",
  title: "Typing Leaderboard: Fastest Typists by Game and Level",
  description: "See the fastest Typinger typists for every game and difficulty level, with WPM, accuracy and best scores updated as results come in.",
  noindex: "noindex,follow",
  schemas: [organization(), website(), breadcrumbs(leaderboardCrumbs)],
}), leaderboardBody);
count += 1;

// Private app routes (unindexed app shells so direct refresh works cleanly in static hosting)
const appRoutes = [
  { path: "/login/", title: "Sign In to Typinger", description: "Sign in to save your typing progress.", noindex: "noindex,follow" },
  { path: "/register/", title: "Create a Free Typinger Account", description: "Create an account to save typing stats and join leaderboards.", noindex: "noindex,follow" },
  { path: "/dashboard/", title: "Your Typing Dashboard", description: "Track your typing progress and badges.", noindex: "noindex,follow" },
  { path: "/admin/", title: "Typinger Admin", description: "Restricted administration area for Typinger content and leaderboard moderation.", noindex: "noindex,nofollow" },
  { path: "/admin/login/", title: "Typinger Admin Sign In", description: "Restricted administration area for Typinger staff.", noindex: "noindex,nofollow" },
  { path: "/admin/content/", title: "Content Management — Typinger Admin", description: "Manage typing passages and blog posts.", noindex: "noindex,nofollow" },
  { path: "/admin/users/", title: "User Management — Typinger Admin", description: "Manage Typinger user accounts.", noindex: "noindex,nofollow" },
  { path: "/admin/moderation/", title: "Moderation — Typinger Admin", description: "Review flagged results and moderation records.", noindex: "noindex,nofollow" },
  { path: "/admin/audit-logs/", title: "Audit Logs — Typinger Admin", description: "Review administrator audit records.", noindex: "noindex,nofollow" },
  { path: "/admin/admins/", title: "Administrators — Typinger Admin", description: "Manage administrator access.", noindex: "noindex,nofollow" },
];
appRoutes.forEach((ar) => {
  write(ar.path, head({ path: ar.path, title: ar.title, description: ar.description, noindex: ar.noindex }), "");
});

// 404 page
write("/404", head({
  path: "/404", title: "Page not found (404) — Typinger typing tests",
  description: "That page does not exist. Jump back to the typing speed test, the practice drills, the touch typing lessons or the arcade.",
  noindex: "noindex,nofollow", schemas: [organization(), website()],
}), `<main><h1>Page not found</h1><p>The link is broken or the page has moved.</p>${linksHtml([
  { to: "/typing-test/", label: "Typing speed test" },
  { to: "/typing-practice/", label: "Typing practice" },
  { to: "/typing-lessons/", label: "Touch typing lessons" },
  { to: "/games/", label: "Typing games" },
], "Popular pages")}</main>${FOOTER}`);

console.log(`prerender: wrote ${count + 1} static HTML files (plus 404.html) into build/`);
