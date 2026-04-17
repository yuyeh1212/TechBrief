import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化：從 localStorage 讀取 token，驗證是否有效
  useEffect(() => {
    const token = localStorage.getItem("tb_token");
    if (!token) { setLoading(false); return; }

    axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem("tb_token"))
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await axios.post(`${API_BASE}/auth/google`, { credential });
    const { access_token, user: userData } = res.data;
    localStorage.setItem("tb_token", access_token);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tb_token");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("tb_token");
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (e) {
      console.error("refreshUser failed", e);
    }
  }, []);

  const isMax = user?.plan === "max";
  const isPro = user?.plan === "pro" || isMax;
  const isMini = user?.plan === "mini" || isPro;

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, refreshUser, isMax, isPro, isMini }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
