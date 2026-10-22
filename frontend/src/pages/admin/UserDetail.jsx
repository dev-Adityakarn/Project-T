import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Gamepad2,
  Gauge,
  History,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { adminApi, formatAdminError } from "@/lib/adminApi";
import {
  formatAction,
  formatDate,
  formatDateTime,
  formatNumber,
  initials,
  roleLabel,
  timeAgo,
} from "@/lib/adminFormat";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfirmDialog,
  ErrorPanel,
  KeyValue,
  LoadingScreen,
  PageHeader,
  RoleBadge,
  StatCard,
  StatusBadge,
} from "@/components/admin/AdminUI";

export default function UserDetail() {
  const { id } = useParams();
  const { user: me } = useAdminAuth();
  const { data, loading, error, reload } = useAdminFetch(`/users/${id}`);

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [nextRole, setNextRole] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    if (data?.user?.role) setNextRole(data.user.role);
  }, [data?.user?.role]);

  if (loading && !data) return <LoadingScreen label="Loading user profile…" />;

  if (error && !data) {
    return (
      <>
        <Seo path={`/admin/users/${id}`} title="User details — Typinger" noindex />
        <PageHeader title="User details" description="Inspect and manage this account." />
        <div className="mt-6"><ErrorPanel message={error} onRetry={reload} /></div>
      </>
    );
  }

  if (!data) return null;

  const { user, stats, per_game: perGame, recent_results: recentResults, recent_audit: recentAudit } = data;
  const isSelf = user.id === me?.id;
  const isSuper = me?.role === "super_admin";
  const canSuspend =
    !isSelf && user.role !== "super_admin" && (user.role !== "admin" || isSuper);
  const isSuspended = user.status === "suspended";

  const setStatus = async (status) => {
    setStatusBusy(true);
    setStatusError("");
    try {
      await adminApi.patch(`/users/${user.id}/status`, {
        status,
        reason: status === "suspended" ? reason.trim() || null : null,
      });
      toast.success(status === "suspended" ? "User suspended" : "User reactivated", {
        description: status === "suspended" ? `${user.name} can no longer sign in.` : `${user.name} can sign in again.`,
      });
      setSuspendOpen(false);
      setReactivateOpen(false);
      setReason("");
      reload();
    } catch (err) {
      const message = formatAdminError(err);
      setStatusError(message);
      toast.error("Action failed", { description: message });
    } finally {
      setStatusBusy(false);
    }
  };

  const changeRole = async () => {
    setRoleBusy(true);
    setRoleError("");
    try {
      await adminApi.patch(`/users/${user.id}/role`, { role: nextRole });
      toast.success("Role updated", {
        description: `${user.name} is now ${roleLabel(nextRole)}.`,
      });
      setRoleOpen(false);
      reload();
    } catch (err) {
      const message = formatAdminError(err);
      setRoleError(message);
      toast.error("Role change failed", { description: message });
    } finally {
      setRoleBusy(false);
    }
  };

  const maxGames = Math.max(1, ...perGame.map((game) => game.plays));

  return (
    <>
      <Seo path={`/admin/users/${id}`} title={`${user.name} — Admin — Typinger`} noindex />
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={15} /> Back to users
      </Link>

      <PageHeader
        eyebrow="User profile"
        title={user.name}
        description={user.email}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
            {!isSuspended ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={!canSuspend}
                title={!canSuspend ? "You cannot suspend this account" : undefined}
                onClick={() => { setStatusError(""); setSuspendOpen(true); }}
              >
                <Ban size={14} /> Suspend user
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!canSuspend || statusBusy}
                onClick={() => { setStatusError(""); setReactivateOpen(true); }}
              >
                <CheckCircle2 size={14} /> Reactivate
              </Button>
            )}
          </>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <RoleBadge role={user.role} />
        <StatusBadge status={user.status} />
        <Badge variant="outline" className="font-mono-type text-[10px]">
          <KeyRound size={11} className="mr-1" /> {user.id}
        </Badge>
        <span className="text-xs text-muted-foreground">Joined {formatDate(user.created_at)}</span>
        {isSelf && <Badge variant="secondary">This is your account</Badge>}
      </div>

      {user.status === "suspended" && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>
            This account is suspended{user.suspended_reason ? `: “${user.suspended_reason}”` : "."} Suspension
            takes effect immediately and all active admin sessions for the account are revoked.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Games played" value={formatNumber(stats.games_played)} hint={stats.last_played_at ? `Last played ${timeAgo(stats.last_played_at)}` : "No activity"} icon={Gamepad2} />
        <StatCard label="Best WPM" value={formatNumber(stats.best_wpm)} hint="Personal record" icon={Gauge} tone="secondary" />
        <StatCard label="Average accuracy" value={`${stats.avg_accuracy}%`} hint={`${stats.avg_wpm} WPM average`} icon={Target} />
        <StatCard label="Achievements" value={formatNumber(stats.achievements)} hint={`${formatNumber(stats.total_score)} total score`} icon={Trophy} tone="muted" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Account information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <KeyValue label="User ID" mono>{user.id}</KeyValue>
              <KeyValue label="Email"><span className="inline-flex items-center gap-1.5"><Mail size={13} /> {user.email}</span></KeyValue>
              <KeyValue label="Role">{roleLabel(user.role)}</KeyValue>
              <KeyValue label="Account status">{isSuspended ? "Suspended" : "Active"}</KeyValue>
              <KeyValue label="Created">{formatDateTime(user.created_at)}</KeyValue>
              <KeyValue label="Last updated">{formatDateTime(user.updated_at)}</KeyValue>
              <KeyValue label="Last login">{formatDateTime(user.last_login_at)}</KeyValue>
              <KeyValue label="Last played">{formatDateTime(stats.last_played_at)}</KeyValue>
              <KeyValue label="Total score">{formatNumber(stats.total_score)}</KeyValue>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={15} className="text-primary" /> Access control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSuper ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Roles are enforced by the server on every request. Demoting an
                    administrator immediately revokes their sessions.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    <Select value={nextRole} onValueChange={setNextRole} disabled={isSelf}>
                      <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {roleError && <p className="text-xs text-destructive">{roleError}</p>}
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isSelf || nextRole === user.role || roleBusy}
                    onClick={() => { setRoleError(""); setRoleOpen(true); }}
                  >
                    <UserCog size={14} /> {isSelf ? "Cannot change your own role" : "Apply role change"}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Only a <strong className="text-foreground">super administrator</strong> can
                  change roles. You can still suspend ordinary users.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent admin actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentAudit.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">No administrative actions on this account.</p>
              ) : (
                <ul className="space-y-3">
                  {recentAudit.map((event) => (
                    <li key={event.id} className="flex items-start gap-2.5">
                      <History size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{formatAction(event.action)}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {event.admin_name || event.admin_email} · {timeAgo(event.created_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentResults.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">This user has not played yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Game</th>
                      <th className="px-4 py-2.5 text-right font-medium">Score</th>
                      <th className="px-4 py-2.5 text-right font-medium">WPM</th>
                      <th className="px-4 py-2.5 text-right font-medium">Accuracy</th>
                      <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Difficulty</th>
                      <th className="px-4 py-2.5 text-right font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((result) => (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="font-medium capitalize">{result.game_id?.replaceAll("-", " ")}</span>
                          {result.flagged && <Badge variant="destructive" className="ml-2 text-[9px]">flagged</Badge>}
                          {result.daily_date && <Badge variant="secondary" className="ml-2 text-[9px]">daily</Badge>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono-type text-xs">{formatNumber(result.score)}</td>
                        <td className="px-4 py-2.5 text-right font-mono-type text-xs">{result.wpm}</td>
                        <td className="px-4 py-2.5 text-right font-mono-type text-xs">{result.accuracy}%</td>
                        <td className="hidden px-4 py-2.5 text-xs capitalize sm:table-cell">{result.difficulty}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{timeAgo(result.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Activity by game</CardTitle>
          </CardHeader>
          <CardContent>
            {perGame.length === 0 ? (
              <p className="py-3 text-xs text-muted-foreground">No per-game activity yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {perGame.map((game) => (
                  <li key={game.game_id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize">{game.game_id.replaceAll("-", " ")}</span>
                      <span className="font-mono-type text-muted-foreground">{game.plays} plays</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(game.plays / maxGames) * 100}%` }} />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      best {formatNumber(game.best_score)} pts · {game.best_wpm} WPM
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {user.name}?</DialogTitle>
            <DialogDescription>
              The account will be blocked from signing in immediately and all of its
              active sessions will be revoked. You can reactivate it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspension-reason">Reason (optional, stored in the audit trail)</Label>
            <Textarea
              id="suspension-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              rows={3}
              placeholder="e.g. Terms violation confirmed by moderation review"
            />
            <div className="text-right text-[10px] text-muted-foreground">{reason.length}/300</div>
          </div>
          {statusError && <Alert variant="destructive"><AlertDescription>{statusError}</AlertDescription></Alert>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={statusBusy}>Cancel</Button>
            <Button variant="destructive" onClick={() => setStatus("suspended")} disabled={statusBusy}>
              {statusBusy ? "Suspending…" : "Suspend account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        title={`Reactivate ${user.name}?`}
        description="The user will be able to sign in and play again. This action is recorded in the audit log."
        confirmLabel="Reactivate account"
        onConfirm={() => setStatus("active")}
      />

      <ConfirmDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        title="Change this user's role?"
        description={`${user.name} will become ${roleLabel(nextRole)}. The change is enforced on the server and recorded in the audit log.`}
        confirmLabel="Change role"
        onConfirm={changeRole}
      />
      {roleBusy && <span className="sr-only">Updating role</span>}
    </>
  );
}
