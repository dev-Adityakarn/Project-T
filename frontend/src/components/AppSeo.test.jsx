import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppSeo } from "@/components/AppSeo";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppSeo />
    </MemoryRouter>,
  );

const robots = () => document.head.querySelector('meta[name="robots"]')?.content;

describe("AppSeo noindex decisions", () => {
  afterEach(() => {
    document.head
      .querySelectorAll('[data-seo="managed"], script[data-seo-owned="true"], script[data-seo="jsonld"]')
      .forEach((node) => node.remove());
  });

  it("marks the daily challenge noindex", () => {
    renderAt("/daily/");
    expect(robots()).toBe("noindex,follow");
  });

  it("marks the leaderboard noindex", () => {
    renderAt("/leaderboard/");
    expect(robots()).toBe("noindex,follow");
  });

  it("marks individual game screens noindex", () => {
    renderAt("/games/speed-test/");
    expect(robots()).toBe("noindex,follow");
  });

  it("keeps the games hub indexable", () => {
    renderAt("/games/");
    expect(robots()).toBe("index,follow,max-image-preview:large");
  });

  it("renders the expected page title", () => {
    renderAt("/daily/");
    expect(screen.queryByTestId("page-h1")).toBeNull();
    expect(document.title).toMatch(/Daily Typing Challenge/i);
  });
});
