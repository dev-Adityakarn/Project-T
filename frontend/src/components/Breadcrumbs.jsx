import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export const Breadcrumbs = ({ crumbs = [] }) => (
  <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" data-testid="breadcrumbs">
    <Link to="/" className="hover:text-foreground" data-testid="breadcrumb-home">Home</Link>
    {crumbs.map((c, i) => (
      <span key={c.name} className="flex items-center gap-1">
        <ChevronRight size={12} className="opacity-60" />
        {c.path && i < crumbs.length - 1 ? (
          <Link to={c.path} className="hover:text-foreground" data-testid={`breadcrumb-link-${i}`}>{c.name}</Link>
        ) : (
          <span className="text-foreground" aria-current="page" data-testid="breadcrumb-current">{c.name}</span>
        )}
      </span>
    ))}
  </nav>
);
