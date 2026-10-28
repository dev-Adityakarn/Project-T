/* Post-build SEO regression suite.
 *
 * Run after `npm run build`:
 *   node scripts/test-seo-regression.js
 *
 * Every assertion is derived from the same JSON used by the prerenderer, so
 * adding a route or article automatically extends the checks.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUILD = path.join(ROOT, "build");
const SEO = path.join(ROOT, "src/seo");
const SITE_URL = "https://typinger.in";

const read = (file) => fs.readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(read(path.join(SEO, file)));

const routes = readJson("routes.json");
const posts = readJson("blog.json");
const pages = [
  ...readJson("pages.tests.json"),
  ...readJson("pages.practice.json"),
  ...readJson("pages.special.json"),
  ...readJson("pages.static.json"),
];

const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const assert = (condition, message) => {
  if (condition) pass(message);
  else {
    console.error(`FAIL ${message}`);
    failures.push(message);
  }
};

const countMatches = (text, regex) => (text.match(regex) || []).length;
const firstMatch = (text, regex) => {
  const match = text.match(regex);
  return match ? match[1] : null;
};
const normalizePath = (value = "/") => {
  const clean = String(value).split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `/${clean}` : "/";
};
const canonicalPath = (value = "/") => {
  const clean = normalizePath(value);
  return clean === "/" ? "/" : `${clean}/`;
};
const buildFileForPath = (pathname) => {
  const clean = normalizePath(pathname);
  return clean === "/"
    ? path.join(BUILD, "index.html")
    : path.join(BUILD, clean.replace(/^\//, ""), "index.html");
};
const pageForPath = (pathname) => {
  const clean = normalizePath(pathname);
  return pages.find((page) => normalizePath(page.path) === clean);
};
const postForPath = (pathname) => {
  const clean = normalizePath(pathname);
  return posts.find((post) => clean === `/blog/${post.slug}`);
};

const parseJsonLd = (html) => {
  const scripts = [];
  const regex = /<script type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    scripts.push({
      attrs: match[1],
      raw: match[2],
      data: JSON.parse(match[2]),
    });
  }
  return scripts;
};

const keyOf = (script) => firstMatch(script.attrs, /data-seo-key="([^"]+)"/);
const scopeOf = (script) => firstMatch(script.attrs, /data-seo-scope="([^"]+)"/);
const pathOf = (script) => firstMatch(script.attrs, /data-seo-path="([^"]+)"/);

const breadcrumbOf = (scripts) =>
  scripts.find((script) => script.data["@type"] === "BreadcrumbList");

const assertBreadcrumb = (html, canonical, label) => {
  const breadcrumb = breadcrumbOf(parseJsonLd(html));
  if (!breadcrumb) return;
  const items = breadcrumb.data.itemListElement || [];
  const finalItem = items[items.length - 1] || {};
  if (Object.prototype.hasOwnProperty.call(finalItem, "item")) {
    assert(finalItem.item === canonical, `${label}: final breadcrumb item is the canonical URL`);
    assert(
      normalizePath(finalItem.item.replace(SITE_URL, "")) !== "/" || canonical === `${SITE_URL}/`,
      `${label}: final breadcrumb does not fall back to the homepage`,
    );
  } else {
    assert(true, `${label}: final breadcrumb omits item (allowed)`);
  }
};

console.log("\n--- Sitemap and robots ---");
const sitemapPath = path.join(BUILD, "sitemap.xml");
assert(fs.existsSync(sitemapPath), "build/sitemap.xml exists");
const sitemap = read(sitemapPath);
assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "sitemap has an XML declaration");
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "sitemap has the sitemap namespace");
assert(!sitemap.includes("preview.emergentagent.com"), "sitemap has no preview domain");
assert(!sitemap.includes("localhost"), "sitemap has no localhost URLs");
assert(!sitemap.includes("/admin"), "sitemap excludes /admin");
assert(!sitemap.includes("/login"), "sitemap excludes /login");
assert(!sitemap.includes("/register"), "sitemap excludes /register");
assert(!sitemap.includes("/dashboard"), "sitemap excludes /dashboard");
assert(!sitemap.includes("/daily"), "sitemap excludes thin /daily");
assert(!sitemap.includes("/leaderboard"), "sitemap excludes thin /leaderboard");
assert(!sitemap.includes("/games/speed-test"), "sitemap excludes noindex game detail pages");

const sitemapLocations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
const expectedSitemapRoutes = routes.filter((route) => route.sitemap !== false && !route.noindex);
assert(
  sitemapLocations.length === expectedSitemapRoutes.length,
  `sitemap has exactly ${expectedSitemapRoutes.length} canonical URLs (found ${sitemapLocations.length})`,
);
assert(new Set(sitemapLocations).size === sitemapLocations.length, "sitemap URLs are unique");
sitemapLocations.forEach((loc) => {
  assert(loc.startsWith(`${SITE_URL}/`), `sitemap URL uses the production origin: ${loc}`);
  assert(loc.endsWith("/"), `sitemap URL uses the trailing-slash policy: ${loc}`);
});

const lastmodBlocks = Array.from(
  sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g),
);
lastmodBlocks.forEach((match) => {
  const loc = match[1];
  const lastmod = match[2];
  const post = postForPath(new URL(loc).pathname);
  if (lastmod) {
    assert(Boolean(post), `lastmod only appears on blog articles: ${loc}`);
    if (post) {
      const expected = post.dateModified || post.datePublished;
      assert(lastmod === expected, `${loc}: lastmod comes from content metadata (${expected})`);
    }
  }
});
posts.forEach((post) => {
  assert(
    sitemapLocations.includes(`${SITE_URL}/blog/${post.slug}/`),
    `sitemap includes article ${post.slug}`,
  );
});
const lastmodCount = countMatches(sitemap, /<lastmod>/g);
assert(
  lastmodCount === posts.length,
  `sitemap has exactly ${posts.length} article lastmod entries (found ${lastmodCount})`,
);

const robots = read(path.join(BUILD, "robots.txt"));
assert(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), "robots.txt references the production sitemap");
assert(robots.includes("Allow: /"), "robots.txt allows /");
assert(robots.includes("Disallow: /admin"), "robots.txt disallows /admin");
assert(robots.includes("Disallow: /api"), "robots.txt disallows /api");
assert(!robots.includes("Disallow: /typing-test"), "robots.txt does not block /typing-test");

console.log("\n--- Cloudflare headers and redirects ---");
const headers = read(path.join(BUILD, "_headers"));
assert(headers.includes("Content-Type: application/xml; charset=utf-8"), "_headers sets XML content-type for sitemap");
assert(headers.includes("X-Robots-Tag: noindex, follow"), "_headers keeps utility routes noindex");
assert(headers.includes("/games/*/"), "_headers keeps game detail routes noindex");

