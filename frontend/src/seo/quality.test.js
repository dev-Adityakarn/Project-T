import fs from "fs";
import path from "path";
import { HOME_ROW, ROUTE_PASSAGES, makeTestText } from "../lib/testText";

const read = (relativePath) =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
const readJson = (relativePath) =>
  JSON.parse(read(relativePath));

const RETIRED_SLUGS = [
  "touch-typing-guide-for-beginners",
  "what-is-a-good-wpm-score",
  "ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide",
  "ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections",
  "how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description",
  "english-typing-test-for-10-minutes-a-government-exam-practice-guide",
];

const EDITORIAL_RESIDUE = [
  "Do not present the historical",
  "This is where a site like Typinger",
  "Users should distinguish between the official software",
  "META DESCRIPTION",
  "target keyword",
  "SEO strategy",
  "TODO:",
  "FIXME:",
];

const wordsOf = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const duplicatesLead = (paragraph, lead) => {
  if (!paragraph || !lead) return false;
  const a = wordsOf(lead);
  const b = wordsOf(paragraph);
  if (!a.length || !b.length) return false;
  if (paragraph.trim() === lead.trim()) return true;
  if (Math.min(a.length, b.length) < 12) return false;
  const leadWords = new Set(a);
  const overlap = b.filter((word) => leadWords.has(word)).length;
  return overlap / Math.min(a.length, b.length) >= 0.8;
};

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
    expect(html).not.toContain("<noscript>");
    expect(html).not.toContain("You need to enable JavaScript");
  });

  it("publishes a real support email, owner identity and jurisdiction", () => {
    const site = readJson("seo/site.json");
    const serialized = JSON.stringify(site);
    expect(serialized).not.toContain("typinger.app");
    expect(serialized).not.toContain("x.com/typinger");
    expect(serialized).not.toContain("github.com/typinger");
    expect(site.contactPath).toBe("/contact/");
    expect(site.supportEmail).toMatch(/^[^@\s]+@typinger\.in$/);
    expect(site.author).toBeTruthy();
    expect(site.owner?.author).toBeTruthy();
    expect(site.jurisdiction).toBe("India");
    expect(site.affiliationDisclaimer).toMatch(/not affiliated|independent/i);

    const practiceText = read("lib/testText.js") + read("seo/lessons.json");
    expect(practiceText).not.toContain("admin@typinger.app");
    expect(practiceText).not.toContain("98765 43210");
  });

  it("keeps blog dates, metadata and reading time valid without stubs", () => {
    const posts = readJson("seo/blog.json");
    expect(posts.length).toBeGreaterThanOrEqual(12);
    posts.forEach((post) => {
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(post.dateModified).getTime()).toBeGreaterThanOrEqual(
        new Date(post.datePublished).getTime(),
      );
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.blocks?.length).toBeGreaterThan(0);
      expect(Number.parseInt(post.readingTime, 10)).toBeGreaterThanOrEqual(3);
      const words = wordsOf(JSON.stringify(post.blocks)).length;
      expect(words).toBeGreaterThanOrEqual(500);
    });
  });

  it("retires duplicate articles and keeps permanent redirects to the canonicals", () => {
    const posts = readJson("seo/blog.json");
    const routes = readJson("seo/routes.json");
    const blogRoutes = routes.filter((route) => route.path.startsWith("/blog/"));
    const routePaths = routes.map((route) => route.path);
    const redirects = read("../public/_redirects");
    const appRoutes = read("lib/appRoutes.js");

    RETIRED_SLUGS.forEach((slug) => {
      expect(posts.some((post) => post.slug === slug)).toBe(false);
      expect(routePaths.some((route) => route.includes(slug))).toBe(false);
    });
    expect(routePaths).toContain(
      "/blog/ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan/",
    );
    expect(blogRoutes.length).toBe(posts.length + 1);

    [
      ["/blog/touch-typing-guide-for-beginners", "/blog/touch-typing-for-beginners/"],
      ["/blog/what-is-a-good-wpm-score", "/blog/what-is-a-good-typing-speed/"],
      ["/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide", "/blog/ssc-chsl-typing-test-2026/"],
      ["/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections", "/blog/ssc-chsl-typing-test-2026/"],
      ["/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description", "/blog/how-to-increase-typing-speed/"],
      ["/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide", "/blog/english-typing-test-1-5-10-minute/"],
    ].forEach(([from, to]) => {
      expect(redirects).toContain(`${from} ${to} 301`);
      expect(redirects).toContain(`${from}/ ${to} 301`);
    });
    expect(appRoutes).toContain('"/blog/what-is-a-good-wpm-score": "/blog/what-is-a-good-typing-speed/"');
    expect(appRoutes).toContain(
      '"/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections": "/blog/ssc-chsl-typing-test-2026/"',
    );
  });

  it("links only to live articles and keeps the important clusters reciprocal", () => {
    const posts = readJson("seo/blog.json");
    const slugs = new Set(posts.map((post) => post.slug));
    const linksTo = (slug, target) =>
      posts.find((post) => post.slug === slug).related?.some((link) => link.to === `/blog/${target}`);

    posts.forEach((post) => {
      (post.related || [])
        .filter((link) => link.to.startsWith("/blog/"))
        .forEach((link) => {
          const target = link.to.replace("/blog/", "").replace(/\/$/, "");
          expect(slugs.has(target)).toBe(true);
          expect(RETIRED_SLUGS).not.toContain(target);
        });
    });

    [
      ["how-to-type-faster", "how-to-increase-typing-speed"],
      ["what-is-a-good-typing-speed", "average-typing-speed-by-age"],
      ["ssc-chsl-typing-test-2026", "ssc-cgl-dest-2026-typing-test-format-and-15-minute-practice-plan"],
      ["ssc-chsl-typing-test-2026", "typing-speed-required-government-jobs-india"],
      ["rrb-ntpc-typing-test", "typing-speed-required-government-jobs-india"],
    ].forEach(([a, b]) => {
      expect(linksTo(a, b)).toBe(true);
      expect(linksTo(b, a)).toBe(true);
    });
  });

  it("removes leaked editorial instructions from public content", () => {
    const copy = [
      read("seo/blog.json"),
      read("seo/pages.tests.json"),
      read("seo/pages.practice.json"),
      read("seo/pages.special.json"),
      read("seo/pages.static.json"),
      read("seo/lessons.json"),
      read("lib/testText.js"),
    ].join("\n");

    EDITORIAL_RESIDUE.forEach((residue) => {
      expect(copy).not.toContain(residue);
    });
  });

  it("renders one consolidated sources list and does not repeat article leads", () => {
    const posts = readJson("seo/blog.json");
    posts.forEach((post) => {
      const sourceBlocks = (post.blocks || []).filter((block) => block.sources?.length);
      expect(sourceBlocks.length).toBeLessThanOrEqual(1);
      const first = post.blocks?.[0];
      if (first?.p?.length && !first.h2 && !first.h3) {
        expect(duplicatesLead(first.p[0], post.excerpt)).toBe(false);
      }
    });

    const renderer = read("components/SeoArticle.jsx");
    expect(renderer).toContain("withoutDuplicateLead");
    expect(renderer).toContain("collectSources");
  });

  it("does not present Typinger practice WPM as an official exam score", () => {
    const page = readJson("seo/pages.special.json").find(
      (entry) => entry.path === "/government-exam-typing-test",
    );
    const copy = JSON.stringify(page);
    expect(copy).not.toContain("Gross speed is calculated exactly as on this page");
    expect(copy).toContain("net-style practice measure");
    expect(copy).toContain("not affiliated with SSC");
    expect(copy).toContain("does not claim a universal cut-off");
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

  it("resolves every widget referenced by a page or article", () => {
    const widgets = readJson("seo/widgets.json");
    const posts = readJson("seo/blog.json");
    const pages = [
      ...readJson("seo/pages.tests.json"),
      ...readJson("seo/pages.practice.json"),
      ...readJson("seo/pages.special.json"),
      ...readJson("seo/pages.static.json"),
    ];
    [...posts, ...pages].forEach((entry) => {
      (entry.blocks || []).forEach((block) => {
        if (block.widget) expect(widgets[block.widget]).toBeTruthy();
      });
    });
  });

  it("scopes the beginner drill and early lessons to the keys already taught", () => {
    const lessons = readJson("seo/lessons.json");
    const allowed = new Map([
      [1, new Set("asdfjkl;")],
      [2, new Set("asdfjkl;gh")],
      [3, new Set("asdfjkl;gh")],
      [4, new Set("asdfjkl;gheiru")],
      [5, new Set("asdfjkl;gheirut yop".replace(/\s/g, ""))],
      [6, new Set("asdfjkl;gheirutyopqw".split(""))],
      [7, new Set("asdfjkl;gheirutyopqwvbnm".split(""))],
      [8, new Set("asdfjkl;gheirutyopqwvbnmzxc,.".split(""))],
    ]);

    lessons
      .filter((lesson) => allowed.has(lesson.id))
      .forEach((lesson) => {
        const invalid = [...new Set(lesson.text.toLowerCase().split(""))]
          .filter((character) => character !== " " && character !== "\n")
          .filter((character) => !allowed.get(lesson.id).has(character));
        expect({ lesson: lesson.id, invalid }).toEqual({ lesson: lesson.id, invalid: [] });
      });

    const homeRow = HOME_ROW.join(" ").toLowerCase();
    expect([...new Set(homeRow.split(""))].filter((key) => key !== " " && !"asdfjkl;".includes(key))).toEqual([]);
    expect(lessons.map((lesson) => lesson.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
  });

  it("gives the core test routes distinct, substantive passages", () => {
    const keys = ["home", "typing-test", "1-minute", "3-minute", "5-minute", "practice", "exam"];
    expect(Object.keys(ROUTE_PASSAGES).sort()).toEqual([...keys].sort());

    const openings = keys.map((key) => ROUTE_PASSAGES[key][0].slice(0, 80));
    expect(new Set(openings).size).toBe(keys.length);
    keys.forEach((key) => {
      const text = ROUTE_PASSAGES[key].join(" ");
      expect(wordsOf(text).length).toBeGreaterThanOrEqual(key === "5-minute" ? 400 : 60);
      expect(makeTestText("words", { passage: key, words: 200 }).startsWith(openings[keys.indexOf(key)])).toBe(true);
    });

    const pages = readJson("seo/pages.tests.json");
    const passages = pages
      .filter((page) => page.tool?.passage)
      .map((page) => page.tool.passage);
    expect(new Set(passages).size).toBe(passages.length);
  });

  it("exposes the primary navigation once and includes the content hubs", () => {
    const navbar = read("components/Navbar.jsx");
    expect(navbar).toContain('label: "Typing Tests"');
    expect(navbar).toContain('label: "Lessons"');
    expect(navbar).toContain('label: "Blog"');
    expect(navbar).not.toContain("mnav-");
    expect((navbar.match(/<nav/g) || []).length).toBe(1);
    expect((navbar.match(/links\.map/g) || []).length).toBe(1);
  });

  it("ships the custom code drill and the exam net-speed study calculator", () => {
    const special = readJson("seo/pages.special.json");
    const code = special.find((page) => page.path === "/typing-test/code");
    const exam = special.find((page) => page.path === "/government-exam-typing-test");
    expect(code.blocks.some((block) => block.widget === "custom-code-practice")).toBe(true);
    expect(code.faqs.find((faq) => faq.q === "Can I practise with my own snippets?")?.a).toContain(
      "stays in your browser",
    );
    expect(exam.blocks.some((block) => block.widget === "exam-net-speed")).toBe(true);
    expect(read("components/CustomCodePractice.jsx")).toContain("TypingTool");
    expect(read("components/ExamNetSpeedCalculator.jsx")).toContain("requiredCharacters");
  });
});
