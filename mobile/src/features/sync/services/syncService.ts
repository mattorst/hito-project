import api from "@/api/client";

export interface SyncPayload {
  checkpoint_records?: Array<{
    trekking: number;
    checkpoint: number;
    registered_at: string;
  }>;
  incidents?: Array<any>;
}

export interface FailedSyncItem {
  index: number;
  type: string;
  error: string;
}

export interface SyncResponse {
  success: boolean;
  data: {
    synchronized: number;
    failed: FailedSyncItem[];
  };
}

export const syncService = {
  async syncBatch(payload: SyncPayload): Promise<SyncResponse> {
    const response = await api.post<SyncResponse>("/api/sync/", payload);
    return response.data;
  },
};