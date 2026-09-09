import client from "@/api/client";
import type {
  CreateRescueRequest,
  Rescue,
} from "../types";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export const createRescue = async (
  data: CreateRescueRequest,
): Promise<ApiResponse<Rescue>> => {
  const response = await client.post<ApiResponse<Rescue>>(
    "/rescues/",
    data,
  );

  return response.data;
};

export const getActiveRescue = async (
  trekkingId: number,
): Promise<ApiResponse<Rescue | null>> => {
  const response = await client.get<ApiResponse<Rescue | null>>(
    "/rescues/active/",
    {
      params: {
        trekking: trekkingId,
      },
    },
  );

  return response.data;
};

export const completeRescue = async (
  rescueId: number,
): Promise<ApiResponse<Rescue>> => {
  const response = await client.post<ApiResponse<Rescue>>(
    `/rescues/${rescueId}/complete/`,
  );

  return response.data;
};

export const cancelRescue = async (
  rescueId: number,
): Promise<ApiResponse<Rescue>> => {
  const response = await client.post<ApiResponse<Rescue>>(
    `/rescues/${rescueId}/cancel/`,
  );

  return response.data;
};