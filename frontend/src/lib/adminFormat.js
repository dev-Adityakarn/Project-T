export const ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  super_admin: "Super admin",
};

export const STATUS_LABELS = {
  active: "Active",
  suspended: "Suspended",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || "User";
export const statusLabel = (status) => STATUS_LABELS[status] || status || "Active";

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value, fallback = "—") {
  const date = asDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value, fallback = "—") {
  const date = asDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value) {
  const date = asDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

export function timeAgo(value, fallback = "Never") {
  const date = asDate(value);
  if (!date) return fallback;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en").format(Number(value) || 0);
}

export function formatAction(action = "") {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function actionTone(action = "") {
  if (action.includes("LOGIN_FAILED") || action.includes("DENIED")) return "destructive";
  if (action.includes("SUSPEND") || action.includes("DELETE") || action.includes("REVOKE")) return "destructive";
  if (action.includes("LOGIN") || action.includes("LOGOUT")) return "secondary";
  if (action.includes("ROLE") || action.includes("CREATE")) return "default";
  return "outline";
}

export const TARGET_TYPES = [
  "user",
  "admin_auth",
  "passage",
  "post",
  "result",
];
