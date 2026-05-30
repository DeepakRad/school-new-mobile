import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../hooks/useAuth';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '../hooks/useThemePreference';
import { defaultScreenQueryOptions } from '../lib/query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...defaultScreenQueryOptions,
      retry: 1,
      },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { isDark } = useThemePreference();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="profile"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="parent-profile"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}
