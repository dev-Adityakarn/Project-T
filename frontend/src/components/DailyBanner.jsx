import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";
import { getGame } from "@/data/games";
import { DifficultyBadge } from "./DifficultyPicker";

export const DailyBanner = () => {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/daily").then((r) => setD(r.data)).catch(() => {}); }, []);
  const game = d && getGame(d.game_id);
  if (!game) return null;
  const I = game.icon;
  const h = Math.floor(d.resets_in / 3600);
  const m = Math.floor((d.resets_in % 3600) / 60);
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-8">
      <Link to="/daily" data-testid="home-daily-banner"
        className="rise-in group flex flex-col gap-4 rounded-2xl border border-primary/40 bg-card p-5 transition-colors duration-200 hover:border-primary sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--kb-key-side))]"><CalendarCheck size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today's challenge</div>
          <div className="flex flex-wrap items-center gap-2 text-lg font-semibold"><I size={18} style={{ color: game.color }} /> {game.title} <DifficultyBadge d={d.difficulty} /></div>
        </div>
        <div className="text-sm text-muted-foreground" data-testid="home-daily-reset">Resets in {h}h {m}m</div>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Play now <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" /></span>
      </Link>
    </section>
  );
};
