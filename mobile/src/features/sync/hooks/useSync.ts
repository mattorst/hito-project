import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";
import { syncPendingEvents } from "../services/syncManager";

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  synchronized: number;
  failed: number;
  error: string | null;
}

export function useSync(enabled: boolean = true) {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    synchronized: 0,
    failed: 0,
    error: null,
  });

  const isSyncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (!enabled || isSyncingRef.current) {
      return;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      return;
    }

    isSyncingRef.current = true;

    setState((previous) => ({
      ...previous,
      isSyncing: true,
      error: null,
    }));

    try {
      const result = await syncPendingEvents();

      setState({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        synchronized: result.synchronized,
        failed: result.failed,
        error: null,
      });
    } catch (error) {
      console.error("[Sync] Error durante sincronización:", error);

      setState((previous) => ({
        ...previous,
        isSyncing: false,
        error: "No fue posible sincronizar los eventos pendientes.",
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribeNetInfo = NetInfo.addEventListener((networkState) => {
      if (networkState.isConnected) {
        void sync();
      }
    });

    return unsubscribeNetInfo;
  }, [enabled, sync]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        void sync();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enabled, sync]);

  return {
    ...state,
    sync,
  };
}