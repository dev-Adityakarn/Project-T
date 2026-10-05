import { Footprints, Gauge, Zap, Flame, Crown, Target, HeartCrack, Skull, Gamepad2, Medal, Compass, CalendarCheck, Code, Award } from "lucide-react";

const ICONS = { Footprints, Gauge, Zap, Flame, Crown, Target, HeartCrack, Skull, Gamepad2, Medal, Compass, CalendarCheck, Code };

export const BadgeIcon = ({ name, size = 20, className = "" }) => {
  const I = ICONS[name] || Award;
  return <I size={size} className={className} />;
};

export const BadgeCard = ({ a }) => {
  const on = !!a.unlocked_at;
  return (
    <div data-testid={`badge-${a.id}`} data-unlocked={on}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors duration-200 ${on ? "border-primary/50 bg-primary/5" : "opacity-50 grayscale"}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${on ? "bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--kb-key-side))]" : "bg-muted text-muted-foreground"}`}>
        <BadgeIcon name={a.icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{a.title}</div>
        <div className="truncate text-xs text-muted-foreground">{on ? `Unlocked ${new Date(a.unlocked_at).toLocaleDateString()}` : a.desc}</div>
      </div>
    </div>
  );
};
