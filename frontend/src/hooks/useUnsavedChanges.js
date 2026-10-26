import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Block in-app navigation and browser tab closes while a form has unsaved
 * changes.  The caller renders a confirmation dialog from `open` and calls
 * `proceed` or `reset`.
 */
export function useUnsavedChanges(dirty) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return {
    open: blocker.state === "blocked",
    proceed: () => blocker.proceed?.(),
    reset: () => blocker.reset?.(),
  };
}
