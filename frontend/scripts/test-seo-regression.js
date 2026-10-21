/* SEO regression test suite */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BUILD = path.join(ROOT, "build");

let failures = [];
const assert = (condition, msg) => {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failures.push(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
};

console.log("\n--- Validating Sitemap & Robots ---");
const sitemapPath = path.join(BUILD, "sitemap.xml");
assert(fs.existsSync(sitemapPath), "build/sitemap.xml exists");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "sitemap has XML declaration");
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "sitemap has schema namespace");
assert(sitemap.includes("<loc>https://typinger.in/</loc>"), "sitemap has homepage canonical with trailing slash");
assert(sitemap.includes("<loc>https://typinger.in/typing-test/</loc>"), "sitemap has /typing-test/ with trailing slash");
assert(sitemap.includes("<loc>https://typinger.in/games/</loc>"), "sitemap has /games/ with trailing slash");
assert(!sitemap.includes("<priority>"), "sitemap has no <priority> tags");
assert(!sitemap.includes("<changefreq>"), "sitemap has no <changefreq> tags");
assert(!sitemap.includes("preview.emergentagent.com"), "sitemap has no preview domain");
assert(!sitemap.includes("localhost"), "sitemap has no localhost URLs");
assert(!sitemap.includes("/admin"), "sitemap excludes /admin");
assert(!sitemap.includes("/login"), "sitemap excludes /login");
assert(!sitemap.includes("/register"), "sitemap excludes /register");
assert(!sitemap.includes("/dashboard"), "sitemap excludes /dashboard");
assert(!sitemap.includes("/daily"), "sitemap excludes thin /daily");
assert(!sitemap.includes("/leaderboard"), "sitemap excludes thin /leaderboard");
assert(!sitemap.includes("/games/speed-test"), "sitemap excludes thin /games/speed-test");

// Verify sitemap contains exactly 24 URLs
const locMatches = sitemap.match(/<loc>/g) || [];
assert(locMatches.length === 24, `sitemap has exactly 24 canonical URLs (found ${locMatches.length})`);

// Verify lastmod only on blog articles
const lastmodMatches = sitemap.match(/<lastmod>/g) || [];
assert(lastmodMatches.length === 5, `sitemap has exactly 5 authentic blog lastmod entries (found ${lastmodMatches.length})`);

const robotsPath = path.join(BUILD, "robots.txt");
assert(fs.existsSync(robotsPath), "build/robots.txt exists");
const robots = fs.readFileSync(robotsPath, "utf8");
assert(robots.includes("Sitemap: https://typinger.in/sitemap.xml"), "robots.txt references production sitemap");
assert(robots.includes("Disallow: /admin"), "robots.txt disallows /admin");
assert(robots.includes("Disallow: /dashboard"), "robots.txt disallows /dashboard");
assert(robots.includes("Disallow: /login"), "robots.txt disallows /login");
assert(robots.includes("Disallow: /register"), "robots.txt disallows /register");
assert(!robots.includes("Disallow: /typing-test"), "robots.txt does not block /typing-test");

console.log("\n--- Validating Cloudflare Headers & Redirects ---");
const headersPath = path.join(BUILD, "_headers");
assert(fs.existsSync(headersPath), "build/_headers exists");
const headers = fs.readFileSync(headersPath, "utf8");
assert(headers.includes("Content-Type: application/xml; charset=utf-8"), "_headers sets XML content-type for sitemap");
assert(headers.includes("X-Robots-Tag: noindex, follow"), "_headers has noindex, follow for private user pages");

const redirectsPath = path.join(BUILD, "_redirects");
assert(fs.existsSync(redirectsPath), "build/_redirects exists");
const redirects = fs.readFileSync(redirectsPath, "utf8");
assert(redirects.includes("/test /typing-test/ 301"), "_redirects includes /test -> /typing-test/ 301");
assert(redirects.includes("/typing-speed-test /typing-test/ 301"), "_redirects includes /typing-speed-test -> /typing-test/ 301");
assert(redirects.includes("/typing-test /typing-test/ 301"), "_redirects includes non-trailing slash /typing-test -> /typing-test/ 301");
assert(!redirects.includes("/index.html"), "_redirects does not rewrite to /index.html (prevents Cloudflare loop 100324)");

