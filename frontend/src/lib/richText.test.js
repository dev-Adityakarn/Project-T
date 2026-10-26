import {
  canonicalizeRichDoc,
  docToText,
  excerptFromDoc,
  leadTextFromDoc,
  legacyTextToBlocks,
  legacyTextToDoc,
  normalizeHref,
  readingTimeFromText,
  safeHref,
  sanitizePastedHtml,
  validateRichDoc,
} from "@/lib/richText";

const text = (value, marks) => {
  const node = { type: "text", text: value };
  if (marks) node.marks = marks;
  return node;
};
const paragraph = (...content) => ({ type: "paragraph", content });
const heading = (level, value) => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

const fullDoc = {
  type: "doc",
  content: [
    {
      type: "lead",
      content: [text("A lead paragraph that introduces the article.")],
    },
    {
      type: "paragraph",
      content: [
        text("Plain "),
        text("bold", [{ type: "bold" }]),
        text(" and "),
        text("italic", [{ type: "italic" }]),
        text(" with a "),
        text("link", [
          { type: "link", attrs: { href: "https://example.com/guide" } },
        ]),
        { type: "hardBreak" },
        text("after a line break."),
      ],
    },
    heading(2, "First section"),
    paragraph(text("Section body text that is long enough to pass.")),
    heading(3, "Subsection"),
    paragraph(text("Subsection body.")),
    heading(4, "Detail"),
    paragraph(text("Detail body.")),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [paragraph(text("First bullet"))] },
        { type: "listItem", content: [paragraph(text("Second bullet"))] },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 2 },
      content: [
        { type: "listItem", content: [paragraph(text("Second step"))] },
        { type: "listItem", content: [paragraph(text("Third step"))] },
      ],
    },
    {
      type: "blockquote",
      content: [paragraph(text("A quoted sentence."))],
    },
    { type: "horizontalRule" },
  ],
};

describe("URL policy", () => {
  test.each([
    "https://example.com/a?b=1#c",
    "http://example.com",
    "mailto:hello@example.com",
    "/blog/guide/",
  ])("accepts %s", (href) => {
    expect(safeHref(href)).toBe(href);
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example/path",
    "https://user:pass@example.com/",
    "https:\\\\evil.example",
    "file:///etc/passwd",
    "https://exa mple.com",
    "",
  ])("rejects %s", (href) => {
    expect(safeHref(href)).toBeNull();
  });

  test("adds https to a bare host", () => {
    expect(normalizeHref("example.com/guide")).toBe(
      "https://example.com/guide",
    );
    expect(normalizeHref("/blog/guide/")).toBe("/blog/guide/");
    expect(normalizeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
  });
});

describe("storage canonicalization", () => {
  test("removes Tiptap-only link and ordered-list attributes", () => {
    const input = {
      type: "doc",
      content: [
        paragraph(
          text("A safe link", [
            {
              type: "link",
              attrs: {
                href: "https://example.com/guide",
                target: "_blank",
                rel: "noopener noreferrer",
                class: null,
                title: null,
              },
            },
          ]),
        ),
        {
          type: "orderedList",
          attrs: { start: 2, type: null },
          content: [
            {
              type: "listItem",
              content: [paragraph(text("Second step"))],
            },
          ],
        },
      ],
    };

    expect(canonicalizeRichDoc(input)).toEqual({
      type: "doc",
      content: [
        paragraph(
          text("A safe link", [
            {
              type: "link",
              attrs: { href: "https://example.com/guide" },
            },
          ]),
        ),
        {
          type: "orderedList",
          attrs: { start: 2 },
          content: [
            {
              type: "listItem",
              content: [paragraph(text("Second step"))],
            },
          ],
        },
      ],
    });
  });

  test("keeps the text of an unsafe link but removes the link mark", () => {
    const result = canonicalizeRichDoc({
      type: "doc",
      content: [
        paragraph(
          text("unsafe link text that is long enough", [
            { type: "link", attrs: { href: "javascript:alert(1)" } },
          ]),
        ),
      ],
    });
    expect(result.content[0].content[0]).toEqual(
      text("unsafe link text that is long enough"),
    );
    expect(validateRichDoc(result)).toEqual([]);
  });
});

describe("document validation", () => {
  test("accepts every supported block and mark", () => {
    expect(validateRichDoc(fullDoc)).toEqual([]);
  });

  test("rejects H1, H5 and skipped heading levels", () => {
    expect(
      validateRichDoc({
        type: "doc",
        content: [heading(1, "Title"), paragraph(text("x".repeat(30)))],
      }).join(" "),
    ).toContain("H1 is reserved");

    expect(
      validateRichDoc({
        type: "doc",
        content: [heading(3, "Too deep"), paragraph(text("x".repeat(30)))],
      }).join(" "),
    ).toContain("first heading must be H2");

    expect(
      validateRichDoc({
        type: "doc",
        content: [
          heading(2, "Top"),
          paragraph(text("x".repeat(30))),
          heading(4, "Skipped"),
          paragraph(text("More body text.")),
        ],
      }).join(" "),
    ).toContain("Heading level skipped: H2 is followed by H4");
  });

  test("rejects a lead that is not first and empty content", () => {
    expect(
      validateRichDoc({
        type: "doc",
        content: [
          paragraph(text("x".repeat(30))),
          { type: "lead", content: [text("Late lead")] },
        ],
      }).join(" "),
    ).toContain("lead paragraph must be the first");

    expect(
      validateRichDoc({ type: "doc", content: [{ type: "lead" }] }).join(" "),
    ).toContain("lead paragraph cannot be empty");
  });

  test("rejects unsafe links and unsupported marks", () => {
    expect(
      validateRichDoc({
        type: "doc",
        content: [
          paragraph(
            text("x".repeat(30), [
              { type: "link", attrs: { href: "javascript:alert(1)" } },
            ]),
          ),
        ],
      }).join(" "),
    ).toContain("Link URLs must use");

    expect(
      validateRichDoc({
        type: "doc",
        content: [paragraph(text("x".repeat(30), [{ type: "strike" }]))],
      }).join(" "),
    ).toContain("Unsupported formatting: strike");
  });

  test("rejects short text", () => {
    expect(
      validateRichDoc({
        type: "doc",
        content: [paragraph(text("Too short"))],
      }).join(" "),
    ).toContain("at least 20 characters");
  });

  test("rejects a list item outside a list", () => {
    expect(
      validateRichDoc({
        type: "doc",
        content: [
          {
            type: "listItem",
            content: [paragraph(text("Stray list item text that is long."))],
          },
        ],
      }).join(" "),
    ).toContain("inside a bulleted or numbered list");
  });
});

describe("legacy conversion", () => {
  test("preserves headings, paragraphs, lists, quotes, rules and text", () => {
    const legacy = [
      "## Heading",
      "Intro line",
      "",
      "- One",
      "- Two",
      "",
      "1. First",
      "2. Second",
      "",
      "> Quote",
      "",
      "---",
      "",
      "Last paragraph.",
    ].join("\n");

    const doc = legacyTextToDoc(legacy);
    const types = doc.content.map((node) => node.type);
    expect(types).toEqual([
      "heading",
      "paragraph",
      "bulletList",
      "orderedList",
      "blockquote",
      "horizontalRule",
      "paragraph",
    ]);
    expect(docToText(doc)).toContain("Heading");
    expect(docToText(doc)).toContain("One");
    expect(docToText(doc)).toContain("First");
    expect(docToText(doc)).toContain("Quote");
    expect(docToText(doc)).toContain("Last paragraph.");
    expect(validateRichDoc(doc)).toEqual([]);
  });

  test("maps legacy H1/H5/H6 into the allowed heading range", () => {
    expect(legacyTextToDoc("# Title").content[0].attrs.level).toBe(2);
    expect(legacyTextToDoc("##### Detail").content[0].attrs.level).toBe(4);
  });

  test("keeps every line of a plain paragraph", () => {
    const doc = legacyTextToDoc("Line one\nLine two\nLine three");
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content.filter((node) => node.type === "hardBreak")).toHaveLength(2);
    expect(docToText(doc)).toContain("Line three");
  });

  test("builds the legacy SeoArticle block shape", () => {
    const blocks = legacyTextToBlocks(
      "## Heading\nBody\n\n- One\n- Two\n\nPlain paragraph.",
    );
    expect(blocks).toEqual([
      { h2: "Heading", p: ["Body"] },
      { ul: ["One", "Two"] },
      { p: ["Plain paragraph."] },
    ]);
  });
});

