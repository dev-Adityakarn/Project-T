import SITE from "@/seo/site.json";
import TEST_PAGES from "@/seo/pages.tests.json";
import POSTS from "@/seo/blog.json";
import structuredData from "@/seo/structured-data.js";

const {
  SCHEMA_KEYS,
  SCHEMA_SCOPES,
  absUrl,
  canonicalPath,
  breadcrumbSchema,
  buildRouteSchemas,
  serializeJsonLd,
} = structuredData;

const homePage = TEST_PAGES.find((page) => page.path === "/");
const oneMinute = TEST_PAGES.find((page) => page.path === "/typing-test/1-minute");
const post = POSTS[0];

const keys = (schemas) => schemas.map((schema) => schema.key);

describe("shared structured-data model", () => {
  it("builds canonical trailing-slash URLs", () => {
    expect(canonicalPath("/typing-test/1-minute")).toBe("/typing-test/1-minute/");
    expect(canonicalPath("/typing-test/1-minute/")).toBe("/typing-test/1-minute/");
    expect(canonicalPath("/")).toBe("/");
    expect(absUrl("/typing-test/1-minute")).toBe("https://typinger.in/typing-test/1-minute/");
    expect(absUrl("/")).toBe("https://typinger.in/");
  });

  it("uses the current page canonical URL for the final breadcrumb item", () => {
    const schema = breadcrumbSchema({
      crumbs: oneMinute.breadcrumbs,
      currentPath: oneMinute.path,
    });

    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[1]).toMatchObject({
      position: 2,
      name: "Typing speed test",
      item: "https://typinger.in/typing-test/",
    });
    expect(schema.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "1 minute",
      item: "https://typinger.in/typing-test/1-minute/",
    });
  });

  it("omits the final item instead of falling back to the homepage", () => {
    const schema = breadcrumbSchema({ crumbs: oneMinute.breadcrumbs });
    expect(schema.itemListElement.at(-1)).not.toHaveProperty("item");
    expect(schema.itemListElement.at(-1).name).toBe("1 minute");
  });

  it("does not invent a homepage URL for a parent crumb without a path", () => {
    const schema = breadcrumbSchema({
      crumbs: [{ name: "Typing speed test" }, { name: "1 minute" }],
      currentPath: "/typing-test/1-minute",
    });
    expect(schema.itemListElement[1]).not.toHaveProperty("item");
    expect(schema.itemListElement[2].item).toBe("https://typinger.in/typing-test/1-minute/");
  });

  it("builds one keyed site-wide set plus homepage-only entities", () => {
    const schemas = buildRouteSchemas({
      kind: "home",
      site: SITE,
      path: "/",
      page: homePage,
      faqs: homePage.faqs,
    });

    expect(keys(schemas)).toEqual([
      SCHEMA_KEYS.organization,
      SCHEMA_KEYS.website,
      SCHEMA_KEYS.webApplication,
      SCHEMA_KEYS.faq,
    ]);
    expect(new Set(keys(schemas)).size).toBe(schemas.length);
    expect(schemas.find((s) => s.key === SCHEMA_KEYS.organization).scope).toBe(SCHEMA_SCOPES.site);
    expect(schemas.find((s) => s.key === SCHEMA_KEYS.faq).scope).toBe(SCHEMA_SCOPES.route);
    expect(schemas.find((s) => s.key === SCHEMA_KEYS.faq).path).toBe("/");
  });

  it("builds an article route without homepage WebApplication or FAQ leakage", () => {
    const schemas = buildRouteSchemas({
      kind: "blog-post",
      site: SITE,
      path: `/blog/${post.slug}`,
      post,
      faqs: [],
      crumbs: [{ name: "Blog", path: "/blog/" }, { name: post.title }],
    });

    expect(keys(schemas)).toEqual([
      SCHEMA_KEYS.organization,
      SCHEMA_KEYS.website,
      SCHEMA_KEYS.article,
      SCHEMA_KEYS.breadcrumb,
    ]);
    expect(keys(schemas)).not.toContain(SCHEMA_KEYS.webApplication);
    expect(keys(schemas)).not.toContain(SCHEMA_KEYS.faq);

    const article = schemas.find((s) => s.key === SCHEMA_KEYS.article);
    expect(article.data.mainEntityOfPage["@id"]).toBe(`https://typinger.in/blog/${post.slug}/`);

    const breadcrumb = schemas.find((s) => s.key === SCHEMA_KEYS.breadcrumb);
    expect(breadcrumb.data.itemListElement.at(-1).item).toBe(
      `https://typinger.in/blog/${post.slug}/`,
    );
  });

  it("keeps game WebApplication data but never marks it indexable by itself", () => {
    const schemas = buildRouteSchemas({
      kind: "game",
      site: SITE,
      path: "/games/speed-test",
      page: {
        path: "/games/speed-test",
        title: "Speed Test",
        description: "Test your typing speed.",
      },
      crumbs: [{ name: "Typing games", path: "/games/" }, { name: "Speed Test" }],
    });

    expect(keys(schemas)).toContain(SCHEMA_KEYS.webApplication);
    expect(keys(schemas)).toContain(SCHEMA_KEYS.breadcrumb);
    expect(schemas.every((schema) => schema.key !== SCHEMA_KEYS.faq)).toBe(true);
  });

  it("returns only site-wide entities for shells", () => {
    const schemas = buildRouteSchemas({ kind: "shell", site: SITE, path: "/login" });
    expect(keys(schemas)).toEqual([SCHEMA_KEYS.organization, SCHEMA_KEYS.website]);
  });

  it("serialises JSON-LD with script-safe escaping", () => {
    const serialized = serializeJsonLd({ text: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script");
    expect(JSON.parse(serialized).text).toBe("</script><script>alert(1)</script>");
  });
});
