import { useCallback, useEffect, useState } from "react";

import { getParks } from "../services/parksService";
import type { Park } from "../types";

export function useParks() {
  const [parks, setParks] = useState<Park[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getParks();
      setParks(data);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los parques.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParks();
  }, [loadParks]);

  return {
    parks,
    isLoading,
    error,
    reload: loadParks,
  };
}