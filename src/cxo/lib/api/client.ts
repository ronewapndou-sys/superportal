/**
 * Thin typed fetch wrapper. Base URL swaps to the real API when the backend
 * lands — everything currently resolves against MSW mock handlers.
 */
import { clearSession, getSession } from "@/lib/session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// The portal carries payment and account data — refuse to run against a
// cleartext backend in production builds.
if (process.env.NODE_ENV === "production" && BASE_URL.startsWith("http://")) {
  throw new Error("NEXT_PUBLIC_API_URL must use https:// in production builds.");
}

export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSession()?.accessToken;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = "Something went wrong on our side. Please try again.";
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.message ?? message;
      code = body.code;
    } catch {
      /* non-JSON error body — keep the friendly default */
    }
    // expired or revoked token: drop the session so the shell sends them to sign-in
    if (res.status === 401 && token) clearSession();
    throw new ApiRequestError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
