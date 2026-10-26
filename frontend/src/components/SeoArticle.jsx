import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AdInArticle } from "@/components/ads/AdInArticle";
import { isValidAdSlot } from "@/config/adsense";

const Block = ({ b }) => (
  <section className="mt-10">
    {b.h2 && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{b.h2}</h2>}
    {b.p?.map((t) => <p key={t.slice(0, 24)} className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">{t}</p>)}
    {b.ul && (
      <ul className="mt-5 space-y-3">
        {b.ul.map((t) => (
          <li key={t.slice(0, 24)} className="flex gap-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-primary" />{t}
          </li>
        ))}
      </ul>
    )}
    {b.steps && (
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {b.steps.map((s, i) => (
          <div key={s.h3} className="rounded-2xl border bg-card p-5">
            <div className="font-pixel text-[10px] text-primary">{String(i + 1).padStart(2, "0")}</div>
            <h3 className="mt-2 text-base font-semibold">{s.h3}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
          </div>
        ))}
      </div>
    )}
    {b.sources?.length > 0 && (
      <div className="mt-5 rounded-xl border bg-muted/30 p-4" data-testid="article-sources">
        <h3 className="text-sm font-semibold">Sources</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {b.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
);

export const Faqs = ({ faqs, heading = "Frequently asked questions" }) => {
  if (!faqs?.length) return null;
  return (
    <section className="mt-14" data-testid="faq-section">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
      <dl className="mt-6 divide-y rounded-2xl border bg-card">
        {faqs.map((f, i) => (
          <div key={f.q} className="p-5" data-testid={`faq-item-${i}`}>
            <dt className="text-base font-semibold">{f.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export const RelatedLinks = ({ links, heading = "Keep practising" }) => {
  if (!links?.length) return null;
  return (
    <section className="mt-14" data-testid="related-links">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {links.map((l) => {
          const targetTo = l.to === "/" ? "/" : (l.to.endsWith("/") ? l.to : `${l.to}/`);
          return (
            <Link key={l.to} to={targetTo} data-testid={`related-${l.to}`}
              className="group flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4 text-sm font-medium transition-colors duration-200 hover:border-primary hover:text-primary">
              {l.label}
              <ArrowUpRight size={16} className="opacity-50 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const contentLength = (blocks = []) =>
  blocks.reduce((total, block) => {
    const parts = [block.h2, ...(block.p || []), ...(block.ul || [])];
    (block.steps || []).forEach((step) => parts.push(step.h3, step.p));
    (block.sources || []).forEach((source) => parts.push(source.label));
    return total + parts.filter(Boolean).join(" ").length;
  }, 0);

/**
 * In-content ads are inserted between whole sections, never inside a paragraph
 * or list, and never as the last thing before the FAQ. The first unit lands
 * after section two; a second unit needs a long article and leaves at least
 * one more section below it.
 */
const articleAdPositions = (blocks = [], slots = []) => {
  // Production only creates units for real slot IDs. Development keeps the
  // unconfigured slots so AdSenseUnit can show its dashed placeholder.
  const validSlots =
    process.env.NODE_ENV === "production" ? slots.filter(isValidAdSlot) : slots;
  if (!validSlots.length || blocks.length < 3 || contentLength(blocks) < 1200) {
    return [];
  }

  const positions = [{ after: 2, slot: validSlots[0] }];
  if (validSlots.length > 1 && blocks.length > 3) {
    const second = Math.min(5, blocks.length - 1);
    if (second > 2) positions.push({ after: second, slot: validSlots[1] });
  }
  return positions;
};

export const SeoArticle = ({
  blocks = [],
  faqs = [],
  related = [],
  inArticleAds = [],
}) => {
  const adPositions = articleAdPositions(blocks, inArticleAds);

  return (
    <div className="mx-auto max-w-3xl">
      {blocks.map((b, i) => (
        <Fragment key={b.h2 || i}>
          <Block b={b} />
          {adPositions
            .filter((position) => position.after === i + 1)
            .map((position) => (
              <AdInArticle
                key={`ad-${position.after}-${position.slot}`}
                slot={position.slot}
              />
            ))}
        </Fragment>
      ))}
      <Faqs faqs={faqs} />
      <RelatedLinks links={related} />
    </div>
  );
};
