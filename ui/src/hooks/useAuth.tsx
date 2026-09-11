import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadStoredToken, login as apiLogin, setAuthToken } from "../services/api";

export type Role = "CISO" | "CIO" | "CRO" | "BOARD";

interface DecodedToken {
  sub: string;
  username: string;
  role: Role;
  exp: number;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  username: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = loadStoredToken();
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser(decoded);
      } else {
        setAuthToken(null);
      }
    }
    setInitialized(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      username: user?.username ?? null,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      login: async (username: string, password: string) => {
        const { token } = await apiLogin(username, password);
        setAuthToken(token);
        setUser(decodeToken(token));
      },
      logout: () => {
        setAuthToken(null);
        setUser(null);
      },
    }),
    [user]
  );

  if (!initialized) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
