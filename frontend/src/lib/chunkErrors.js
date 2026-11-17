const RETRY_KEY = "kq_chunk_reload_at";
const RETRY_WINDOW_MS = 15_000;

/**
 * A lazy route fails with one of these messages when a deploy replaced its
 * chunk between the HTML response and the import. The exact wording differs
 * between browsers and webpack versions, so match all known forms.
 */
export const isChunkLoadError = (error) => {
  const message = `${error?.name || ""} ${error?.message || ""} ${
    typeof error === "string" ? error : ""
  }`;
  return /ChunkLoadError|Loading chunk [\w.-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
};

/**
 * Allow one automatic reload per short window. If the fresh HTML still points
 * at a missing chunk, the error page is shown instead of looping forever.
 */
export const shouldRetryChunkLoad = (now = Date.now()) => {
  try {
    const last = Number(sessionStorage.getItem(RETRY_KEY) || 0);
    if (last && now - last < RETRY_WINDOW_MS) return false;
    sessionStorage.setItem(RETRY_KEY, String(now));
    return true;
  } catch {
    return false;
  }
};