const redirects = read(path.join(BUILD, "_redirects"));
assert(redirects.includes("/typing-speed-test /typing-test/ 301"), "_redirects keeps the legacy typing redirect");
assert(redirects.includes("/typing-test /typing-test/ 301"), "_redirects keeps the trailing-slash redirect");
assert(redirects.includes("/games/speed-test /games/speed-test/ 301"), "_redirects keeps the game trailing-slash redirect");
assert(!redirects.includes("/index.html"), "_redirects does not rewrite to /index.html");

console.log("\n--- Every sitemap page ---");
sitemapLocations.forEach((loc) => {
  const url = new URL(loc);
  const label = url.pathname;
  const file = buildFileForPath(url.pathname);
  assert(fs.existsSync(file), `${label}: prerendered HTML exists`);

  if (!fs.existsSync(file)) return;

  const html = read(file);
  const canonical = canonicalPath(url.pathname);
  const expectedCanonical = `${SITE_URL}${canonical}`;

  assert(!html.includes("preview.emergentagent.com"), `${label}: no preview-domain leakage`);
  assert(countMatches(html, /<link rel="canonical"/g) === 1, `${label}: exactly one canonical`);
  assert(
    firstMatch(html, /<link rel="canonical" href="([^"]+)"/) === expectedCanonical,
    `${label}: canonical is ${expectedCanonical}`,
  );
  assert(countMatches(html, /<title>/g) === 1, `${label}: exactly one title`);
  assert(countMatches(html, /<meta name="description"/g) === 1, `${label}: exactly one meta description`);
  assert(countMatches(html, /<h1[\s>]/g) === 1, `${label}: exactly one H1`);
  assert(
    firstMatch(html, /<meta property="og:url" content="([^"]+)"/) === expectedCanonical,
    `${label}: og:url matches the canonical`,
  );
  assert(
    firstMatch(html, /<meta name="robots" content="([^"]+)"/) === "index,follow,max-image-preview:large",
    `${label}: robots permits indexing`,
  );
  assert(
    html.includes('<div id="root">') && !html.includes('<div id="root"></div>'),
    `${label}: initial HTML contains prerendered content`,
  );

  const scripts = parseJsonLd(html);
  assert(scripts.length > 0, `${label}: contains parseable JSON-LD`);
  scripts.forEach((script) => {
    assert(
      script.attrs.includes('data-seo-owned="true"'),
      `${label}: JSON-LD is ownership-marked`,
    );
    assert(Boolean(keyOf(script)), `${label}: JSON-LD has a stable key`);
  });
  const keys = scripts.map(keyOf).filter(Boolean);
  assert(new Set(keys).size === keys.length, `${label}: no duplicate schema keys`);

  const organization = scripts.find((script) => keyOf(script) === "organization");
  const website = scripts.find((script) => keyOf(script) === "website");
  assert(Boolean(organization), `${label}: one Organization entity`);
  assert(Boolean(website), `${label}: one WebSite entity`);
  if (organization) assert(scopeOf(organization) === "site", `${label}: Organization is site-scoped`);
  if (website) assert(scopeOf(website) === "site", `${label}: WebSite is site-scoped`);

  scripts
    .filter((script) => scopeOf(script) === "route")
    .forEach((script) => {
      assert(
        pathOf(script) === normalizePath(url.pathname),
        `${label}: ${keyOf(script)} is bound to the current route`,
      );
    });

  assertBreadcrumb(html, expectedCanonical, label);

  const page = pageForPath(url.pathname);
  const post = postForPath(url.pathname);
  if (page?.tool) {
    assert(keys.includes("webapplication"), `${label}: includes WebApplication for an interactive tool`);
  }
  if (page?.faqs?.length || post?.faqs?.length) {
    assert(keys.includes("faq"), `${label}: includes FAQPage for rendered FAQs`);
  }
  if (post) {
    assert(keys.includes("article"), `${label}: includes Article schema`);
    assert(!keys.includes("webapplication"), `${label}: does not include homepage WebApplication`);
  }
});

