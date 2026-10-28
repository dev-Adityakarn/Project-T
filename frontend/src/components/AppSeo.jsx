import { useLocation } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { getGame } from "@/data/games";
import { buildSchemas } from "@/seo/schema";

const MAP = {
  "/games": {
    kind: "games-index",
    title: "Typing Games: 10 Free Games to Build Typing Speed",
    description: "Play ten free typing games, from a classic speed test to zombie defence and space shooting. Three difficulty levels and global leaderboards.",
    crumbs: [{ name: "Typing games" }],
  },
  "/daily": {
    kind: "utility",
    title: "Daily Typing Challenge: One Game, Everyone, Each Day",
    description: "Every day Typinger picks one game, one difficulty and one shared word seed. Compete against every other player on exactly the same challenge.",
    crumbs: [{ name: "Daily challenge" }],
    noindex: true,
  },
  "/leaderboard": {
    kind: "utility",
    title: "Typing Leaderboard: Fastest Typists by Game and Level",
    description: "See the fastest Typinger typists for every game and difficulty level, with WPM, accuracy and best scores updated as results come in.",
    crumbs: [{ name: "Leaderboard" }],
    noindex: true,
  },
  "/dashboard": {
    kind: "shell",
    title: "Your Typing Dashboard: WPM History and Badges",
    description: "Track your typing progress: WPM chart, per game statistics, personal bests, achievement badges and your recent results in one place.",
    noindex: true,
  },
  "/login": {
    kind: "shell",
    title: "Sign In to Typinger: Save Your Typing Progress",
    description: "Sign in to Typinger to save typing results, keep your WPM history, unlock achievement badges and appear on the global leaderboards.",
    noindex: true,
  },
  "/register": {
    kind: "shell",
    title: "Create a Free Typinger Account to Track Typing",
    description: "Create a free Typinger account in seconds to save every typing test, chart your WPM history, earn badges and join the daily challenge.",
    noindex: true,
  },
};

/** Head tags for app routes that are not content pages. */
export const AppSeo = () => {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const entry = MAP[path];

  if (entry) {
    return (
      <Seo path={path} title={entry.title} description={entry.description} noindex={entry.noindex}
        jsonLd={buildSchemas({ kind: entry.kind, path, crumbs: entry.crumbs || [] })} />
    );
  }

  const match = path.match(/^\/games\/([a-z-]+)$/);
  const game = match && getGame(match[1]);
  if (!game) return null;

  const page = {
    path,
    title: `${game.title} — Free Typing Game to Practise ${game.category === "Arcade" ? "Speed" : "Accuracy"}`.slice(0, 60),
    description: `${game.description} Play free on Typinger in easy, medium or hard mode and climb the leaderboard.`.slice(0, 155),
  };
  return (
    <Seo path={path} title={page.title} description={page.description} noindex
      jsonLd={buildSchemas({
        kind: "game",
        path,
        page,
        crumbs: [{ name: "Typing games", path: "/games/" }, { name: game.title }],
      })} />
  );
};
