import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  FileText,
  Gamepad2,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import {
  actionTone,
  formatAction,
  formatNumber,
  formatShortDate,
  initials,
  timeAgo,
} from "@/lib/adminFormat";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  ErrorPanel,
  PageHeader,
  RoleBadge,
  StatCard,
} from "@/components/admin/AdminUI";

const CHART_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

const ChartCard = ({ title, subtitle, children, action }) => (
  <Card>
    <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
      <div>
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </CardHeader>
    <CardContent className="pt-2">{children}</CardContent>
  </Card>
);

export default function Overview() {
  const { data, loading, error, reload } = useAdminFetch("/dashboard");

  if (error) {
    return (
      <>
        <Seo path="/admin" title="Admin overview — Typinger" description="Typinger administration overview." noindex />
        <PageHeader title="Overview" description="Live operational snapshot of the application." />
        <div className="mt-6">
          <ErrorPanel message={error} onRetry={reload} />
        </div>
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <Seo path="/admin" title="Admin overview — Typinger" description="Typinger administration overview." noindex />
        <PageHeader title="Overview" description="Loading the latest operational metrics…" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-[104px] rounded-xl" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </>
    );
  }

  const { users, activity, content, audit, series, top_games: topGames, recent_users: recentUsers, recent_audit: recentAudit } = data;
  const maxPlays = Math.max(1, ...topGames.map((game) => game.plays));

  return (
    <>
      <Seo path="/admin" title="Admin overview — Typinger" description="Typinger administration overview." noindex />
      <PageHeader
        eyebrow="Control plane"
        title="Overview"
        description="Every metric below is queried from the live database. Refreshed on demand."
        actions={
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(users.total)} hint={`${formatNumber(users.new_today)} joined today`} icon={UsersIcon} />
        <StatCard label="Active users · 30d" value={formatNumber(users.active_30d)} hint="Signed in during the last 30 days" icon={UserCheck} tone="secondary" />
        <StatCard label="New this month" value={formatNumber(users.new_this_month)} hint={`${formatNumber(users.new_this_week)} in the last 7 days`} icon={UserPlus} />
        <StatCard label="Suspended" value={formatNumber(users.suspended)} hint="Accounts currently blocked" icon={UserX} tone="destructive" />
        <StatCard label="Games played" value={formatNumber(activity.total_results)} hint={`${formatNumber(activity.results_today)} today`} icon={Gamepad2} tone="secondary" />
        <StatCard label="Administrators" value={formatNumber(users.admins)} hint="Active privileged accounts" icon={ShieldCheck} />
        <StatCard label="Content units" value={formatNumber(content.posts + content.passages)} hint={`${formatNumber(content.published_posts)} published posts · ${formatNumber(content.passages)} passages`} icon={FileText} />
        <StatCard label="Audit events" value={formatNumber(audit.total_events)} hint="Immutable administrative history" icon={ScrollText} tone="muted" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="New registrations"
            subtitle="Daily signups over the last 14 days"
            action={<Badge variant="outline">14 days</Badge>}
          >
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={series.signups} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} labelFormatter={formatShortDate} />
                  <Area type="monotone" dataKey="count" name="Signups" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#signupFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <ChartCard
          title="Most played games"
          subtitle="All-time plays by game"
          action={<Badge variant="outline">Top {topGames.length || 0}</Badge>}
        >
          {topGames.length === 0 ? (
            <EmptyState title="No game activity yet" description="Plays will appear here after users submit results." icon={Gamepad2} />
          ) : (
            <ul className="space-y-4 py-1">
              {topGames.map((game) => (
                <li key={game.game_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{game.game_id.replaceAll("-", " ")}</span>
                    <span className="font-mono-type text-xs text-muted-foreground">{formatNumber(game.plays)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(game.plays / maxPlays) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>avg {game.avg_wpm} wpm</span>
                    <span>best {game.best_wpm} wpm</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Game activity" subtitle="Daily results recorded over the last 14 days">
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={series.results} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} labelFormatter={formatShortDate} />
                  <Bar dataKey="count" name="Results" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Recent admin activity</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/admin/audit-logs">
                View all <ArrowUpRight size={13} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAudit.length === 0 ? (
              <EmptyState title="No admin activity yet" description="Privileged actions will be recorded here." icon={ScrollText} />
            ) : (
              <ul className="space-y-3">
                {recentAudit.map((event) => (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={actionTone(event.action)} className="px-1.5 py-0 text-[9px]">
                          {formatAction(event.action)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(event.created_at)}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {event.admin_name || event.admin_email || "System"} · {event.target_type || "system"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Recent registrations</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/admin/users">
              Manage users <ArrowUpRight size={13} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentUsers.length === 0 ? (
            <EmptyState title="No users yet" description="New registrations will appear here." icon={Activity} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials(user.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium group-hover:text-primary">{user.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Badge variant={user.status === "suspended" ? "destructive" : "outline"} className="text-[10px]">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{timeAgo(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-right text-[10px] uppercase tracking-widest text-muted-foreground">
        Snapshot generated {timeAgo(data.generated_at)}
      </p>
    </>
  );
}
