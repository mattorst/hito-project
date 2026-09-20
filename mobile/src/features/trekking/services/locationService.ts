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

export async function getCurrentLocation(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export async function watchLocation(
  callback: Location.LocationCallback,
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    callback,
  );
}