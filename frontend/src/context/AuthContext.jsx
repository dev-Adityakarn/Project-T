import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    // The admin console has its own cookie-based session. Probing consumer auth
    // there produces misleading 401s in the console and is never used.
    if (isAdminRoute) {
      setUser(false);
      return;
    }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
  }, [isAdminRoute]);

  const handleAuth = (data) => {
    localStorage.setItem("kq_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => handleAuth((await api.post("/auth/login", { email, password })).data);
  const register = async (name, email, password) =>
    handleAuth((await api.post("/auth/register", { name, email, password })).data);
  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("kq_token");
    setUser(false);
  };

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
