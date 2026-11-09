import fs from "fs";
import path from "path";

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
const readJson = (relativePath) =>
  JSON.parse(read(relativePath));

describe("site quality regressions", () => {
  it("uses documented AdSense status signals instead of a collapse timer", () => {
    const source = read("components/ads/AdSenseUnit.jsx");
    expect(source).toContain("data-ad-status");
    expect(source).toContain("unfilled");
    expect(source).toContain("unfill-optimized");
    expect(source).not.toMatch(/setTimeout\s*\(/);
    expect(source).not.toMatch(/\b6000\b/);
  });

  it("does not place ad components on game, daily or leaderboard screens", () => {
    ["pages/Games.jsx", "pages/GamePlay.jsx", "pages/Daily.jsx", "pages/Leaderboard.jsx"].forEach((file) => {
      const source = read(file);
      expect(source).not.toMatch(/AdSenseUnit|AdInArticle|AdAfterResult|AdRailLayout|AdSideRail/);
    });
  });

  it("does not load AdSense, PostHog or Emergent from the HTML shell", () => {
    const html = read("../public/index.html");
    expect(html).not.toContain("pagead2.googlesyndication.com");
    expect(html).not.toContain("posthog");
    expect(html).not.toContain("emergent-main.js");
    expect(html).toContain('name="google-adsense-account"');
  });

  it("does not publish the dead mailbox or dead social profiles", () => {
    const site = readJson("seo/site.json");
    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain("typinger.app");
    expect(serialized).not.toContain("x.com/typinger");
    expect(serialized).not.toContain("github.com/typinger");
    expect(site.contactPath).toBe("/contact/");

    const practiceText = read("lib/testText.js") + read("seo/lessons.json");
    expect(practiceText).not.toContain("admin@typinger.app");
    expect(practiceText).not.toContain("98765 43210");
  });

  it("keeps blog dates valid and records the editorial update", () => {
    const posts = readJson("seo/blog.json");
    expect(posts.length).toBeGreaterThan(0);
    posts.forEach((post) => {
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(post.dateModified).getTime()).toBeGreaterThanOrEqual(
        new Date(post.datePublished).getTime(),
      );
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.blocks?.length).toBeGreaterThan(0);
    });
  });

  it("cross-links overlapping guides in both directions", () => {
    const posts = readJson("seo/blog.json");
    const linksTo = (slug, target) =>
      posts.find((post) => post.slug === slug).related?.some((link) => link.to === `/blog/${target}`);

    [
      ["how-to-type-faster", "how-to-increase-typing-speed"],
      ["what-is-a-good-wpm-score", "what-is-a-good-typing-speed"],
      ["touch-typing-guide-for-beginners", "touch-typing-for-beginners"],
    ].forEach(([a, b]) => {
      expect(linksTo(a, b)).toBe(true);
      expect(linksTo(b, a)).toBe(true);
    });
  });

  it("does not present Typinger practice WPM as an official exam score", () => {
    const page = readJson("seo/pages.special.json").find(
      (entry) => entry.path === "/government-exam-typing-test",
    );
    const copy = JSON.stringify(page);
    expect(copy).not.toContain("Gross speed is calculated exactly as on this page");
    expect(copy).toContain("net-style practice score");
    expect(copy).toContain("not the official exam client");
  });

  it("cites official sources for the government-exam speed claims", () => {
    const sources = [
      ...readJson("seo/pages.special.json").flatMap((page) => page.blocks || []),
      ...readJson("seo/blog.json").flatMap((post) => post.blocks || []),
    ].flatMap((block) => block.sources || []);

    expect(sources.length).toBeGreaterThanOrEqual(2);
    sources.forEach((source) => {
      expect(source.label).toBeTruthy();
      expect(source.url).toMatch(/^https:\/\//);
    });
    const urls = sources.map((source) => source.url);
    expect(urls).toContain("https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf");
    expect(urls).toContain("https://www.cpct.mp.gov.in/per/g01/pub/1172/ASM/WebPortal/1/Hindi/PDF/CPCT_Rule_book_V1.3.pdf");
  });

  it("does not repeat outdated exam-cycle or unsupported average claims", () => {
    const blog = read("seo/blog.json");
    const testPages = read("seo/pages.tests.json");
    const specialPages = read("seo/pages.special.json");
    const practicePages = read("seo/pages.practice.json");

    [blog, testPages, specialPages].forEach((copy) => {
      expect(copy).not.toContain("SSC CHSL 2025");
      expect(copy).not.toContain("CPCT score card");
    });
    expect(testPages).not.toContain("gross speed is the number of correctly typed characters");
    expect(testPages).not.toContain("you get net WPM");
    expect(testPages).not.toContain("average for an adult typing in English");
    expect(testPages).not.toContain("total keystrokes and a score");
    expect(testPages).not.toContain("only from the time you actually typed");
    expect(testPages).not.toContain("5 to 10 percent");
    expect(testPages).not.toContain("Sign in first");
    expect(blog).not.toContain("higher effective rate");
    expect(blog).not.toContain("same physical effort");
    expect(blog).not.toContain("largest public dataset");
    expect(practicePages).not.toContain("practice results stored");
  });

  it("keeps every timed test route at its advertised duration", () => {
    const pages = readJson("seo/pages.tests.json");
    const expected = {
      "/typing-test/1-minute": 60,
      "/typing-test/3-minute": 180,
      "/typing-test/5-minute": 300,
    };

    Object.entries(expected).forEach(([route, seconds]) => {
      const page = pages.find((entry) => entry.path === route);
      expect(page).toBeTruthy();
      expect(page.tool.duration).toBe(seconds);
      expect(page.tool.durations || [page.tool.duration]).toContain(seconds);
    });

    pages.forEach((page) => {
      expect(page.tool.duration).toBeGreaterThan(0);
      (page.tool.durations || []).forEach((duration) => expect(duration).toBeGreaterThan(0));
    });
  });

  it("resolves every widget referenced by an article", () => {
    const widgets = readJson("seo/widgets.json");
    const posts = readJson("seo/blog.json");
    posts.forEach((post) => {
      (post.blocks || []).forEach((block) => {
        if (block.widget) expect(widgets[block.widget]).toBeTruthy();
      });
    });
  });
});
