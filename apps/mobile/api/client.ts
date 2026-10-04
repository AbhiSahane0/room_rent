import Constants from 'expo-constants';
import { tokenStorage } from '@/services/tokenStorage';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra as any)?.apiUrl ?? 'http://10.0.2.2:3000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}
/** Thrown when the server could not be reached (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor() {
    super('Unable to reach the server. Please check your internet connection and try again.');
  }
}

type AuthListener = () => void;
let onSessionExpired: AuthListener | null = null;
export const setSessionExpiredHandler = (fn: AuthListener | null) => { onSessionExpired = fn; };

let refreshing: Promise<boolean> | null = null;

/** Single-flight refresh: concurrent 401s share one refresh call so rotation never races. */
async function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await tokenStorage.getRefresh();
      if (!refreshToken) return false;
      const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refreshToken } });
      if (res.status === 401 || res.status === 403) {
        // Definitive: revoked, disabled, expired or replayed. Only now do we drop the session.
        await tokenStorage.clear();
        onSessionExpired?.();
        return false;
      }
      if (!res.ok) throw new ApiError(res.status, 'Unable to refresh your session. Please try again.');
      const json = await res.json();
      await tokenStorage.save(json.data.accessToken, json.data.refreshToken);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

interface RawOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  formData?: FormData;
  signal?: AbortSignal;
}

async function rawFetch(path: string, opts: RawOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...opts.headers,
      },
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal ?? controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
  }
}

async function parse<T>(res: Response): Promise<T> {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json?.message ?? 'Something went wrong. Please try again.', json?.errors);
  }
  return json?.data as T;
}

export interface RequestOptions extends Omit<RawOptions, 'headers'> {
  /** Skip the Authorization header and 401 handling (login/refresh). */
  anonymous?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const send = async () => {
    const headers: Record<string, string> = {};
    if (!opts.anonymous) {
      const token = await tokenStorage.getAccess();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return rawFetch(path, { ...opts, headers });
  };

  let res = await send();
  if (res.status === 401 && !opts.anonymous) {
    const ok = await refreshTokens();
    if (!ok) throw new ApiError(401, 'Your session has expired. Please log in again.');
    res = await send();
  }
  return parse<T>(res);
}

/** Authenticated download of a binary body (used for PDFs). Returns the raw Response after auth handling. */
export async function authedFetch(path: string): Promise<Response> {
  const attempt = async () => {
    const token = await tokenStorage.getAccess();
    return rawFetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  };
  let res = await attempt();
  if (res.status === 401) {
    if (!(await refreshTokens())) throw new ApiError(401, 'Your session has expired. Please log in again.');
    res = await attempt();
  }
  return res;
}

export const apiUrl = (path: string) => `${BASE_URL}${path}`;

/** For XHR uploads (progress events): current bearer header, and a way to refresh after a 401. */
export const getAuthHeader = async () => {
  const token = await tokenStorage.getAccess();
  return token ? `Bearer ${token}` : null;
};
export const refreshSession = refreshTokens;

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),
};

export const friendlyError = (e: unknown): string =>
  e instanceof ApiError || e instanceof NetworkError ? e.message : 'Something went wrong. Please try again.';
