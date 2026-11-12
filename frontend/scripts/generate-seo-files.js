/* Generates public/sitemap.xml and public/robots.txt for typinger.in. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PRODUCTION_ORIGIN = "https://typinger.in";

const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/routes.json"), "utf8"));
const blog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/blog.json"), "utf8"));

const lastmodFor = (route) => {
  const clean = route.path.replace(/^\/+/, "").replace(/\/+$/, "");
  const post = blog.find((p) => `blog/${p.slug}` === clean);
  if (post && (post.dateModified || post.datePublished)) {
    return post.dateModified || post.datePublished;
  }
  return null;
};

// Filter only canonical, indexable routes intended for the sitemap. A route
// explicitly marked noindex must never leak back in through the sitemap.
const RETIRED = new Set([
  "/blog/touch-typing-guide-for-beginners/",
  "/blog/what-is-a-good-wpm-score/",
  "/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide/",
  "/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections/",
  "/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description/",
  "/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide/",
]);
const sitemapRoutes = routes.filter(
  (r) => r.sitemap !== false && !r.noindex && !RETIRED.has(r.path),
);

const urls = sitemapRoutes
  .map((r) => {
    const clean = r.path === "/" ? "" : r.path.replace(/^\/+/, "").replace(/\/+$/, "");
    const loc = clean === "" ? `${PRODUCTION_ORIGIN}/` : `${PRODUCTION_ORIGIN}/${clean}/`;
    const lastmod = lastmodFor(r);
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
    return `  <url>
    <loc>${loc}</loc>${lastmodTag}
  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

// Googlebot needs the public content, and Mediapartners-Google must be able
// to fetch any page that can carry an ad. Both are kept out of the private
// application and API surfaces only.
const crawlerGroup = (agent) => `User-agent: ${agent}
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /dashboard
Disallow: /login
Disallow: /register
`;

const robots = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /api
Disallow: /dashboard
Disallow: /login
Disallow: /register

${crawlerGroup("Googlebot")}
${crawlerGroup("Mediapartners-Google")}
Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml
`;

fs.writeFileSync(path.join(ROOT, "public/sitemap.xml"), sitemap);
fs.writeFileSync(path.join(ROOT, "public/robots.txt"), robots);

const buildDir = path.join(ROOT, "build");
if (fs.existsSync(buildDir)) {
  fs.writeFileSync(path.join(buildDir, "sitemap.xml"), sitemap);
  fs.writeFileSync(path.join(buildDir, "robots.txt"), robots);
}

console.log(`seo: wrote sitemap.xml (${sitemapRoutes.length} urls) and robots.txt`);
