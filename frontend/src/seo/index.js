import SITE from "@/seo/site.json";
import ROUTES from "@/seo/routes.json";
import TESTS from "@/seo/pages.tests.json";
import PRACTICE from "@/seo/pages.practice.json";
import SPECIAL from "@/seo/pages.special.json";
import STATIC from "@/seo/pages.static.json";
import POSTS from "@/seo/blog.json";
import LESSONS from "@/seo/lessons.json";

export const PRODUCTION_ORIGIN = "https://typinger.in";
export const SITE_URL = (process.env.REACT_APP_SITE_URL || PRODUCTION_ORIGIN).replace(/\/$/, "");
export const PAGE_LIST = [...TESTS, ...PRACTICE, ...SPECIAL, ...STATIC];
export const PAGES = Object.fromEntries(PAGE_LIST.map((p) => [p.path, p]));
export const getPage = (path) => PAGES[path];
export const getPost = (slug) => POSTS.find((p) => p.slug === slug);

export const absUrl = (path = "/") => {
  if (!path || path === "/") return `${SITE_URL}/`;
  const clean = String(path).split("?")[0].split("#")[0];
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  const stripped = normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
  return `${SITE_URL}${stripped}`;
};

export { SITE, ROUTES, POSTS, LESSONS };
