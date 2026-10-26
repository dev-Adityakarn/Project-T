/**
 * One place for privacy-choice UI. Google's CMP exposes its own revocation
 * dialog; other certified CMPs must provide their own entry point. When no CMP
 * API is present we reopen the site's own consent banner so the user is never
 * left without a privacy choice.
 */
export const PRIVACY_CHOICES_EVENT = "typinger:open-privacy-choices";

export const hasGoogleCmp = () =>
  typeof window !== "undefined" &&
  typeof window.googlefc?.showRevocationMessage === "function";

export const openPrivacyChoices = () => {
  if (typeof window === "undefined") return false;
  if (hasGoogleCmp()) {
    window.googlefc.showRevocationMessage();
    return true;
  }
  // A Google-certified external CMP must expose its own revocation dialog.
  // Its adapter can assign this global without changing the footer.
  if (typeof window.__typingerOpenPrivacyChoices === "function") {
    window.__typingerOpenPrivacyChoices();
    return true;
  }
  window.dispatchEvent(new Event(PRIVACY_CHOICES_EVENT));
  return false;
};
