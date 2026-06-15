import { API_BASE_URL } from '../src/config';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(path: string, method: string, status: number, data: unknown) {
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;

    if (typeof detail === 'string') {
      return detail;
    }
  }

  return `${method} ${path} failed with status ${status}`;
}

async function requestApiResource<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const url = `${API_BASE_URL}${path}`;
  console.log(`[Inventory] ${method} ${path}`, { url });

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await readResponseBody(response);

  console.log(`[Inventory] ${method} ${path} response`, {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok) {
    throw new ApiError(getErrorMessage(path, method, response.status, data), response.status, data);
  }

  return data as T;
}

export async function fetchApiResource<T>(path: string): Promise<T> {
  return requestApiResource<T>(path);
}

export async function postApiResource<T>(path: string, body: unknown): Promise<T> {
  return requestApiResource<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchApiResource<T>(path: string, body: unknown): Promise<T> {
  return requestApiResource<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteApiResource(path: string): Promise<void> {
  await requestApiResource<null>(path, {
    method: 'DELETE',
  });
}
