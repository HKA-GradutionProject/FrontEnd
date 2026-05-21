import { API_BASE_URL } from '../src/config';

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

export async function fetchApiResource<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log(`[Inventory] GET ${path}`, { url });

  const response = await fetch(url);
  const data = await readResponseBody(response);

  console.log(`[Inventory] GET ${path} response`, {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`);
  }

  return data as T;
}
