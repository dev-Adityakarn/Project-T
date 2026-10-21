import { useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { GAMES } from "@/data/games";

const FILTERS = ["All", "Classic", "Arcade"];

export default function Games() {
  const [f, setF] = useState("All");
  const list = GAMES.filter((g) => f === "All" || g.category === f);
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Games</h1>
      <p className="mt-3 text-base text-muted-foreground md:text-lg">10 ways to get faster. Start anywhere.</p>
      <div className="mt-8 flex gap-2" data-testid="games-filter">
        {FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)} data-testid={`filter-${x.toLowerCase()}`}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors duration-200 ${f === x ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {x}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g, i) => {
          const I = g.icon;
          return (
            <Link key={g.id} to={`/games/${g.id}/`} data-testid={`game-card-${g.id}`} style={{ animationDelay: `${i * 50}ms` }}
              className="rise-in group relative overflow-hidden rounded-2xl border bg-card p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/60">
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: `${g.color}22`, color: g.color }}><I size={24} /></span>
                <span className="flex items-center gap-1 rounded-full border px-2.5 py-1" title="Easy · Medium · Hard" data-testid={`levels-${g.id}`}>
                  {["#22C55E", "#F59E0B", "#EF4444"].map((c) => <span key={c} className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />)}
                  <span className="ml-1 text-[11px] text-muted-foreground">3 levels</span>
                </span>
              </div>
              <div className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">{g.category}</div>
              <h3 className="text-xl font-semibold">{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                <Play size={14} className="transition-transform duration-200 group-hover:translate-x-1" /> Play
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
