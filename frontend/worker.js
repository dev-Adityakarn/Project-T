import { resolveRoute, robotsHeaderFor } from "./src/lib/appRoutes.js";

/**
 * Asset-first Cloudflare Worker for the Typinger SPA.
 *
 * Static files in `build/` are served by Cloudflare before this Worker runs.
 * The Worker only handles unmatched paths:
 *   - legacy aliases and non-canonical URLs -> 301;
 *   - valid client-side routes -> the SPA shell with HTTP 200;
 *   - everything else, plus /404 and /404.html -> the branded 404 page with
 *     HTTP 404.
 */

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
};

const FALLBACK_404 = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Page not found (404) — Typinger</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1120; color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; }
    main { width: min(640px, calc(100% - 2rem)); }
    .code { color: #22d3ee; font-size: 3rem; font-weight: 800; letter-spacing: .08em; }
    h1 { margin: 1rem 0 0; font-size: clamp(1.75rem, 5vw, 2.5rem); }
    p { color: #94a3b8; line-height: 1.6; }
    ul { display: grid; gap: .6rem; padding: 0; margin: 1.5rem 0 0; list-style: none; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    a { display: block; padding: .9rem 1rem; border: 1px solid #1e293b; border-radius: .75rem; color: #e2e8f0; text-decoration: none; }
    a:hover { border-color: #22d3ee; color: #22d3ee; }
  </style>
</head>
<body>
  <main>
    <div class="code">404</div>
    <h1>That page took a wrong turn</h1>
    <p>The link is broken or the page has moved. Everything you came for is one click away.</p>
    <ul>
      <li><a href="/">Typing test</a></li>
      <li><a href="/typing-test/1-minute/">1 minute typing test</a></li>
      <li><a href="/typing-practice/">Typing practice</a></li>
      <li><a href="/typing-lessons/">Touch typing lessons</a></li>
      <li><a href="/games/">Typing games</a></li>
      <li><a href="/blog/">Typing guides</a></li>
    </ul>
  </main>
</body>
</html>`;

const fetchAsset = (env, request, path) => {
  const url = new URL(path, request.url);
  return env.ASSETS.fetch(
    new Request(url.toString(), {
      method: "GET",
      headers: request.headers,
    }),
  );
};

const htmlResponse = (body, status, extraHeaders = {}) =>
  new Response(body, {
    status,
    headers: { ...HTML_HEADERS, ...extraHeaders },
  });

const notFound = async (request, env) => {
  let body = FALLBACK_404;
  try {
    const asset = await fetchAsset(env, request, "/404.html");
    if (asset.ok) {
      const text = await asset.text();
      if (text.trim()) body = text;
    }
  } catch {
    // The fallback above is intentionally self-contained and nonempty.
  }
  return htmlResponse(request.method === "HEAD" ? null : body, 404, {
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow",
  });
};

const serveAppShell = async (request, env, pathname) => {
  const asset = await fetchAsset(env, request, "/index.html");
  if (!asset.ok) return notFound(request, env);

  const body = await asset.text();
  const headers = new Headers(asset.headers);
  headers.set("content-type", HTML_HEADERS["content-type"]);
  headers.set("x-content-type-options", HTML_HEADERS["x-content-type-options"]);
  headers.set("cache-control", "no-cache");
  // The body has been decoded to text; do not forward a stale compressed
  // representation or a length that no longer matches it.
  headers.delete("content-encoding");
  headers.delete("content-length");
  const robots = robotsHeaderFor(pathname);
  if (robots) headers.set("x-robots-tag", robots);

  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers,
  });
};

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          allow: "GET, HEAD",
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    const url = new URL(request.url);
    const decision = resolveRoute(url.pathname);

    if (decision.type === "redirect") {
      const target = new URL(decision.location, url.origin);
      target.search = url.search;
      return Response.redirect(target.toString(), decision.status);
    }

    if (decision.type === "app-shell") {
      return serveAppShell(request, env, url.pathname);
    }

    return notFound(request, env);
  },
};
