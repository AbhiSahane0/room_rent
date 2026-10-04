import { Platform } from 'react-native';
import { ApiError, apiUrl, getAuthHeader, NetworkError, refreshSession } from './client';

export interface UploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

async function buildForm(file: UploadFile, fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    // React Native's FormData streams the file from disk when given a uri descriptor.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
  return form;
}

function send(path: string, form: FormData, auth: string | null, onProgress?: (fraction: number) => void): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(path));
    xhr.setRequestHeader('Accept', 'application/json');
    if (auth) xhr.setRequestHeader('Authorization', auth);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
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
    xhr.send(form as any);
  });
}

/** Multipart upload with progress. Refreshes the session once on 401, like every other request. */
export async function uploadFile<T = unknown>(path: string, file: UploadFile, fields: Record<string, string>, onProgress?: (fraction: number) => void): Promise<T> {
  const form = await buildForm(file, fields);
  let res = await send(path, form, await getAuthHeader(), onProgress);
  if (res.status === 401) {
    if (!(await refreshSession())) throw new ApiError(401, 'Your session has expired. Please log in again.');
    res = await send(path, await buildForm(file, fields), await getAuthHeader(), onProgress);
  }
  if (res.status < 200 || res.status >= 300 || res.body?.success === false) {
    const message = res.status === 413 ? 'The file is too large. Maximum size is 10 MB.' : res.body?.message ?? 'Upload failed. Please try again.';
    throw new ApiError(res.status, message);
  }
  return res.body?.data as T;
}
