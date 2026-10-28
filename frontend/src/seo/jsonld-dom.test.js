import structuredData from "@/seo/structured-data.js";
import { clearStaleOwnedJsonLd, syncOwnedJsonLd } from "@/seo/jsonld-dom";

const { serializeJsonLd } = structuredData;

const addScript = (attrs, data) => {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
  script.textContent = serializeJsonLd(data);
  document.head.appendChild(script);
  return script;
};

const owned = (key, scope, path, data) =>
  addScript(
    {
      "data-seo-owned": "true",
      "data-seo-key": key,
      "data-seo-scope": scope,
      ...(path ? { "data-seo-path": path } : {}),
    },
    data,
  );

const scripts = (selector) => Array.from(document.head.querySelectorAll(selector));
const ownedScripts = () => scripts('script[data-seo-owned="true"]');
const byKey = (key) => document.head.querySelector(`script[data-seo-key="${key}"]`);

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Typinger",
};
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Typinger",
};
const webApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Typing test",
};
const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [],
};
const article = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Article",
};
const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [],
};

const homeEntries = [
  { key: "organization", scope: "site", data: organization },
  { key: "website", scope: "site", data: website },
  { key: "webapplication", scope: "route", path: "/", data: webApp },
  { key: "faq", scope: "route", path: "/", data: faq },
];

const articleEntries = [
  { key: "organization", scope: "site", data: organization },
  { key: "website", scope: "site", data: website },
  { key: "article", scope: "route", path: "/blog/how-to-type-faster", data: article },
  { key: "breadcrumb", scope: "route", path: "/blog/how-to-type-faster", data: breadcrumb },
];

afterEach(() => {
  scripts("script[type='application/ld+json']").forEach((script) => script.remove());
});

describe("owned JSON-LD lifecycle", () => {
  it("adopts prerendered nodes instead of appending duplicates", () => {
    const prerenderedOrganization = owned("organization", "site", null, organization);
    const prerenderedWebsite = owned("website", "site", null, website);
    const prerenderedWebApp = owned("webapplication", "route", "/", webApp);
    const prerenderedFaq = owned("faq", "route", "/", faq);

    syncOwnedJsonLd(homeEntries, "/");

    expect(ownedScripts()).toHaveLength(4);
    expect(byKey("organization")).toBe(prerenderedOrganization);
    expect(byKey("website")).toBe(prerenderedWebsite);
    expect(byKey("webapplication")).toBe(prerenderedWebApp);
    expect(byKey("faq")).toBe(prerenderedFaq);
  });

  it("is idempotent across repeated calls", () => {
    syncOwnedJsonLd(homeEntries, "/");
    const first = ownedScripts();
    const firstText = first.map((script) => script.textContent);

    syncOwnedJsonLd(homeEntries, "/");
    syncOwnedJsonLd(homeEntries, "/");

    expect(ownedScripts()).toEqual(first);
    expect(ownedScripts().map((script) => script.textContent)).toEqual(firstText);
  });

  it("collapses duplicate owned nodes for the same key", () => {
    owned("organization", "site", null, organization);
    owned("organization", "site", null, { ...organization, name: "Old Typinger" });

    syncOwnedJsonLd(homeEntries, "/");

    expect(scripts('script[data-seo-key="organization"]')).toHaveLength(1);
    expect(JSON.parse(byKey("organization").textContent).name).toBe("Typinger");
  });

  it("removes route schemas from the previous route and keeps site-wide entities", () => {
    syncOwnedJsonLd(homeEntries, "/");
    const organizationNode = byKey("organization");
    const websiteNode = byKey("website");

    clearStaleOwnedJsonLd("/blog/how-to-type-faster");
    syncOwnedJsonLd(articleEntries, "/blog/how-to-type-faster");

    expect(byKey("organization")).toBe(organizationNode);
    expect(byKey("website")).toBe(websiteNode);
    expect(byKey("webapplication")).toBeNull();
    expect(byKey("faq")).toBeNull();
    expect(byKey("article")).not.toBeNull();
    expect(byKey("breadcrumb")).not.toBeNull();
    expect(ownedScripts()).toHaveLength(4);
  });

  it("clears stale route schema immediately while async article data is loading", () => {
    syncOwnedJsonLd(homeEntries, "/");

    clearStaleOwnedJsonLd("/blog/new-article");

    expect(byKey("organization")).not.toBeNull();
    expect(byKey("website")).not.toBeNull();
    expect(byKey("webapplication")).toBeNull();
    expect(byKey("faq")).toBeNull();
  });

  it("adopts the legacy client marker without duplicating the entity", () => {
    addScript({ "data-seo": "jsonld" }, organization);

    syncOwnedJsonLd([{ key: "organization", scope: "site", data: organization }], "/");

    expect(scripts('script[data-seo="jsonld"]')).toHaveLength(0);
    expect(scripts('script[data-seo-key="organization"]')).toHaveLength(1);
  });

  it("never deletes or adopts unowned third-party JSON-LD", () => {
    const thirdParty = addScript(
      { "data-vendor": "analytics" },
      { "@context": "https://schema.org", "@type": "Organization", name: "Third party" },
    );

    syncOwnedJsonLd(homeEntries, "/");
    clearStaleOwnedJsonLd("/blog/");

    expect(thirdParty.isConnected).toBe(true);
    expect(thirdParty.getAttribute("data-seo-owned")).toBeNull();
    expect(thirdParty.textContent).toContain("Third party");
  });
});