console.log("\n--- Validating Homepage HTML ---");
const indexPath = path.join(BUILD, "index.html");
assert(fs.existsSync(indexPath), "build/index.html exists");
const indexHtml = fs.readFileSync(indexPath, "utf8");
assert(indexHtml.includes('<link rel="canonical" href="https://typinger.in/"/>'), "homepage canonical is https://typinger.in/");
assert(indexHtml.includes('<meta property="og:url" content="https://typinger.in/"/>'), "homepage og:url is https://typinger.in/");
assert(!indexHtml.includes("preview.emergentagent.com"), "homepage has no preview domain in canonical");
assert(indexHtml.includes("<title>Typing Test Online Free: Practice With 10 Typing Games</title>"), "homepage has proper title");
assert(indexHtml.includes('name="description"'), "homepage has meta description");
assert(indexHtml.includes('<main><h1>Free typing test and ten typing games in one place</h1>'), "homepage prerendered body has meaningful h1");
assert(!indexHtml.includes('<div id="root"></div>'), "homepage is not an empty root div");

console.log("\n--- Validating Representative Public Routes ---");
const routesToTest = [
  { file: "typing-test/index.html", canonical: "https://typinger.in/typing-test/", h1: "Typing speed test with instant WPM and accuracy" },
  { file: "typing-test/1-minute/index.html", canonical: "https://typinger.in/typing-test/1-minute/", h1: "1 minute typing test" },
  { file: "games/speed-test/index.html", canonical: "https://typinger.in/games/speed-test/", h1: "Speed Test" },
  { file: "blog/how-to-type-faster/index.html", canonical: "https://typinger.in/blog/how-to-type-faster/", h1: "How to type faster: nine changes that actually work" },
  { file: "hindi-typing-test/index.html", canonical: "https://typinger.in/hindi-typing-test/", h1: "Hindi typing test in Devanagari" },
];

routesToTest.forEach(({ file, canonical, h1 }) => {
  const filePath = path.join(BUILD, file);
  assert(fs.existsSync(filePath), `${file} exists`);
  const content = fs.readFileSync(filePath, "utf8");
  assert(content.includes(`<link rel="canonical" href="${canonical}"/>`), `${file} has canonical ${canonical}`);
  assert(content.includes(`<meta property="og:url" content="${canonical}"/>`), `${file} has matching og:url ${canonical}`);
  assert(content.includes(`<h1>${h1}</h1>`), `${file} has distinct h1: "${h1}"`);
  assert(!content.includes("preview.emergentagent.com"), `${file} has no preview domain`);
});

console.log("\n--- Validating 404 & Private Shells ---");
const notFoundPath = path.join(BUILD, "404.html");
assert(fs.existsSync(notFoundPath), "build/404.html exists");
const notFound = fs.readFileSync(notFoundPath, "utf8");
assert(notFound.includes('content="noindex,nofollow"'), "404 page has noindex,nofollow");

const loginPath = path.join(BUILD, "login/index.html");
assert(fs.existsSync(loginPath), "build/login/index.html exists for static hosting refresh");
const login = fs.readFileSync(loginPath, "utf8");
assert(login.includes('content="noindex,follow"'), "login shell has noindex,follow");

const adminPath = path.join(BUILD, "admin/index.html");
assert(fs.existsSync(adminPath), "build/admin/index.html exists for static hosting refresh");
const admin = fs.readFileSync(adminPath, "utf8");
assert(admin.includes('content="noindex,nofollow"'), "admin shell has noindex,nofollow");

if (failures.length > 0) {
  console.error(`\n❌ Regression testing failed with ${failures.length} errors.`);
  process.exit(1);
} else {
  console.log(`\n🎉 All SEO regression tests passed successfully!`);
}
