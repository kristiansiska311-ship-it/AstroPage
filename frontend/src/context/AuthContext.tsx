import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api, setDemoMode, type LoginPayload } from "../api/client";
import { clearCache } from "../api/cache";
import { prefetchAll } from "../api/prefetch";

interface AuthUser {
  username: string;
  subdomain: string;
}

interface AuthState {
  user: AuthUser | null;
  isDemo: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // The JWT lives in an HttpOnly cookie (not readable by JS), so we only keep
  // the non-sensitive identity here for rendering. Reset on logout.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.login(payload);
    setUser({ username: res.username, subdomain: res.subdomain });
    // Warm every page's cache in the background (dashboard first). Fire-and-
    // forget: never block the login transition on it, never surface its errors.
    void prefetchAll();
  }, []);

  const loginAsDemo = useCallback(() => {
    setDemoMode(true);
    setIsDemo(true);
    setUser({ username: "demo.student", subdomain: "demo" });
  }, []);

  const logout = useCallback(async () => {
    if (!isDemo) await api.logout();
    setDemoMode(false);
    setIsDemo(false);
    clearCache();
    setUser(null);
  }, [isDemo]);

  const value = useMemo<AuthState>(
    () => ({ user, isDemo, login, loginAsDemo, logout }),
    [user, isDemo, login, loginAsDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook co-location is intentional
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
