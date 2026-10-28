import { act } from "react";
import { createRoot } from "react-dom/client";
import TEST_PAGES from "@/seo/pages.tests.json";
import POSTS from "@/seo/blog.json";
import structuredData from "@/seo/structured-data.js";
import { buildSchemas } from "@/seo/schema";
import { Seo } from "@/components/Seo";

const { SCHEMA_KEYS, serializeJsonLd } = structuredData;

global.IS_REACT_ACT_ENVIRONMENT = true;

const homePage = TEST_PAGES.find((page) => page.path === "/");
const post = POSTS[0];

const homeSchemas = buildSchemas({
  kind: "home",
  path: "/",
  page: homePage,
  faqs: homePage.faqs,
});

const articleSchemas = buildSchemas({
  kind: "blog-post",
  path: `/blog/${post.slug}`,
  post,
  faqs: post.faqs || [],
  crumbs: [{ name: "Blog", path: "/blog/" }, { name: post.title }],
});

const articleWithoutFaq = buildSchemas({
  kind: "blog-post",
  path: `/blog/${post.slug}`,
  post,
  faqs: [],
  crumbs: [{ name: "Blog", path: "/blog/" }, { name: post.title }],
});

const addPrerendered = (schema) => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-seo-owned", "true");
  script.setAttribute("data-seo-key", schema.key);
  script.setAttribute("data-seo-scope", schema.scope);
  if (schema.path) script.setAttribute("data-seo-path", schema.path);
  script.textContent = serializeJsonLd(schema.data);
  document.head.appendChild(script);
};

const ownedScripts = () =>
  Array.from(document.head.querySelectorAll('script[data-seo-owned="true"]'));
const keys = () => ownedScripts().map((script) => script.getAttribute("data-seo-key"));

const renderSeo = async (root, props) => {
  await act(async () => {
    root.render(<Seo {...props} />);
  });
};

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  document.head
    .querySelectorAll('[data-seo="managed"], script[data-seo-owned="true"], script[data-seo="jsonld"]')
    .forEach((node) => node.remove());
});

describe("Seo component JSON-LD lifecycle", () => {
  it("adopts prerendered homepage schema instead of doubling it", async () => {
    homeSchemas.forEach(addPrerendered);
    const before = ownedScripts();

    await renderSeo(root, {
      path: "/",
      title: homePage.title,
      description: homePage.description,
      jsonLd: homeSchemas,
    });

    expect(ownedScripts()).toHaveLength(homeSchemas.length);
    expect(ownedScripts()).toEqual(before);
    expect(new Set(keys()).size).toBe(keys().length);
  });

  it("replaces homepage-only schema when the route changes to an article", async () => {
    homeSchemas.forEach(addPrerendered);

    await renderSeo(root, {
      path: "/",
      title: homePage.title,
      description: homePage.description,
      jsonLd: homeSchemas,
    });

    await renderSeo(root, {
      path: `/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      type: "article",
      jsonLd: articleSchemas,
    });

    expect(keys()).toContain(SCHEMA_KEYS.organization);
    expect(keys()).toContain(SCHEMA_KEYS.website);
    expect(keys()).toContain(SCHEMA_KEYS.article);
    expect(keys()).toContain(SCHEMA_KEYS.breadcrumb);
    expect(keys()).toContain(SCHEMA_KEYS.faq);
    expect(keys()).not.toContain(SCHEMA_KEYS.webApplication);
    expect(new Set(keys()).size).toBe(keys().length);

    const faq = JSON.parse(
      document.head.querySelector('script[data-seo-key="faq"]').textContent,
    );
    expect(faq.mainEntity.map((question) => question.name)).toEqual(
      post.faqs.map((question) => question.q),
    );
  });

  it("removes the homepage FAQ when the destination article has none", async () => {
    homeSchemas.forEach(addPrerendered);

    await renderSeo(root, {
      path: "/",
      title: homePage.title,
      description: homePage.description,
      jsonLd: homeSchemas,
    });

    await renderSeo(root, {
      path: `/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      type: "article",
      jsonLd: articleWithoutFaq,
    });

    expect(keys()).not.toContain(SCHEMA_KEYS.webApplication);
    expect(keys()).not.toContain(SCHEMA_KEYS.faq);
    expect(keys()).toContain(SCHEMA_KEYS.article);
  });
});
