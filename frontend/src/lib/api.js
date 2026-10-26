import axios from "axios";

export const API_TIMEOUT_MS = 12000;

const backendOrigin = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");

export const api = axios.create({
  // Falling back to a same-origin /api avoids the old "undefined/api" base URL
  // when a local build has not been given an explicit backend origin.
  baseURL: `${backendOrigin}/api`,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return e?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || JSON.stringify(d)).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
