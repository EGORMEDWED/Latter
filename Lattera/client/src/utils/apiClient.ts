import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import type {
  ApiErrorResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "../types/api";

export class ApiError extends Error {
  statusCode?: number;
  code?: string;
  requestId?: string;
  details?: unknown;
  originalError?: unknown;

  constructor(message: string, options?: Omit<ApiError, "name" | "message">) {
    super(message);
    this.name = "ApiError";

    if (options) {
      this.statusCode = options.statusCode;
      this.code = options.code;
      this.requestId = options.requestId;
      this.details = options.details;
      this.originalError = options.originalError;
    }
  }
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const hasWindow = (): boolean => typeof window !== "undefined";

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string): void {
    if (!hasWindow()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    if (!hasWindow()) return;
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clearTokens(): void {
    if (!hasWindow()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new CustomEvent("auth:tokens-cleared"));
  },
};

const getApiBaseUrl = (): string => {
  const env = import.meta.env as unknown as {
    VITE_API_URL?: string;
    VITE_API_BASE_URL?: string;
    DEV?: boolean;
  };

  const configured = env.VITE_API_URL || env.VITE_API_BASE_URL;
  const base = (configured || "http://localhost:5000").replace(/\/$/, "");

  if (base.endsWith("/api")) return base;
  return `${base}/api`;
};

const isDev = (): boolean => {
  const env = import.meta.env as unknown as { DEV?: boolean };
  return Boolean(env.DEV);
};

const isApiErrorResponse = (data: unknown): data is ApiErrorResponse => {
  if (!data || typeof data !== "object") return false;

  const record = data as Record<string, unknown>;
  if (
    !("error" in record) ||
    typeof record.error !== "object" ||
    !record.error
  ) {
    return false;
  }

  const errorObj = record.error as Record<string, unknown>;
  return (
    typeof errorObj.message === "string" &&
    typeof errorObj.code === "string" &&
    typeof errorObj.statusCode === "number"
  );
};

const defaultStatusMessage = (statusCode?: number): string => {
  if (!statusCode) return "Network error. Please check your connection.";

  if (statusCode >= 500) return "Server error. Please try again later.";

  switch (statusCode) {
    case 400:
      return "Bad request.";
    case 401:
      return "You are not authorized. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "Requested resource was not found.";
    case 409:
      return "Conflict. Please retry.";
    case 413:
      return "File is too large.";
    default:
      return "Request failed.";
  }
};

const normalizeError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new ApiError("Unexpected error occurred.", { originalError: error });
  }

  const axiosError = error as AxiosError;
  const statusCode = axiosError.response?.status;
  const data = axiosError.response?.data;

  if (isApiErrorResponse(data)) {
    return new ApiError(
      data.error.message || defaultStatusMessage(statusCode),
      {
        statusCode: data.error.statusCode,
        code: data.error.code,
        requestId: data.error.requestId,
        details: data.error.details,
        originalError: axiosError,
      },
    );
  }

  return new ApiError(defaultStatusMessage(statusCode), {
    statusCode,
    originalError: axiosError,
  });
};

const setAuthorizationHeader = (
  config: { headers?: AxiosRequestConfig["headers"] },
  token: string,
): void => {
  if (!config.headers) {
    config.headers = {};
  }

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
    return;
  }

  (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json",
  },
});

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const storedRefreshToken = tokenStorage.getRefreshToken();
  if (!storedRefreshToken) {
    throw new ApiError("No refresh token available.", { statusCode: 401 });
  }

  const response = await apiClient.post<
    RefreshTokenResponse,
    AxiosResponse<RefreshTokenResponse>,
    RefreshTokenRequest
  >("/auth/refresh", { refreshToken: storedRefreshToken });

  tokenStorage.setAccessToken(response.data.accessToken);
  return response.data.accessToken;
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      setAuthorizationHeader(config, accessToken);
    }

    if (isDev()) {
      const method = (config.method || "GET").toUpperCase();
      const url = config.baseURL
        ? `${config.baseURL}${config.url || ""}`
        : config.url;
      console.debug(`[API] ${method} ${url}`);
    }

    return config;
  },
  (error: unknown) => Promise.reject(normalizeError(error)),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (isDev()) {
      const method = (response.config.method || "GET").toUpperCase();
      const url = response.config.baseURL
        ? `${response.config.baseURL}${response.config.url || ""}`
        : response.config.url;
      console.debug(`[API] ${method} ${url} -> ${response.status}`);
    }

    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeError(error));
    }

    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    const originalRequest = axiosError.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const url = originalRequest?.url || "";
    const shouldSkipRefresh =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/refresh");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;

        setAuthorizationHeader(originalRequest, newToken);

        return apiClient.request(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        tokenStorage.clearTokens();
        return Promise.reject(normalizeError(refreshError));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

export const request = async <TResponse>(
  config: AxiosRequestConfig,
): Promise<TResponse> => {
  const response = await apiClient.request<TResponse>(config);
  return response.data;
};
