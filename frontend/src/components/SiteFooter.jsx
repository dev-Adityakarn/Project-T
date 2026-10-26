import { Link } from "react-router-dom";
import { Keyboard } from "lucide-react";
import { ROUTES, SITE } from "@/seo";
import { openPrivacyChoices } from "@/lib/consent";

const GROUPS = ["Typing tests", "Practice & lessons", "Exam practice", "Games", "Company"];

export const SiteFooter = () => (
  <footer className="mt-20 border-t bg-card/40" data-testid="site-footer">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.3fr_repeat(3,1fr)]">
      <div>
        <Link to="/" className="flex items-center gap-2" data-testid="footer-logo">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Keyboard size={18} /></span>
          <span className="font-pixel text-[11px]">TYPINGER</span>
        </Link>
        <p className="mt-4 max-w-xs text-sm text-muted-foreground">{SITE.description}</p>
      </div>
      {["Typing tests", "Practice & lessons", "Games"].map((g) => (
        <div key={g}>
          <h2 className="text-sm font-semibold">{g}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ROUTES.filter((r) => r.group === g && r.nav).map((r) => (
              <li key={r.path}><Link to={r.path} className="text-muted-foreground hover:text-primary" data-testid={`footer-link-${r.path}`}>{r.nav}</Link></li>
            ))}
            {g === "Typing tests" && ROUTES.filter((r) => r.group === "Exam practice").map((r) => (
              <li key={r.path}><Link to={r.path} className="text-muted-foreground hover:text-primary" data-testid={`footer-link-${r.path}`}>{r.nav}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} {SITE.name}. Practice daily, type freely.</p>
        <ul className="flex flex-wrap items-center gap-4">
          {ROUTES.filter((r) => r.group === "Company" && r.nav).map((r) => (
            <li key={r.path}><Link to={r.path} className="hover:text-primary" data-testid={`footer-legal-${r.path}`}>{r.nav}</Link></li>
          ))}
          <li>
            <button
              type="button"
              onClick={openPrivacyChoices}
              className="hover:text-primary"
              data-testid="privacy-choices-btn"
            >
              Privacy choices
            </button>
          </li>
        </ul>
      </div>
    </div>
  </footer>
);

export { GROUPS };
