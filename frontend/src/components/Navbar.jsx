import { Link, NavLink, useNavigate } from "react-router-dom";
import { Keyboard, Moon, Sun, LogOut, User, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useMuted } from "@/hooks/useMuted";
import { sfx } from "@/lib/sound";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/typing-test/", label: "Typing Tests", testId: "typing-tests" },
  { to: "/typing-lessons/", label: "Lessons", testId: "lessons" },
  { to: "/blog/", label: "Blog", testId: "blog" },
  { to: "/games/", label: "Games", testId: "games" },
  { to: "/daily/", label: "Daily", testId: "daily" },
  { to: "/leaderboard/", label: "Leaderboard", testId: "leaderboard" },
];

export const Navbar = () => {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [muted, setMuted] = useMuted();
  const nav = useNavigate();
  const toggleMute = () => { setMuted(!muted); if (muted) setTimeout(sfx.hit, 0); };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-xl" data-testid="navbar">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-8 md:flex-nowrap md:py-0">
        <Link to="/" className="flex h-12 items-center gap-2" data-testid="nav-logo">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_4px_0_hsl(var(--kb-key-side))]">
            <Keyboard size={18} />
          </span>
          <span className="font-pixel text-[11px] tracking-tight sm:text-xs">TYPINGER</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 md:order-3">
          <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"} data-testid="sound-toggle-btn" data-muted={muted} className="rounded-full">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" data-testid="theme-toggle-btn" className="rounded-full">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {user ? (
            <>
              <Link to="/dashboard/" className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-sm sm:flex" data-testid="nav-user-name">
                <User size={14} /> {user.name}
              </Link>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={async () => { await logout(); nav("/"); }} data-testid="logout-btn" aria-label="Log out">
                <LogOut size={18} />
              </Button>
            </>
          ) : (
            <Button onClick={() => nav("/login/")} className="rounded-full px-5 font-semibold" data-testid="nav-login-btn">Sign in</Button>
          )}
        </div>
        <nav
          aria-label="Primary"
          data-testid="primary-nav"
          className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 pb-1 md:order-2 md:mx-0 md:w-auto md:flex-1 md:justify-center md:overflow-visible md:px-0 md:pb-0"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.testId}`}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-muted sm:px-4 ${
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
