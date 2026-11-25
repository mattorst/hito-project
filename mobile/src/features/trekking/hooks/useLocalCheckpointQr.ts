
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";

import {
  useAuth,
} from "@/features/auth/context/AuthContext";

import {
  getUserIdFromToken,
} from "@/features/auth/utils/tokenIdentity";

import {
  useScan,
} from "@/features/checkpoints/context/ScanContext";

import {
  findCachedCheckpointByQr,
} from "@/features/parks/storage/catalogStorage";

import {
  getDatabase,
} from "@/features/trekking/storage/database";

import {
  registerLocalCheckpoint,
} from "@/features/trekking/services/localCheckpointService";

import {
  completeTrekkingByQr,
} from "@/features/trekking/services/localCheckOutService";

// ---------------------------------------------------------
// HITO — CONTROLADOR QR OFFLINE-FIRST
//
// Procesa:
// - Checkpoints NORMAL y REST.
// - Cima SUMMIT o VIEWPOINT.
// - Check-Out por la portería original.
//
// Todas las validaciones definitivas se realizan
// en los servicios SQLite.
//
// Una excursión finalizada no debe permanecer
// activa en el contexto de React.
//
// No elimina ni modifica el historial QR.
// ---------------------------------------------------------

interface PreviousEvent {
  event_type: string;
}

type StopTracking =
  () => void | Promise<void>;

// ---------------------------------------------------------
// MENSAJES SEGÚN EVENTO GUARDADO
// ---------------------------------------------------------

function getSuccessMessage(
  eventType: string,
  name: string,
): string {
  switch (eventType) {
    case "CHECKPOINT_OUTBOUND":
      return `Paso de ida registrado en "${name}".`;

    case "CHECKPOINT_RETURN":
      return `Paso de regreso registrado en "${name}".`;

    case "SUMMIT_ARRIVAL":
      return `Llegada a la cima "${name}" registrada.`;

    case "SUMMIT_DESCENT":
      return `Inicio del descenso desde "${name}" registrado.`;

    default:
      return `Checkpoint "${name}" registrado.`;
  }
}

// ---------------------------------------------------------
// HOOK PRINCIPAL
// ---------------------------------------------------------

