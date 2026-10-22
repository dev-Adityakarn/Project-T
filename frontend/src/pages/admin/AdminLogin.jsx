import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Keyboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { formatAdminError } from "@/lib/adminApi";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingScreen } from "@/components/admin/AdminUI";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLogin() {
  const { user, loading, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingScreen label="Checking administrator session…" />;
  if (user) return <Navigate to="/admin" replace />;

  const destination = location.state?.from || "/admin";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const errors = {};
    if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
    if (!form.password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo
        path="/admin/login"
        title="Administrator sign in — Typinger"
        description="Restricted Typinger administration console."
        noindex
      />
      <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden border-r bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="relative p-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-foreground text-primary shadow-lg">
                <Keyboard size={20} />
              </span>
              <span className="font-pixel text-xs tracking-tight">TYPINGER</span>
            </Link>
          </div>
          <div className="relative max-w-lg p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <ShieldCheck size={13} /> Restricted console
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Operate Typinger with confidence.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/75">
              One control plane for users, content, moderation and the complete
              administrative audit trail. Every privileged action is authorised
              server-side and recorded.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-primary-foreground/85">
              <li className="flex items-center gap-2.5">
                <Sparkles size={15} /> Live metrics from the production database
              </li>
              <li className="flex items-center gap-2.5">
                <LockKeyhole size={15} /> HttpOnly, server-managed admin sessions
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck size={15} /> Role-based access with immutable audit logs
              </li>
            </ul>
          </div>
          <div className="relative p-10 text-xs text-primary-foreground/60">
            Authorised personnel only. Access attempts are logged.
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col px-5 py-6 sm:px-10">
          <div className="flex items-center justify-between lg:justify-end">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={15} /> Back to site
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Keyboard size={16} />
              </span>
              <span className="font-pixel text-[10px]">TYPINGER</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
            <div className="mb-7">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Administration
              </div>
              <h2 className="mt-2 text-2xl font-bold">Sign in to the admin console</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use your administrator email and password. Consumer accounts cannot
                access this area.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5" data-testid="admin-login-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={submit} noValidate className="space-y-5" data-testid="admin-login-form">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Administrator email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  value={form.email}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "admin-email-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, email: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  disabled={busy}
                  data-testid="admin-email-input"
                />
                {fieldErrors.email && (
                  <p id="admin-email-error" className="text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "admin-password-error" : undefined}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, password: event.target.value }));
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    disabled={busy}
                    className="pr-11"
                    data-testid="admin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="admin-password-error" className="text-xs text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={busy} data-testid="admin-login-btn">
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    Signing in…
                  </>
                ) : (
                  "Sign in securely"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Protected by rate limiting and server-side session validation.
              <br />
              Lost access? Contact a super administrator.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
