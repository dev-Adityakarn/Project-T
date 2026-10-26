import { isAdEligibleRoute } from "@/config/adPolicy";

const readSlot = (name) => {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
};

export const ADSENSE_CONFIG = {
  publisherId: (process.env.REACT_APP_ADSENSE_PUBLISHER_ID || "ca-pub-4755033920004677").trim(),
  // Ads stay off unless an owner explicitly enables them after the CMP and
  // genuine manual slots are published.
  enabled: (process.env.REACT_APP_ADSENSE_ENABLED || "").trim().toLowerCase() === "true",
  // "google" = Google CMP configured in AdSense Privacy & messaging.
  // "external" = a Google-certified third-party CMP integration.
  cmpProvider: (process.env.REACT_APP_CMP_PROVIDER || "").trim().toLowerCase(),
};

/**
 * Ad unit slot IDs live in environment variables so no placeholder or fake
 * slot is ever shipped. Empty values are treated as "no ad configured".
 */
export const AD_SLOTS = {
  homepageAfterTest: readSlot("REACT_APP_ADSENSE_SLOT_HOMEPAGE_AFTER_TEST"),
  homepageContent: readSlot("REACT_APP_ADSENSE_SLOT_HOMEPAGE_CONTENT"),
  typingAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_TYPING_AFTER_RESULT"),
  practiceAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_PRACTICE_AFTER_RESULT"),
  lessonAfterCompletion: readSlot("REACT_APP_ADSENSE_SLOT_LESSON_AFTER_COMPLETION"),
  blogIndexInline: readSlot("REACT_APP_ADSENSE_SLOT_BLOG_INDEX_INLINE"),
  articleMid: readSlot("REACT_APP_ADSENSE_SLOT_ARTICLE_MID"),
  articleLower: readSlot("REACT_APP_ADSENSE_SLOT_ARTICLE_LOWER"),
  desktopRail: readSlot("REACT_APP_ADSENSE_SLOT_DESKTOP_RAIL"),
  examAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_EXAM_AFTER_RESULT"),
};

/** Google ad unit slots are numeric. Anything else is treated as unconfigured. */
export const isValidAdSlot = (slot) =>
  typeof slot === "string" && /^\d{6,20}$/.test(slot.trim());

export const isValidPublisherId = (publisherId) =>
  typeof publisherId === "string" && /^ca-pub-\d{16}$/.test(publisherId.trim());

export const AD_INTERACTIONS = new Set(["idle", "completed"]);

export const isCmpConfigured = () =>
  ADSENSE_CONFIG.cmpProvider === "google" || ADSENSE_CONFIG.cmpProvider === "external";

/**
 * The external-CMP adapter must set this value only after its own certified
 * consent flow has completed. A local checkbox or Consent Mode alone is not a
 * substitute for a Google-certified CMP.
 */
export const getExternalAdConsent = () => {
  if (typeof window === "undefined") return "unknown";
  const value = window.__typingerAdConsent;
  return value === "granted" || value === "denied" ? value : "unknown";
};

/** Google CMP needs its script to display the message; external CMP gates it. */
export const canLoadAdSenseScript = () => {
  if (!ADSENSE_CONFIG.enabled || !isValidPublisherId(ADSENSE_CONFIG.publisherId)) return false;
  if (ADSENSE_CONFIG.cmpProvider === "google") return true;
  if (ADSENSE_CONFIG.cmpProvider === "external") return getExternalAdConsent() === "granted";
  return false;
};

/**
 * A single decision point for every ad request:
 * enabled build + valid owner slot + configured CMP + eligible route +
 * idle/editorial or completed-result interaction.
 */
export const canRequestAds = ({
  slot,
  pathname = "/",
  interaction = "idle",
} = {}) => {
  if (!ADSENSE_CONFIG.enabled) return false;
  if (!isValidPublisherId(ADSENSE_CONFIG.publisherId)) return false;
  if (!isValidAdSlot(slot)) return false;
  if (!isCmpConfigured()) return false;
  if (ADSENSE_CONFIG.cmpProvider === "external" && getExternalAdConsent() !== "granted") return false;
  if (!AD_INTERACTIONS.has(interaction)) return false;
  if (!isAdEligibleRoute(pathname)) return false;
  return true;
};
