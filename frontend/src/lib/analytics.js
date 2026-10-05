const KEY = "kq_cookie_consent";
let loaded = false;

export const getConsent = () => localStorage.getItem(KEY);
export const setConsent = (v) => localStorage.setItem(KEY, v);

export const loadAnalytics = () => {
  const id = process.env.REACT_APP_GA_ID;
  if (!id || loaded || getConsent() !== "accepted") return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true, send_page_view: false });
};

export const trackPageview = (path, title) => {
  if (!window.gtag) return;
  window.gtag("event", "page_view", { page_path: path, page_title: title, page_location: window.location.href });
};

export const trackEvent = (name, params = {}) => {
  if (window.gtag) window.gtag("event", name, params);
};
