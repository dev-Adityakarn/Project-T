import axios from "axios";

/**
 * Dedicated admin client.
 *
 * Admin authentication is cookie-only, so this instance deliberately does NOT
 * read or send the consumer `kq_token` from localStorage. `withCredentials`
 * makes the browser attach the HttpOnly admin session cookie.
 */
export const adminApi = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api/admin`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || "";
    if (
      error?.response?.status === 401 &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/me")
    ) {
      // Let the provider drop the session so the route guard redirects.
      window.dispatchEvent(new Event("admin:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function formatAdminError(error) {
  const detail = error?.response?.data?.detail;
  if (detail == null) {
    if (error?.code === "ERR_NETWORK") {
      return "Cannot reach the administration API. Check your connection and try again.";
    }
    return error?.message || "Something went wrong. Please try again.";
  }
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || "Invalid value").join(" ");
  }
  if (typeof detail?.msg === "string") return detail.msg;
  return "Request failed. Please try again.";
}
