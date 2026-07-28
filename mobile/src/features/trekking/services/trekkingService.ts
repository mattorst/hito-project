import apiClient from "@/api/client";
import type {
  StartTrekkingRequest,
  Trekking,
} from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function startTrekking(
  request: StartTrekkingRequest,
): Promise<Trekking> {
  const response = await apiClient.post<ApiResponse<Trekking>>(
    "/trekkings/start/",
    request,
  );

  return response.data.data;
}