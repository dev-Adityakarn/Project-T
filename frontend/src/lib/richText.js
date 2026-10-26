export const CONTENT_FORMAT_LEGACY = "legacy-text-v1";
export const CONTENT_FORMAT_RICH = "rich-json-v1";

export const MIN_TEXT_CHARS = 20;
export const MAX_URL_LENGTH = 2048;
export const MAX_JSON_BYTES = 200_000;

const BLOCK_TYPES = new Set([
  "paragraph",
  "lead",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
]);
const INLINE_TYPES = new Set(["text", "hardBreak"]);
const ALLOWED_MARKS = new Set(["bold", "italic", "link"]);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export const emptyRichDoc = () => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export const isRichDoc = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      value.type === "doc" &&
      Array.isArray(value.content),
  );

export const normalizeRichDoc = (value) =>
  isRichDoc(value) ? value : emptyRichDoc();

const canonicalMarks = (marks) => {
  if (!Array.isArray(marks)) return [];
  const result = [];
  const seen = new Set();
  marks.forEach((mark) => {
    if (!mark || typeof mark !== "object") return;
    if (mark.type === "bold" || mark.type === "italic") {
      if (seen.has(mark.type)) return;
      seen.add(mark.type);
      result.push({ type: mark.type });
      return;
    }
    if (mark.type !== "link" || seen.has("link")) return;
    const href = safeHref(mark.attrs?.href);
    if (!href) return;
    seen.add("link");
    result.push({ type: "link", attrs: { href } });
  });
  return result;
};

const canonicalChildren = (content) =>
  Array.isArray(content)
    ? content.map(canonicalizeNode).filter(Boolean)
    : [];

const canonicalizeNode = (node) => {
  if (!node || typeof node !== "object") return null;
  const type = node.type;

  if (type === "text") {
    const text = typeof node.text === "string" ? node.text : "";
    const marks = canonicalMarks(node.marks);
    return marks.length
      ? { type, text, marks }
      : { type, text };
  }

  if (type === "hardBreak" || type === "horizontalRule") {
    return { type };
  }

  if (type === "heading") {
    const content = canonicalChildren(node.content);
    return {
      type,
      attrs: { level: node.attrs?.level },
      ...(content.length ? { content } : {}),
    };
  }

  if (type === "orderedList") {
    const start = node.attrs?.start;
    const content = canonicalChildren(node.content);
    return {
      type,
      attrs: {
        start:
          Number.isInteger(start) && start >= 1 && start <= 9999 ? start : 1,
      },
      ...(content.length ? { content } : {}),
    };
  }

  if (
    type === "doc" ||
    type === "paragraph" ||
    type === "lead" ||
    type === "bulletList" ||
    type === "listItem" ||
    type === "blockquote"
  ) {
    const content = canonicalChildren(node.content);
    return content.length ? { type, content } : { type };
  }

  // Unknown nodes are preserved with only their type and children so the
  // validator can report the unsupported block instead of silently dropping it.
  const content = canonicalChildren(node.content);
  return content.length ? { type, content } : { type };
};

/**
 * Produce the exact rich-document shape the server stores.  Tiptap adds
 * presentation-only link attributes (target/rel/class/title) and a numbering
 * `type` to ordered lists; those are intentionally not part of the storage
 * format.  Unsafe links are removed while their text is kept.
 */
export const canonicalizeRichDoc = (value) =>
  isRichDoc(value) ? canonicalizeNode(value) : emptyRichDoc();

/**
 * URL policy shared with the server.  Only explicit http(s), mailto and
 * site-relative links are accepted; javascript:, data:, protocol-relative and
 * credential-bearing URLs are rejected.
 */
export function safeHref(value) {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (
    !href ||
    href.length > MAX_URL_LENGTH ||
    CONTROL_CHARS.test(href) ||
    /\s/.test(href) ||
    href.includes("\\") ||
    href.startsWith("//")
  ) {
    return null;
  }
  if (href.startsWith("/")) return href;

  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const protocol = url.protocol.toLowerCase();
  if (protocol === "http:" || protocol === "https:") {
    if (!url.hostname || url.username || url.password) return null;
    return href;
  }
  if (protocol === "mailto:") {
    if (!url.pathname || !url.pathname.includes("@")) return null;
    return href;
  }
  return null;
}

