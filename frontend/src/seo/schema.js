import SITE from "./site.json";
import structuredData from "./structured-data.js";

const {
  PRODUCTION_ORIGIN,
  SCHEMA_KEYS,
  SCHEMA_SCOPES,
  normalizePath,
  canonicalPath,
  absUrl,
  serializeJsonLd,
  organizationSchema: buildOrganizationSchema,
  websiteSchema: buildWebsiteSchema,
  webAppSchema: buildWebAppSchema,
  faqSchema: buildFaqSchema,
  breadcrumbSchema: buildBreadcrumbSchema,
  articleSchema: buildArticleSchema,
  buildRouteSchemas,
} = structuredData;

/**
 * Browser-facing wrappers around the shared schema model. They inject the
 * site data once so route components stay declarative, while the prerenderer
 * calls the same underlying builders with the same JSON.
 */
export const organizationSchema = () => buildOrganizationSchema({ site: SITE });
export const websiteSchema = () => buildWebsiteSchema({ site: SITE });
export const webAppSchema = (page) => buildWebAppSchema({ page, site: SITE });
export const faqSchema = (faqs) => buildFaqSchema(faqs);
export const breadcrumbSchema = (crumbs, currentPath) =>
  buildBreadcrumbSchema({ crumbs, currentPath });
export const articleSchema = (post) => buildArticleSchema({ post, site: SITE });

/** Build the complete, keyed schema set for the current route. */
export const buildSchemas = (options) => buildRouteSchemas({ site: SITE, ...options });

export {
  PRODUCTION_ORIGIN,
  SCHEMA_KEYS,
  SCHEMA_SCOPES,
  normalizePath,
  canonicalPath,
  absUrl,
  serializeJsonLd,
};
