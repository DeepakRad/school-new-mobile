import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'school_mobile_token';
const THEME_KEY = 'school_mobile_theme';

let tokenCache: string | null | undefined;

export async function saveToken(token: string): Promise<void> {
  tokenCache = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (tokenCache !== undefined) {
    return tokenCache;
  }

  const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  tokenCache = storedToken;
  return storedToken;
}

export function setTokenCache(token: string | null): void {
  tokenCache = token;
}

export function getCachedToken(): string | null {
  return tokenCache ?? null;
}

export async function hydrateTokenCache(): Promise<string | null> {
  if (tokenCache !== undefined) {
    return tokenCache;
  }

  const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  tokenCache = storedToken;
  return storedToken;
}

export async function deleteToken(): Promise<void> {
  tokenCache = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveThemePreference(
  theme: 'light' | 'dark',
): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, theme);
}

export async function getThemePreference(): Promise<'light' | 'dark' | null> {
  const value = await SecureStore.getItemAsync(THEME_KEY);
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return null;
}
