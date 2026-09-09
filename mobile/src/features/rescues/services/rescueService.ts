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