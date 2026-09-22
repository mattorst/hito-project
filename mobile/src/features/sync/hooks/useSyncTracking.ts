import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { syncTrackingPoints } from "../services/syncService";
import type { SyncTrackingResult } from "../types";
import { useNetworkStatus } from "./useNetworkStatus";

interface UseSyncTrackingResult {
  isSyncing: boolean;
  lastResult: SyncTrackingResult | null;
  error: unknown;
  syncNow: () => Promise<void>;
}

export function useSyncTracking(): UseSyncTrackingResult {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<SyncTrackingResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const syncingRef = useRef<boolean>(false);
  const previousOnlineRef = useRef<boolean | null>(null);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncTrackingPoints();
      setLastResult(result);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        console.error(
          "Detalle del error 400 del Backend:",
          JSON.stringify(err.response.data, null, 2),
        );
      } else {
        console.error("Error al sincronizar puntos de tracking:", err);
      }
      setError(err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    if (wasOnline === null && isOnline) {
      syncNow();
      return;
    }

    if (wasOnline === false && isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  return {
    isSyncing,
    lastResult,
    error,
    syncNow,
  };
}