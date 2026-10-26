import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

function Harness({ dirty }) {
  const navigate = useNavigate();
  const { open, proceed, reset } = useUnsavedChanges(dirty);

  return (
    <div>
      <button type="button" onClick={() => navigate("/next")}>
        Go next
      </button>
      {open && (
        <div role="alertdialog" aria-label="Unsaved changes">
          <button type="button" onClick={reset}>
            Stay
          </button>
          <button type="button" onClick={proceed}>
            Leave
          </button>
        </div>
      )}
    </div>
  );
}

const renderHarness = (dirty = true) => {
  const router = createMemoryRouter(
    [
      { path: "/", element: <Harness dirty={dirty} /> },
      { path: "/next", element: <div>Next page</div> },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe("useUnsavedChanges", () => {
  test("blocks navigation, can stay, and can leave", async () => {
    const router = renderHarness(true);

    fireEvent.click(screen.getByText("Go next"));
    await waitFor(() =>
      expect(screen.getByRole("alertdialog")).toBeTruthy(),
    );

    fireEvent.click(screen.getByText("Stay"));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    expect(router.state.location.pathname).toBe("/");

    fireEvent.click(screen.getByText("Go next"));
    await waitFor(() =>
      expect(screen.getByRole("alertdialog")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Leave"));
    await waitFor(() => expect(screen.getByText("Next page")).toBeTruthy());
    expect(router.state.location.pathname).toBe("/next");
  });

  test("does not block navigation when clean", async () => {
    const router = renderHarness(false);
    fireEvent.click(screen.getByText("Go next"));
    await waitFor(() => expect(screen.getByText("Next page")).toBeTruthy());
    expect(router.state.location.pathname).toBe("/next");
  });

  test("marks beforeunload when dirty and clears it when clean", async () => {
    const { unmount } = render(
      <RouterProvider
        router={createMemoryRouter([{ path: "/", element: <Harness dirty /> }])}
      />,
    );
    await waitFor(() => expect(screen.getByText("Go next")).toBeTruthy());

    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(dirtyEvent);
    });
    expect(dirtyEvent.defaultPrevented).toBe(true);

    unmount();
    render(
      <RouterProvider
        router={createMemoryRouter([
          { path: "/", element: <Harness dirty={false} /> },
        ])}
      />,
    );
    await waitFor(() => expect(screen.getByText("Go next")).toBeTruthy());

    const cleanEvent = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(cleanEvent);
    });
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
