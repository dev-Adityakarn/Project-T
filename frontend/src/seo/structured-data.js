/**
 * Pure structured-data model shared by the post-build prerenderer and the
 * browser SEO lifecycle.
 *
 * This file is deliberately CommonJS and dependency-free so that:
 *   - Node can `require()` it from `scripts/prerender.js`;
 *   - webpack/Jest can import it from the React application.
 *
 * Keeping URL construction, breadcrumb construction, schema selection and
 * serialisation here prevents the prerendered HTML and the hydrated DOM from
 * drifting apart.
 */

const PRODUCTION_ORIGIN = "https://typinger.in";
const SITE_URL = PRODUCTION_ORIGIN;

const SCHEMA_KEYS = Object.freeze({
  organization: "organization",
  website: "website",
  webApplication: "webapplication",
  faq: "faq",
  breadcrumb: "breadcrumb",
  article: "article",
});

const SCHEMA_SCOPES = Object.freeze({
  site: "site",
  route: "route",
});

/** Normalise a path for comparisons: one leading slash, no trailing slash. */
const normalizePath = (path = "/") => {
  if (!path) return "/";
  const value = String(path).split("?")[0].split("#")[0];
  const clean = value.replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `/${clean}` : "/";
};

/** The canonical trailing-slash form used by every public route. */
const canonicalPath = (path = "/") => {
  const clean = normalizePath(path);
  return clean === "/" ? "/" : `${clean}/`;
};

const absUrl = (path = "/", origin = PRODUCTION_ORIGIN) =>
  `${origin}${canonicalPath(path)}`;

/**
 * Serialise JSON-LD exactly the same way in prerender and runtime. Escaping
 * `<` prevents article/FAQ copy from terminating the script element early.
 */
const serializeJsonLd = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const organizationSchema = ({ site, origin = PRODUCTION_ORIGIN }) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  legalName: site.legalName,
  url: `${origin}/`,
  logo: `${origin}${site.logo}`,
  ...(site.email ? { email: site.email } : {}),
  ...(site.founded ? { foundingDate: site.founded } : {}),
  ...(site.sameAs?.length ? { sameAs: site.sameAs } : {}),
});

const websiteSchema = ({ site, origin = PRODUCTION_ORIGIN }) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: `${origin}/`,
  description: site.description,
  inLanguage: "en",
  publisher: { "@type": "Organization", name: site.name, url: `${origin}/` },
});

const webAppSchema = ({ page, site, origin = PRODUCTION_ORIGIN }) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: page.title,
  url: absUrl(page.path, origin),
  description: page.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a physical keyboard",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: `${origin}/` },
});

const faqSchema = (faqs = []) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

/**
 * Build a trail from Home plus the supplied parent crumbs.
 *
 * The final/current crumb always uses `currentPath` (the page's canonical
 * route), never a homepage fallback. If a caller cannot provide a current path,
 * the final `item` is omitted, which Google explicitly permits.
 */
const breadcrumbSchema = ({ crumbs = [], currentPath, origin = PRODUCTION_ORIGIN }) => {
  const trail = [{ name: "Home", path: "/" }, ...crumbs];
  const lastIndex = trail.length - 1;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => {
      const isCurrent = index === lastIndex;
      const itemPath = isCurrent ? currentPath : crumb.path;
      const item = itemPath ? absUrl(itemPath, origin) : null;
      return {
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        ...(item ? { item } : {}),
      };
    }),
  };
};

const articleSchema = ({ post, site, origin = PRODUCTION_ORIGIN }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.description,
  datePublished: post.datePublished,
  dateModified: post.dateModified || post.datePublished,
  author: { "@type": "Organization", name: post.author || site.name },
  publisher: {
    "@type": "Organization",
    name: site.name,
    logo: { "@type": "ImageObject", url: `${origin}${site.logo}` },
  },
  image: `${origin}${post.image || site.ogImage}`,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": absUrl(`/blog/${post.slug}`, origin),
  },
  inLanguage: "en",
});

const siteWide = (site, origin) => [
  {
    key: SCHEMA_KEYS.organization,
    scope: SCHEMA_SCOPES.site,
    data: organizationSchema({ site, origin }),
  },
  {
    key: SCHEMA_KEYS.website,
    scope: SCHEMA_SCOPES.site,
    data: websiteSchema({ site, origin }),
  },
];

/**
 * The single source of truth for which schema entities belong to a route.
 *
 * @param {object} input
 * @param {"home"|"content"|"lesson"|"blog-index"|"blog-post"|"games-index"|"game"|"utility"|"shell"|"not-found"} input.kind
 * @param {object} input.site
 * @param {string} input.path canonical route path (without query/hash)
 * @param {object} [input.page] page data for content/home/lesson/game routes
 * @param {object} [input.post] article data for blog-post routes
 * @param {Array} [input.crumbs] parent crumbs, excluding Home and excluding the current page
 * @param {Array} [input.faqs]
 * @param {string} [input.origin]
 * @returns {Array<{key: string, scope: string, path?: string, data: object}>}
 */
const buildRouteSchemas = ({
  kind,
  site,
  path,
  page,
  post,
  crumbs = [],
  faqs = [],
  origin = PRODUCTION_ORIGIN,
}) => {
  const schemas = siteWide(site, origin);
  const route = (key, data) => ({
    key,
    scope: SCHEMA_SCOPES.route,
    path: normalizePath(path),
    data,
  });

  const addBreadcrumb = () => {
    if (crumbs.length) {
      schemas.push(
        route(
          SCHEMA_KEYS.breadcrumb,
          breadcrumbSchema({ crumbs, currentPath: path, origin }),
        ),
      );
    }
  };
  const addFaq = () => {
    if (faqs.length) schemas.push(route(SCHEMA_KEYS.faq, faqSchema(faqs)));
  };
  const addWebApp = () => {
    if (page) {
      schemas.push(
        route(SCHEMA_KEYS.webApplication, webAppSchema({ page, site, origin })),
      );
    }
  };

  switch (kind) {
    case "home":
      addWebApp();
      addFaq();
      break;
    case "content":
      if (page?.tool) addWebApp();
      addFaq();
      addBreadcrumb();
      break;
    case "lesson":
      addWebApp();
      addFaq();
      addBreadcrumb();
      break;
    case "blog-index":
    case "games-index":
    case "utility":
      addBreadcrumb();
      break;
    case "blog-post":
      if (post) {
        schemas.push(route(SCHEMA_KEYS.article, articleSchema({ post, site, origin })));
      }
      addBreadcrumb();
      addFaq();
      break;
    case "game":
      addWebApp();
      addBreadcrumb();
      break;
    case "not-found":
    case "shell":
    default:
      // Site-wide entities only.
      break;
  }

  return schemas;
};

module.exports = {
  PRODUCTION_ORIGIN,
  SITE_URL,
  SCHEMA_KEYS,
  SCHEMA_SCOPES,
  normalizePath,
  canonicalPath,
  absUrl,
  serializeJsonLd,
  organizationSchema,
  websiteSchema,
  webAppSchema,
  faqSchema,
  breadcrumbSchema,
  articleSchema,
  buildRouteSchemas,
};
