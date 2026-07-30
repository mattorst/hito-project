import apiClient from "@/api/client";
import { CheckpointRecord } from "@/features/trekking/types";

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface RegisterCheckpointRequest {
  trekking: number;
  checkpoint: number;
  registered_at: string;
}

export async function registerCheckpoint(
  payload: RegisterCheckpointRequest,
): Promise<CheckpointRecord> {
  const response = await apiClient.post<ApiResponse<CheckpointRecord>>(
    "/checkpoint-records/",
    payload,
  );

  return response.data.data;
}