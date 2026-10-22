import { useMemo, useState } from "react";
import { Flag, FlagOff, RefreshCw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { adminApi, formatAdminError } from "@/lib/adminApi";
import { formatNumber, timeAgo } from "@/lib/adminFormat";
import { GAMES } from "@/data/games";
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
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  PageHeader,
  TableSkeleton,
} from "@/components/admin/AdminUI";

const GAME_TITLES = Object.fromEntries(GAMES.map((game) => [game.id, game.title]));

export default function Moderation() {
  const [gameId, setGameId] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [flagging, setFlagging] = useState(null);

  const params = useMemo(
    () => ({ limit: 200, ...(gameId !== "all" ? { game_id: gameId } : {}) }),
    [gameId],
  );
  const { data, loading, error, reload } = useAdminFetch("/results", params);

  const rows = useMemo(() => data || [], [data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        (row.user_name || "").toLowerCase().includes(term) ||
        (row.game_id || "").includes(term),
    );
  }, [rows, search]);

  const flaggedCount = rows.filter((row) => row.flagged).length;

  const toggleFlag = async (row) => {
    setFlagging(row.id);
    try {
      await adminApi.post(`/results/${row.id}/flag`, { flagged: !row.flagged });
      toast.success(row.flagged ? "Result unflagged" : "Result flagged", {
        description: `${GAME_TITLES[row.game_id] || row.game_id} · ${row.user_name}`,
      });
      reload();
    } catch (err) {
      toast.error("Could not update result", { description: formatAdminError(err) });
    } finally {
      setFlagging(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.delete(`/results/${deleteTarget.id}`);
      toast.success("Result deleted");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error("Delete failed", { description: formatAdminError(err) });
    }
  };

  return (
    <>
      <Seo path="/admin/moderation" title="Moderation — Typinger" description="Moderate leaderboard results." noindex />
      <PageHeader
        eyebrow="Trust & safety"
        title="Moderation"
        description="Review recent results, flag suspicious scores and remove invalid entries. Flagged results are excluded from leaderboards."
        actions={
          <>
            <Badge variant={flaggedCount ? "destructive" : "outline"} className="h-8 px-3">
              {formatNumber(flaggedCount)} flagged
            </Badge>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </>
        }
      />

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by player or game…"
              className="pl-9"
              aria-label="Filter results"
            />
          </div>
          <Select value={gameId} onValueChange={setGameId}>
            <SelectTrigger className="sm:w-[210px]"><SelectValue placeholder="Game" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All games</SelectItem>
              {GAMES.map((game) => (
                <SelectItem key={game.id} value={game.id}>{game.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="p-4"><ErrorPanel message={error} onRetry={reload} /></div>
        ) : loading && !data ? (
          <TableSkeleton rows={10} cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={rows.length === 0 ? "No results recorded yet" : "No results match these filters"}
            description="Game submissions will appear here for moderation."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="pl-4">Player</TableHead>
                <TableHead>Game</TableHead>
                <TableHead className="hidden sm:table-cell">Difficulty</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">WPM</TableHead>
                <TableHead className="hidden text-right md:table-cell">Accuracy</TableHead>
                <TableHead className="hidden lg:table-cell">When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} className={row.flagged ? "bg-destructive/5" : undefined}>
                  <TableCell className="pl-4">
                    <div className="max-w-[160px] truncate text-sm font-medium">{row.user_name}</div>
                    <div className="max-w-[160px] truncate font-mono-type text-[10px] text-muted-foreground">{row.user_id}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {GAME_TITLES[row.game_id] || row.game_id}
                    {row.daily_date && <Badge variant="secondary" className="ml-2 text-[9px]">daily</Badge>}
                  </TableCell>
                  <TableCell className="hidden text-xs capitalize sm:table-cell">{row.difficulty}</TableCell>
                  <TableCell className="text-right font-mono-type text-xs">{formatNumber(row.score)}</TableCell>
                  <TableCell className="text-right font-mono-type text-xs">{row.wpm}</TableCell>
                  <TableCell className="hidden text-right font-mono-type text-xs md:table-cell">{row.accuracy}%</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{timeAgo(row.created_at)}</TableCell>
                  <TableCell>
                    {row.flagged ? (
                      <Badge variant="destructive" className="text-[9px] uppercase">flagged</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] uppercase text-emerald-500">ok</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        disabled={flagging === row.id}
                        onClick={() => toggleFlag(row)}
                      >
                        {row.flagged ? <FlagOff size={13} /> : <Flag size={13} />}
                        <span className="hidden xl:inline">{row.flagged ? "Unflag" : "Flag"}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                        aria-label="Delete result"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
          Showing the latest {formatNumber(filtered.length)} result{filtered.length === 1 ? "" : "s"}.
          Flagged entries are hidden from public leaderboards.
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this result?"
        description={
          deleteTarget
            ? `${deleteTarget.user_name}'s ${GAME_TITLES[deleteTarget.game_id] || deleteTarget.game_id} result (${formatNumber(deleteTarget.score)} points) will be permanently deleted.`
            : ""
        }
        confirmLabel="Delete result"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
