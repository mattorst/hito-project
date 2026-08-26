import { clearApiAuthHeader } from "@/api/client";
import { setMemoryToken } from "@/api/interceptors"; 
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import * as authService from "../services/authService";
import { getActiveTrekking } from "@/features/trekking/services/trekkingService";
import type { Trekking } from "@/features/trekking/types";

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTrekking: Trekking | null;
  setActiveTrekking: React.Dispatch<React.SetStateAction<Trekking | null>>;
  lastCompletedTrekking: Trekking | null;
  setLastCompletedTrekking: React.Dispatch<React.SetStateAction<Trekking | null>>;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTrekking, setActiveTrekking] = useState<Trekking | null>(null);
  const [lastCompletedTrekking, setLastCompletedTrekking] = useState<Trekking | null>(null);

  // Sincronizamos el token en memoria cada vez que cambie en React
  const updateTokenState = (token: string | null) => {
    setAccessToken(token);
    setMemoryToken(token);
  };

  const initAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (token) {
        updateTokenState(token);

        try {
          const trekking = await getActiveTrekking();
          setActiveTrekking(trekking);
        } catch (error) {
          console.error("Error al obtener trekking activo en restauración:", error);
          setActiveTrekking(null);
        }
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
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      clearApiAuthHeader();
    } catch (e) {
      console.error("Error limpiando tokens previos en login:", e);
    }

    updateTokenState(null);
    setActiveTrekking(null);
    setLastCompletedTrekking(null);

    const data = await authService.login(credentials);
    
    if (data?.access) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access);
      if (data?.refresh) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh);
      }
      updateTokenState(data.access);

      try {
        const trekking = await getActiveTrekking();
        setActiveTrekking(trekking);
      } catch (error) {
        console.error("Error al obtener trekking activo en login:", error);
        setActiveTrekking(null);
      }
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      clearApiAuthHeader();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      updateTokenState(null);
      setActiveTrekking(null);
      setLastCompletedTrekking(null);
      
      setTimeout(() => {
        router.replace("/login");
      }, 100);
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
        lastCompletedTrekking,
        setLastCompletedTrekking,
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