export function normalizeHref(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("/") ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isSafeHref(value) {
  return safeHref(value) !== null;
}

const nodeText = (node) => {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (node.type === "hardBreak" || node.type === "horizontalRule") return " ";
  if (!Array.isArray(node.content)) return "";
  return node.content.map(nodeText).join(" ");
};

export function docToText(doc) {
  if (!isRichDoc(doc)) return "";
  return doc.content.map(nodeText).join(" ").replace(/\s+/g, " ").trim();
}

export function leadTextFromDoc(doc) {
  if (!isRichDoc(doc)) return null;
  const first = doc.content[0];
  if (!first || first.type !== "lead") return null;
  return nodeText(first).replace(/\s+/g, " ").trim() || null;
}

export function firstTextFromDoc(doc) {
  if (!isRichDoc(doc)) return "";
  for (const block of doc.content) {
    if (!block || typeof block !== "object") continue;
    if (["lead", "paragraph", "heading"].includes(block.type)) {
      const text = nodeText(block).replace(/\s+/g, " ").trim();
      if (text) return text;
    }
  }
  return "";
}

export function excerptFromDoc(doc, limit = 180) {
  const text = leadTextFromDoc(doc) || firstTextFromDoc(doc);
  if (!text) return "";
  if (text.length <= limit) return text;
  const shortened = text
    .slice(0, limit + 1)
    .replace(/\s+\S*$/, "")
    .replace(/[\s,.;:-]+$/, "");
  return `${shortened || text.slice(0, limit).trim()}…`;
}

export function readingTimeFromText(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** Shape used by the existing SeoArticle renderer for legacy posts. */
export function legacyTextToBlocks(content = "") {
  const blocks = [];
  for (const chunk of String(content)
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)) {
    if (chunk.startsWith("## ")) {
      const lines = chunk.split("\n");
      blocks.push({
        h2: lines[0].slice(3).trim(),
        p: lines.slice(1).map((line) => line.trim()).filter(Boolean),
      });
    } else if (chunk.startsWith("- ")) {
      blocks.push({
        ul: chunk
          .split("\n")
          .filter((line) => line.trim().startsWith("- "))
          .map((line) => line.trim().slice(2).trim()),
      });
    } else {
      blocks.push({ p: [chunk] });
    }
  }
  return blocks;
}

const paragraphFromLines = (lines) => {
  const content = [];
  lines.forEach((line, index) => {
    if (index > 0) content.push({ type: "hardBreak" });
    if (line) content.push({ type: "text", text: line });
  });
  return content.length
    ? { type: "paragraph", content }
    : { type: "paragraph" };
};

const listItemsFromLines = (lines, pattern) =>
  lines.map((line) => ({
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: line.replace(pattern, "") }],
      },
    ],
  }));

/**
 * Convert the old blank-line-delimited text format into the rich document
 * shape.  This is intentionally lossless for text: every line ends up in a
 * paragraph, heading or list item, and single line breaks become hard breaks.
 */
