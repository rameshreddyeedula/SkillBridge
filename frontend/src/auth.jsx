import { createContext, useContext, useEffect, useState } from "react";
import { api, clearSession, getUser, setSession } from "./api.js";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);
  useEffect(() => { window.__skillbridgeAuth = { user, loading }; }, [user, loading]);
  async function login(email, password) {
    const form = new URLSearchParams({ username: email, password });
    const result = await api("/auth/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const current = await api("/auth/me", { headers: { Authorization: `Bearer ${result.access_token}` } });
    setSession(result.access_token, current); setUser(current); return current;
  }
  async function register(payload) {
    await api("/auth/register", { method: "POST", body: JSON.stringify(payload) });
    return login(payload.email, payload.password);
  }
  function logout() { clearSession(); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
