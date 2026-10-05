import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/typing-test", label: "Typing speed test" },
  { to: "/typing-test/1-minute", label: "1 minute typing test" },
  { to: "/typing-practice", label: "Typing practice" },
  { to: "/typing-lessons", label: "Touch typing lessons" },
  { to: "/games", label: "Typing games" },
  { to: "/blog", label: "Typing guides" },
];

export default function NotFound() {
  return (
    <>
      <Seo path="/404" title="Page not found (404) — KeyQuest typing tests" description="That page does not exist. Jump back to the typing speed test, the practice drills, the touch typing lessons or the arcade." noindex />
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-8" data-testid="page-404">
        <div className="font-pixel text-5xl text-primary">404</div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">That page took a wrong turn</h1>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          The link is broken or the page has moved. Everything you came for is one click away.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`notfound-link-${l.to}`}
              className="rounded-xl border bg-card px-5 py-4 text-sm font-medium transition-colors duration-200 hover:border-primary hover:text-primary">
              {l.label}
            </Link>
          ))}
        </div>
        <Button asChild className="mt-8 rounded-full px-6 font-semibold" data-testid="notfound-home-btn"><Link to="/">Back to the typing test</Link></Button>
      </div>
    </>
  );
}
