import { useEffect } from "react";
import { SITE, SITE_URL, absUrl } from "@/seo";

const upsert = (selector, tag, attrs) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.setAttribute("data-seo", "managed");
  return el;
};

const meta = (name, content) => upsert(`meta[name="${name}"]`, "meta", { name, content });
const prop = (property, content) => upsert(`meta[property="${property}"]`, "meta", { property, content });

const setCanonical = (href) => {
  const existing = document.head.querySelectorAll('link[rel="canonical"]');
  if (existing.length > 0) {
    existing[0].setAttribute("href", href);
    existing[0].setAttribute("data-seo", "managed");
    for (let i = 1; i < existing.length; i++) {
      existing[i].remove();
    }
    return existing[0];
  }
  const el = document.createElement("link");
  el.setAttribute("rel", "canonical");
  el.setAttribute("href", href);
  el.setAttribute("data-seo", "managed");
  document.head.appendChild(el);
  return el;
};

/** Declarative head manager: title, description, canonical, robots, OG/Twitter, JSON-LD. */
export const Seo = ({ path, title, description, image, type = "website", noindex = false, lang = "en", jsonLd = [], alternates = [] }) => {
  const json = JSON.stringify(jsonLd);

  useEffect(() => {
    const canonical = absUrl(path);
    document.documentElement.lang = lang;
    document.title = title;
    meta("description", description);
    meta("robots", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large");
    setCanonical(canonical);

    prop("og:title", title);
    prop("og:description", description);
    prop("og:type", type);
    prop("og:url", canonical);
    prop("og:image", `${SITE_URL}${image || SITE.ogImage}`);
    prop("og:image:width", "1200");
    prop("og:image:height", "630");
    prop("og:site_name", SITE.name);
    prop("og:locale", lang === "hi" ? "hi_IN" : SITE.locale);
    meta("twitter:card", "summary_large_image");
    meta("twitter:title", title);
    meta("twitter:description", description);
    meta("twitter:image", `${SITE_URL}${image || SITE.ogImage}`);
    meta("twitter:site", SITE.twitter);
    if (process.env.REACT_APP_GSC_VERIFICATION) meta("google-site-verification", process.env.REACT_APP_GSC_VERIFICATION);

    document.head.querySelectorAll('link[data-seo="alt"]').forEach((n) => n.remove());
    alternates.forEach((a) => {
      const l = document.createElement("link");
      l.setAttribute("rel", "alternate");
      l.setAttribute("hreflang", a.hreflang);
      l.setAttribute("href", absUrl(a.path));
      l.setAttribute("data-seo", "alt");
      document.head.appendChild(l);
    });

    document.head.querySelectorAll('script[data-seo="jsonld"]').forEach((n) => n.remove());
    JSON.parse(json).forEach((schema) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo", "jsonld");
      s.textContent = JSON.stringify(schema);
      document.head.appendChild(s);
    });
  }, [path, title, description, image, type, noindex, lang, json, alternates]);

  return null;
};
