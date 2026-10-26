import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { PostEditor } from "@/components/admin/PostEditor";
import { adminApi } from "@/lib/adminApi";

jest.mock("@/lib/adminApi", () => ({
  adminApi: {
    put: jest.fn(),
    post: jest.fn(),
  },
  formatAdminError: (error) => error?.message || "Save failed",
}));

const richPost = {
  id: "post-1",
  title: "Original title",
  slug: "original-title",
  excerpt: "Original excerpt",
  meta_title: "",
  meta_description: "",
  author: "Typinger Team",
  published: false,
  content: "Original body text that is long enough.",
  content_format: "rich-json-v1",
  content_json: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Original body text that is long enough." },
        ],
      },
    ],
  },
  date_published: "2026-01-01",
};

const legacyPost = {
  ...richPost,
  id: "post-legacy",
  content_format: "legacy-text-v1",
  content_json: null,
  content:
    "## Legacy heading\nLegacy paragraph text that is long enough to pass.",
};

const richPostWithLead = {
  ...richPost,
  id: "post-lead",
  excerpt: "Excerpt fallback",
  content_json: {
    type: "doc",
    content: [
      {
        type: "lead",
        content: [{ type: "text", text: "Explicit lead for the preview." }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Body paragraph after the lead." }],
      },
    ],
  },
};

const renderEditor = (post = richPost) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <PostEditor
            post={post}
            onSaved={jest.fn()}
            onCancel={jest.fn()}
            onDirtyChange={jest.fn()}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
};

const changeTitle = (value) => {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value },
  });
};

describe("PostEditor", () => {
  beforeEach(() => {
    adminApi.put.mockReset();
    adminApi.post.mockReset();
  });

  test("preview uses the current unsaved title and shared rich renderer", async () => {
    renderEditor();
    changeTitle("Unsaved preview title");

    fireEvent.click(screen.getByTestId("preview-button"));

    await waitFor(() => expect(screen.getByTestId("post-preview")).toBeTruthy());
    const preview = screen.getByTestId("post-preview");
    expect(within(preview).getByText("Unsaved preview title")).toBeTruthy();
    expect(
      within(preview).getByText("Original body text that is long enough."),
    ).toBeTruthy();
  });

  test("preview shows an explicit lead once, not the excerpt fallback", async () => {
    renderEditor(richPostWithLead);

    fireEvent.click(screen.getByTestId("preview-button"));

    const preview = await screen.findByTestId("post-preview");
    expect(within(preview).getByText("Explicit lead for the preview.")).toBeTruthy();
    expect(
      within(preview).queryAllByText("Explicit lead for the preview."),
    ).toHaveLength(1);
    expect(within(preview).queryByText("Excerpt fallback")).toBeNull();
  });

  test("retains the form and body after a failed save", async () => {
    adminApi.put.mockRejectedValueOnce(new Error("Save failed"));
    renderEditor();
    changeTitle("A title that should survive");

    fireEvent.click(screen.getByRole("button", { name: /Update/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Save failed"),
    );
    expect(screen.getByLabelText("Title").value).toBe(
      "A title that should survive",
    );
    expect(screen.getByTestId("rich-editor").textContent).toContain(
      "Original body text that is long enough.",
    );
  });

  test("metadata-only saves do not send body fields", async () => {
    adminApi.put.mockResolvedValueOnce({ data: { ok: true } });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Excerpt"), {
      target: { value: "Updated excerpt" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Update/ }));

    await waitFor(() => expect(adminApi.put).toHaveBeenCalledTimes(1));
    const payload = adminApi.put.mock.calls[0][1];
    expect(payload).toEqual({ excerpt: "Updated excerpt" });
    expect(payload).not.toHaveProperty("content");
    expect(payload).not.toHaveProperty("content_json");
    expect(payload).not.toHaveProperty("content_format");
  });

  test("does not send a second request while a save is in flight", async () => {
    let resolveSave;
    adminApi.put.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
    );
    renderEditor();
    changeTitle("Only one save");

    const update = screen.getByRole("button", { name: /Update/ });
    fireEvent.click(update);
    fireEvent.click(update);

    expect(adminApi.put).toHaveBeenCalledTimes(1);
    resolveSave({ data: { ok: true } });
    await waitFor(() => expect(adminApi.put).toHaveBeenCalledTimes(1));
  });

  test("converts legacy text into an editable rich document", async () => {
    renderEditor(legacyPost);

    fireEvent.click(screen.getByTestId("convert-legacy"));

    const editor = await screen.findByTestId("rich-editor");
    expect(within(editor).getByText("Legacy heading")).toBeTruthy();
    expect(within(editor).getByText(/Legacy paragraph text/)).toBeTruthy();
  });
});
