import client from "@/api/client";
import type {
  SyncRequest,
  SyncResponse,
} from "../types";

export async function synchronize(
  payload: SyncRequest,
): Promise<SyncResponse> {
  const response = await client.post<SyncResponse>(
    "/sync/",
    payload,
  );

  return response.data;
}