describe("text helpers", () => {
  test("extracts lead, text, excerpt and reading time", () => {
    expect(docToText(fullDoc)).toContain("A lead paragraph");
    expect(docToText(fullDoc)).not.toContain('"type"');
    expect(leadTextFromDoc(fullDoc)).toContain("A lead paragraph");
    expect(excerptFromDoc(fullDoc)).toContain("A lead paragraph");
    expect(readingTimeFromText("one two three")).toBe("1 min read");
    expect(readingTimeFromText("word ".repeat(440))).toBe("2 min read");
  });

  test("truncates excerpts at a word boundary", () => {
    const excerpt = excerptFromDoc(
      { type: "doc", content: [paragraph(text("word ".repeat(60)))] },
      40,
    );
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(41);
  });
});

describe("clipboard sanitising", () => {
  test("keeps supported structure and removes foreign styling", () => {
    const html = [
      '<b style="font-weight:normal">',
      '<span style="font-weight:700">Bold</span>',
      '<span style="font-style:italic">Italic</span>',
      "<h1>Title</h1>",
      "<h5>Subhead</h5>",
      "<pre>line one\nline two</pre>",
      "<table><tr><td>A</td><td>B</td></tr></table>",
      "<script>alert(1)</script>",
      '<iframe src="https://evil.example"></iframe>',
      "<img src=x onerror=alert(1)>",
      '<a href="javascript:alert(1)">bad</a>',
      '<a href="https://example.com">good</a>',
      "</b>",
    ].join("");

    const clean = sanitizePastedHtml(html);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("<img");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<strong>Bold</strong>");
    expect(clean).toContain("<em>Italic</em>");
    expect(clean).toContain("<h2>Title</h2>");
    expect(clean).toContain("<h4>Subhead</h4>");
    expect(clean).toContain("line one<br>line two");
    expect(clean).toContain("A · B");
    expect(clean).toContain('<a href="https://example.com">good</a>');
    expect(clean).toContain("bad");
  });

  test("does not turn a Google Docs normal-weight wrapper into bold text", () => {
    const clean = sanitizePastedHtml(
      '<b style="font-weight: normal" id="docs-internal-guid-1"><p>Normal text</p></b>',
    );
    expect(clean).toContain("<p>Normal text</p>");
    expect(clean).not.toContain("<b");
  });
});
