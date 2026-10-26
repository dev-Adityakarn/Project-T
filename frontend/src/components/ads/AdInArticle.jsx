import { AdSenseUnit } from "@/components/ads/AdSenseUnit";
import { cn } from "@/lib/utils";

export const AdInArticle = ({ slot, className = "", isPaused = false }) => (
  <AdSenseUnit
    slot={slot}
    variant="in-article"
    format="auto"
    isPaused={isPaused}
    interaction="idle"
    className={cn("my-10", className)}
  />
);
