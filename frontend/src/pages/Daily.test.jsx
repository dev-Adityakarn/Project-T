import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Daily from "@/pages/Daily";
import { api } from "@/lib/api";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock("@/lib/api", () => ({
  api: { get: jest.fn() },
}));

const successDaily = {
  date: "2026-10-27",
  game_id: "speed-test",
  difficulty: "easy",
  resets_in: 3600,
  my_attempts: 0,
  my_best: null,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <Daily />
    </MemoryRouter>,
  );

describe("Daily challenge request states", () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it("shows a bounded loading state instead of staying on Loading", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/daily") return Promise.reject(new Error("timeout"));
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(screen.getByTestId("daily-loading")).toBeTruthy();
    expect(await screen.findByTestId("daily-error")).toBeTruthy();
  });

  it("shows an error when the server returns an empty challenge", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/daily") return Promise.resolve({ data: null });
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(await screen.findByTestId("daily-error")).toBeTruthy();
  });

  it("retries the daily request and renders the challenge", async () => {
    let dailyCalls = 0;
    api.get.mockImplementation((url) => {
      if (url === "/daily") {
        dailyCalls += 1;
        return dailyCalls === 1
          ? Promise.reject(new Error("timeout"))
          : Promise.resolve({ data: successDaily });
      }
      return Promise.resolve({ data: [] });
    });

    renderPage();
    expect(await screen.findByTestId("daily-error")).toBeTruthy();
    fireEvent.click(screen.getByTestId("daily-retry"));

    expect(await screen.findByTestId("daily-card")).toBeTruthy();
    expect(screen.getByTestId("daily-game-title").textContent).toBe("Speed Test");
    expect(dailyCalls).toBe(2);
  });
});
