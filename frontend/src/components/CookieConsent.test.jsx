import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CookieConsent } from "@/components/CookieConsent";
import { PRIVACY_CHOICES_EVENT } from "@/lib/consent";

const openDialog = () => {
  act(() => {
    window.dispatchEvent(new Event(PRIVACY_CHOICES_EVENT));
  });
};

const renderConsent = () =>
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  );

describe("CookieConsent", () => {
  const originalId = process.env.REACT_APP_GA_ID;

  beforeEach(() => {
    localStorage.clear();
    process.env.REACT_APP_GA_ID = "";
  });

  afterEach(() => {
    if (originalId === undefined) delete process.env.REACT_APP_GA_ID;
    else process.env.REACT_APP_GA_ID = originalId;
  });

  it("shows an informational notice, not fake consent buttons, when no analytics service is configured", () => {
    renderConsent();
    openDialog();

    expect(screen.getByTestId("cookie-banner")).toBeTruthy();
    expect(screen.getByText(/nothing to accept or reject right now/i)).toBeTruthy();
    expect(screen.queryByTestId("cookie-accept-btn")).toBeNull();
    expect(screen.queryByTestId("cookie-reject-btn")).toBeNull();
    expect(screen.getByTestId("cookie-close-btn")).toBeTruthy();
  });

  it("offers a real choice when an analytics measurement ID is configured", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    renderConsent();

    expect(screen.getByTestId("cookie-accept-btn")).toBeTruthy();
    expect(screen.getByTestId("cookie-reject-btn")).toBeTruthy();
  });

  it("offers a withdrawal control when analytics is already accepted", () => {
    process.env.REACT_APP_GA_ID = "G-TEST";
    localStorage.setItem("kq_cookie_consent", "accepted");
    renderConsent();
    openDialog();

    expect(screen.getByTestId("cookie-reject-btn").textContent).toMatch(/turn off analytics/i);
    expect(screen.getByTestId("cookie-dismiss-btn").textContent).toMatch(/keep analytics on/i);
    expect(screen.getByText(/analytics is currently on/i)).toBeTruthy();
  });
});
