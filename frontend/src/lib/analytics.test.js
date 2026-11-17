const GA_SCRIPT = 'script[src*="googletagmanager.com/gtag/js"]';
const calls = () => (window.dataLayer || []).map((entry) => Array.from(entry));

describe("analytics consent behavior", () => {
  const originalId = process.env.REACT_APP_GA_ID;

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    delete window.dataLayer;
    delete window.gtag;
    document.head.querySelectorAll(GA_SCRIPT).forEach((node) => node.remove());
    document.head.querySelectorAll('script[data-testid="ga-test"]').forEach((node) => node.remove());
    delete window["ga-disable-G-TEST"];
  });

  afterEach(() => {
    if (originalId === undefined) delete process.env.REACT_APP_GA_ID;
    else process.env.REACT_APP_GA_ID = originalId;
  });

  it("reports no analytics service when the measurement ID is empty", () => {
    process.env.REACT_APP_GA_ID = "";
    const analytics = require("./analytics");

    expect(analytics.isAnalyticsConfigured()).toBe(false);
    expect(analytics.loadAnalytics()).toBe(false);
    expect(document.querySelector(GA_SCRIPT)).toBeNull();
  });

  it("does not load GA before the user accepts", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    const analytics = require("./analytics");

    expect(analytics.loadAnalytics()).toBe(false);
    expect(document.querySelector(GA_SCRIPT)).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  it("loads GA after acceptance and records denied then granted consent", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    const analytics = require("./analytics");

    expect(analytics.applyConsent("accepted")).toBe(true);

    expect(document.querySelector(GA_SCRIPT)).toBeTruthy();
    expect(localStorage.getItem("kq_cookie_consent")).toBe("accepted");
    expect(window["ga-disable-G-TEST"]).toBe(false);

    const events = calls();
    expect(events[0]).toEqual(["consent", "default", { analytics_storage: "denied" }]);
    expect(events.some((event) => event[0] === "consent" && event[1] === "update" && event[2].analytics_storage === "granted")).toBe(true);
    expect(events.some((event) => event[0] === "config" && event[1] === "G-TEST")).toBe(true);
  });

  it("withdraws consent by disabling GA and updating Consent Mode", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    const analytics = require("./analytics");

    analytics.applyConsent("accepted");
    analytics.applyConsent("rejected");

    expect(localStorage.getItem("kq_cookie_consent")).toBe("rejected");
    expect(window["ga-disable-G-TEST"]).toBe(true);
    expect(
      calls().some(
        (event) =>
          event[0] === "consent" &&
          event[1] === "update" &&
          event[2].analytics_storage === "denied",
      ),
    ).toBe(true);
  });

  it("never sends events without accepted consent", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    const analytics = require("./analytics");

    analytics.setConsent("rejected");
    analytics.trackPageview("/blog/", "Blog");
    analytics.trackEvent("test_event");

    const events = calls();
    expect(events.some((event) => event[0] === "event")).toBe(false);
  });

  it("does not set advertising consent signals", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    const analytics = require("./analytics");

    analytics.applyConsent("accepted");

    calls().forEach((event) => {
      if (event[0] === "consent") {
        expect(Object.keys(event[2])).toEqual(["analytics_storage"]);
      }
    });
  });
});
