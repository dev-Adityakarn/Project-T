import { fireEvent, render, screen } from "@testing-library/react";
import { ContactForm } from "@/components/ContactForm";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: { post: jest.fn() },
}));

const fillForm = () => {
  fireEvent.change(screen.getByTestId("contact-name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByTestId("contact-email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByTestId("contact-message"), {
    target: { value: "The leaderboard has a result I would like reviewed." },
  });
};

describe("ContactForm", () => {
  beforeEach(() => {
    api.post.mockReset();
  });

  it("sends a message and confirms it was stored", async () => {
    api.post.mockResolvedValueOnce({ data: { ok: true } });
    render(<ContactForm />);

    fillForm();
    fireEvent.click(screen.getByTestId("contact-submit"));

    expect(await screen.findByTestId("contact-success")).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith(
      "/contact",
      expect.objectContaining({
        name: "Ada",
        email: "ada@example.com",
        message: "The leaderboard has a result I would like reviewed.",
      }),
    );
  });

  it("explains a rate limit without pretending the message was sent", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 429 } });
    render(<ContactForm />);

    fillForm();
    fireEvent.click(screen.getByTestId("contact-submit"));

    expect((await screen.findByTestId("contact-error")).textContent).toMatch(/too many messages/i);
    expect(screen.queryByTestId("contact-success")).toBeNull();
  });
});
