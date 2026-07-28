import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import * as authService from "../services/authService";
import type { Trekking } from "@/features/trekking/types";

const TOKEN_KEY = "auth_token";

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTrekking: Trekking | null;
  setActiveTrekking: React.Dispatch<React.SetStateAction<Trekking | null>>;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTrekking, setActiveTrekking] = useState<Trekking | null>(null);

  const initAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAccessToken(token);
      }
    } catch (error) {
      console.error("Error al restaurar sesión:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (credentials: any) => {
    const data = await authService.login(credentials);
    if (data?.access) {
      await SecureStore.setItemAsync(TOKEN_KEY, data.access);
      setAccessToken(data.access);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setAccessToken(null);
      setActiveTrekking(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        activeTrekking,
        setActiveTrekking,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}