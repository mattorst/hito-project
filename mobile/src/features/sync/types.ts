export type SyncEventType = "checkpoint" | "incident";

export interface SyncEvent {
  id: string;
  type: SyncEventType;
  createdAt: string;
  payload: any;
}