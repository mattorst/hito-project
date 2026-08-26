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

export async function getActiveTrekking(): Promise<Trekking | null> {
  const response = await apiClient.get<any>("/trekkings/");

  const rawData = response.data;
  const list: Trekking[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData?.results)
    ? rawData.results
    : [];

  // Busca el trekking cuyo estado sea IN_PROGRESS o ACTIVE
  const active = list.find((trekking) => {
    const status = trekking.status?.toUpperCase();
    return status === "IN_PROGRESS" || status === "ACTIVE";
  });

  return active ?? null;
}

export async function finishTrekking(
  trekkingId: number,
): Promise<Trekking> {
  const response = await apiClient.post<ApiResponse<Trekking>>(
    `/trekkings/${trekkingId}/finish/`,
  );

  return response.data.data;
}

export async function getTrekkings(): Promise<Trekking[]> {
  const response = await apiClient.get<ApiResponse<Trekking[]>>(
    "/trekkings/",
  );

  return response.data.data;
}