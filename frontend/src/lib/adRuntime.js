import { ADSENSE_CONFIG, canLoadAdSenseScript } from "@/config/adsense";

let state = "idle";
let loadPromise = null;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener(state));

export const getAdRuntimeState = () => state;

export const subscribeAdRuntime = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Loads the AdSense tag at most once. The Google CMP path needs this script
 * before consent exists so the consent message can be displayed; external CMP
 * providers must grant consent first. Ad units are gated separately.
 */
export const ensureAdSenseScript = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (state === "ready") return Promise.resolve(true);
  if (state === "failed") return Promise.resolve(false);
  if (loadPromise) return loadPromise;
  if (!canLoadAdSenseScript()) return Promise.resolve(false);

  state = "loading";
  notify();

  loadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CONFIG.publisherId)}`;
    script.setAttribute("data-typinger-adsense", "true");
    script.onload = () => {
      state = "ready";
      notify();
      resolve(true);
    };
    script.onerror = () => {
      state = "failed";
      notify();
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

/** Test-only reset; never used by production code. */
export const resetAdRuntimeForTests = () => {
  state = "idle";
  loadPromise = null;
  listeners.clear();
  if (typeof document !== "undefined") {
    document.querySelectorAll('script[data-typinger-adsense="true"]').forEach((node) => node.remove());
  }
};
