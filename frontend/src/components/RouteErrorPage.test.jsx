import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { RouteErrorPage } from "@/components/RouteErrorPage";

const BrokenPage = () => {
  throw new Error("render failed");
};

describe("RouteErrorPage", () => {
  it("renders a branded recovery page instead of the router default", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter([
      { path: "/", element: <BrokenPage />, errorElement: <RouteErrorPage /> },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByTestId("route-error")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /reload the page/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to typing test/i }).getAttribute("href")).toBe("/");
    spy.mockRestore();
  });
});
