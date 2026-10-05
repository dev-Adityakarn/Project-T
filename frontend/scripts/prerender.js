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
const SITE_URL = (env.REACT_APP_SITE_URL || "").replace(/\/$/, "");
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

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (p) => `${SITE_URL}${p === "/" ? "" : p}`;

const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

const organization = () => ({
  "@context": "https://schema.org", "@type": "Organization", name: SITE.name, legalName: SITE.legalName,
  url: `${SITE_URL}/`, logo: `${SITE_URL}${SITE.logo}`, email: SITE.email, foundingDate: SITE.founded, sameAs: SITE.sameAs,
});
const website = () => ({
  "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: `${SITE_URL}/`,
  description: SITE.description, inLanguage: "en",
  publisher: { "@type": "Organization", name: SITE.name, url: `${SITE_URL}/` },
});
const webApp = (page) => ({
  "@context": "https://schema.org", "@type": "WebApplication", name: page.title, url: abs(page.path),
  description: page.description, applicationCategory: "EducationalApplication", operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a physical keyboard",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE.name, url: `${SITE_URL}/` },
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
  publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE_URL}${SITE.logo}` } },
  image: `${SITE_URL}${SITE.ogImage}`, mainEntityOfPage: { "@type": "WebPage", "@id": abs(`/blog/${post.slug}`) }, inLanguage: "en",
});

const blocksHtml = (blocks = []) => blocks.map((b) => {
  const out = [];
  if (b.h2) out.push(`<h2>${esc(b.h2)}</h2>`);
  (b.p || []).forEach((p) => out.push(`<p>${esc(p)}</p>`));
  if (b.ul) out.push(`<ul>${b.ul.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`);
  if (b.steps) out.push(b.steps.map((s) => `<h3>${esc(s.h3)}</h3><p>${esc(s.p)}</p>`).join(""));
  return `<section>${out.join("")}</section>`;
}).join("");

const faqHtml = (faqs = []) => (faqs.length
  ? `<section><h2>Frequently asked questions</h2><dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}</dl></section>`
  : "");

const linksHtml = (links = [], heading = "Keep practising") => (links.length
  ? `<nav aria-label="${esc(heading)}"><h2>${esc(heading)}</h2><ul>${links.map((l) => `<li><a href="${esc(l.to)}">${esc(l.label)}</a></li>`).join("")}</ul></nav>`
  : "");

const crumbHtml = (crumbs = []) => (crumbs.length
  ? `<nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li>${crumbs.map((c) => `<li>${c.path ? `<a href="${esc(c.path)}">${esc(c.name)}</a>` : esc(c.name)}</li>`).join("")}</ol></nav>`
  : "");

const FOOTER = `<footer><h2>KeyQuest typing tests</h2><ul>${
  JSON.parse(fs.readFileSync(path.join(SEO, "routes.json"), "utf8"))
    .filter((r) => r.nav)
    .map((r) => `<li><a href="${esc(r.path)}">${esc(r.nav)}</a></li>`).join("")
}</ul></footer>`;

const head = ({ path: p, title, description, lang = "en", type = "website", noindex = false, schemas = [], alternates = [] }) => [
  `<title>${esc(title)}</title>`,
  `<meta name="description" content="${esc(description)}"/>`,
  `<meta name="robots" content="${noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"}"/>`,
  `<link rel="canonical" href="${abs(p)}"/>`,
  `<meta property="og:title" content="${esc(title)}"/>`,
  `<meta property="og:description" content="${esc(description)}"/>`,
  `<meta property="og:type" content="${type}"/>`,
  `<meta property="og:url" content="${abs(p)}"/>`,
  `<meta property="og:image" content="${SITE_URL}${SITE.ogImage}"/>`,
  `<meta property="og:image:width" content="1200"/>`,
  `<meta property="og:image:height" content="630"/>`,
  `<meta property="og:site_name" content="${esc(SITE.name)}"/>`,
  `<meta property="og:locale" content="${lang === "hi" ? "hi_IN" : SITE.locale}"/>`,
  `<meta name="twitter:card" content="summary_large_image"/>`,
  `<meta name="twitter:title" content="${esc(title)}"/>`,
  `<meta name="twitter:description" content="${esc(description)}"/>`,
  `<meta name="twitter:image" content="${SITE_URL}${SITE.ogImage}"/>`,
  `<meta name="twitter:site" content="${esc(SITE.twitter)}"/>`,
  GSC ? `<meta name="google-site-verification" content="${esc(GSC)}"/>` : "",
  ...alternates.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${abs(a.path)}"/>`),
  ...schemas.map(ld),
].filter(Boolean).join("\n");

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

