import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

export const REQUEST_TIMEOUT_MS = 12000;

export const isCanceledError = (error) =>
  axios.isCancel(error) ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError";

/**
 * Runs one bounded API request for the current key.
 *
 * - a new key or retry aborts the previous request;
 * - unmount aborts the request;
 * - the axios timeout is a hard upper bound even if the server never answers;
 * - canceled requests never overwrite state.
 */
export function useApiResource(key, fetcher, { timeout = REQUEST_TIMEOUT_MS } = {}) {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading", data: null, error: null });

    Promise.resolve()
      .then(() => fetcherRef.current({ signal: controller.signal, timeout }))
      .then((data) => {
        if (active) setState({ status: "success", data, error: null });
      })
      .catch((error) => {
        if (!active || isCanceledError(error)) return;
        setState({ status: "error", data: null, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, attempt, timeout]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
