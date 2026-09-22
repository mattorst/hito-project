import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from "@react-native-community/netinfo";

/**
 * Servicio encargado únicamente de la consulta y suscripción
 * del estado de la red (Offline / Online).
 */
export async function getNetworkState(): Promise<NetInfoState> {
  return await NetInfo.fetch();
}

/**
 * Determina si el dispositivo tiene una conexión a Internet utilizable.
 * Evalúa isConnected y que isInternetReachable no sea false explícito.
 */
export async function isNetworkAvailable(): Promise<boolean> {
  const state = await getNetworkState();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Permite suscribirse a los cambios de estado de la red en tiempo real.
 * Retorna la función para cancelar la suscripción (unsubscribe).
 */
export function subscribeToNetworkChanges(
  listener: (state: NetInfoState) => void,
): NetInfoSubscription {
  return NetInfo.addEventListener(listener);
}