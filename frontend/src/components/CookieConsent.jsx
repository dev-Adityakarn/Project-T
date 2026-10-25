import { useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, loadAnalytics } from "@/lib/analytics";

export const CookieConsent = () => {
  const [open, setOpen] = useState(() => !!process.env.REACT_APP_GA_ID && !getConsent());
  if (!open) return null;

  const decide = (v) => {
    setConsent(v);
    if (v === "accepted") loadAnalytics();
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:max-w-md" data-testid="cookie-banner">
      <div className="rounded-2xl border bg-card/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <Cookie size={18} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            We use anonymous analytics cookies to understand which typing tests people use. Sign-in cookies are always required. Advertising is served by Google AdSense; its cookies and consent options are explained in our{" "}
            <Link to="/privacy-policy/" className="text-primary underline" data-testid="cookie-policy-link">Privacy policy</Link>.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="rounded-full px-5 font-semibold" onClick={() => decide("accepted")} data-testid="cookie-accept-btn">Accept</Button>
          <Button size="sm" variant="outline" className="rounded-full px-5" onClick={() => decide("rejected")} data-testid="cookie-reject-btn">Reject</Button>
        </div>
      </div>
    </div>
  );
};