export function legacyTextToDoc(content = "") {
  const normalized = String(content).replace(/\r\n?/g, "\n").trim();
  if (!normalized) return emptyRichDoc();

  const chunks = normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, ""))
    .filter((chunk) => chunk.trim());

  const blocks = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const firstLine = lines[0].trim();
    const headingMatch = firstLine.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      const level = Math.min(4, Math.max(2, headingMatch[1].length));
      const headingText = headingMatch[2].replace(/\s+#+\s*$/, "").trim();
      blocks.push({
        type: "heading",
        attrs: { level },
        content: headingText ? [{ type: "text", text: headingText }] : [],
      });
      const rest = lines
        .slice(1)
        .map((line) => line.trim())
        .filter(Boolean);
      if (rest.length) blocks.push(paragraphFromLines(rest));
      continue;
    }

    const nonEmpty = lines.map((line) => line.trim()).filter(Boolean);
    if (nonEmpty.length && nonEmpty.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        type: "bulletList",
        content: listItemsFromLines(nonEmpty, /^[-*]\s+/),
      });
      continue;
    }

    if (
      nonEmpty.length &&
      nonEmpty.every((line) => /^\d+[.)]\s+/.test(line))
    ) {
      const start = Number.parseInt(nonEmpty[0].match(/^\d+/)?.[0] || "1", 10);
      blocks.push({
        type: "orderedList",
        attrs: { start: Number.isFinite(start) ? start : 1 },
        content: listItemsFromLines(nonEmpty, /^\d+[.)]\s+/),
      });
      continue;
    }

    if (
      nonEmpty.length === 1 &&
      /^(-{3,}|\*{3,}|_{3,})$/.test(nonEmpty[0])
    ) {
      blocks.push({ type: "horizontalRule" });
      continue;
    }

    if (nonEmpty.length && nonEmpty.every((line) => /^>\s?/.test(line))) {
      blocks.push({
        type: "blockquote",
        content: [
          paragraphFromLines(nonEmpty.map((line) => line.replace(/^>\s?/, ""))),
        ],
      });
      continue;
    }

    blocks.push(paragraphFromLines(lines.map((line) => line.trim())));
  }

  return {
    type: "doc",
    content: blocks.length ? blocks : [{ type: "paragraph" }],
  };
}

const validateMarks = (marks, path, errors) => {
  if (marks == null) return;
  if (!Array.isArray(marks)) {
    errors.push(`${path}: Text marks must be a list.`);
    return;
  }
  const seen = new Set();
  marks.forEach((mark, index) => {
    const markPath = `${path}[${index}]`;
    if (!mark || typeof mark !== "object") {
      errors.push(`${markPath}: Each mark must be an object.`);
      return;
    }
    if (!ALLOWED_MARKS.has(mark.type)) {
      errors.push(`${markPath}: Unsupported formatting: ${String(mark.type)}.`);
      return;
    }
    if (seen.has(mark.type)) {
      errors.push(`${markPath}: Duplicate ${mark.type} formatting.`);
      return;
    }
    seen.add(mark.type);
    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (!href) {
        errors.push(
          `${markPath}: Link URLs must use https, http, mailto, or a site-relative path beginning with /.`,
        );
      }
    }
  });
};

const validateInline = (content, path, errors, counters) => {
  if (content == null) return;
  if (!Array.isArray(content)) {
    errors.push(`${path}: Inline content must be a list.`);
    return;
  }
  content.forEach((node, index) => {
    const nodePath = `${path}[${index}]`;
    if (!node || typeof node !== "object") {
      errors.push(`${nodePath}: Inline content must be an object.`);
      return;
    }
    counters.nodes += 1;
    if (!INLINE_TYPES.has(node.type)) {
      errors.push(
        `${nodePath}: Only text and line breaks are allowed inside paragraphs.`,
      );
      return;
    }
    if (node.type === "hardBreak") return;
    if (typeof node.text !== "string") {
      errors.push(`${nodePath}: Text nodes need a string text value.`);
      return;
    }
    counters.textChars += node.text.length;
    validateMarks(node.marks, `${nodePath}.marks`, errors);
  });
};

