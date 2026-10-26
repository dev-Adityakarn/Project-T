import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { ADSENSE_CONFIG, isValidAdSlot } from "@/config/adsense";
import { isAdEligibleRoute } from "@/config/adPolicy";
import { cn } from "@/lib/utils";

const RAIL_QUERY = "(min-width: 1280px)";

const useIsDesktopRail = () => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(RAIL_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia(RAIL_QUERY);
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return matches;
};

/**
 * Desktop-only rail. It is not mounted below xl, so no request is made and no
 * space is reserved on tablets or phones. It is deliberately non-sticky.
 */
export const AdSideRail = ({ slot, className = "" }) => {
  const isDesktop = useIsDesktopRail();
  const { pathname } = useLocation();
  if (!isDesktop || !isAdEligibleRoute(pathname)) return null;
  // Production never creates a rail for an unconfigured or disabled build.
  if (!ADSENSE_CONFIG.enabled && process.env.NODE_ENV === "production") return null;
  if (!isValidAdSlot(slot) && process.env.NODE_ENV === "production") return null;

  return (
    <aside
      className={cn("w-full", className)}
      aria-label="Advertisement"
      data-testid="ad-side-rail"
    >
      <AdSenseUnit slot={slot} variant="rail" format="auto" className="w-full" />
    </aside>
  );
};

/**
 * Adds a fixed-width rail column only when ads are enabled and a rail slot
 * exists. Pass enabled=false on pages where a rail is deliberately not wanted.
 */
export const AdRailLayout = ({ slot, children, className = "", enabled = true }) => {
  const { pathname } = useLocation();
  const routeAllowed = isAdEligibleRoute(pathname);
  const showRail =
    enabled &&
    routeAllowed &&
    ((ADSENSE_CONFIG.enabled && isValidAdSlot(slot)) ||
      process.env.NODE_ENV !== "production");
  if (!showRail) return children;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-10",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <AdSideRail slot={slot} />
    </div>
  );
};
