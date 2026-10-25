import { useEffect, useRef, useState } from "react";
import { ADSENSE_CONFIG, isValidAdSlot } from "@/config/adsense";
import { cn } from "@/lib/utils";

const VARIANT_HEIGHTS = {
  leaderboard: "min-h-[100px] sm:min-h-[90px]",
  rectangle: "min-h-[250px]",
  "in-article": "min-h-[250px]",
  rail: "min-h-[600px]",
};

/**
 * The only component that talks to AdSense. It keeps one <ins> per mounted
 * unit, pushes exactly once, never focuses anything and never reacts to keys.
 */
export const AdSenseUnit = ({
  slot,
  format = "auto",
  layout,
  responsive = true,
  className = "",
  variant = "leaderboard",
  isPaused = false,
  lazy = true,
}) => {
  const configured = isValidAdSlot(slot);
  const [everActive, setEverActive] = useState(!isPaused);
  const [visible, setVisible] = useState(!lazy);
  const [unfilled, setUnfilled] = useState(false);
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
    if (!configured || !everActive || !lazy) return undefined;
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
  }, [configured, everActive, lazy]);

  useEffect(() => {
    if (!configured || !everActive || !visible || pushedRef.current) return;
    const ins = insRef.current;
    if (!ins) return;
    // Set the guard before pushing so StrictMode's second effect run, a route
    // remount or a hot reload cannot initialize the same <ins> twice.
    pushedRef.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AdSense could not initialize this unit:", error);
      }
    }
  }, [configured, everActive, visible]);

  // Ad blockers and unfilled units never leave a permanent empty box behind.
  useEffect(() => {
    if (!configured || !everActive || !visible) return undefined;
    const ins = insRef.current;
    if (!ins) return undefined;
    const syncStatus = () => {
      const status = ins.getAttribute("data-ad-status");
      if (status === "unfilled") setUnfilled(true);
      if (status === "filled") setUnfilled(false);
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
    const timer = window.setTimeout(() => {
      if (!ins.getAttribute("data-ad-status")) setUnfilled(true);
    }, 6000);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [configured, everActive, visible]);

  if (!configured) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center",
          heightClass,
          className,
        )}
        data-ad-placeholder="true"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Advertisement
        </span>
        <span className="mt-2 text-xs text-muted-foreground/70">
          Advertisement (slot not configured)
        </span>
      </div>
    );
  }

  // If a unit was mounted before a pause began, it stays untouched. A unit
  // that is paused before its first mount is not created at all.
  if (isPaused && !everActive) return null;

  return (
    <div
      ref={wrapRef}
      className={cn("w-full", unfilled && "hidden", className)}
      data-ad-unit={variant}
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
