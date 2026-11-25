
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------
// HITO — ALMACENAMIENTO SEGURO DE TOKENS
//
// Las claves deben coincidir con AuthContext.tsx.
// ---------------------------------------------------------

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// ---------------------------------------------------------
// ACCESS TOKEN
// ---------------------------------------------------------

export async function saveAccessToken(
  token: string,
): Promise<void> {
  await SecureStore.setItemAsync(
    ACCESS_TOKEN_KEY,
    token,
  );
}

export async function getAccessToken():
  Promise<string | null> {
  return SecureStore.getItemAsync(
    ACCESS_TOKEN_KEY,
  );
}

export async function deleteAccessToken():
  Promise<void> {
  await SecureStore.deleteItemAsync(
    ACCESS_TOKEN_KEY,
  );
}

// ---------------------------------------------------------
// REFRESH TOKEN
// ---------------------------------------------------------

export async function saveRefreshToken(
  token: string,
): Promise<void> {
  await SecureStore.setItemAsync(
    REFRESH_TOKEN_KEY,
    token,
  );
}

export async function getRefreshToken():
  Promise<string | null> {
  return SecureStore.getItemAsync(
    REFRESH_TOKEN_KEY,
  );
}

export async function deleteRefreshToken():
  Promise<void> {
  await SecureStore.deleteItemAsync(
    REFRESH_TOKEN_KEY,
  );
}

// ---------------------------------------------------------
// LIMPIAR SESIÓN
// ---------------------------------------------------------

export async function clearTokens():
  Promise<void> {
  await Promise.all([
    deleteAccessToken(),
    deleteRefreshToken(),
  ]);
}
