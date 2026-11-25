
import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";

import { getUserIdFromToken } from "@/features/auth/utils/tokenIdentity";

import {
  syncPendingTrekkingBootstraps,
  type BootstrapSyncResult,
} from "../services/localTrekkingBootstrapSync";

// ---------------------------------------------------------
// HITO — CONTROL DE SINCRONIZACIÓN DE EXCURSIONES
//
// Sincronización manual y controlada.
//
// Solo envía:
// - Inicio del trekking
// - Sendero
// - Fecha del Check-In
// - Acompañantes
//
// No sincroniza todavía eventos QR, GPS,
// incidentes, rescates ni Check-Out.
// ---------------------------------------------------------

interface UseTrekkingBootstrapSyncReturn {
  syncing: boolean;
  error: string | null;
  result: BootstrapSyncResult | null;
  synchronize: () => Promise<BootstrapSyncResult | null>;
  clearResult: () => void;
}

export function useTrekkingBootstrapSync():
  UseTrekkingBootstrapSyncReturn {
  const { accessToken, isAuthenticated } = useAuth();

  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  const [result, setResult] =
    useState<BootstrapSyncResult | null>(null);

  const runningRef = useRef(false);

  // -------------------------------------------------------
  // SINCRONIZAR TREKKINGS PENDIENTES
  // -------------------------------------------------------

  const synchronize = useCallback(
    async (): Promise<BootstrapSyncResult | null> => {
      if (runningRef.current) {
        return null;
      }

      setError(null);
      setResult(null);

      if (!isAuthenticated || !accessToken) {
        setError(
          "Debes iniciar sesión para sincronizar las excursiones.",
        );
        return null;
      }

      const ownerUserId =
        getUserIdFromToken(accessToken);

      if (!ownerUserId) {
        setError(
          "No fue posible identificar tu cuenta. Inicia sesión nuevamente.",
        );
        return null;
      }

      runningRef.current = true;
      setSyncing(true);

      try {
        const syncResult =
          await syncPendingTrekkingBootstraps(
            ownerUserId,
          );

        setResult(syncResult);

        if (syncResult.failed > 0) {
          setError(
            `${syncResult.failed} excursión(es) no pudieron sincronizarse. Los registros locales se conservaron.`,
          );
        }

        return syncResult;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Ocurrió un error durante la sincronización.";

        console.error(
          "HITO — Error de sincronización:",
          err,
        );

        setError(message);

        return null;
      } finally {
        runningRef.current = false;
        setSyncing(false);
      }
    },
    [accessToken, isAuthenticated],
  );

  // -------------------------------------------------------
  // LIMPIAR RESULTADO VISUAL
  // -------------------------------------------------------

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    syncing,
    error,
    result,
    synchronize,
    clearResult,
  };
}
