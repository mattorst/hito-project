import { ScanResult } from "../types";

export function createScanResult(qrIdentifier: string): ScanResult {
  return {
    qrIdentifier,
  };
}