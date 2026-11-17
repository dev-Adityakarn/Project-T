import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADSENSE_CONFIG } from "@/config/adsense";
import { applyConsent, getConsent, isAnalyticsConfigured } from "@/lib/analytics";
import { PRIVACY_CHOICES_EVENT } from "@/lib/consent";

const hasAdConsentPlatform = () =>
  ADSENSE_CONFIG.enabled &&
  (ADSENSE_CONFIG.cmpProvider === "google" ||
    ADSENSE_CONFIG.cmpProvider === "external");

const adConsentCopy = () => {
  if (!ADSENSE_CONFIG.enabled) return "";
  if (ADSENSE_CONFIG.cmpProvider === "google") {
    return " Advertising consent is handled by Google's consent message.";
  }
  if (ADSENSE_CONFIG.cmpProvider === "external") {
    return " Advertising consent is handled by our consent platform.";
  }
  return " Advertising is disabled until a consent platform is configured.";
};

export const CookieConsent = () => {
  const [open, setOpen] = useState(() => isAnalyticsConfigured() && !getConsent());

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(PRIVACY_CHOICES_EVENT, onOpen);
    return () => window.removeEventListener(PRIVACY_CHOICES_EVENT, onOpen);
  }, []);

  if (!open) return null;

  const decide = (value) => {
    applyConsent(value);
    setOpen(false);
  };

  const analyticsAvailable = isAnalyticsConfigured();
  const currentConsent = getConsent();
  const adConsentManaged = hasAdConsentPlatform();
  const onlyEssential = !analyticsAvailable && !adConsentManaged;

  const cookieCopy = analyticsAvailable
    ? currentConsent === "accepted"
      ? "Analytics is currently on in this browser. You can turn it off below. Sign-in cookies are always required."
      : "We use anonymous analytics cookies, only if you accept, to understand which typing tests people use. Sign-in cookies are always required."
    : adConsentManaged
      ? "Typinger uses essential cookies for sign-in and security. Analytics cookies are not active in this build."
      : "Typinger uses only essential cookies needed for sign-in and security. No analytics or advertising cookies are active in this build, so there is nothing to accept or reject right now. If analytics is enabled later, this dialog will offer a real choice and you can reopen it from Privacy choices in the footer.";

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:max-w-md" data-testid="cookie-banner">
      <div
        className="rounded-2xl border bg-card/95 p-5 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-label="Privacy and cookie choices"
      >
        <div className="flex items-start gap-3">
          <Cookie size={18} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            {cookieCopy}
            {adConsentCopy()}{" "}
            <Link to="/privacy-policy/" className="text-primary underline" data-testid="cookie-policy-link">Privacy policy</Link>.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {analyticsAvailable ? (
            currentConsent === "accepted" ? (
              <>
                <Button size="sm" variant="outline" className="rounded-full px-5" onClick={() => decide("rejected")} data-testid="cookie-reject-btn">Turn off analytics</Button>
                <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={() => setOpen(false)} data-testid="cookie-dismiss-btn">
                  Keep analytics on
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" className="rounded-full px-5 font-semibold" onClick={() => decide("accepted")} data-testid="cookie-accept-btn">Accept analytics</Button>
                <Button size="sm" variant="outline" className="rounded-full px-5" onClick={() => decide("rejected")} data-testid="cookie-reject-btn">Reject analytics</Button>
                <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={() => setOpen(false)} data-testid="cookie-dismiss-btn">
                  Not now
                </Button>
              </>
            )
          ) : (
            <Button size="sm" className={onlyEssential ? "rounded-full px-5 font-semibold" : "rounded-full px-5"} onClick={() => setOpen(false)} data-testid="cookie-close-btn">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
