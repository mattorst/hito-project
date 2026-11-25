
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import NetInfo from "@react-native-community/netinfo";

import {
  AppState,
  type AppStateStatus,
} from "react-native";

import {
  syncPendingEvents,
  type SyncManagerResult,
} from "../services/syncManager";

// ---------------------------------------------------------
// HITO — SINCRONIZACIÓN AUTOMÁTICA OFFLINE-FIRST
//
// Activadores:
// 1. Inicio de sesión.
// 2. Reconexión a Internet.
// 3. Regreso de Hito a primer plano.
// 4. Reintento periódico.
//
// No elimina ni modifica directamente los registros.
// Los servicios individuales gestionan su estado SQLite.
// ---------------------------------------------------------

interface UseSyncOptions {
  enabled: boolean;
  ownerUserId: string | null;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  synchronized: number;
  failed: number;
  skipped: number;
  error: string | null;
}

type SyncTrigger =
  | "inicio"
  | "reconexion"
  | "primer_plano"
  | "periodico"
  | "manual";

const CHECK_INTERVAL_MS = 60_000;

// ---------------------------------------------------------
// HOOK PRINCIPAL
// ---------------------------------------------------------

export function useSync(options: UseSyncOptions) {
  const { enabled, ownerUserId } = options;

  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    synchronized: 0,
    failed: 0,
    skipped: 0,
    error: null,
  });

  // Evita dos sincronizaciones simultáneas
  // desde esta instancia del hook.
  const runningRef = useRef(false);

  // Mantener siempre el usuario y la sesión actuales.
  const ownerRef = useRef(ownerUserId);
  ownerRef.current = ownerUserId;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Último estado de conectividad observado.
  const previousOnlineRef = useRef<boolean | null>(
    null,
  );

  // -------------------------------------------------------
  // CONSULTAR CONECTIVIDAD
  // -------------------------------------------------------

  const checkConnectivity = useCallback(
    async (): Promise<boolean> => {
      const networkState = await NetInfo.fetch();

      const online =
        networkState.isConnected === true &&
        networkState.isInternetReachable !== false;

      console.log(
        "[Hito AutoSync] Estado de red:",
        JSON.stringify({
          type: networkState.type,
          connected: networkState.isConnected,
          reachable: networkState.isInternetReachable,
          online,
        }),
      );

      // Conservar el último estado observado,
      // incluso si Android no entregó el evento
      // mediante el listener de NetInfo.
      previousOnlineRef.current = online;

      return online;
    },
    [],
  );

  // -------------------------------------------------------
  // EJECUTAR SINCRONIZACIÓN
  // -------------------------------------------------------

  const sync = useCallback(
    async (
      trigger: SyncTrigger = "manual",
    ): Promise<void> => {
      const currentOwner = ownerRef.current;

      if (
        !enabledRef.current ||
        !currentOwner
      ) {
        console.log(
          `[Hito AutoSync] Omitido (${trigger}): sesión no disponible.`,
        );

        return;
      }

      if (runningRef.current) {
        console.log(
          `[Hito AutoSync] Omitido (${trigger}): sincronización en curso.`,
        );

        return;
      }

      if (AppState.currentState !== "active") {
        console.log(
          `[Hito AutoSync] Omitido (${trigger}): aplicación en segundo plano.`,
        );

        return;
      }

      // Bloqueo antes del primer await.
      runningRef.current = true;

      try {
        console.log(
          `[Hito AutoSync] Comprobando conexión. Motivo: ${trigger}`,
        );

        const online = await checkConnectivity();

        if (!online) {
          console.log(
            `[Hito AutoSync] SIN CONEXIÓN. Registros pendientes en SQLite. Motivo: ${trigger}`,
          );

          return;
        }

        // Evitar sincronizar datos bajo otra sesión.
        if (
          !enabledRef.current ||
          ownerRef.current !== currentOwner
        ) {
          console.log(
            "[Hito AutoSync] Sesión modificada. Sincronización cancelada.",
          );

          return;
        }

        setState((previous) => ({
          ...previous,
          isSyncing: true,
          error: null,
        }));

        console.log(
          `[Hito AutoSync] INICIO de sincronización automática. Motivo: ${trigger}`,
        );

        const result: SyncManagerResult =
          await syncPendingEvents({
            ownerUserId: currentOwner,

            shouldContinue: () =>
              enabledRef.current &&
              ownerRef.current === currentOwner &&
              AppState.currentState === "active",
          });

        if (
          !enabledRef.current ||
          ownerRef.current !== currentOwner
        ) {
          console.log(
            "[Hito AutoSync] Resultado descartado por cambio de sesión.",
          );

          return;
        }

        const completedAt =
          new Date().toISOString();

        setState({
          isSyncing: false,
          lastSyncAt: completedAt,
          synchronized: result.synchronized,
          failed: result.failed,
          skipped: result.skipped,
          error:
            result.failed > 0 ||
            result.skipped > 0
              ? "Algunos registros siguen pendientes."
              : null,
        });

        // Mostrar siempre el resultado, incluso
        // cuando no existan registros pendientes.
        console.log(
          "[Hito AutoSync] FIN de sincronización:",
          JSON.stringify({
            trigger,
            synchronized: result.synchronized,
            failed: result.failed,
            skipped: result.skipped,
            stages: result.stages,
            completedAt,
          }),
        );

        // Detalle de cada módulo.
        for (const stage of result.stages) {
          console.log(
            `[Hito AutoSync] ${stage.stage}: confirmados=${stage.synchronized}, fallidos=${stage.failed}, omitidos=${stage.skipped}`,
          );

          if (stage.error) {
            console.warn(
              `[Hito AutoSync] Error en ${stage.stage}: ${stage.error}`,
            );
          }
        }
      } catch (error) {
        console.warn(
          `[Hito AutoSync] Error general (${trigger}):`,
          error,
        );

        if (
          enabledRef.current &&
          ownerRef.current === currentOwner
        ) {
          setState((previous) => ({
            ...previous,
            error:
              error instanceof Error
                ? error.message
                : "No fue posible sincronizar.",
          }));
        }
      } finally {
        runningRef.current = false;

        if (
          enabledRef.current &&
          ownerRef.current === currentOwner
        ) {
          setState((previous) => ({
            ...previous,
            isSyncing: false,
          }));
        }
      }
    },
    [checkConnectivity],
  );

  // -------------------------------------------------------
  // 1. AL INICIAR SESIÓN O HABILITAR EL HOOK
  // -------------------------------------------------------

  useEffect(() => {
    if (!enabled || !ownerUserId) {
      previousOnlineRef.current = null;
      return;
    }

    console.log(
      "[Hito AutoSync] Sesión habilitada. Verificando pendientes.",
    );

    void sync("inicio");
  }, [enabled, ownerUserId, sync]);

  // -------------------------------------------------------
  // 2. DETECTAR CAMBIOS DE CONECTIVIDAD
  // -------------------------------------------------------

  useEffect(() => {
    if (!enabled || !ownerUserId) {
      return;
    }

    let subscribed = true;

    const unsubscribe = NetInfo.addEventListener(
      (networkState) => {
        if (!subscribed) {
          return;
        }

        const online =
          networkState.isConnected === true &&
          networkState.isInternetReachable !== false;

        const previous =
          previousOnlineRef.current;

        console.log(
          "[Hito AutoSync] NetInfo:",
          JSON.stringify({
            type: networkState.type,
            connected: networkState.isConnected,
            reachable: networkState.isInternetReachable,
            online,
            previousOnline: previous,
          }),
        );

        if (!online) {
          previousOnlineRef.current = false;

          console.log(
            "[Hito AutoSync] SIN CONEXIÓN. Los registros permanecen en SQLite.",
          );

          return;
        }

        previousOnlineRef.current = true;

        // Se recibió un evento offline -> online.
        if (previous === false) {
          console.log(
            "[Hito AutoSync] INTERNET RECUPERADO. Activando sincronización.",
          );

          void sync("reconexion");

          return;
        }

        // Primer evento con conexión disponible.
        // También verificamos los pendientes.
        if (previous === null) {
          console.log(
            "[Hito AutoSync] Conexión disponible. Verificando pendientes.",
          );

          void sync("inicio");
        }
      },
    );

    return () => {
      subscribed = false;
      unsubscribe();
    };
  }, [enabled, ownerUserId, sync]);

  // -------------------------------------------------------
  // 3. AL REGRESAR A PRIMER PLANO
  // -------------------------------------------------------

  useEffect(() => {
    if (!enabled || !ownerUserId) {
      return;
    }

    const handleAppStateChange = (
      nextState: AppStateStatus,
    ) => {
      console.log(
        "[Hito AutoSync] AppState:",
        nextState,
      );

      if (nextState === "active") {
        // Android puede no emitir un evento de NetInfo
        // mientras la app está en segundo plano.
        //
        // Por eso comprobamos Internet nuevamente
        // al regresar a Hito.

        console.log(
          "[Hito AutoSync] Aplicación activa. Comprobando pendientes.",
        );

        void sync("primer_plano");
      }
    };

    const subscription =
      AppState.addEventListener(
        "change",
        handleAppStateChange,
      );

    return () => {
      subscription.remove();
    };
  }, [enabled, ownerUserId, sync]);

  // -------------------------------------------------------
  // 4. REINTENTOS PERIÓDICOS
  // -------------------------------------------------------

  useEffect(() => {
    if (!enabled || !ownerUserId) {
      return;
    }

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        void sync("periodico");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, ownerUserId, sync]);

  // -------------------------------------------------------
  // ESTADO PÚBLICO
  // -------------------------------------------------------

  return {
    ...state,
    sync,
  };
}
