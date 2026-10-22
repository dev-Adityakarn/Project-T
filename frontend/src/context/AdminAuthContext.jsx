import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";

const AdminAuthCtx = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  // null = checking, false = anonymous, object = authenticated administrator
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await adminApi.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => setUser(false);
    window.addEventListener("admin:unauthorized", onUnauthorized);
    return () => window.removeEventListener("admin:unauthorized", onUnauthorized);
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await adminApi.post("/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post("/auth/logout");
    } finally {
      setUser(false);
    }
  }, []);

  return (
    <AdminAuthCtx.Provider value={{ user, loading: user === null, login, logout, refresh }}>
      {children}
    </AdminAuthCtx.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthCtx);
