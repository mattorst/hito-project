import * as Location from "expo-location";

export async function getForegroundPermissionStatus(): Promise<Location.PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

export async function requestForegroundPermission(): Promise<Location.PermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

export async function isLocationEnabled(): Promise<boolean> {
  return Location.hasServicesEnabledAsync();
}