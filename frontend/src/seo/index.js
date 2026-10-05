import SITE from "@/seo/site.json";
import ROUTES from "@/seo/routes.json";
import TESTS from "@/seo/pages.tests.json";
import PRACTICE from "@/seo/pages.practice.json";
import SPECIAL from "@/seo/pages.special.json";
import STATIC from "@/seo/pages.static.json";
import POSTS from "@/seo/blog.json";
import LESSONS from "@/seo/lessons.json";

export const SITE_URL = (process.env.REACT_APP_SITE_URL || "").replace(/\/$/, "");
export const PAGE_LIST = [...TESTS, ...PRACTICE, ...SPECIAL, ...STATIC];
export const PAGES = Object.fromEntries(PAGE_LIST.map((p) => [p.path, p]));
export const getPage = (path) => PAGES[path];
export const getPost = (slug) => POSTS.find((p) => p.slug === slug);
export const absUrl = (path) => `${SITE_URL}${path === "/" ? "" : path}`;

export { SITE, ROUTES, POSTS, LESSONS };
