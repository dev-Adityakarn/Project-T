/* Generates public/sitemap.xml and public/robots.txt from src/seo/routes.json. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
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
const SITE_URL = (env.REACT_APP_SITE_URL || PRODUCTION_ORIGIN).replace(/\/$/, "");

const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/routes.json"), "utf8"));
const blog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/blog.json"), "utf8"));

const lastmodFor = (route) => {
  const post = blog.find((p) => `/blog/${p.slug}` === route.path);
  if (post && (post.dateModified || post.datePublished)) {
    return post.dateModified || post.datePublished;
  }
  return null;
};

const urls = routes
  .map((r) => {
    const loc = `${SITE_URL}${r.path === "/" ? "/" : r.path}`;
    const lastmod = lastmodFor(r);
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
    return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `# robots.txt for ${SITE_URL}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /dashboard
Disallow: /login
Disallow: /register

Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(ROOT, "public/sitemap.xml"), sitemap);
fs.writeFileSync(path.join(ROOT, "public/robots.txt"), robots);

const buildDir = path.join(ROOT, "build");
if (fs.existsSync(buildDir)) {
  fs.writeFileSync(path.join(buildDir, "sitemap.xml"), sitemap);
  fs.writeFileSync(path.join(buildDir, "robots.txt"), robots);
}

console.log(`seo: wrote sitemap.xml (${routes.length} urls) and robots.txt`);