const validateBlock = (
  node,
  path,
  errors,
  counters,
  depth,
  topLevelIndex,
  headings,
  leads,
  allowListItem = false,
) => {
  if (!node || typeof node !== "object") {
    errors.push(`${path}: Block content must be an object.`);
    return;
  }
  counters.nodes += 1;
  if (!BLOCK_TYPES.has(node.type)) {
    errors.push(`${path}: Unsupported block type: ${String(node.type)}.`);
    return;
  }
  if (node.type === "listItem" && !allowListItem) {
    errors.push(`${path}: List items must be inside a bulleted or numbered list.`);
    return;
  }
  if (depth > 12) {
    errors.push(`${path}: Content cannot be nested more than 12 levels deep.`);
    return;
  }

  if (node.type === "horizontalRule") return;

  if (node.type === "paragraph" || node.type === "lead") {
    validateInline(node.content, `${path}.content`, errors, counters);
    if (node.type === "lead") {
      if (depth !== 1) {
        errors.push(`${path}: A lead paragraph is only allowed at the top level.`);
      } else {
        leads.push({ path, index: topLevelIndex });
      }
      if (!nodeText(node).trim()) {
        errors.push(`${path}: The lead paragraph cannot be empty.`);
      }
    }
    return;
  }

  if (node.type === "heading") {
    const level = node.attrs?.level;
    if (![2, 3, 4].includes(level)) {
      errors.push(
        `${path}: Headings must be H2, H3, or H4. H1 is reserved for the article title.`,
      );
    } else {
      headings.push({ level, path });
    }
    validateInline(node.content, `${path}.content`, errors, counters);
    if (!nodeText(node).trim()) {
      errors.push(`${path}: Headings cannot be empty.`);
    }
    return;
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    if (!Array.isArray(node.content) || !node.content.length) {
      errors.push(
        `${path}: A ${node.type === "bulletList" ? "bulleted" : "numbered"} list needs at least one item.`,
      );
      return;
    }
    node.content.forEach((item, index) => {
      if (!item || item.type !== "listItem") {
        errors.push(`${path}.content[${index}]: Lists can only contain list items.`);
        return;
      }
      validateBlock(
        item,
        `${path}.content[${index}]`,
        errors,
        counters,
        depth + 1,
        null,
        headings,
        leads,
        true,
      );
    });
    return;
  }

  if (node.type === "listItem") {
    if (!Array.isArray(node.content) || !node.content.length) {
      errors.push(`${path}: A list item cannot be empty.`);
      return;
    }
    node.content.forEach((block, index) => {
      validateBlock(
        block,
        `${path}.content[${index}]`,
        errors,
        counters,
        depth + 1,
        null,
        headings,
        leads,
      );
    });
    if (node.content[0]?.type !== "paragraph") {
      errors.push(`${path}: A list item must start with a paragraph.`);
    }
    return;
  }

  if (node.type === "blockquote") {
    if (!Array.isArray(node.content) || !node.content.length) {
      errors.push(`${path}: A blockquote needs at least one block.`);
      return;
    }
    node.content.forEach((block, index) => {
      validateBlock(
        block,
        `${path}.content[${index}]`,
        errors,
        counters,
        depth + 1,
        null,
        headings,
        leads,
      );
    });
  }
};

/**
 * Client-side mirror of the server validation.  The server remains the trust
 * boundary; these messages are for immediate, actionable editor feedback.
 */
export function validateRichDoc(doc) {
  const errors = [];
  if (!isRichDoc(doc)) {
    return ["The article body is not a valid rich-text document."];
  }
  if (!doc.content.length) {
    return ["The article body cannot be empty."];
  }

  try {
    if (JSON.stringify(doc).length > MAX_JSON_BYTES) {
      errors.push("The article body is larger than the 200 KB limit.");
    }
  } catch {
    errors.push("The article body could not be serialized.");
  }

  const counters = { nodes: 0, textChars: 0 };
  const headings = [];
  const leads = [];
  doc.content.forEach((node, index) => {
    validateBlock(
      node,
      `body[${index}]`,
      errors,
      counters,
      1,
      index,
      headings,
      leads,
    );
  });

  if (counters.nodes > 5000) {
    errors.push("The article body contains too many elements (maximum 5000).");
  }
  if (leads.length > 1) {
    errors.push("Only one lead paragraph is allowed.");
  }
  leads.forEach((lead) => {
    if (lead.index !== 0) {
      errors.push("The lead paragraph must be the first body block.");
    }
  });

  if (headings.length) {
    const [first] = headings;
    if (first.level !== 2) {
      errors.push(
        `The first heading must be H2, but this is H${first.level}. Start with an H2 or change it to H2.`,
      );
    }
    let previous = first.level;
    headings.slice(1).forEach(({ level }) => {
      if (level > previous + 1) {
        errors.push(
          `Heading level skipped: H${previous} is followed by H${level}. Add an H${previous + 1} before it or change this heading to H${previous + 1} or lower.`,
        );
      }
      previous = level;
    });
  }

  if (counters.textChars < MIN_TEXT_CHARS) {
    errors.push(
      `Content must contain at least ${MIN_TEXT_CHARS} characters of text.`,
    );
  }

  return [...new Set(errors)];
}

