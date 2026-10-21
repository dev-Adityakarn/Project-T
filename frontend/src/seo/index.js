import SITE from "@/seo/site.json";
import ROUTES from "@/seo/routes.json";
import TESTS from "@/seo/pages.tests.json";
import PRACTICE from "@/seo/pages.practice.json";
import SPECIAL from "@/seo/pages.special.json";
import STATIC from "@/seo/pages.static.json";
import POSTS from "@/seo/blog.json";
import LESSONS from "@/seo/lessons.json";

export const PRODUCTION_ORIGIN = "https://typinger.in";
export const SITE_URL = PRODUCTION_ORIGIN;
export const PAGE_LIST = [...TESTS, ...PRACTICE, ...SPECIAL, ...STATIC];

const normalizePath = (p) => {
  if (!p || p === "/") return "/";
  const clean = String(p).split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${clean}`;
};

export const PAGES = Object.fromEntries(
  PAGE_LIST.flatMap((p) => {
    const raw = p.path;
    const clean = normalizePath(raw);
    return [
      [raw, p],
      [clean, p],
      [`${clean}/`, p],
    ];
  })
);

export const getPage = (path) => {
  if (!path) return undefined;
  const clean = normalizePath(path);
  return PAGES[path] || PAGES[clean] || PAGES[`${clean}/`];
};

export const getPost = (slug) => POSTS.find((p) => p.slug === slug);

export const absUrl = (path = "/") => {
  if (!path || path === "/") return `${PRODUCTION_ORIGIN}/`;
  const clean = String(path).split("?")[0].split("#")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  return `${PRODUCTION_ORIGIN}/${clean}/`;
};

export { SITE, ROUTES, POSTS, LESSONS };
