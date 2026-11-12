import { GAMES } from "@/data/games";
import {
  GAME_IDS,
  isAppRoute,
  normalizePath,
  redirectForPath,
  resolveRoute,
  robotsHeaderFor,
  shouldRedirectToTrailingSlash,
} from "@/lib/appRoutes";

describe("appRoutes", () => {
  it("normalizes paths without changing the root", () => {
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/blog/")).toBe("/blog");
    expect(normalizePath("/blog/how-to-type-faster/?x=1")).toBe("/blog/how-to-type-faster");
    expect(normalizePath("games")).toBe("/games");
  });

  it("keeps the Worker game list in sync with the app data", () => {
    expect([...GAME_IDS]).toEqual(GAMES.map((game) => game.id));
  });

  it("redirects legacy aliases and non-canonical URLs", () => {
    expect(redirectForPath("/typing-speed-test")).toBe("/typing-test/");
    expect(redirectForPath("/typing-speed-test/")).toBe("/typing-test/");
    expect(redirectForPath("/blog/index/")).toBe("/blog/");
    expect(redirectForPath("/blog/what-is-a-good-wpm-score")).toBe(
      "/blog/what-is-a-good-typing-speed/",
    );
    expect(
      redirectForPath(
        "/blog/ssc-chsl-typing-test-mistakes-full-errors-half-errors-and-corrections/",
      ),
    ).toBe("/blog/ssc-chsl-typing-test-2026/");
    expect(
      redirectForPath(
        "/blog/english-typing-test-for-10-minutes-a-government-exam-practice-guide",
      ),
    ).toBe("/blog/english-typing-test-1-5-10-minute/");
    expect(resolveRoute("/typing-test")).toEqual({
      type: "redirect",
      location: "/typing-test/",
      status: 301,
    });
    expect(resolveRoute("/login")).toEqual({
      type: "redirect",
      location: "/login/",
      status: 301,
    });
  });

  it("does not add a trailing slash to admin URLs", () => {
    expect(shouldRedirectToTrailingSlash("/admin")).toBe(false);
    expect(resolveRoute("/admin")).toEqual({ type: "app-shell" });
    expect(resolveRoute("/admin/users/abc")).toEqual({ type: "app-shell" });
  });

  it("serves the SPA shell for valid app and dynamic routes", () => {
    [
      "/",
      "/typing-test/",
      "/typing-practice/beginners/",
      "/blog/",
      "/blog/how-to-type-faster/",
      "/games/",
      "/games/speed-test/",
      "/daily/",
      "/leaderboard/",
      "/dashboard/",
      "/register/",
    ].forEach((path) => {
      expect(resolveRoute(path)).toEqual({ type: "app-shell" });
    });
  });

  it("redirects the consolidated article slugs permanently", () => {
    [
      ["/blog/touch-typing-guide-for-beginners/", "/blog/touch-typing-for-beginners/"],
      ["/blog/what-is-a-good-wpm-score/", "/blog/what-is-a-good-typing-speed/"],
      [
        "/blog/ssc-chsl-typing-test-2026-speed-duration-and-preparation-guide/",
        "/blog/ssc-chsl-typing-test-2026/",
      ],
      [
        "/blog/how-to-increase-typing-speed-30-day-plan-to-reach-40-wpm-meta-description",
        "/blog/how-to-increase-typing-speed/",
      ],
    ].forEach(([from, to]) => {
      expect(resolveRoute(from)).toEqual({
        type: "redirect",
        location: to,
        status: 301,
      });
    });
  });

  it("returns a real not-found decision for unknown paths and API paths", () => {
    [
      "/does-not-exist",
      "/games/not-a-game",
      "/games/not-a-game/",
      "/blog/foo/bar",
      "/api",
      "/api/leaderboard",
      "/404",
      "/404.html",
      "/sitemap.xml",
    ].forEach((path) => {
      expect(resolveRoute(path)).toEqual({ type: "not-found" });
    });
  });

  it("recognizes only real game ids and single-segment blog slugs", () => {
    expect(isAppRoute("/games/speed-test")).toBe(true);
    expect(isAppRoute("/games/not-a-game")).toBe(false);
    expect(isAppRoute("/blog/how-to-type-faster")).toBe(true);
    expect(isAppRoute("/blog/foo/bar")).toBe(false);
    expect(isAppRoute("/administrator")).toBe(false);
  });

  it("sets robots headers for app routes without blanket-noindexing editorial pages", () => {
    expect(robotsHeaderFor("/admin/users/1")).toBe("noindex, nofollow");
    expect(robotsHeaderFor("/dashboard/")).toBe("noindex, follow");
    expect(robotsHeaderFor("/games/speed-test/")).toBe("noindex, follow");
    expect(robotsHeaderFor("/games/")).toBeNull();
    expect(robotsHeaderFor("/blog/how-to-type-faster/")).toBeNull();
    expect(robotsHeaderFor("/typing-test/")).toBeNull();
  });
});
