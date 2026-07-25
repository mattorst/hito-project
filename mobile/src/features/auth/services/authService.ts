import api from "../../../api/client";

import type {
  LoginRequest,
  RefreshTokenRequest,
  TokenResponse,
} from "../types";

export async function login(
  credentials: LoginRequest,
): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>(
    "/token/",
    credentials,
  );

  return response.data;
}

export async function refreshToken(
  data: RefreshTokenRequest,
): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>(
    "/token/refresh/",
    data,
  );

  return response.data;
}