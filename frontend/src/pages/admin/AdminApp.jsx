import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ShieldX } from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { useTheme } from "@/context/ThemeContext";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import { LoadingScreen } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Overview from "@/pages/admin/Overview";
import Users from "@/pages/admin/Users";
import UserDetail from "@/pages/admin/UserDetail";
import Content from "@/pages/admin/Content";
import Moderation from "@/pages/admin/Moderation";
import AuditLogs from "@/pages/admin/AuditLogs";
import Admins from "@/pages/admin/Admins";

const Forbidden = () => (
  <div className="grid min-h-screen place-items-center px-6">
    <div className="max-w-md text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX size={22} />
      </span>
      <h1 className="mt-4 text-xl font-bold">Administrator access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This account does not have permission to use the administration console.
      </p>
      <Button asChild className="mt-5">
        <Link to="/">Return to Typinger</Link>
      </Button>
    </div>
  </div>
);

const RequireAdmin = () => {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (!["admin", "super_admin"].includes(user.role)) return <Forbidden />;
  return <Outlet />;
};

const RequireSuperAdmin = ({ children }) => {
  const { user } = useAdminAuth();
  if (user?.role !== "super_admin") return <Navigate to="/admin" replace />;
  return children;
};

const AdminToaster = () => {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
};

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminErrorBoundary>
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequireAdmin />}>
            <Route path="" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="content" element={<Content />} />
              <Route path="moderation" element={<Moderation />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route
                path="admins"
                element={
                  <RequireSuperAdmin>
                    <Admins />
                  </RequireSuperAdmin>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminErrorBoundary>
      <AdminToaster />
    </AdminAuthProvider>
  );
}