const write = (route, headHtml, bodyHtml, lang = "en") => {
  const template = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta name="description"[^>]*>/, "")
    .replace(/<link rel="canonical"[^>]*>/, "")
    .replace("</head>", `${headHtml}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  if (lang !== "en") html = html.replace('<html lang="en">', `<html lang="${lang}">`);

  const target = route === "/404" ? path.join(BUILD, "404.html") : path.join(BUILD, route === "/" ? "index.html" : `${route.slice(1)}/index.html`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
};

if (!fs.existsSync(path.join(BUILD, "index.html"))) {
  console.error("prerender: build/index.html missing — run the build first");
  process.exit(1);
}
if (!SITE_URL) {
  console.error("prerender: REACT_APP_SITE_URL is required");
  process.exit(1);
}

let count = 0;

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

// typing lessons page (own React page, same content model)
const lessonsPage = PAGES.find((p) => p.path === "/typing-lessons");
if (!lessonsPage) {
  const lp = readJson("pages.practice.json").find((p) => p.path === "/typing-lessons");
  if (lp) {
    const body = `<main>${crumbHtml(lp.breadcrumbs)}<h1>${esc(lp.h1)}</h1><p>${esc(lp.lead)}</p><ol>${LESSONS.map((l) => `<li><h2>Lesson ${l.id}: ${esc(l.title)}</h2><p>${esc(l.goal)} — keys ${esc(l.keys)}</p></li>`).join("")}</ol>${blocksHtml(lp.blocks)}${faqHtml(lp.faqs)}${linksHtml(lp.related)}</main>${FOOTER}`;
    write(lp.path, head({ path: lp.path, title: lp.title, description: lp.description, schemas: [organization(), website(), webApp(lp), faqPage(lp.faqs), breadcrumbs(lp.breadcrumbs)] }), body);
    count += 1;
  }
}

POSTS.forEach((post) => {
  const crumbs = [{ name: "Blog", path: "/blog" }, { name: post.title }];
  const schemas = [organization(), website(), article(post), breadcrumbs(crumbs)];
  if (post.faqs && post.faqs.length) schemas.push(faqPage(post.faqs));
  const body = `<article>${crumbHtml(crumbs)}<h1>${esc(post.h1 || post.title)}</h1><p>${esc(post.excerpt)}</p>${blocksHtml(post.blocks)}${faqHtml(post.faqs)}${linksHtml(post.related)}</article>${FOOTER}`;
  write(`/blog/${post.slug}`, head({ path: `/blog/${post.slug}`, title: post.title, description: post.description, type: "article", schemas }), body);
  count += 1;
});

const blogIndex = PAGES.find((p) => p.path === "/blog");
if (blogIndex) {
  const body = `<main>${crumbHtml(blogIndex.breadcrumbs)}<h1>${esc(blogIndex.h1)}</h1><p>${esc(blogIndex.lead)}</p><ul>${
    POSTS.map((p) => `<li><h2><a href="/blog/${p.slug}">${esc(p.title)}</a></h2><p>${esc(p.excerpt)}</p></li>`).join("")
  }</ul>${blocksHtml(blogIndex.blocks)}${linksHtml(blogIndex.related)}</main>${FOOTER}`;
  write("/blog", head({ path: "/blog", title: blogIndex.title, description: blogIndex.description, schemas: [organization(), website(), breadcrumbs(blogIndex.breadcrumbs)] }), body);
}

write("/404", head({
  path: "/404", title: "Page not found (404) — KeyQuest typing tests",
  description: "That page does not exist. Jump back to the typing speed test, the practice drills, the touch typing lessons or the arcade.",
  noindex: true, schemas: [organization(), website()],
}), `<main><h1>Page not found</h1><p>The link is broken or the page has moved.</p>${linksHtml([
  { to: "/typing-test", label: "Typing speed test" },
  { to: "/typing-practice", label: "Typing practice" },
  { to: "/typing-lessons", label: "Touch typing lessons" },
  { to: "/games", label: "Typing games" },
], "Popular pages")}</main>${FOOTER}`);

console.log(`prerender: wrote ${count + 2} static HTML files (plus 404.html) into build/`);
