import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ADSENSE_CONFIG,
  canRequestAds,
  isValidAdSlot,
} from "@/config/adsense";
import { adPolicyFor } from "@/config/adPolicy";
import { ensureAdSenseScript } from "@/lib/adRuntime";
import { cn } from "@/lib/utils";

const VARIANT_HEIGHTS = {
  leaderboard: "min-h-[100px] sm:min-h-[90px]",
  rectangle: "min-h-[250px]",
  "in-article": "min-h-[250px]",
  rail: "min-h-[600px]",
};

/**
 * The only component that creates an AdSense unit. It keeps one <ins> per
 * mounted unit, pushes exactly once, never focuses anything and never reacts
 * to keys. Eligibility is decided by canRequestAds() before any request.
 */
export const AdSenseUnit = ({
  slot,
  format = "auto",
  layout,
  responsive = true,
  className = "",
  variant = "leaderboard",
  isPaused = false,
  interaction = "idle",
  lazy = true,
}) => {
  const { pathname } = useLocation();
  const policy = adPolicyFor(pathname);
  const configured = isValidAdSlot(slot);
  const requestAllowed = canRequestAds({ slot, pathname, interaction });
  const [everActive, setEverActive] = useState(!isPaused);
  const [visible, setVisible] = useState(!lazy);
  const [scriptState, setScriptState] = useState("idle");
  const [adStatus, setAdStatus] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const wrapRef = useRef(null);
  const insRef = useRef(null);
  const pushedRef = useRef(false);
  const heightClass = VARIANT_HEIGHTS[variant] || VARIANT_HEIGHTS.leaderboard;

  useEffect(() => {
    if (!isPaused) setEverActive(true);
  }, [isPaused]);

  // Below-the-fold units wait for the viewport, but their space is already
  // reserved by the min-height so the wait cannot shift the page.
  useEffect(() => {
    if (!requestAllowed || !everActive || !lazy) return undefined;
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [requestAllowed, everActive, lazy]);

  useEffect(() => {
    if (!requestAllowed || !everActive || !visible || pushedRef.current) return undefined;
    let cancelled = false;

    ensureAdSenseScript().then((ready) => {
      if (cancelled) return;
      if (!ready) {
        setScriptState("failed");
        return;
      }
      const ins = insRef.current;
      if (!ins) return;
      // Set the guard before pushing so StrictMode's second effect run, a route
      // remount or a hot reload cannot initialize the same <ins> twice.
      pushedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        setScriptState("ready");
      } catch (error) {
        setScriptState("failed");
        if (process.env.NODE_ENV !== "production") {
          console.warn("AdSense could not initialize this unit:", error);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [requestAllowed, everActive, visible]);

  // Use the documented fill signal, never a timer. "unfilled" is the only
  // state that may collapse; "unfill-optimized" must stay visible. An unfilled
  // unit that is still in the viewport keeps its reserved space to avoid CLS.
  useEffect(() => {
    if (!requestAllowed || !everActive || !visible || scriptState !== "ready") return undefined;
    const ins = insRef.current;
    if (!ins) return undefined;

    const syncStatus = () => {
      const status = ins.getAttribute("data-ad-status");
      if (status === "filled") {
        setAdStatus("filled");
        setCollapsed(false);
        return;
      }
      if (status === "unfill-optimized") {
        setAdStatus("unfill-optimized");
        setCollapsed(false);
        return;
      }
      if (status === "unfilled") {
        setAdStatus("unfilled");
        const rect = ins.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
        setCollapsed(!inViewport);
      }
    };

    syncStatus();
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(syncStatus);
    observer?.observe(ins, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });
    return () => observer?.disconnect();
  }, [requestAllowed, everActive, visible, scriptState]);

  if (!policy.allowed) return null;

  if (!requestAllowed) {
    if (process.env.NODE_ENV === "production") return null;
    const reason = !ADSENSE_CONFIG.enabled
      ? "disabled"
      : !configured
        ? "slot"
        : "consent-or-route";
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center",
          heightClass,
          className,
        )}
        data-ad-placeholder="true"
        data-ad-placeholder-reason={reason}
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Advertisement
        </span>
        <span className="mt-2 text-xs text-muted-foreground/70">
          {reason === "disabled"
            ? "Advertisement (disabled in this build)"
            : reason === "slot"
              ? "Advertisement (slot not configured)"
              : "Advertisement (consent or route not eligible)"}
        </span>
      </div>
    );
  }

  // If a unit was mounted before a pause began, it stays untouched. A unit
  // that is paused before its first mount is not created at all.
  if (isPaused && !everActive) return null;
  if (scriptState === "failed") return null;

  return (
    <div
      ref={wrapRef}
      className={cn("w-full", collapsed && "hidden", className)}
      data-ad-unit={variant}
      data-ad-interaction={interaction}
      data-ad-state={adStatus || scriptState}
      aria-label="Advertisement"
    >
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
        Advertisement
      </div>
      <ins
        ref={insRef}
        className={cn(
          "adsbygoogle block w-full overflow-hidden rounded-xl bg-muted/10",
          heightClass,
        )}
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout || undefined}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
};
