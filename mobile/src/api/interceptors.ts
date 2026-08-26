import { AxiosError, InternalAxiosRequestConfig } from "axios";
import apiClient from "./client";
import { refreshToken } from "@/features/auth/services/authService";
import {
  getRefreshToken,
  saveAccessToken,
} from "@/storage/secureStorage";
import { triggerLogout } from "@/features/auth/session"; 

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Variable en memoria global del módulo que se actualiza al instante
let currentMemoryToken: string | null = null;

export function setMemoryToken(token: string | null) {
  currentMemoryToken = token;
}

export function setupInterceptors() {
  apiClient.interceptors.request.clear();
  apiClient.interceptors.response.clear();

  apiClient.interceptors.request.use(
    async (
      config: InternalAxiosRequestConfig,
    ): Promise<InternalAxiosRequestConfig> => {
      if (currentMemoryToken) {
        config.headers.Authorization = `Bearer ${currentMemoryToken}`;
      } else {
        delete config.headers.Authorization;
      }

      return config;
    },
    async (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetryAxiosRequestConfig | undefined;

      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes("/token/refresh/")) {
        await triggerLogout();
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const storedRefreshToken = await getRefreshToken();
        if (!storedRefreshToken) throw new Error("Refresh token no encontrado.");

        const response = await refreshToken({ refresh: storedRefreshToken });
        await saveAccessToken(response.access);
        setMemoryToken(response.access);

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