import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getThemePreference, saveThemePreference } from '../lib/storage';

type ThemeMode = 'light' | 'dark';

interface ThemePreferenceState {
  theme: ThemeMode;
  isDark: boolean;
  isReady: boolean;
  setTheme: (value: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemePreferenceContext = createContext<ThemePreferenceState | null>(null);

export function ThemePreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restoreTheme() {
      try {
        const storedTheme = await getThemePreference();
        if (storedTheme && isMounted) {
          setThemeState(storedTheme);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    restoreTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = useCallback(async (value: ThemeMode) => {
    setThemeState(value);
    await saveThemePreference(value);
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    await saveThemePreference(nextTheme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      isReady,
      setTheme,
      toggleTheme,
    }),
    [theme, isReady, setTheme, toggleTheme],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceState {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error(
      'useThemePreference must be used within ThemePreferenceProvider',
    );
  }
  return context;
}
