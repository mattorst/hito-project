import apiClient from "@/api/client";

import type {
  Checkpoint,
  Park,
  Trail,
} from "../types";

export async function getParks(): Promise<Park[]> {
  const response = await apiClient.get<Park[]>("/parks/");

  return response.data;
}

export async function getTrails(
  parkId?: number,
): Promise<Trail[]> {
  const response = await apiClient.get<Trail[]>("/trails/", {
    params: parkId
      ? {
          park: parkId,
        }
      : undefined,
  });

  return response.data;
}

export async function getCheckpoints(
  trailId?: number,
): Promise<Checkpoint[]> {
  const response = await apiClient.get<Checkpoint[]>("/checkpoints/", {
    params: trailId
      ? {
          trail: trailId,
        }
      : undefined,
  });

  return response.data;
}