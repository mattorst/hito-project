
import { useMemo } from "react";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getUserIdFromToken,
} from "@/features/auth/utils/tokenIdentity";

import {
  useSync,
} from "@/features/sync/hooks/useSync";

// ---------------------------------------------------------
// HITO — ACTIVADOR GLOBAL DE SINCRONIZACIÓN
// ---------------------------------------------------------

export default function AutoSyncRunner() {
  const {
    accessToken,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const ownerUserId = useMemo(() => {
    if (!accessToken) {
      return null;
    }

    try {
      return getUserIdFromToken(accessToken);
    } catch (error) {
      console.warn(
        "[Hito AutoSync] No se pudo identificar la sesión:",
        error,
      );

      return null;
    }
  }, [accessToken]);

  useSync({
    enabled:
      !isLoading &&
      isAuthenticated &&
      !!ownerUserId,

    ownerUserId,
  });

  // No representa interfaz visual.
  return null;
}
