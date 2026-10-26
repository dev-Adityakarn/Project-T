import { render, screen } from "@testing-library/react";
import { ArticleHeader } from "@/components/ArticleHeader";

describe("ArticleHeader", () => {
  it("shows the published date and the editorial update date when they differ", () => {
    render(
      <ArticleHeader
        title="How to type faster"
        author="Typinger Team"
        datePublished="2026-02-10"
        dateModified="2026-10-27"
        readingTime="7 min read"
        lead="A practical guide."
      />,
    );

    expect(screen.getByTestId("article-published").textContent).toMatch(/Published 2026-02-10/);
    expect(screen.getByTestId("article-updated").textContent).toMatch(/Updated 2026-10-27/);
  });

  it("does not duplicate an identical published and updated date", () => {
    render(
      <ArticleHeader
        title="Guide"
        datePublished="2026-10-27"
        dateModified="2026-10-27"
      />,
    );

    expect(screen.queryByTestId("article-updated")).toBeNull();
  });
});
