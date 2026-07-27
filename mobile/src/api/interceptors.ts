import { AxiosError, InternalAxiosRequestConfig } from "axios";
import apiClient from "./client";
import { refreshToken } from "@/features/auth/services/authService";
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
} from "@/storage/secureStorage";
import { triggerLogout } from "@/features/auth/session"; 

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let initialized = false;

export function setupInterceptors() {
  if (initialized) {
    return;
  }

  initialized = true;

  // Interceptor de Request: Adjunta el Access Token si existe
  apiClient.interceptors.request.use(
    async (
      config: InternalAxiosRequestConfig,
    ): Promise<InternalAxiosRequestConfig> => {
      const accessToken = await getAccessToken();

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    },
    async (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Interceptor de Response: Maneja errores 401 y renueva el Access Token
  apiClient.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
      const originalRequest = error.config as RetryAxiosRequestConfig | undefined;

      if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retry
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const storedRefreshToken = await getRefreshToken();

        if (!storedRefreshToken) {
          throw new Error("Refresh token no encontrado.");
        }

        const response = await refreshToken({
          refresh: storedRefreshToken,
        });

        await saveAccessToken(response.access);

        // Actualizamos el header con el nuevo token para el reintento
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.access}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        await triggerLogout();

        return Promise.reject(refreshError);
      }
    },
  );
}