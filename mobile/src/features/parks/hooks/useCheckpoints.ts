import { useCallback, useEffect, useState } from "react";
import { getCheckpoints } from "../services/parksService";
import type { Checkpoint } from "../types";

export function useCheckpoints(trailId: number) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckpoints = useCallback(async () => {
    if (!trailId || isNaN(trailId)) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCheckpoints(trailId);
      setCheckpoints(data);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los checkpoints.");
    } finally {
      setIsLoading(false);
    }
  }, [trailId]);

  useEffect(() => {
    loadCheckpoints();
  }, [loadCheckpoints]);

  return {
    checkpoints,
    isLoading,
    error,
    reload: loadCheckpoints,
  };
}