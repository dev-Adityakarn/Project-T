import structuredData from "@/seo/structured-data.js";

const { SCHEMA_KEYS, SCHEMA_SCOPES, normalizePath, serializeJsonLd } = structuredData;

const OWNED_SELECTOR = 'script[type="application/ld+json"][data-seo-owned="true"]';
const LEGACY_SELECTOR = 'script[type="application/ld+json"][data-seo="jsonld"]';
const OWNED_QUERY = `${OWNED_SELECTOR}, ${LEGACY_SELECTOR}`;

const TYPE_TO_KEY = Object.freeze({
  organization: SCHEMA_KEYS.organization,
  website: SCHEMA_KEYS.website,
  webapplication: SCHEMA_KEYS.webApplication,
  faqpage: SCHEMA_KEYS.faq,
  breadcrumblist: SCHEMA_KEYS.breadcrumb,
  article: SCHEMA_KEYS.article,
});

const ownedNodes = () => Array.from(document.head.querySelectorAll(OWNED_QUERY));

const keyForNode = (node) => {
  const explicit = node.getAttribute("data-seo-key");
  if (explicit) return explicit;

  // Adopt nodes created by the previous client lifecycle, which used
  // data-seo="jsonld" without a stable key. They are Typinger-owned, not
  // third-party markup.
  try {
    const parsed = JSON.parse(node.textContent || "{}");
    const type = String(parsed["@type"] || "").toLowerCase();
    return TYPE_TO_KEY[type] || type;
  } catch {
    return "";
  }
};

const scopeForNode = (node) =>
  node.getAttribute("data-seo-scope") ||
  (node.getAttribute("data-seo") === "jsonld" ? SCHEMA_SCOPES.route : null);

const normalizeEntry = (entry, currentPath) => {
  if (!entry) return null;
  if (entry.key && entry.data) return entry;

  // Backwards-compatible support for callers that still pass a bare schema.
  const type = String(entry["@type"] || "").toLowerCase();
  const key = TYPE_TO_KEY[type] || type;
  if (!key) return null;
  return {
    key,
    scope: SCHEMA_SCOPES.route,
    path: normalizePath(currentPath),
    data: entry,
  };
};

/**
 * Idempotently reconcile Typinger-owned JSON-LD with the current route.
 *
 * - Existing owned nodes with the same key are adopted and updated in place.
 * - Duplicate owned nodes for the same key are collapsed to one.
 * - Route-scoped keys that are no longer intended are removed.
 * - Site-scoped keys (Organization/WebSite) are updated but never removed by a
 *   route change, so one accurate site-wide entity survives navigation.
 * - JSON-LD without Typinger's ownership marker is never touched.
 */
export const syncOwnedJsonLd = (entries = [], currentPath = "/") => {
  const intended = new Map();
  entries.forEach((rawEntry) => {
    const entry = normalizeEntry(rawEntry, currentPath);
    if (!entry?.key || !entry?.data) return;
    intended.set(entry.key, entry);
  });

  const existing = new Map();
  ownedNodes().forEach((node) => {
    const key = keyForNode(node);
    if (!key) return;
    if (!existing.has(key)) existing.set(key, []);
    existing.get(key).push(node);
  });

  const adopted = new Set();

  intended.forEach((entry, key) => {
    const nodes = existing.get(key) || [];
    let node = nodes[0];

    if (!node) {
      node = document.createElement("script");
      node.type = "application/ld+json";
      document.head.appendChild(node);
    }
    adopted.add(node);

    const scope = entry.scope || SCHEMA_SCOPES.route;
    node.setAttribute("data-seo-owned", "true");
    node.setAttribute("data-seo-key", key);
    node.setAttribute("data-seo-scope", scope);
    node.removeAttribute("data-seo");

    if (scope === SCHEMA_SCOPES.site) {
      node.removeAttribute("data-seo-path");
    } else {
      node.setAttribute("data-seo-path", normalizePath(entry.path || currentPath));
    }

    const text = serializeJsonLd(entry.data);
    if (node.textContent !== text) node.textContent = text;

    // Duplicate owned nodes for the same entity are never intentional.
    nodes.slice(1).forEach((duplicate) => duplicate.remove());
  });

  ownedNodes().forEach((node) => {
    if (adopted.has(node)) return;
    const scope = scopeForNode(node);
    if (scope === SCHEMA_SCOPES.site) return;
    node.remove();
  });
};

/**
 * Remove route-scoped owned schema that describes a different path.
 *
 * Runs on every pathname change, including changes whose destination SEO data
 * is still loading asynchronously. This guarantees the previous route's
 * Article/FAQ/WebApplication/Breadcrumb cannot survive into the new route.
 */
export const clearStaleOwnedJsonLd = (currentPath = "/") => {
  const current = normalizePath(currentPath);

  ownedNodes().forEach((node) => {
    const scope = scopeForNode(node);
    if (scope === SCHEMA_SCOPES.site) return;

    // Old client-owned nodes have no path. They cannot be proven to describe
    // the current route, so drop them; the active route will upsert fresh data.
    if (scope !== SCHEMA_SCOPES.route) {
      node.remove();
      return;
    }

    const nodePath = normalizePath(node.getAttribute("data-seo-path") || "/");
    if (nodePath !== current) node.remove();
  });
};
