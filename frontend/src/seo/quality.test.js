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
    expect(urls).toContain("https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2025.pdf");
    expect(urls).toContain("https://cpct.mp.gov.in/per/g01/pub/1172/ASM/WebPortal/1/downloads/score_card.pdf");
  });
});
