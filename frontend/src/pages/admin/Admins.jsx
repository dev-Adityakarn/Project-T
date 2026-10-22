import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { adminApi, formatAdminError } from "@/lib/adminApi";
import { formatDate, initials, roleLabel, timeAgo } from "@/lib/adminFormat";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  PageHeader,
  RoleBadge,
  StatusBadge,
  TableSkeleton,
} from "@/components/admin/AdminUI";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generatePassword = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join("");
};

export default function Admins() {
  const { user: me } = useAdminAuth();
  const { data, loading, error, reload } = useAdminFetch("/admins");
  const isSuper = me?.role === "super_admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [roleTarget, setRoleTarget] = useState(null);
  const [roleBusy, setRoleBusy] = useState(false);

  const items = useMemo(() => data?.items || [], [data]);
  const summary = useMemo(
    () => ({
      total: items.length,
      supers: items.filter((item) => item.role === "super_admin").length,
      active: items.filter((item) => item.status !== "suspended").length,
    }),
    [items],
  );

  const submitCreate = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim()) return setFormError("Enter a display name.");
    if (!EMAIL_RE.test(form.email.trim())) return setFormError("Enter a valid email address.");
    if (form.password.length < 12) return setFormError("Password must be at least 12 characters.");
    setBusy(true);
    try {
      await adminApi.post("/admins", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("Administrator created", { description: `${form.email} can now sign in to the admin console.` });
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", role: "admin" });
      setShowPassword(false);
      reload();
    } catch (err) {
      setFormError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  const applyRole = async () => {
    if (!roleTarget) return;
    setRoleBusy(true);
    try {
      await adminApi.patch(`/admins/${roleTarget.id}/role`, { role: roleTarget.nextRole });
      toast.success("Administrator updated", {
        description: `${roleTarget.name} is now ${roleLabel(roleTarget.nextRole)}.`,
      });
      setRoleTarget(null);
      reload();
    } catch (err) {
      toast.error("Role change failed", { description: formatAdminError(err) });
    } finally {
      setRoleBusy(false);
    }
  };

  return (
    <>
      <Seo path="/admin/admins" title="Administrators — Typinger" description="Manage Typinger administrators." noindex />
      <PageHeader
        eyebrow="Privileged access"
        title="Administrators"
        description="Create administrators and control privileged roles. Only super administrators can mutate this list."
        actions={
          <>
            <Badge variant="outline" className="h-8 px-3">{summary.total} admins</Badge>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
            {isSuper && (
              <Button size="sm" onClick={() => { setFormError(""); setCreateOpen(true); }}>
                <Plus size={14} /> New administrator
              </Button>
            )}
          </>
        }
      />

      {!isSuper && (
        <Alert className="mt-6">
          <ShieldCheck size={16} />
          <AlertDescription>
            You have read-only visibility of administrators. Creating administrators and
            changing roles requires a super administrator account.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Administrators</div><div className="mt-2 font-mono-type text-2xl font-semibold">{summary.total}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Super admins</div><div className="mt-2 font-mono-type text-2xl font-semibold">{summary.supers}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active</div><div className="mt-2 font-mono-type text-2xl font-semibold">{summary.active}</div></CardContent></Card>
      </div>

      <Card className="mt-4">
        {error ? (
          <div className="p-4"><ErrorPanel message={error} onRetry={reload} /></div>
        ) : loading && !data ? (
          <TableSkeleton rows={4} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No administrators" description="Bootstrap an administrator with the create_admin script." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4">Administrator</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last login</TableHead>
                <TableHead className="hidden xl:table-cell">Created</TableHead>
                {isSuper && <TableHead className="pr-4 text-right">Change role</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((admin) => {
                const locked = admin.is_self || !isSuper;
                return (
                  <TableRow key={admin.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(admin.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{admin.name}</span>
                            {admin.is_self && <Badge variant="secondary" className="text-[9px]">you</Badge>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{admin.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={admin.role} /></TableCell>
                    <TableCell><StatusBadge status={admin.status} /></TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {admin.last_login_at ? `${timeAgo(admin.last_login_at)}` : "Never"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      {formatDate(admin.created_at)}
                    </TableCell>
                    {isSuper && (
                      <TableCell className="pr-4 text-right">
                        <Select
                          value={admin.role}
                          disabled={locked || roleBusy}
                          onValueChange={(value) => {
                            if (value !== admin.role) setRoleTarget({ ...admin, nextRole: value });
                          }}
                        >
                          <SelectTrigger className="ml-auto h-8 w-[145px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super admin</SelectItem>
                            <SelectItem value="user">Revoke admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound size={15} className="text-primary" /> Security model
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-3">
          <p><strong className="text-foreground">Super admin</strong> can create administrators, change roles and manage every account.</p>
          <p><strong className="text-foreground">Admin</strong> can manage users and content, but cannot create administrators or escalate roles.</p>
          <p><strong className="text-foreground">Revocation</strong> demotes the account to a normal user and immediately invalidates all of its admin sessions.</p>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create administrator</DialogTitle>
            <DialogDescription>
              The account is created on the server with a bcrypt password hash. Share
              credentials through a secure channel only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Display name</Label>
              <Input id="admin-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={60} placeholder="Operations Admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-new-email">Email</Label>
              <Input id="admin-new-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ops@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Temporary password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <Button type="button" variant="outline" onClick={() => { setForm({ ...form, password: generatePassword() }); setShowPassword(true); }} title="Generate a strong password">
                  <Wand2 size={14} />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Minimum 12 characters. The password is never logged or returned by the API.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-role">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger id="admin-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating…" : <><UserPlus size={14} /> Create administrator</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => { if (!open) setRoleTarget(null); }}
        title={roleTarget?.nextRole === "user" ? "Revoke administrator access?" : "Change administrator role?"}
        description={
          roleTarget
            ? `${roleTarget.name} will become ${roleLabel(roleTarget.nextRole)}. ${
                roleTarget.nextRole === "user"
                  ? "All of their admin sessions will be revoked immediately."
                  : "This changes what they can do on the next request."
              }`
            : ""
        }
        confirmLabel={roleBusy ? "Updating…" : roleTarget?.nextRole === "user" ? "Revoke access" : "Change role"}
        destructive={roleTarget?.nextRole === "user"}
        onConfirm={applyRole}
      />
    </>
  );
}
