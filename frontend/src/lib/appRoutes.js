/**
 * Route knowledge shared by the Cloudflare Worker and the Jest tests.
 *
 * Cloudflare serves a matching static asset before invoking the Worker. This
 * module therefore only decides what to do when no asset matched: redirect a
 * legacy or non-canonical URL, serve the SPA shell for a valid application
 * route, or return the branded 404 page with an HTTP 404 status.
 */

const LEGACY_REDIRECTS = Object.freeze({
  "/typing-speed-test": "/typing-test/",
  "/test": "/typing-test/",
  "/practice": "/typing-practice/",
  "/lessons": "/typing-lessons/",
  "/typing-tutor": "/typing-lessons/",
  "/typing-test/60-seconds": "/typing-test/1-minute/",
  "/privacy": "/privacy-policy/",
  "/terms-of-service": "/terms/",
  "/hindi-typing": "/hindi-typing-test/",
  "/blog/index": "/blog/",
});

// Keep these in sync with frontend/src/data/games.js. A test checks the list.
export const GAME_IDS = Object.freeze([
  "speed-test",
  "falling-words",
  "zombie-typing",
  "space-shooter",
  "type-racer",
  "sudden-death",
  "key-reflex",
  "word-scramble",
  "balloon-pop",
  "code-typer",
]);

const GAME_ID_SET = new Set(GAME_IDS);

const EXACT_APP_ROUTES = new Set([
  "/",
  "/typing-test",
  "/typing-test/1-minute",
  "/typing-test/3-minute",
  "/typing-test/5-minute",
  "/typing-test/numbers",
  "/typing-test/punctuation",
  "/typing-test/code",
  "/typing-practice",
  "/typing-practice/beginners",
  "/typing-lessons",
  "/hindi-typing-test",
  "/government-exam-typing-test",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/blog",
  "/games",
  "/daily",
  "/leaderboard",
  "/dashboard",
  "/login",
  "/register",
]);

const BLOG_SLUG_RE = /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GAME_PATH_RE = /^\/games\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Return the path portion of a URL, without a query string or hash. */
export const pathOnly = (pathname = "/") => {
  const value = String(pathname || "/").split("?")[0].split("#")[0];
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
};

/** Normalize a path for comparisons: one leading slash, no trailing slash. */
export const normalizePath = (pathname = "/") => {
  const path = pathOnly(pathname);
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
};

/** A legacy alias that must be redirected with a permanent 301. */
export const redirectForPath = (pathname = "/") =>
  LEGACY_REDIRECTS[normalizePath(pathname)] || null;

/** True for a real application route, including dynamic blog and game routes. */
export const isAppRoute = (pathname = "/") => {
  const path = normalizePath(pathname);
  if (EXACT_APP_ROUTES.has(path)) return true;
  if (path === "/admin" || path.startsWith("/admin/")) return true;
  if (BLOG_SLUG_RE.test(path)) return true;
  const game = path.match(GAME_PATH_RE);
  return Boolean(game && GAME_ID_SET.has(game[1]));
};

/**
 * Canonicalize a known route to its trailing-slash form. Admin paths are
 * deliberately excluded because the admin router owns its own URL shape.
 */
export const shouldRedirectToTrailingSlash = (pathname = "/") => {
  const path = pathOnly(pathname);
  if (path === "/" || path.endsWith("/") || path.includes(".")) return false;
  if (path === "/api" || path.startsWith("/api/")) return false;
  if (path === "/admin" || path.startsWith("/admin/")) return false;
  return isAppRoute(`${path}/`);
};

/**
 * Decide what the Worker should do for a request that did not match an asset.
 *
 * @returns {{type: "redirect", location: string, status: 301}
 *   | {type: "app-shell"}
 *   | {type: "not-found"}}
 */
export const resolveRoute = (pathname = "/") => {
  const path = pathOnly(pathname);

  // The API is a separate service. Never answer an API request with the SPA.
  if (path === "/api" || path.startsWith("/api/")) return { type: "not-found" };

  const legacy = redirectForPath(path);
  if (legacy) return { type: "redirect", location: legacy, status: 301 };

  // Both forms are explicit error pages; they must keep an HTTP 404 status.
  if (path === "/404" || path === "/404.html") return { type: "not-found" };

  if (shouldRedirectToTrailingSlash(path)) {
    return {
      type: "redirect",
      location: `${normalizePath(path)}/`,
      status: 301,
    };
  }

  if (isAppRoute(path)) return { type: "app-shell" };
  return { type: "not-found" };
};

/**
 * Robots header for app-shell responses. Prerendered pages already carry a
 * robots meta tag; this covers client-side-only routes and deep admin paths.
 */
export const robotsHeaderFor = (pathname = "/") => {
  const path = normalizePath(pathname);
  if (path === "/admin" || path.startsWith("/admin/")) {
    return "noindex, nofollow";
  }
  if (
    path === "/dashboard" ||
    path === "/login" ||
    path === "/register" ||
    path === "/daily" ||
    path === "/leaderboard" ||
    path.startsWith("/games/")
  ) {
    return "noindex, follow";
  }
  return null;
};
