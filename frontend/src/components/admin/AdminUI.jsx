import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { roleLabel, statusLabel } from "@/lib/adminFormat";

export const PageHeader = ({ title, description, actions, eyebrow }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && (
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const TONES = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export const StatCard = ({ label, value, hint, icon: Icon, tone = "primary" }) => (
  <Card className="overflow-hidden">
    <CardContent className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 font-mono-type text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </div>
      {Icon && (
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon size={17} />
        </span>
      )}
    </CardContent>
  </Card>
);

export const RoleBadge = ({ role }) => {
  const variant =
    role === "super_admin" ? "default" : role === "admin" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="whitespace-nowrap font-medium">
      {roleLabel(role)}
    </Badge>
  );
};

export const StatusBadge = ({ status }) => (
  <Badge
    variant={status === "suspended" ? "destructive" : "outline"}
    className={cn(
      "gap-1.5 whitespace-nowrap font-medium",
      status !== "suspended" && "border-emerald-500/40 text-emerald-500",
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        status === "suspended" ? "bg-destructive-foreground" : "bg-emerald-500",
      )}
    />
    {statusLabel(status)}
  </Badge>
);

export const ErrorPanel = ({ message, onRetry, title = "Could not load data" }) => (
  <Card className="border-destructive/30">
    <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle size={20} />
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {message || "An unexpected error occurred."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw size={14} /> Retry
        </Button>
      )}
    </CardContent>
  </Card>
);

export const EmptyState = ({ title = "Nothing here yet", description, icon: Icon = Inbox, action }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
      <Icon size={20} />
    </span>
    <div>
      <div className="font-semibold">{title}</div>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);

export const TableSkeleton = ({ rows = 6, cols = 5 }) => (
  <div className="divide-y">
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex items-center gap-4 px-4 py-3.5">
        {Array.from({ length: cols }).map((__, col) => (
          <Skeleton
            key={col}
            className={cn("h-4", col === 0 ? "w-40" : "w-24", col === cols - 1 && "ml-auto w-16")}
          />
        ))}
      </div>
    ))}
  </div>
);

export const LoadingScreen = ({ label = "Loading administration console…" }) => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="animate-spin text-primary" size={22} />
      {label}
    </div>
  </div>
);

export const PaginationBar = ({ page, pages, total, limit, onPage, onLimit }) => {
  const safePages = Math.max(1, pages || 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground">
        {total === 0 ? "No results" : `${from}–${to} of ${total}`}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Rows
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              onLimit(Number(value));
              onPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </Button>
          <span className="min-w-[90px] text-center text-xs text-muted-foreground">
            Page {page} of {safePages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= safePages}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  destructive = false,
  children,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {children}
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const Spinner = ({ size = 15 }) => <Loader2 size={size} className="animate-spin" />;

export const KeyValue = ({ label, children, mono = false }) => (
  <div>
    <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {label}
    </dt>
    <dd className={cn("mt-1 break-words text-sm", mono && "font-mono-type text-xs")}>
      {children || "—"}
    </dd>
  </div>
);
