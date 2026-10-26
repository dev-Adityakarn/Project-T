import { CalendarDays, Clock, RefreshCw, User } from "lucide-react";

export function ArticleHeader({
  title,
  author = "Typinger Team",
  datePublished,
  dateModified,
  readingTime,
  lead,
}) {
  const showUpdated = dateModified && dateModified !== datePublished;

  return (
    <header className="mx-auto max-w-3xl">
      <h1
        className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl"
        data-testid="page-h1"
      >
        {title}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User size={12} /> {author || "Typinger Team"}
        </span>
        {datePublished && (
          <span className="flex items-center gap-1" data-testid="article-published">
            <CalendarDays size={12} /> Published {datePublished}
          </span>
        )}
        {showUpdated && (
          <span className="flex items-center gap-1" data-testid="article-updated">
            <RefreshCw size={12} /> Updated {dateModified}
          </span>
        )}
        {readingTime && (
          <span className="flex items-center gap-1">
            <Clock size={12} /> {readingTime}
          </span>
        )}
      </div>
      {lead && (
        <p className="mt-6 border-l-2 border-primary pl-4 text-base text-muted-foreground md:text-lg">
          {lead}
        </p>
      )}
    </header>
  );
}
