import { useState } from "react";

import { createRescue } from "../services/rescueService";
import type {
  CreateRescueRequest,
  Rescue,
} from "../types";

interface UseRescueReturn {
  rescue: Rescue | null;
  loading: boolean;
  error: string | null;
  requestRescue: (
    data: CreateRescueRequest,
  ) => Promise<Rescue | null>;
  clearError: () => void;
}

export const useRescue = (): UseRescueReturn => {
  const [rescue, setRescue] = useState<Rescue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRescue = async (
    data: CreateRescueRequest,
  ): Promise<Rescue | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await createRescue(data);

      if (!response.success || !response.data) {
        const message =
          response.message || "No fue posible solicitar el rescate.";

        setError(message);
        return null;
      }

      setRescue(response.data);

      return response.data;
    } catch (err: unknown) {
      let message = "Ocurrió un error al solicitar el rescate.";

      if (err instanceof Error) {
        message = err.message;
      }

      setError(message);

      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    rescue,
    loading,
    error,
    requestRescue,
    clearError,
  };
};