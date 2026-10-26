const normalizePath = (pathname = "/") => {
  if (!pathname || pathname === "/") return "/";
  const clean = String(pathname).split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${clean}`;
};

const EDITORIAL_ROUTES = new Set([
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/blog",
  "/typing-test",
  "/typing-practice",
  "/typing-lessons",
  "/hindi-typing-test",
  "/government-exam-typing-test",
]);

const BLOCKED_ROUTES = new Set([
  "/dashboard",
  "/login",
  "/register",
  "/games",
  "/daily",
  "/leaderboard",
  "/404",
  "/404.html",
]);

/**
 * Ad eligibility is deliberately conservative. A route must have substantial
 * publisher content or a completed result to be eligible. App, data-only,
 * leaderboard, daily, game-detail and error routes stay ad-free.
 */
export const adPolicyFor = (pathname = "/") => {
  const path = normalizePath(pathname);

  if (BLOCKED_ROUTES.has(path)) {
    return { allowed: false, reason: "app, data-only, game or error route" };
  }
  if (path.startsWith("/admin") || path.startsWith("/games/") || path.startsWith("/leaderboard/") || path.startsWith("/daily/")) {
    return { allowed: false, reason: "app, data-only, game or error route" };
  }
  if (path === "/blog" || path.startsWith("/blog/")) {
    return { allowed: true, reason: "editorial article or index" };
  }
  if (EDITORIAL_ROUTES.has(path) || path.startsWith("/typing-test/") || path.startsWith("/typing-practice/")) {
    return { allowed: true, reason: "editorial page or completed-result placement" };
  }
  return { allowed: false, reason: "unknown route" };
};

export const isAdEligibleRoute = (pathname) => adPolicyFor(pathname).allowed;