const unwrapElement = (element) => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
};

const replaceTag = (document, element, tagName) => {
  const replacement = document.createElement(tagName);
  while (element.firstChild) replacement.appendChild(element.firstChild);
  element.replaceWith(replacement);
};

const textWithBreaks = (document, text) => {
  const fragment = document.createDocumentFragment();
  String(text)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line, index) => {
      if (index > 0) fragment.appendChild(document.createElement("br"));
      if (line) fragment.appendChild(document.createTextNode(line));
    });
  return fragment;
};

/**
 * Normalise Word / Google Docs clipboard HTML before Tiptap parses it.
 *
 * Tiptap's schema already drops unsupported marks and blocks, but foreign
 * editors wrap whole documents in styled <b>/<span> elements.  We map the
 * style information we support, flatten unsupported block containers without
 * losing their text, and remove dangerous or decorative elements.
 */
export function sanitizePastedHtml(html) {
  if (typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString(String(html || ""), "text/html");

  document
    .querySelectorAll(
      "script, style, iframe, object, embed, form, input, button, select, textarea, video, audio, canvas, svg, img, picture, source, link, meta, base",
    )
    .forEach((element) => element.remove());

  // Google Docs wraps the entire document in <b style="font-weight:normal">.
  document.querySelectorAll("b, strong").forEach((element) => {
    const weight = element
      .getAttribute("style")
      ?.match(/font-weight\s*:\s*([^;]+)/i)?.[1]
      ?.trim()
      .toLowerCase();
    if (weight === "normal" || weight === "400" || weight === "lighter") {
      unwrapElement(element);
    }
  });

  document.querySelectorAll("i, em").forEach((element) => {
    const style = element
      .getAttribute("style")
      ?.match(/font-style\s*:\s*([^;]+)/i)?.[1]
      ?.trim()
      .toLowerCase();
    if (style === "normal") unwrapElement(element);
  });

  document.querySelectorAll("span").forEach((element) => {
    const style = element.getAttribute("style") || "";
    const bold = /font-weight\s*:\s*(bold|bolder|[6-9]00)/i.test(style);
    const italic = /font-style\s*:\s*(italic|oblique)/i.test(style);
    if (!bold && !italic) {
      unwrapElement(element);
      return;
    }
    const strong = bold ? document.createElement("strong") : null;
    const em = italic ? document.createElement("em") : null;
    const children = Array.from(element.childNodes);
    if (strong && em) {
      em.append(...children);
      strong.append(em);
      element.replaceWith(strong);
    } else {
      const wrapper = strong || em;
      wrapper.append(...children);
      element.replaceWith(wrapper);
    }
  });

  document.querySelectorAll("h1").forEach((element) => replaceTag(document, element, "h2"));
  document.querySelectorAll("h5, h6").forEach((element) => replaceTag(document, element, "h4"));

  document.querySelectorAll("pre").forEach((element) => {
    const paragraph = document.createElement("p");
    paragraph.appendChild(textWithBreaks(document, element.textContent || ""));
    element.replaceWith(paragraph);
  });

  document.querySelectorAll("table").forEach((table) => {
    const paragraph = document.createElement("p");
    const rows = Array.from(table.querySelectorAll("tr"))
      .map((row) =>
        Array.from(row.querySelectorAll("th, td"))
          .map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" · "),
      )
      .filter(Boolean);
    paragraph.appendChild(textWithBreaks(document, rows.join("\n")));
    table.replaceWith(paragraph);
  });

  document.querySelectorAll("code, u, ins, s, strike, del, font, center").forEach(unwrapElement);

  document.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const keepHref = element.tagName === "A" && attribute.name === "href";
      const keepListStart = element.tagName === "OL" && attribute.name === "start";
      if (!keepHref && !keepListStart) element.removeAttribute(attribute.name);
    });
  });

  document.querySelectorAll("a").forEach((anchor) => {
    const href = safeHref(anchor.getAttribute("href"));
    if (!href) {
      unwrapElement(anchor);
      return;
    }
    anchor.setAttribute("href", href);
  });

  return document.body.innerHTML;
}
