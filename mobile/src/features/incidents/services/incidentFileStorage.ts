import { File, Paths } from "expo-file-system";

export async function persistIncidentPhoto(
  sourceUri: string,
  eventId: string,
): Promise<string> {
  const source = new File(sourceUri);

  if (!source.exists) {
    throw new Error("La fotografía original ya no existe.");
  }

  const extension = source.extension || ".jpg";

  const destination = new File(
    Paths.document,
    `incident_${eventId}${extension}`,
  );

  source.copy(destination);

  return destination.uri;
}

export async function incidentPhotoExists(
  uri: string,
): Promise<boolean> {
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
}

export async function deleteIncidentPhoto(
  uri: string,
): Promise<void> {
  try {
    const file = new File(uri);

    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn(
      "No se pudo eliminar la fotografía local:",
      error,
    );
  }
}