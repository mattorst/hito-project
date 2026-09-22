import { useEffect, useState } from "react";
import type { NetInfoState } from "@react-native-community/netinfo";
import {
  getNetworkState,
  subscribeToNetworkChanges,
} from "../services/networkService";

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOnline: boolean;
}

const INITIAL_NETWORK_STATUS: NetworkStatus = {
  isConnected: false,
  isInternetReachable: null,
  isOnline: false,
};

function mapNetworkState(state: NetInfoState): NetworkStatus {
  return {
    isConnected: state.isConnected === true,
    isInternetReachable: state.isInternetReachable,
    isOnline:
      state.isConnected === true &&
      state.isInternetReachable !== false,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    INITIAL_NETWORK_STATUS,
  );

  useEffect(() => {
    let mounted = true;

    getNetworkState()
      .then((state) => {
        if (!mounted) {
          return;
        }

        setNetworkStatus(mapNetworkState(state));
      })
      .catch((error) => {
        console.error(
          "Error al obtener el estado de red:",
          error,
        );
      });

    const unsubscribe = subscribeToNetworkChanges((state) => {
      if (!mounted) {
        return;
      }

      setNetworkStatus(mapNetworkState(state));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return networkStatus;
}