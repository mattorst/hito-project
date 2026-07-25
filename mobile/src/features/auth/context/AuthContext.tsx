import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { login as loginService } from "../services/authService";
import type { LoginRequest } from "../types";
import {
  clearTokens,
  saveAccessToken,
  saveRefreshToken,
} from "@/storage";

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function login(credentials: LoginRequest) {
    setIsLoading(true);

    try {
      const tokens = await loginService(credentials);

      await saveAccessToken(tokens.access);
      await saveRefreshToken(tokens.refresh);

      setAccessToken(tokens.access);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await clearTokens();
    setAccessToken(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: accessToken !== null,
      isLoading,
      login,
      logout,
    }),
    [accessToken, isLoading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}