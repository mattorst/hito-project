
import { clearApiAuthHeader } from "@/api/client";
import { setMemoryToken } from "@/api/interceptors";
import { registerLogoutHandler } from "@/features/auth/session";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

import * as authService from "../services/authService";

import { getUserIdFromToken } from "../utils/tokenIdentity";

import { getActiveTrekking } from "@/features/trekking/services/trekkingService";

import {
  getActiveLocalTrekking,
  type LocalTrekkingGroup,
} from "@/features/trekking/storage/trekkingGroupStorage";

import type { Trekking } from "@/features/trekking/types";

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  activeTrekking: Trekking | null;
  setActiveTrekking: React.Dispatch<
    React.SetStateAction<Trekking | null>
  >;

  activeLocalTrekking: LocalTrekkingGroup | null;
  setActiveLocalTrekking: React.Dispatch<
    React.SetStateAction<LocalTrekkingGroup | null>
  >;

  lastCompletedTrekking: Trekking | null;
  setLastCompletedTrekking: React.Dispatch<
    React.SetStateAction<Trekking | null>
  >;

  restoreLocalTrekking: () => Promise<void>;

  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [activeTrekking, setActiveTrekking] =
    useState<Trekking | null>(null);

  const [
    activeLocalTrekking,
    setActiveLocalTrekking,
  ] = useState<LocalTrekkingGroup | null>(null);

  const [
    lastCompletedTrekking,
    setLastCompletedTrekking,
  ] = useState<Trekking | null>(null);

  // Evita aplicar resultados de una sesión anterior
  // después de un logout o cambio de cuenta.
  const authGenerationRef = useRef(0);
  const accessTokenRef = useRef<string | null>(null);

  const updateTokenState = useCallback(
    (token: string | null) => {
      accessTokenRef.current = token;
      setAccessToken(token);
      setMemoryToken(token);
    },
    [],
  );

  const loadLocalForToken = useCallback(
    async (token: string): Promise<
      LocalTrekkingGroup | null
    > => {
      const ownerUserId = getUserIdFromToken(token);

      return getActiveLocalTrekking(ownerUserId);
    },
    [],
  );

  const restoreLocalTrekking =
    useCallback(async () => {
      const token = accessTokenRef.current;

      if (!token) {
        setActiveLocalTrekking(null);
        return;
      }

      const generation = authGenerationRef.current;

      try {
        const local = await loadLocalForToken(token);

        if (
          generation === authGenerationRef.current &&
          accessTokenRef.current === token
        ) {
          setActiveLocalTrekking(local);
        }
      } catch (error) {
        console.error(
          "Error al restaurar trekking local:",
          error,
        );

        // No borramos la sesión local por un fallo
        // de lectura o de identificación.
      }
    }, [loadLocalForToken]);

  // -------------------------------------------------------
  // Restauración al abrir Hito
  // -------------------------------------------------------

  const initAuth = useCallback(async () => {
    const generation = ++authGenerationRef.current;

    try {
      const token = await SecureStore.getItemAsync(
        ACCESS_TOKEN_KEY,
      );

      if (generation !== authGenerationRef.current) {
        return;
      }

      if (!token) {
        updateTokenState(null);
        setActiveTrekking(null);
        setActiveLocalTrekking(null);
        return;
      }

      updateTokenState(token);

      // SQLite se consulta independientemente de Django.
      // No requiere conexión de red.
      try {
        const local = await loadLocalForToken(token);

        if (generation === authGenerationRef.current) {
          setActiveLocalTrekking(local);
        }
      } catch (error) {
        console.error(
          "Error al cargar trekking desde SQLite:",
          error,
        );
      }

      // Conservamos el comportamiento remoto original.
      try {
        const trekking = await getActiveTrekking();

        if (generation === authGenerationRef.current) {
          setActiveTrekking(trekking);
        }
      } catch (error) {
        console.error(
          "No se pudo consultar el trekking remoto:",
          error,
        );

        // El fallo remoto no elimina un trekking local.
      }
    } catch (error) {
      console.error(
        "Error al restaurar sesión:",
        error,
      );
    } finally {
      if (generation === authGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [loadLocalForToken, updateTokenState]);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // -------------------------------------------------------
  // Inicio de sesión
  // -------------------------------------------------------

  const login = async (credentials: any) => {
    const generation = ++authGenerationRef.current;

    setIsLoading(true);

    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

      clearApiAuthHeader();

      updateTokenState(null);
      setActiveTrekking(null);
      setActiveLocalTrekking(null);
      setLastCompletedTrekking(null);

      const data = await authService.login(credentials);

      if (!data?.access) {
        throw new Error(
          "El servidor no devolvió un token de acceso.",
        );
      }

      // Validamos que podamos leer la identidad declarada
      // antes de guardar la nueva sesión.
      getUserIdFromToken(data.access);

      if (generation !== authGenerationRef.current) {
        return;
      }

      await SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        data.access,
      );

      if (data.refresh) {
        await SecureStore.setItemAsync(
          REFRESH_TOKEN_KEY,
          data.refresh,
        );
      }

      updateTokenState(data.access);

      try {
        const local = await loadLocalForToken(
          data.access,
        );

        if (generation === authGenerationRef.current) {
          setActiveLocalTrekking(local);
        }
      } catch (error) {
        console.error(
          "Error al recuperar trekking local tras login:",
          error,
        );
      }

      try {
        const trekking = await getActiveTrekking();

        if (generation === authGenerationRef.current) {
          setActiveTrekking(trekking);
        }
      } catch (error) {
        console.error(
          "Error al recuperar trekking remoto tras login:",
          error,
        );
      }
    } finally {
      if (generation === authGenerationRef.current) {
        setIsLoading(false);
      }
    }
  };

  // -------------------------------------------------------
  // Cierre de sesión
  // -------------------------------------------------------

  const logout = async () => {
    ++authGenerationRef.current;

    try {
      await SecureStore.deleteItemAsync(
        ACCESS_TOKEN_KEY,
      );

      await SecureStore.deleteItemAsync(
        REFRESH_TOKEN_KEY,
      );

      clearApiAuthHeader();
    } catch (error) {
      console.error(
        "Error al cerrar sesión:",
        error,
      );
    } finally {
      updateTokenState(null);

      setActiveTrekking(null);
      setActiveLocalTrekking(null);
      setLastCompletedTrekking(null);

      router.replace("/login");
    }
  };

  // -------------------------------------------------------
  // Registro del cierre automático de sesión JWT
  // -------------------------------------------------------

  useEffect(() => {
    registerLogoutHandler(logout);

    return () => {
      registerLogoutHandler(() => {});
    };
  }, [logout]);

  // -------------------------------------------------------
  // Provider
  // -------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,

        activeTrekking,
        setActiveTrekking,

        activeLocalTrekking,
        setActiveLocalTrekking,

        lastCompletedTrekking,
        setLastCompletedTrekking,

        restoreLocalTrekking,

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
    throw new Error(
      "useAuth debe ser usado dentro de un AuthProvider",
    );
  }

  return context;
}
