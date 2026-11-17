const KEY = "kq_cookie_consent";
let loaded = false;

const analyticsId = () => (process.env.REACT_APP_GA_ID || "").trim();

/** An empty measurement ID means there is no analytics service to consent to. */
export const isAnalyticsConfigured = () => Boolean(analyticsId());

export const getConsent = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setConsent = (value) => {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // A blocked storage API must not break the page. The in-memory decision
    // still controls whether analytics can load for this page view.
  }
};

const ensureGtag = () => {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    // Only analytics storage is managed here. Advertising consent belongs to
    // Google's certified CMP, so this code must not set ad_* signals.
    window.gtag("consent", "default", { analytics_storage: "denied" });
  }
};

const disableKey = (id) => `ga-disable-${id}`;

export const denyAnalytics = () => {
  const id = analyticsId();
  if (!id) return;
  window[disableKey(id)] = true;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
};

/**
 * Loads GA4 only after an explicit Accept. Google Consent Mode defaults to
 * denied, then is updated to granted for analytics_storage. Ads are not
 * touched: a Google-certified CMP owns advertising consent separately.
 */
export const loadAnalytics = () => {
  const id = analyticsId();
  if (!id || getConsent() !== "accepted") return false;

  window[disableKey(id)] = false;
  ensureGtag();

  if (!loaded) {
    loaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("consent", "update", { analytics_storage: "granted" });
  window.gtag("config", id, { anonymize_ip: true, send_page_view: false });
  return true;
};

/** Persist and apply a decision. Rejecting stops further GA collection. */
export const applyConsent = (value) => {
  if (value !== "accepted" && value !== "rejected") return false;
  setConsent(value);
  if (value === "accepted") return loadAnalytics();
  denyAnalytics();
  return false;
};

export const trackPageview = (path, title) => {
  if (getConsent() !== "accepted" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", { page_path: path, page_title: title, page_location: window.location.href });
};

export const trackEvent = (name, params = {}) => {
  if (getConsent() !== "accepted" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
};
