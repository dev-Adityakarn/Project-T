import {
  ADSENSE_CONFIG,
  canRequestAds,
  isValidAdSlot,
  isValidPublisherId,
} from "@/config/adsense";
import { adPolicyFor, isAdEligibleRoute } from "@/config/adPolicy";

describe("ad policy", () => {
  it("allows editorial pages and completed-result surfaces", () => {
    [
      "/",
      "/blog",
      "/blog/how-to-type-faster/",
      "/typing-test/",
      "/typing-practice/beginners/",
      "/typing-lessons/",
      "/hindi-typing-test/",
      "/government-exam-typing-test/",
    ].forEach((path) => {
      expect(isAdEligibleRoute(path)).toBe(true);
    });
  });

  it("blocks app, game, leaderboard, daily and error routes", () => {
    [
      "/dashboard",
      "/login",
      "/register",
      "/admin",
      "/admin/users/1",
      "/games",
      "/games/",
      "/games/speed-test",
      "/daily",
      "/daily/",
      "/leaderboard",
      "/leaderboard/",
      "/404",
      "/404.html",
      "/unknown",
    ].forEach((path) => {
      expect(isAdEligibleRoute(path)).toBe(false);
    });
  });

  it("explains why a route is blocked", () => {
    expect(adPolicyFor("/games/speed-test").reason).toMatch(/game/i);
    expect(adPolicyFor("/daily/").reason).toMatch(/app|game|error/i);
    expect(adPolicyFor("/blog").reason).toMatch(/editorial/i);
  });

  it("accepts only numeric slot IDs and the configured publisher ID", () => {
    expect(isValidAdSlot("1234567890")).toBe(true);
    expect(isValidAdSlot(" 1234567890 ")).toBe(true);
    expect(isValidAdSlot("")).toBe(false);
    expect(isValidAdSlot("auto")).toBe(false);
    expect(isValidAdSlot("12345")).toBe(false);
    expect(isValidPublisherId("ca-pub-4755033920004677")).toBe(true);
    expect(isValidPublisherId("ca-pub-123")).toBe(false);
  });

  it("does not request ads in a build that has not been explicitly enabled", () => {
    expect(ADSENSE_CONFIG.enabled).toBe(false);
    expect(
      canRequestAds({ slot: "1234567890", pathname: "/blog/how-to-type-faster/" }),
    ).toBe(false);
  });
});
