import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, formatAdminError } from "@/lib/adminApi";

/**
 * Small data hook for admin GET endpoints.
 * Cancels stale responses when params change or the component unmounts.
 */
export function useAdminFetch(path, params = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const key = JSON.stringify(params || {});
  const requestID = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestID.current;
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.get(path, params ? { params } : undefined);
      if (id === requestID.current) setData(response.data);
    } catch (err) {
      if (id === requestID.current) setError(formatAdminError(err));
    } finally {
      if (id === requestID.current) setLoading(false);
    }
  }, [path, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
    return () => {
      requestID.current += 1;
    };
  }, [load, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, error, reload, setData };
}
