import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RichArticle } from "@/components/RichArticle";

const text = (value, marks) => {
  const node = { type: "text", text: value };
  if (marks) node.marks = marks;
  return node;
};

const doc = {
  type: "doc",
  content: [
    {
      type: "lead",
      content: [text("This lead is shown by the article header, not the body.")],
    },
    {
      type: "paragraph",
      content: [
        text("Plain "),
        text("bold", [{ type: "bold" }]),
        text(" and "),
        text("italic", [{ type: "italic" }]),
        text(" with "),
        text("an external link", [
          {
            type: "link",
            attrs: { href: "https://example.com/guide" },
          },
        ]),
        text(" and "),
        text("an internal link", [
          { type: "link", attrs: { href: "/blog/internal-guide/" } },
        ]),
        text(" and "),
        text("an unsafe link", [
          { type: "link", attrs: { href: "javascript:alert(1)" } },
        ]),
        { type: "hardBreak" },
        text("after a break."),
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [text("Section heading")],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [text("Subsection heading")],
    },
    {
      type: "heading",
      attrs: { level: 4 },
      content: [text("Detail heading")],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [text("Bullet one")] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [text("Bullet two")] }],
        },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 2 },
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [text("Step two")] }],
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [text("A quoted sentence.")] },
      ],
    },
    { type: "horizontalRule" },
  ],
};

const renderArticle = () =>
  render(
    <MemoryRouter>
      <RichArticle doc={doc} />
    </MemoryRouter>,
  );

describe("RichArticle", () => {
  test("renders every supported block with the article hierarchy", () => {
    const { container } = renderArticle();

    expect(screen.getByText("Section heading").tagName).toBe("H2");
    expect(screen.getByText("Subsection heading").tagName).toBe("H3");
    expect(screen.getByText("Detail heading").tagName).toBe("H4");
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("br")).toBeTruthy();
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("ol")?.getAttribute("start")).toBe("2");
    expect(container.querySelector("blockquote")?.textContent).toContain(
      "A quoted sentence.",
    );
    expect(container.querySelector("hr")).toBeTruthy();
  });

  test("does not repeat the lead block in the body", () => {
    const { container } = renderArticle();
    expect(container.textContent).not.toContain(
      "This lead is shown by the article header",
    );
  });

  test("renders safe links and drops unsafe link marks", () => {
    const { container } = renderArticle();

    const external = screen.getByText("an external link").closest("a");
    expect(external.getAttribute("href")).toBe("https://example.com/guide");
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toContain("noopener");

    const internal = screen.getByText("an internal link").closest("a");
    expect(internal.getAttribute("href")).toBe("/blog/internal-guide/");

    expect(container.textContent).toContain("an unsafe link");
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });
});
