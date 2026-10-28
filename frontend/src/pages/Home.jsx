import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Activity, Gamepad2 } from "lucide-react";
import { HeroKeyboard } from "@/components/HeroKeyboard";
import { DailyBanner } from "@/components/DailyBanner";
import { GAMES } from "@/data/games";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { SeoArticle } from "@/components/SeoArticle";
import { TypingTool } from "@/components/TypingTool";
import { AD_SLOTS } from "@/config/adsense";
import { getPage, canonicalPath } from "@/seo";
import { buildSchemas } from "@/seo/schema";

const Strip = () => (
  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3">
    {[
      { icon: Gamepad2, k: "10", v: "typing games, classic to arcade" },
      { icon: Activity, k: "Live", v: "WPM and accuracy tracking" },
      { icon: Trophy, k: "Global", v: "leaderboards for every game" },
    ].map(({ icon: I, k, v }) => (
      <div key={k} className="flex items-center gap-4 bg-card p-6">
        <I className="text-primary" size={22} />
        <div><div className="font-pixel text-sm">{k}</div><div className="text-sm text-muted-foreground">{v}</div></div>
      </div>
    ))}
  </div>
);

const GameTile = ({ g, big, i }) => {
  const I = g.icon;
  return (
    <Link to={canonicalPath(`/games/${g.id}`)} data-testid={`home-game-${g.id}`} style={{ animationDelay: `${i * 60}ms` }}
      className={`rise-in group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1 ${big ? "sm:col-span-2 sm:row-span-2 min-h-[260px]" : "min-h-[150px]"}`}>
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40" style={{ background: g.color }} />
      <I size={big ? 40 : 26} style={{ color: g.color }} />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{g.category}</div>
        <h3 className={`font-semibold ${big ? "text-3xl" : "text-lg"}`}>{g.title}</h3>
        {big && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{g.description}</p>}
      </div>
    </Link>
  );
};

export default function Home() {
  const page = getPage("/");
  return (
    <div>
      <Seo path="/" title={page.title} description={page.description}
        jsonLd={buildSchemas({ kind: "home", path: "/", page, faqs: page.faqs })} />
      <section className="noise relative overflow-hidden bg-grid">
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pb-8 pt-14 sm:px-8 sm:pt-16 lg:grid-cols-[5fr_7fr]">
          <div className="rise-in max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Press any key — the keyboard is live
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-[4.25rem]" data-testid="page-h1">
              Free typing test and ten typing games in one place
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              {page.lead} Blast asteroids, outrun bots, survive zombies — and watch your WPM climb.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 font-semibold" data-testid="hero-play-btn">
                <Link to="/games/">Start playing <ArrowRight size={18} /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7" data-testid="hero-speedtest-btn">
                <Link to="/typing-test/">Typing speed test</Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 lg:mt-0"><HeroKeyboard /></div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6 pt-10 sm:px-8" id="typing-test" data-testid="home-tool-section">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Take the 60 second typing test</h2>
        <TypingTool config={page.tool} label="Home typing test" testId="tool-home" resultAdSlot={AD_SLOTS.homepageAfterTest} />
      </section>

      <DailyBanner />
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-8"><Strip /></section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Pick your arena</h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">Every game trains a different typing muscle.</p>
          </div>
          <Link to="/games/" className="hidden text-sm font-medium text-primary hover:underline sm:block" data-testid="home-all-games-link">All games</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {GAMES.map((g, i) => <GameTile key={g.id} g={g} i={i} big={i === 0 || i === 3} />)}
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Track every keystroke.</h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">Create a free account to save scores, chart your progress and climb the leaderboard.</p>
          </div>
          <Button asChild size="lg" className="rounded-full px-7 font-semibold" data-testid="cta-register-btn">
            <Link to="/register/">Create free account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-8">
        <SeoArticle
          blocks={page.blocks}
          faqs={page.faqs}
          related={page.related}
          inArticleAds={[AD_SLOTS.homepageContent]}
        />
      </section>
    </div>
  );
}
