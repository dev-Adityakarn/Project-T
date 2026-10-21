import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      nav("/dashboard/");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, type = "text") => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="h-12 rounded-xl" data-testid={`auth-${k}-input`} minLength={k === "password" ? 6 : undefined} />
    </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-grid">
      <div className="mx-auto flex max-w-7xl justify-start px-4 py-16 sm:px-8 md:py-24">
        <form onSubmit={submit} className="rise-in w-full max-w-md space-y-5 rounded-2xl border bg-card/90 p-8 backdrop-blur-xl" data-testid={`${mode}-form`}>
          <div>
            <h1 className="text-3xl font-bold">{isLogin ? "Welcome back" : "Create account"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{isLogin ? "Sign in to save your scores." : "Track WPM history and climb the leaderboard."}</p>
          </div>
          {!isLogin && field("name", "Display name")}
          {field("email", "Email", "email")}
          {field("password", "Password", "password")}
          {error && <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive" data-testid="auth-error">{error}</p>}
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl font-semibold" data-testid="auth-submit-btn">
            {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "New here? " : "Already have an account? "}
            <Link to={isLogin ? "/register" : "/login"} className="font-medium text-primary" data-testid="auth-switch-link">{isLogin ? "Create an account" : "Sign in"}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
