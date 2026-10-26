import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { cn } from "@/lib/utils";

/** Always rendered after a completed run, with 32px of clear space. */
export const AdAfterResult = ({ slot, className = "" }) => (
  <AdSenseUnit
    slot={slot}
    variant="leaderboard"
    format="auto"
    interaction="completed"
    className={cn("mt-8", className)}
  />
);
