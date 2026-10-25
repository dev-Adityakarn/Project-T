const readSlot = (name) => {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
};

export const ADSENSE_CONFIG = {
  publisherId: (process.env.REACT_APP_ADSENSE_PUBLISHER_ID || "ca-pub-4755033920004677").trim(),
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
  gameAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_GAME_AFTER_RESULT"),
  gamesListingInline: readSlot("REACT_APP_ADSENSE_SLOT_GAMES_LISTING_INLINE"),
  blogIndexInline: readSlot("REACT_APP_ADSENSE_SLOT_BLOG_INDEX_INLINE"),
  articleMid: readSlot("REACT_APP_ADSENSE_SLOT_ARTICLE_MID"),
  articleLower: readSlot("REACT_APP_ADSENSE_SLOT_ARTICLE_LOWER"),
  desktopRail: readSlot("REACT_APP_ADSENSE_SLOT_DESKTOP_RAIL"),
  dailyAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_DAILY_AFTER_RESULT"),
  leaderboardInline: readSlot("REACT_APP_ADSENSE_SLOT_LEADERBOARD_INLINE"),
  examAfterResult: readSlot("REACT_APP_ADSENSE_SLOT_EXAM_AFTER_RESULT"),
};

/** Google ad unit slots are numeric. Anything else is treated as unconfigured. */
export const isValidAdSlot = (slot) =>
  typeof slot === "string" && /^\d{6,20}$/.test(slot.trim());
