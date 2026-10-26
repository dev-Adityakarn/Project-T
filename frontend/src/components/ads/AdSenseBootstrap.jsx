import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { canLoadAdSenseScript } from "@/config/adsense";
import { isAdEligibleRoute } from "@/config/adPolicy";
import { ensureAdSenseScript } from "@/lib/adRuntime";

/**
 * Bootstraps the Google CMP path before an ad unit is visible. It never
 * creates an ad request; AdSenseUnit still decides that separately.
 */
export const AdSenseBootstrap = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Do not load the AdSense runtime on a direct visit to an app, game,
    // leaderboard, daily, auth or error route. Auto ads are an account-side
    // setting: disable them in AdSense before enabling manual units, because a
    // script loaded on an earlier route stays loaded during client-side
    // navigation.
    if (!isAdEligibleRoute(pathname)) return;
    if (canLoadAdSenseScript()) ensureAdSenseScript();
  }, [pathname]);

  return null;
};