export function useLocalCheckpointQr(
  isLocalTrekking: boolean,
  stopTracking: StopTracking,
): void {
  const {
    accessToken,
    activeLocalTrekking,
    setActiveLocalTrekking,
    setActiveTrekking,
  } = useAuth();

  const {
    scannedQr,
    setScannedQr,
  } = useScan();

  // Evita procesar dos escaneos simultáneamente.
  const processingRef = useRef(false);

  const trekkingLocalId =
    activeLocalTrekking?.trekking.status ===
    "IN_PROGRESS"
      ? activeLocalTrekking.trekking.local_id
      : null;

  useEffect(() => {
    if (
      !isLocalTrekking ||
      !trekkingLocalId ||
      !scannedQr ||
      processingRef.current
    ) {
      return;
    }

    processingRef.current = true;

    const qrIdentifier = scannedQr.trim();

    // Consumir inmediatamente el QR para impedir
    // que el mismo valor se procese nuevamente.
    setScannedQr(null);

    const releaseLock = () => {
      processingRef.current = false;
    };

    const showError = (error: unknown) => {
      console.error(
        "[Hito QR] No se pudo registrar el evento:",
        error,
      );

      Alert.alert(
        "No se registró el QR",
        error instanceof Error
          ? error.message
          : "No fue posible registrar el escaneo.",
      );
    };

    // -----------------------------------------------------
    // REGISTRAR CHECKPOINT O CIMA
    // -----------------------------------------------------

    const processCheckpoint = async (
      ownerUserId: string,
      checkpointId: number,
      checkpointName: string,
    ) => {
      const database = await getDatabase();

      // Consultar los eventos anteriores de este punto.
      //
      // No inferimos que VIEWPOINT sea la cima
      // solamente por el tipo de checkpoint.
      //
      // Utilizamos el evento realmente registrado
      // y delegamos la secuencia definitiva al
      // servicio SQLite.

      const previousEvents =
        await database.getAllAsync<PreviousEvent>(
          `
            SELECT event_type
            FROM local_checkpoint_events
            WHERE trekking_local_id = ?
              AND checkpoint_id = ?
            ORDER BY
              occurred_at ASC,
              created_at ASC,
              rowid ASC;
          `,
          [
            trekkingLocalId,
            checkpointId,
          ],
        );

      const saveCheckpoint = async () => {
        try {
          const result =
            await registerLocalCheckpoint({
              trekkingLocalId,
              ownerUserId,
              qrIdentifier,
            });

          console.log(
            "[Hito QR] Evento guardado en SQLite:",
            result.eventType,
            result.checkpoint.name,
          );

          Alert.alert(
            "Checkpoint registrado",
            `${getSuccessMessage(
              result.eventType,
              result.checkpoint.name,
            )}\n\nRegistro guardado correctamente en tu dispositivo. Hito intentará sincronizarlo automáticamente con el servidor.`,
          );
        } catch (error) {
          showError(error);
        } finally {
          releaseLock();
        }
      };

      // ---------------------------------------------------
      // SEGUNDA LECTURA DEL MISMO CHECKPOINT
      // ---------------------------------------------------

      if (previousEvents.length === 1) {
        const previousEventType =
          previousEvents[0].event_type;

        const isSummitDescent =
          previousEventType === "SUMMIT_ARRIVAL";

        const isReturn =
          previousEventType === "CHECKPOINT_OUTBOUND";

        if (!isSummitDescent && !isReturn) {
          showError(
            new Error(
              "La secuencia de este checkpoint es inconsistente.",
            ),
          );

          releaseLock();
          return;
        }

        Alert.alert(
          isSummitDescent
            ? "Confirmar inicio del descenso"
            : "Confirmar paso de regreso",

          isSummitDescent
            ? `Ya registraste la llegada a "${checkpointName}". ¿Confirmas que estás iniciando el descenso?`
            : `Ya registraste la ida por "${checkpointName}". ¿Confirmas que estás pasando nuevamente por este punto de regreso?`,

          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: releaseLock,
            },
            {
              text: "Confirmar",
              onPress: () => {
                void saveCheckpoint();
              },
            },
          ],
          {
            cancelable: false,
          },
        );

        return;
      }

      // Primera lectura o lectura adicional.
      //
      // El servicio SQLite verifica el circuito
      // completo y rechaza pasos no permitidos.

      await saveCheckpoint();
    };

    // -----------------------------------------------------
    // CHECK-OUT DE PORTERÍA
    // -----------------------------------------------------

    const processCheckOut = (
      ownerUserId: string,
    ) => {
      Alert.alert(
        "Finalizar trekking",

        "¿Confirmas que regresaste a la portería y deseas finalizar esta excursión?\n\nHito comprobará todos los checkpoints de ida y regreso antes de registrar el Check-Out.",

        [
          {
            text: "Continuar trekking",
            style: "cancel",
            onPress: releaseLock,
          },
          {
            text: "Confirmar Check-Out",
            onPress: () => {
              const finish = async () => {
                try {
                  // ---------------------------------------
                  // 1. CONFIRMAR CIERRE EN SQLITE
                  // ---------------------------------------
                  //
                  // El servicio registra CHECK_OUT y
                  // actualiza el trekking a COMPLETED
                  // en una transacción exclusiva.
                  //
                  // Si falla, no detenemos el GPS
                  // ni limpiamos el estado activo.

                  const result =
                    await completeTrekkingByQr({
                      trekkingLocalId,
                      ownerUserId,
                      qrIdentifier,
                    });

                  console.log(
                    "[Hito Check-Out] SQLite confirmó el cierre:",
                    {
                      trekkingLocalId,
                      completedAt: result.completedAt,
                      alreadyCompleted:
                        result.alreadyCompleted,
                    },
                  );

                  // ---------------------------------------
                  // 2. DETENER SEGUIMIENTO GPS
                  // ---------------------------------------
                  //
                  // Se solicita la detención solamente
                  // después de confirmar el cierre local.

                  try {
                    await Promise.resolve(
                      stopTracking(),
                    );

                    console.log(
                      "[Hito Check-Out] Detención GPS solicitada.",
                    );
                  } catch (trackingError) {
                    console.error(
                      "[Hito Check-Out] Check-Out guardado, pero falló la detención del GPS:",
                      trackingError,
                    );
                  }

                  // ---------------------------------------
                  // 3. LIMPIAR TREKKINGS ACTIVOS
                  // ---------------------------------------
                  //
                  // CORRECCIÓN:
                  //
                  // Antes solamente se limpiaba
                  // activeLocalTrekking.
                  //
                  // La referencia activeTrekking podía
                  // permanecer en memoria y hacer que
                  // la interfaz mostrara una excursión
                  // que ya estaba finalizada.
                  //
                  // Limpiamos ambos estados solamente
                  // después del commit de SQLite.

                  setActiveLocalTrekking(null);
                  setActiveTrekking(null);

                  console.log(
                    "[Hito Check-Out] Estados activos limpiados.",
                  );

                  // ---------------------------------------
                  // 4. CONFIRMACIÓN AL EXCURSIONISTA
                  // ---------------------------------------

                  Alert.alert(
                    "Trekking finalizado",

                    result.alreadyCompleted
                      ? "La excursión ya estaba finalizada. Su Check-Out permanece registrado."
                      : `Check-Out registrado en "${result.checkpoint.name}".\n\nLa excursión finalizó correctamente y sus datos quedaron guardados en SQLite. Los eventos pendientes se sincronizarán cuando haya conexión.`,

                    [
                      {
                        text: "Volver al inicio",
                        onPress: () => {
                          router.replace(
                            "/(protected)",
                          );
                        },
                      },
                    ],
                    {
                      cancelable: false,
                    },
                  );
                } catch (error) {
                  // Una validación fallida no detiene
                  // el GPS ni finaliza la excursión.

                  showError(error);
                } finally {
                  releaseLock();
                }
              };

              void finish();
            },
          },
        ],
        {
          cancelable: false,
        },
      );
    };

    // -----------------------------------------------------
    // IDENTIFICAR Y PROCESAR QR
    // -----------------------------------------------------

    const processQr = async () => {
      try {
        const ownerUserId =
          accessToken
            ? getUserIdFromToken(accessToken)
            : null;

        if (!ownerUserId) {
          throw new Error(
            "No fue posible identificar tu sesión.",
          );
        }

        if (!qrIdentifier) {
          throw new Error(
            "El código QR está vacío.",
          );
        }

        const checkpoint =
          await findCachedCheckpointByQr(
            qrIdentifier,
          );

        if (!checkpoint) {
          throw new Error(
            "QR desconocido. Actualiza el catálogo del sendero cuando tengas conexión.",
          );
        }

        const checkpointType = String(
          checkpoint.checkpoint_type ?? "",
        ).toUpperCase();

        // -----------------------------------------------
        // PORTERÍA ORIGINAL
        // -----------------------------------------------

        if (checkpointType === "ENTRY") {
          processCheckOut(ownerUserId);
          return;
        }

        // -----------------------------------------------
        // QR DE SALIDA DIFERENTE
        // -----------------------------------------------

        if (checkpointType === "EXIT") {
          throw new Error(
            "Este QR corresponde a una salida distinta de la entrada. Debes utilizar el QR original de Check-In.",
          );
        }

        // -----------------------------------------------
        // CHECKPOINTS DEL CIRCUITO
        // -----------------------------------------------

        const isValidRouteCheckpoint =
          checkpointType === "NORMAL" ||
          checkpointType === "REST" ||
          checkpointType === "SUMMIT" ||
          checkpointType === "VIEWPOINT";

        if (!isValidRouteCheckpoint) {
          throw new Error(
            `El checkpoint "${checkpoint.name}" tiene un tipo no admitido: ${checkpointType}.`,
          );
        }

        // No determinamos aquí si REST corresponde
        // a ida o regreso ni si VIEWPOINT es cima.
        //
        // registerLocalCheckpoint utiliza el
        // circuito QR y el historial SQLite
        // para decidir el siguiente evento válido.

        await processCheckpoint(
          ownerUserId,
          checkpoint.id,
          checkpoint.name,
        );
      } catch (error) {
        showError(error);
        releaseLock();
      }
    };

    void processQr();
  }, [
    isLocalTrekking,
    trekkingLocalId,
    scannedQr,
    accessToken,
    setScannedQr,
    setActiveLocalTrekking,
    setActiveTrekking,
    stopTracking,
  ]);
}
