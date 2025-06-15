import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { useCallback, useState } from "react";
import { ApiError } from "../api/ApiError";
import api from "../api/axiosInstance";
import { AuthService } from "../services/authService";
import { TRequestOptions } from "../types/auth";
import { TApiResponse } from "../types/api";

export function useSecureApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const request = useCallback(
    async <T>(
      method: string,
      url: string,
      data?: any,
      options?: TRequestOptions
    ): Promise<TApiResponse<T> | null> => {
      const { syncTokens = true, onError, config = {} } = options || {};
      try {
        setIsLoading(true);
        clearError();
        if (syncTokens) {
          AuthService.syncAllTokens();
        }

        const requestConfig: AxiosRequestConfig = {
          ...config,
          method,
          url,
          data,
        };
        const response = await api(requestConfig);
        return { success: true, message: "Success", data: response.data };
      } catch (error) {
        console.error(`API ${method} error:`, error);

        const apiError = axios.isAxiosError(error)
          ? ApiError.fromAxiosError(error as AxiosError)
          : new ApiError(500, String(error));
        setError(apiError);

        if (onError) {
          onError(apiError);
        }
        return {
          success: false,
          message: apiError.getUserFriendlyMessage(),
          error: apiError,
          data: undefined,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [clearError]
  );

  const get = useCallback(
    <T = any>(
      url: string,
      options?: TRequestOptions
    ): Promise<TApiResponse<T> | null> => {
      return request<T>("GET", url, undefined, options);
    },
    [request]
  );

  const post = useCallback(
    <T = any>(
      url: string,
      data?: any,
      options?: TRequestOptions
    ): Promise<TApiResponse<T> | null> => {
      return request<T>("POST", url, data, options);
    },
    [request]
  );

  const put = useCallback(
    <T = any>(
      url: string,
      data?: any,
      options?: TRequestOptions
    ): Promise<TApiResponse<T> | null> => {
      return request<T>("PUT", url, data, options);
    },
    [request]
  );

  const del = useCallback(
    <T = any>(
      url: string,
      options?: TRequestOptions
    ): Promise<TApiResponse<T> | null> => {
      return request<T>("DELETE", url, undefined, options);
    },
    [request]
  );

  return {
    isLoading,
    error,
    clearError,
    get,
    post,
    put,
    del,
  };
}
