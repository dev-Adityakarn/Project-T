import { Fragment } from "react";
import { Link } from "react-router-dom";
import { AdInArticle } from "@/components/ads/AdInArticle";
import { isValidAdSlot } from "@/config/adsense";
import { docToText, isRichDoc, safeHref } from "@/lib/richText";

const linkClass =
  "font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary";

const renderInline = (nodes = []) =>
  nodes.map((node, index) => {
    if (!node || typeof node !== "object") return null;
    if (node.type === "hardBreak") return <br key={`break-${index}`} />;
    if (node.type !== "text") return null;

    let value = typeof node.text === "string" ? node.text : "";
    const marks = [...(node.marks || [])].sort((a, b) => {
      if (a?.type === "link") return 1;
      if (b?.type === "link") return -1;
      return 0;
    });

    marks.forEach((mark) => {
      if (mark?.type === "bold") {
        value = <strong key={`bold-${index}`}>{value}</strong>;
      } else if (mark?.type === "italic") {
        value = <em key={`italic-${index}`}>{value}</em>;
      } else if (mark?.type === "link") {
        const href = safeHref(mark.attrs?.href);
        if (!href) return;
        if (href.startsWith("/")) {
          value = (
            <Link key={`link-${index}`} to={href} className={linkClass}>
              {value}
            </Link>
          );
        } else {
          const external = !href.startsWith("mailto:");
          value = (
            <a
              key={`link-${index}`}
              href={href}
              className={linkClass}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {value}
            </a>
          );
        }
      }
    });

    return <Fragment key={`text-${index}`}>{value}</Fragment>;
  });

const headingClass = (level) => {
  if (level === 2) return "mt-10 scroll-mt-24 text-2xl font-bold tracking-tight sm:text-3xl";
  if (level === 3) return "mt-8 scroll-mt-24 text-xl font-semibold tracking-tight";
  return "mt-6 scroll-mt-24 text-lg font-semibold";
};

const paragraphClass = (compact) =>
  compact
    ? "text-sm leading-relaxed text-muted-foreground md:text-base"
    : "mt-4 text-sm leading-relaxed text-muted-foreground md:text-base";

const renderBlock = (node, key, index, compact = false) => {
  if (!node || typeof node !== "object") return null;

  if (node.type === "lead") {
    if (index === 0) return null;
    return (
      <p
        key={key}
        className="mt-6 border-l-2 border-primary pl-4 text-base text-muted-foreground md:text-lg"
      >
        {renderInline(node.content)}
      </p>
    );
  }

  if (node.type === "paragraph") {
    return (
      <p key={key} className={paragraphClass(compact)}>
        {renderInline(node.content)}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = [2, 3, 4].includes(node.attrs?.level) ? node.attrs.level : 2;
    const Tag = `h${level}`;
    return (
      <Tag key={key} className={headingClass(level)}>
        {renderInline(node.content)}
      </Tag>
    );
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const ordered = node.type === "orderedList";
    const ListTag = ordered ? "ol" : "ul";
    const items = Array.isArray(node.content) ? node.content : [];
    return (
      <ListTag
        key={key}
        start={ordered ? node.attrs?.start || 1 : undefined}
        className={
          ordered
            ? "mt-5 list-decimal space-y-3 pl-5 marker:font-semibold marker:text-primary"
            : "mt-5 space-y-3"
        }
      >
        {items.map((item, itemIndex) => {
          const blocks = Array.isArray(item?.content) ? item.content : [];
          return (
            <li
              key={`${key}-item-${itemIndex}`}
              className={ordered ? "pl-1" : "flex gap-3"}
            >
              {!ordered && (
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-primary"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                {blocks.map((block, blockIndex) =>
                  renderBlock(
                    block,
                    `${key}-item-${itemIndex}-${blockIndex}`,
                    blockIndex,
                    blockIndex === 0,
                  ),
                )}
              </div>
            </li>
          );
        })}
      </ListTag>
    );
  }

  if (node.type === "blockquote") {
    const blocks = Array.isArray(node.content) ? node.content : [];
    return (
      <blockquote
        key={key}
        className="mt-6 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground md:text-base"
      >
        {blocks.map((block, blockIndex) =>
          renderBlock(
            block,
            `${key}-quote-${blockIndex}`,
            blockIndex,
            blockIndex === 0,
          ),
        )}
      </blockquote>
    );
  }

  if (node.type === "horizontalRule") {
    return <hr key={key} className="my-10 border-border" />;
  }

  return null;
};

const articleAdPositions = (doc, slots = []) => {
  const validSlots =
    process.env.NODE_ENV === "production"
      ? slots.filter(isValidAdSlot)
      : slots;
  const blocks = isRichDoc(doc) ? doc.content : [];
  if (!validSlots.length || blocks.length < 3 || docToText(doc).length < 1200) {
    return [];
  }
  const positions = [{ after: 2, slot: validSlots[0] }];
  if (validSlots.length > 1 && blocks.length > 3) {
    const second = Math.min(5, blocks.length - 1);
    if (second > 2) positions.push({ after: second, slot: validSlots[1] });
  }
  return positions;
};

export function RichArticle({ doc, inArticleAds = [], className = "" }) {
  if (!isRichDoc(doc)) return null;
  const adPositions = articleAdPositions(doc, inArticleAds);

  return (
    <div className={`mx-auto max-w-3xl ${className}`.trim()} data-testid="rich-article">
      {doc.content.map((node, index) => (
        <Fragment key={`block-${index}`}>
          {renderBlock(node, `block-${index}`, index)}
          {adPositions
            .filter((position) => position.after === index + 1)
            .map((position) => (
              <AdInArticle
                key={`ad-${position.after}-${position.slot}`}
                slot={position.slot}
              />
            ))}
        </Fragment>
      ))}
    </div>
  );
}
