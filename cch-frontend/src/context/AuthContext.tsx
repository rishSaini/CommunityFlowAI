import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi, setToken, clearToken, getToken, type UserResponse } from "../lib/api";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<UserResponse | null>(null);
  const [token, setTok]       = useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  // On mount, if we have a stored token, validate it
  useEffect(() => {
    const stored = getToken();
    if (!stored) { setLoading(false); return; }
    authApi.me()
      .then((u) => { setUser(u); setTok(stored); })
      .catch(() => { clearToken(); setTok(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await authApi.login(email, password);
    setToken(access_token);
    setTok(access_token);
    const u = await authApi.me();
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTok(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
