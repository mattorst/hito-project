import { useCallback, useEffect, useState } from "react";
import { getTrails } from "../services/parksService";
import type { Trail } from "../types";

export function useTrails(parkId: number) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrails = useCallback(async () => {
    if (!parkId || isNaN(parkId)) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTrails(parkId);
      setTrails(data);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los senderos.");
    } finally {
      setIsLoading(false);
    }
  }, [parkId]);

  useEffect(() => {
    loadTrails();
  }, [loadTrails]);

  return {
    trails,
    isLoading,
    error,
    reload: loadTrails,
  };
}