import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, AuthPayload } from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

const ROUTES_WITHOUT_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

const GUEST_PATHS = ["/login", "/register"];

type RetriableRequest = InternalAxiosRequestConfig & { retried?: boolean };

let refreshRequest: Promise<string> | null = null;

async function requestNewAccessToken(): Promise<string> {
  const response = await axios.post<ApiResponse<AuthPayload>>(
    "/auth/refresh",
    null,
    { baseURL, withCredentials: true },
  );

  const token = response.data.data?.accessToken;

  if (!token) {
    throw new Error(response.data.message);
  }

  return token;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (GUEST_PATHS.includes(window.location.pathname)) {
    return;
  }

  window.location.replace("/login");
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined;

    const isRefreshable =
      error.response?.status === 401 &&
      request !== undefined &&
      !request.retried &&
      !ROUTES_WITHOUT_REFRESH.some((route) => request.url?.endsWith(route));

    if (!isRefreshable) {
      return Promise.reject(error);
    }

    request.retried = true;

    try {
      refreshRequest ??= requestNewAccessToken().finally(() => {
        refreshRequest = null;
      });

      const token = await refreshRequest;

      setAccessToken(token);
      request.headers.set("Authorization", `Bearer ${token}`);

      return await api(request);
    } catch {
      clearAccessToken();
      redirectToLogin();

      return Promise.reject(error);
    }
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiResponse<null>>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.code === AxiosError.ERR_NETWORK) {
      return "Unable to reach the server. Please try again.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
