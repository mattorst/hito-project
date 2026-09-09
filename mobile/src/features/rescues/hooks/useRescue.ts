import { useState } from "react";
import {
  createRescue,
  getActiveRescue,
  completeRescue,
  cancelRescue,
} from "../services/rescueService";
import type {
  CreateRescueRequest,
  Rescue,
} from "../types";

interface UseRescueReturn {
  rescue: Rescue | null;
  activeRescue: Rescue | null;
  loading: boolean;
  activeRescueLoading: boolean;
  closingRescue: boolean;
  cancellingRescue: boolean;
  error: string | null;
  requestRescue: (
    data: CreateRescueRequest,
  ) => Promise<Rescue | null>;
  loadActiveRescue: (
    trekkingId: number,
  ) => Promise<Rescue | null>;
  closeActiveRescue: (
    rescueId: number,
  ) => Promise<Rescue | null>;
  cancelActiveRescue: (
    rescueId: number,
  ) => Promise<Rescue | null>;
  clearError: () => void;
}

export const useRescue = (): UseRescueReturn => {
  const [rescue, setRescue] = useState<Rescue | null>(null);
  const [activeRescue, setActiveRescue] =
    useState<Rescue | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeRescueLoading, setActiveRescueLoading] =
    useState(false);
  const [closingRescue, setClosingRescue] = useState(false);
  const [cancellingRescue, setCancellingRescue] = useState(false);

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
          response.message ||
          "No fue posible solicitar el rescate.";
        setError(message);
        return null;
      }

      setRescue(response.data);
      setActiveRescue(response.data);
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

  const loadActiveRescue = async (
    trekkingId: number,
  ): Promise<Rescue | null> => {
    try {
      setActiveRescueLoading(true);
      setError(null);

      const response = await getActiveRescue(trekkingId);

      if (!response.success) {
        const message =
          response.message ||
          "No fue posible consultar el estado del rescate.";
        setError(message);
        return null;
      }

      setActiveRescue(response.data);
      return response.data;
    } catch (err: unknown) {
      let message = "Ocurrió un error al consultar el rescate.";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return null;
    } finally {
      setActiveRescueLoading(false);
    }
  };

  const closeActiveRescue = async (
    rescueId: number,
  ): Promise<Rescue | null> => {
    try {
      setClosingRescue(true);
      setError(null);

      const response = await completeRescue(rescueId);

      if (!response.success || !response.data) {
        const message =
          response.message ||
          "No fue posible cerrar el rescate.";
        setError(message);
        return null;
      }

      // Al cerrarse deja de estar activo para la UI
      setActiveRescue(null);
      setRescue(response.data);
      return response.data;
    } catch (err: unknown) {
      let message = "Ocurrió un error al cerrar el rescate.";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return null;
    } finally {
      setClosingRescue(false);
    }
  };

  const cancelActiveRescue = async (
    rescueId: number,
  ): Promise<Rescue | null> => {
    try {
      setCancellingRescue(true);
      setError(null);

      const response = await cancelRescue(rescueId);

      if (!response.success || !response.data) {
        const message =
          response.message ||
          "No fue posible cancelar el rescate.";
        setError(message);
        return null;
      }

      // Al cancelarse deja de estar activo para la UI
      setActiveRescue(null);
      setRescue(response.data);
      return response.data;
    } catch (err: unknown) {
      let message = "Ocurrió un error al cancelar el rescate.";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return null;
    } finally {
      setCancellingRescue(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    rescue,
    activeRescue,
    loading,
    activeRescueLoading,
    closingRescue,
    cancellingRescue,
    error,
    requestRescue,
    loadActiveRescue,
    closeActiveRescue,
    cancelActiveRescue,
    clearError,
  };
};