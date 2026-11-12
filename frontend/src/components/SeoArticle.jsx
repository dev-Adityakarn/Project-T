import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AdInArticle } from "@/components/ads/AdInArticle";
import { CustomCodePractice } from "@/components/CustomCodePractice";
import { ExamNetSpeedCalculator } from "@/components/ExamNetSpeedCalculator";
import { HomeRowDrill } from "@/components/HomeRowDrill";
import { KeyboardFingerMap } from "@/components/KeyboardFingerMap";
import { WpmInterpreter } from "@/components/WpmInterpreter";
import { isValidAdSlot } from "@/config/adsense";

const WIDGETS = {
  "wpm-interpreter": WpmInterpreter,
  "finger-map": KeyboardFingerMap,
  "home-row-drill": HomeRowDrill,
  "exam-net-speed": ExamNetSpeedCalculator,
  "custom-code-practice": CustomCodePractice,
};

const normalizeTo = (to) => (to === "/" ? "/" : to.endsWith("/") ? to : `${to}/`);

const wordsOf = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * A legacy article can repeat its excerpt as the first paragraph. The header
 * already renders the lead, so compare the two and drop the duplicate rather
 * than rendering the same sentence twice.
 */
const duplicatesLead = (paragraph, lead) => {
  if (!paragraph || !lead) return false;
  const a = wordsOf(lead);
  const b = wordsOf(paragraph);
  if (!a.length || !b.length) return false;
  if (paragraph.trim() === lead.trim()) return true;
  if (Math.min(a.length, b.length) < 12) return false;
  const leadWords = new Set(a);
  const overlap = b.filter((word) => leadWords.has(word)).length;
  return overlap / Math.min(a.length, b.length) >= 0.8;
};

const withoutDuplicateLead = (blocks = [], lead = "") => {
  if (!lead || !blocks.length) return blocks;
  const first = blocks[0];
  if (!first?.p?.length || first.h2 || first.h3) return blocks;
  if (!duplicatesLead(first.p[0], lead)) return blocks;

  const next = { ...first, p: first.p.slice(1) };
  if (!next.p.length) {
    const { p, ...rest } = next;
    return Object.keys(rest).length ? [rest, ...blocks.slice(1)] : blocks.slice(1);
  }
  return [next, ...blocks.slice(1)];
};

const collectSources = (blocks = []) => {
  const seen = new Set();
  const sources = [];
  blocks.forEach((block) => {
    (block.sources || []).forEach((source) => {
      if (!source?.url || seen.has(source.url)) return;
      seen.add(source.url);
      sources.push(source);
    });
  });
  return sources;
};

const Block = ({ b }) => {
  const Widget = b.widget ? WIDGETS[b.widget] : null;

  return (
  <section className="mt-10">
    {b.h2 && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{b.h2}</h2>}
    {b.h3 && <h3 className="mt-6 text-xl font-semibold tracking-tight">{b.h3}</h3>}
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
    {b.table && (
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm" data-testid="article-table">
          {b.table.caption && (
            <caption className="pb-3 text-left text-sm font-medium text-muted-foreground">{b.table.caption}</caption>
          )}
          <thead>
            <tr>
              {b.table.columns.map((column) => (
                <th key={column} scope="col" className="border-b bg-muted/40 px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b last:border-0">
                {row.map((cell, cellIndex) => (
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row" className="px-3 py-2 align-top font-medium">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex} className="px-3 py-2 align-top text-muted-foreground">
                      {cell}
                    </td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {b.pre && (
      <pre className="mt-5 overflow-x-auto rounded-xl border bg-muted/30 p-4 font-mono-type text-sm leading-relaxed">
        {Array.isArray(b.pre) ? b.pre.join("\n") : b.pre}
      </pre>
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
    {b.links?.length > 0 && (
      <div className="mt-5 rounded-xl border bg-muted/20 p-4" data-testid="article-links">
        <h3 className="text-sm font-semibold">{b.linksHeading || "Related reading"}</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {b.links.map((link) => (
            <li key={link.to}>
              <Link to={normalizeTo(link.to)} className="font-medium text-primary underline underline-offset-2">
                {link.label}
              </Link>
              {link.description ? <span className="text-muted-foreground"> — {link.description}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    )}
    {Widget && <Widget />}
  </section>
  );
};

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

const Sources = ({ sources }) => {
  if (!sources.length) return null;
  return (
    <section className="mt-14" data-testid="article-sources">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Sources</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {sources.map((source) => (
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
    </section>
  );
};

const contentLength = (blocks = []) =>
  blocks.reduce((total, block) => {
    const parts = [block.h2, block.h3, block.pre, ...(block.p || []), ...(block.ul || [])];
    (block.table?.columns || []).forEach((column) => parts.push(column));
    (block.table?.rows || []).forEach((row) => row.forEach((cell) => parts.push(cell)));
    (block.steps || []).forEach((step) => parts.push(step.h3, step.p));
    (block.links || []).forEach((link) => parts.push(link.label, link.description));
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
  lead = "",
}) => {
  const visibleBlocks = withoutDuplicateLead(blocks, lead);
  const sources = collectSources(visibleBlocks);
  const adPositions = articleAdPositions(visibleBlocks, inArticleAds);

  return (
    <div className="mx-auto max-w-3xl">
      {visibleBlocks.map((b, i) => (
        <Fragment key={b.h2 || b.h3 || i}>
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
      <Sources sources={sources} />
      <Faqs faqs={faqs} />
      <RelatedLinks links={related} />
    </div>
  );
};
