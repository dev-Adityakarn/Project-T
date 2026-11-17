import { useEffect } from "react";
import { Link, useRouteError } from "react-router-dom";
import { isChunkLoadError, shouldRetryChunkLoad } from "@/lib/chunkErrors";

/**
 * Root error boundary for the data router. It replaces React Router's
 * developer-facing default screen with a branded recovery page, and reloads
 * once when a deploy left the browser holding an old chunk manifest.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError && shouldRetryChunkLoad()) window.location.reload();
  }, [chunkError]);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="route-error">
      <main className="mx-auto max-w-2xl px-4 py-24">
        <div className="font-pixel text-xs uppercase tracking-widest text-primary">Typinger</div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {chunkError ? "Loading the latest version" : "Something went wrong"}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          {chunkError
            ? "The page was opened while a new version of the site was being published. Reload to fetch the current files."
            : "This page could not be loaded. Your typing results and saved scores are not affected."}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If the problem continues, email{" "}
          <a className="text-primary underline" href="mailto:support@typinger.in">
            support@typinger.in
          </a>{" "}
          with the page address and your browser.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-5 py-2.5 text-primary-foreground"
          >
            Reload the page
          </button>
          <Link to="/" className="rounded-full border px-5 py-2.5">
            Back to typing test
          </Link>
          <Link to="/contact/" className="rounded-full border px-5 py-2.5">
            Contact support
          </Link>
        </div>
      </main>
    </div>
  );
}
