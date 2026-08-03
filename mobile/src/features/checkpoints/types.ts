export interface ScanResult {
  qrIdentifier: string;
}

export interface PendingCheckpointEvent {
  trekking: number;
  checkpoint: number;
  registered_at: string;
}