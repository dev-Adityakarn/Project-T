import { useMemo, useState } from "react";
import { FilterX, RefreshCw, ScrollText } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import {
  actionTone,
  formatAction,
  formatDateTime,
  formatNumber,
  TARGET_TYPES,
  timeAgo,
} from "@/lib/adminFormat";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  EmptyState,
  ErrorPanel,
  PageHeader,
  PaginationBar,
  TableSkeleton,
} from "@/components/admin/AdminUI";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [action, setAction] = useState("all");
  const [adminId, setAdminId] = useState("all");
  const [targetType, setTargetType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const actions = useAdminFetch("/audit-logs/actions");
  const admins = useAdminFetch("/admins");

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(action !== "all" ? { action } : {}),
      ...(adminId !== "all" ? { admin_id: adminId } : {}),
      ...(targetType !== "all" ? { target_type: targetType } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [page, limit, action, adminId, targetType, dateFrom, dateTo],
  );

  const { data, loading, error, reload } = useAdminFetch("/audit-logs", params);

  const filtersActive =
    action !== "all" || adminId !== "all" || targetType !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  const clearFilters = () => {
    setAction("all");
    setAdminId("all");
    setTargetType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <>
      <Seo path="/admin/audit-logs" title="Audit logs — Typinger" description="Immutable administrative audit trail." noindex />
      <PageHeader
        eyebrow="Governance"
        title="Audit logs"
        description="Append-only record of privileged actions. Records cannot be edited or deleted from the console."
        actions={
          <>
            <Badge variant="outline" className="h-8 px-3">
              {data ? `${formatNumber(data.total)} events` : "…"}
            </Badge>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </>
        }
      />

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b p-3 sm:p-4 xl:flex-row xl:items-center">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:flex">
            <Select
              value={action}
              onValueChange={(value) => { setAction(value); setPage(1); }}
            >
              <SelectTrigger className="xl:w-[210px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(actions.data?.items || []).map((item) => (
                  <SelectItem key={item} value={item}>{formatAction(item)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={adminId}
              onValueChange={(value) => { setAdminId(value); setPage(1); }}
            >
              <SelectTrigger className="xl:w-[200px]"><SelectValue placeholder="Administrator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All administrators</SelectItem>
                {(admins.data?.items || []).map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>{admin.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={targetType}
              onValueChange={(value) => { setTargetType(value); setPage(1); }}
            >
              <SelectTrigger className="xl:w-[160px]"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All targets</SelectItem>
                {TARGET_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">{type.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="xl:w-[150px]" aria-label="From date" />
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="xl:w-[150px]" aria-label="To date" />

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <FilterX size={14} /> Clear
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-4"><ErrorPanel message={error} onRetry={reload} /></div>
        ) : loading && !data ? (
          <TableSkeleton rows={10} cols={6} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={filtersActive ? "No events match these filters" : "No audit events yet"}
            description="Privileged actions such as sign-ins, suspensions and role changes will appear here."
            action={filtersActive ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-4">Time</TableHead>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead className="hidden lg:table-cell">IP address</TableHead>
                  <TableHead className="hidden pr-4 xl:table-cell">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((event) => (
                  <TableRow key={event.id} className={loading ? "opacity-60" : undefined}>
                    <TableCell className="pl-4">
                      <div className="text-xs font-medium">{formatDateTime(event.created_at)}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(event.created_at)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px] truncate text-sm">{event.admin_name || "System"}</div>
                      <div className="max-w-[180px] truncate text-[10px] text-muted-foreground">{event.admin_email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionTone(event.action)} className="whitespace-nowrap text-[10px]">
                        {formatAction(event.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-xs capitalize">{event.target_type?.replaceAll("_", " ") || "—"}</div>
                      <div className="max-w-[160px] truncate font-mono-type text-[10px] text-muted-foreground">{event.target_id || ""}</div>
                    </TableCell>
                    <TableCell className="hidden font-mono-type text-[11px] text-muted-foreground lg:table-cell">
                      {event.ip_address || "—"}
                    </TableCell>
                    <TableCell className="hidden pr-4 xl:table-cell">
                      {Object.keys(event.metadata || {}).length ? (
                        <details className="group max-w-[260px]">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            View metadata
                          </summary>
                          <pre className="mt-1 max-h-24 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-relaxed">
{JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              page={data.page}
              pages={data.pages}
              total={data.total}
              limit={data.limit}
              onPage={setPage}
              onLimit={setLimit}
            />
          </>
        )}
      </Card>
    </>
  );
}
