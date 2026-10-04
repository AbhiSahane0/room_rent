const BASE_URL = String(import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const ACCESS = 'auth.accessToken';
const REFRESH = 'auth.refreshToken';

/** Session tokens for this browser. Cleared on logout or when the server revokes the session. */
export const tokens = {
  access: () => localStorage.getItem(ACCESS),
  refresh: () => localStorage.getItem(REFRESH),
  save(access: string, refresh: string) {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}
/** The server could not be reached (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor() {
    super('Unable to reach the server. Please check your internet connection and try again.');
  }
}

let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: (() => void) | null) => {
  onSessionExpired = fn;
};

let refreshing: Promise<boolean> | null = null;

/** Single-flight refresh: simultaneous 401s share one call, so token rotation never races. */
async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = tokens.refresh();
      if (!refreshToken) return false;
      const res = await rawFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }), json: true });
      if (res.status === 401 || res.status === 403) {
        tokens.clear(); // revoked, disabled, expired or replayed: this is a real sign-out
        onSessionExpired?.();
        return false;
      }
      if (!res.ok) throw new ApiError(res.status, 'Unable to refresh your session. Please try again.');
      const json = await res.json();
      tokens.save(json.data.accessToken, json.data.refreshToken);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

interface RawOptions {
  method?: string;
  body?: BodyInit;
  json?: boolean;
  headers?: Record<string, string>;
}

async function rawFetch(path: string, opts: RawOptions = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers: { Accept: 'application/json', ...(opts.json ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body,
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response): Promise<T> {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* body was not JSON */
  }
  if (!res.ok || json?.success === false) throw new ApiError(res.status, json?.message ?? 'Something went wrong. Please try again.', json?.errors);
  return json?.data as T;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the Authorization header and 401 handling (login). */
  anonymous?: boolean;
}

async function authed(path: string, opts: RawOptions, anonymous = false): Promise<Response> {
  const send = () => {
    const token = tokens.access();
    return rawFetch(path, { ...opts, headers: { ...opts.headers, ...(token && !anonymous ? { Authorization: `Bearer ${token}` } : {}) } });
  };
  let res = await send();
  if (res.status === 401 && !anonymous) {
    if (!(await refreshSession())) throw new ApiError(401, 'Your session has expired. Please log in again.');
    res = await send();
  }
  return res;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await authed(path, { method: opts.method, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, json: opts.body !== undefined }, opts.anonymous);
  return parse<T>(res);
}

/** Authenticated download of a binary body (PDF). */
export const authedFetch = (path: string) => authed(path, {});

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const friendlyError = (e: unknown): string => (e instanceof ApiError || e instanceof NetworkError ? e.message : 'Something went wrong. Please try again.');

/** Multipart upload with progress events (fetch cannot report upload progress). Refreshes the session once on 401. */
export async function uploadFile<T>(path: string, file: Blob, fileName: string, fields: Record<string, string>, onProgress?: (fraction: number) => void): Promise<T> {
  const send = (): Promise<{ status: number; body: any }> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      form.append('file', file, fileName);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}${path}`);
      xhr.setRequestHeader('Accept', 'application/json');
      const token = tokens.access();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 120_000;
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        let body: any = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* non-JSON */
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new NetworkError());
      xhr.ontimeout = () => reject(new NetworkError());
      xhr.send(form);
    });

  let res = await send();
  if (res.status === 401) {
    if (!(await refreshSession())) throw new ApiError(401, 'Your session has expired. Please log in again.');
    res = await send();
  }
  if (res.status < 200 || res.status >= 300 || res.body?.success === false) {
    throw new ApiError(res.status, res.status === 413 ? 'The file is too large. Maximum size is 10 MB.' : res.body?.message ?? 'Upload failed. Please try again.');
  }
  return res.body?.data as T;
}
