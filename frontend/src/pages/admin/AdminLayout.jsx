import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  FileText,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useTheme } from "@/context/ThemeContext";
import { initials } from "@/lib/adminFormat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RoleBadge } from "@/components/admin/AdminUI";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/content", label: "Content", icon: FileText },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/audit-logs", label: "Audit logs", icon: ScrollText },
  { to: "/admin/admins", label: "Administrators", icon: ShieldCheck, superOnly: true },
];

const titleFor = (pathname) => {
  if (pathname === "/admin" || pathname === "/admin/") return "Overview";
  if (pathname.startsWith("/admin/users/")) return "User details";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/content")) return "Content";
  if (pathname.startsWith("/admin/moderation")) return "Moderation";
  if (pathname.startsWith("/admin/audit-logs")) return "Audit logs";
  if (pathname.startsWith("/admin/admins")) return "Administrators";
  return "Administration";
};

const SidebarBody = ({ user, onNavigate, onLogout }) => {
  const items = NAV.filter((item) => !item.superOnly || user.role === "super_admin");
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_3px_0_hsl(var(--kb-key-side))]">
          <Keyboard size={17} />
        </span>
        <div>
          <div className="font-pixel text-[10px] leading-none tracking-tight">TYPINGER</div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Admin console
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Workspace
        </div>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <Icon size={17} />
            {label}
            {label === "Administrators" && (
              <Badge variant="outline" className="ml-auto px-1.5 py-0 text-[9px] uppercase">
                super
              </Badge>
            )}
          </NavLink>
        ))}

        <div className="mt-6 px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Shortcuts
        </div>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink size={17} /> View public site
        </Link>
      </nav>

      <div className="border-t p-3">
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <RoleBadge role={user.role} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={onLogout}
            >
              <LogOut size={13} /> Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card lg:block">
        <SidebarBody user={user} onLogout={handleLogout} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Admin navigation</SheetTitle>
              </SheetHeader>
              <SidebarBody
                user={user}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Administration
            </div>
            <div className="truncate text-sm font-semibold">{titleFor(pathname)}</div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/" target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> View site
              </Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
