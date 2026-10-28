import SITE from "@/seo/site.json";
import ROUTES from "@/seo/routes.json";
import TESTS from "@/seo/pages.tests.json";
import PRACTICE from "@/seo/pages.practice.json";
import SPECIAL from "@/seo/pages.special.json";
import STATIC from "@/seo/pages.static.json";
import POSTS from "@/seo/blog.json";
import LESSONS from "@/seo/lessons.json";
import structuredData from "@/seo/structured-data.js";

const { PRODUCTION_ORIGIN, SITE_URL, absUrl, canonicalPath, normalizePath } = structuredData;

export const PAGE_LIST = [...TESTS, ...PRACTICE, ...SPECIAL, ...STATIC];

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

export {
  PRODUCTION_ORIGIN,
  SITE_URL,
  absUrl,
  canonicalPath,
  normalizePath,
  SITE,
  ROUTES,
  POSTS,
  LESSONS,
};