console.log("\n--- Representative breadcrumb trails ---");
const breadcrumbExpectations = [
  {
    path: "/typing-test/1-minute/",
    names: ["Home", "Typing speed test", "1 minute"],
    items: [`${SITE_URL}/`, `${SITE_URL}/typing-test/`, `${SITE_URL}/typing-test/1-minute/`],
  },
  {
    path: "/typing-test/",
    names: ["Home", "Typing speed test"],
    items: [`${SITE_URL}/`, `${SITE_URL}/typing-test/`],
  },
  {
    path: "/hindi-typing-test/",
    names: ["Home", "Hindi typing test"],
    items: [`${SITE_URL}/`, `${SITE_URL}/hindi-typing-test/`],
  },
  {
    path: "/games/",
    names: ["Home", "Typing games"],
    items: [`${SITE_URL}/`, `${SITE_URL}/games/`],
  },
  {
    path: "/blog/",
    names: ["Home", "Blog"],
    items: [`${SITE_URL}/`, `${SITE_URL}/blog/`],
  },
  {
    path: "/blog/how-to-type-faster/",
    names: ["Home", "Blog", posts.find((post) => post.slug === "how-to-type-faster").title],
    items: [
      `${SITE_URL}/`,
      `${SITE_URL}/blog/`,
      `${SITE_URL}/blog/how-to-type-faster/`,
    ],
  },
];

