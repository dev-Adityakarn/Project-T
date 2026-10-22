import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  FilterX,
  RefreshCw,
  Search,
  UserRoundSearch,
} from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { formatDate, formatNumber, initials, timeAgo } from "@/lib/adminFormat";
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
  RoleBadge,
  StatusBadge,
  TableSkeleton,
} from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

const SORTS = {
  name: "Name",
  email: "Email",
  created_at: "Joined",
  last_login_at: "Last login",
};

function SortHeader({ field, label, sort, order, onSort, className }) {
  const active = sort === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        {active ? (
          order === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      page,
      limit,
      sort,
      order,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(role !== "all" ? { role } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [page, limit, sort, order, debouncedSearch, role, status, dateFrom, dateTo],
  );

  const { data, loading, error, reload } = useAdminFetch("/users", params);

  const onSort = (field) => {
    if (sort === field) setOrder((value) => (value === "desc" ? "asc" : "desc"));
    else {
      setSort(field);
      setOrder("asc");
    }
    setPage(1);
  };

  const filtersActive =
    Boolean(debouncedSearch) || role !== "all" || status !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRole("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <>
      <Seo path="/admin/users" title="User management — Typinger" description="Manage Typinger users." noindex />
      <PageHeader
        eyebrow="Directory"
        title="Users"
        description="Search, filter and inspect every registered account. Pagination and filtering run on the server."
        actions={
          <>
            <Badge variant="outline" className="h-8 px-3">
              {data ? `${formatNumber(data.total)} total` : "…"}
            </Badge>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </>
        }
      />

      <Card className="mt-6">
        <div className="border-b p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or user ID…"
                className="pl-9"
                aria-label="Search users"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Select
                value={role}
                onValueChange={(value) => {
                  setRole(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="sm:w-[150px]"
                aria-label="Joined after"
              />
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="sm:w-[150px]"
                aria-label="Joined before"
              />

              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <FilterX size={14} /> Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorPanel message={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <TableSkeleton rows={8} cols={6} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={UserRoundSearch}
            title={filtersActive ? "No users match these filters" : "No users yet"}
            description={
              filtersActive
                ? "Try a different search term or clear the filters."
                : "Registered users will appear here."
            }
            action={
              filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <SortHeader field="name" label="User" sort={sort} order={order} onSort={onSort} className="pl-4" />
                  <SortHeader field="email" label="Email" sort={sort} order={order} onSort={onSort} className="hidden lg:table-cell" />
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Games</TableHead>
                  <SortHeader field="created_at" label="Joined" sort={sort} order={order} onSort={onSort} className="hidden xl:table-cell" />
                  <SortHeader field="last_login_at" label="Last login" sort={sort} order={order} onSort={onSort} className="hidden md:table-cell" />
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user.id} className={cn("group", loading && "opacity-60")}>
                    <TableCell className="pl-4">
                      <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {initials(user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:text-primary">{user.name}</span>
                          <span className="block truncate font-mono-type text-[10px] text-muted-foreground">
                            {user.id}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="block max-w-[220px] truncate text-sm text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell><RoleBadge role={user.role} /></TableCell>
                    <TableCell><StatusBadge status={user.status} /></TableCell>
                    <TableCell className="hidden text-right font-mono-type text-xs md:table-cell">
                      {formatNumber(user.games_played)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {timeAgo(user.last_login_at)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="text-xs">
                        <Link to={`/admin/users/${user.id}`}>
                          Details <ChevronRight size={14} />
                        </Link>
                      </Button>
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

      <p className="mt-3 text-[11px] text-muted-foreground">
        Sortable columns: {Object.values(SORTS).join(", ")}. Search matches names, emails and exact user IDs.
      </p>
    </>
  );
}
