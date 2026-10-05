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
const SITE_URL = (env.REACT_APP_SITE_URL || "").replace(/\/$/, "");
if (!SITE_URL) {
  console.error("REACT_APP_SITE_URL is required to generate sitemap.xml");
  process.exit(1);
}

const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/routes.json"), "utf8"));
const blog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/seo/blog.json"), "utf8"));
const lastmodFor = (route) => {
  const post = blog.find((p) => `/blog/${p.slug}` === route.path);
  return post ? post.dateModified || post.datePublished : new Date().toISOString().slice(0, 10);
};

const urls = routes
  .map((r) => `  <url>
    <loc>${SITE_URL}${r.path === "/" ? "/" : r.path}</loc>
    <lastmod>${lastmodFor(r)}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`)
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
console.log(`seo: wrote public/sitemap.xml (${routes.length} urls) and public/robots.txt`);