breadcrumbExpectations.forEach(({ path: pagePath, names, items }) => {
  const html = read(buildFileForPath(pagePath));
  const breadcrumb = breadcrumbOf(parseJsonLd(html));
  assert(Boolean(breadcrumb), `${pagePath}: BreadcrumbList exists`);
  if (!breadcrumb) return;
  const list = breadcrumb.data.itemListElement || [];
  assert(
    JSON.stringify(list.map((item) => item.name)) === JSON.stringify(names),
    `${pagePath}: breadcrumb labels are ${names.join(" > ")}`,
  );
  assert(
    JSON.stringify(list.map((item) => item.item)) === JSON.stringify(items),
    `${pagePath}: breadcrumb URLs are correct`,
  );
});

console.log("\n--- Indexability policy ---");
const indexableGameHrefs = Array.from(
  read(buildFileForPath("/games/")).matchAll(/<a href="(\/games\/[^"]+)"/g),
  (match) => match[1],
);
assert(indexableGameHrefs.length >= 10, "games hub links to every game");
indexableGameHrefs.forEach((href) => {
  assert(href.endsWith("/"), `games hub link uses the canonical trailing slash: ${href}`);
});

routes
  .filter((route) => route.path.startsWith("/games/") && route.path !== "/games/")
  .forEach((route) => {
    const html = read(buildFileForPath(route.path));
    assert(
      firstMatch(html, /<meta name="robots" content="([^"]+)"/) === "noindex,follow",
      `${route.path}: individual game remains noindex,follow`,
    );
  });

const gamesHub = read(buildFileForPath("/games/"));
assert(
  firstMatch(gamesHub, /<meta name="robots" content="([^"]+)"/) === "index,follow,max-image-preview:large",
  "/games/: hub remains indexable",
);

[
  "/daily/",
  "/leaderboard/",
  "/login/",
  "/register/",
  "/dashboard/",
  "/admin/",
].forEach((pagePath) => {
  const html = read(buildFileForPath(pagePath));
  const robotsValue = firstMatch(html, /<meta name="robots" content="([^"]+)"/);
  assert(
    robotsValue && robotsValue.startsWith("noindex"),
    `${pagePath}: remains noindex`,
  );
});

const notFound = read(path.join(BUILD, "404.html"));
assert(notFound.includes('content="noindex,nofollow"'), "404 page has noindex,nofollow");

console.log("\n--- Game link source ---");
const homeSource = read(path.join(ROOT, "src/pages/Home.jsx"));
const dashboardSource = read(path.join(ROOT, "src/pages/Dashboard.jsx"));
assert(homeSource.includes("canonicalPath(`/games/${g.id}`)"), "homepage game tiles use canonicalPath");
assert(dashboardSource.includes("canonicalPath(`/games/${g.id}`)"), "dashboard game links use canonicalPath");
assert(!homeSource.includes("to={`/games/${g.id}`}"), "homepage does not link to non-trailing-slash game URLs");
assert(!dashboardSource.includes("to={`/games/${g.id}`}"), "dashboard does not link to non-trailing-slash game URLs");

if (failures.length > 0) {
  console.error(`\nSEO regression testing failed with ${failures.length} error(s).`);
  process.exit(1);
}

console.log(`\nAll SEO regression checks passed (${sitemapLocations.length} sitemap URLs).`);
