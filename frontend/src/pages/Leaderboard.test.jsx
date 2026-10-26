import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Leaderboard from "@/pages/Leaderboard";
import { api } from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn() },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Leaderboard />
    </MemoryRouter>,
  );

describe("Leaderboard request states", () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it("shows an explicit loading state instead of an empty board", () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId("leaderboard-loading")).toBeTruthy();
    expect(screen.queryByTestId("leaderboard-empty")).toBeNull();
  });

  it("shows an error with retry when the request fails", async () => {
    api.get.mockRejectedValueOnce(new Error("network down"));
    renderPage();
    expect(await screen.findByTestId("leaderboard-error")).toBeTruthy();
    expect(screen.getByTestId("leaderboard-retry")).toBeTruthy();
  });

  it("retries the request and renders scores", async () => {
    api.get
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        data: [
          {
            user_id: "u1",
            name: "Ada",
            difficulty: "easy",
            best_score: 980,
            wpm: 82,
            accuracy: 98,
          },
        ],
      });

    renderPage();
    expect(await screen.findByTestId("leaderboard-error")).toBeTruthy();
    fireEvent.click(screen.getByTestId("leaderboard-retry"));

    expect(await screen.findByTestId("lb-row-0")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
