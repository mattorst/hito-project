import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { registerLogoutHandler } from "../session";
import {
  clearTokens,
  getAccessToken,
  saveAccessToken,
  saveRefreshToken,
} from "@/storage/secureStorage";

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { access: string; refresh: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Cargar token guardado al abrir la aplicación
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await getAccessToken();
        if (storedToken) {
          setAccessToken(storedToken);
        }
      } catch (error) {
        console.error("Error al recuperar el token almacenado:", error);
      } finally {
        // Garantizamos que la pantalla de carga desaparezca siempre
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // 2. Función para Iniciar Sesión (guardar tokens y actualizar estado)
  const login = useCallback(async (tokens: { access: string; refresh: string }) => {
    await saveAccessToken(tokens.access);
    await saveRefreshToken(tokens.refresh);
    setAccessToken(tokens.access);
  }, []);

  // 3. Función para Cerrar Sesión (limpiar storage y estado)
  const logout = useCallback(async () => {
    await clearTokens();
    setAccessToken(null);
  }, []);

  // 4. Registrar handler para el interceptor
  useEffect(() => {
    registerLogoutHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};