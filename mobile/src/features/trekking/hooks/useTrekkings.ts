import { useCallback, useEffect, useState } from "react";
import { getTrekkings } from "../services/trekkingService";
import type { Trekking } from "../types";

export function useTrekkings() {
  const [trekkings, setTrekkings] = useState<Trekking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrekkings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getTrekkings();

      setTrekkings(data);
    } catch (error) {
      console.error(
        "Error al cargar historial de trekkings:",
        error,
      );

      setError(
        "No fue posible cargar el historial de trekkings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrekkings();
  }, [loadTrekkings]);

  return {
    trekkings,
    isLoading,
    error,
    refresh: loadTrekkings,
  };
}