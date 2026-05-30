import { getCachedToken, getToken } from './storage';

const DEV_BASE_URL = 'http://localhost:8081';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

function resolveBaseUrl() {
  if (BASE_URL) {
    return BASE_URL;
  }

  if (__DEV__) {
    return DEV_BASE_URL;
  }

  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is not configured for this build.',
  );
}

async function authHeaders(): Promise<Record<string, string>> {
  const cachedToken = getCachedToken();
  const token = cachedToken ?? (await getToken());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Server returned HTML instead of JSON. For Expo Router API routes, set web.output to "server" in app.json, then restart `npx expo`.',
      );
    }
    throw new Error('Invalid JSON from server');
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }
  return data as T;
}
