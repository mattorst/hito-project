import client from "@/api/client";
import type {
  CreateIncidentRequest,
  Incident,
} from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export async function createIncident(
  data: CreateIncidentRequest,
): Promise<Incident> {
  const formData = new FormData();

  formData.append("trekking", String(data.trekking));
  formData.append("incident_type", data.incident_type);
  formData.append("description", data.description);
  formData.append("latitude", data.latitude);
  formData.append("longitude", data.longitude);
  formData.append("registered_at", data.registered_at);

  if (data.photo) {
    formData.append("photo", {
      uri: data.photo,
      name: `incident-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);
  }

  const response = await client.post<ApiResponse<Incident>>(
    "/incidents/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.data;
}