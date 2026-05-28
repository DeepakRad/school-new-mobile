import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'school_mobile_token';
const THEME_KEY = 'school_mobile_theme';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
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
