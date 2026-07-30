import { Checkpoint } from "@/features/parks/types";

export function findCheckpointByQr(
  checkpoints: Checkpoint[],
  qrIdentifier: string,
): Checkpoint | null {
  return (
    checkpoints.find(
      (checkpoint) => checkpoint.qr_identifier === qrIdentifier,
    ) ?? null
  );
}