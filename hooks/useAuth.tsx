import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '../lib/api';
import {
  deleteToken,
  hydrateTokenCache,
  saveToken,
  setTokenCache,
} from '../lib/storage';
import type { Student } from '../types/api';

interface AuthState {
  isLoading: boolean;
  isBootstrapped: boolean;
  isAuthenticated: boolean;
  student: Student | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const prefetchEssentialData = useCallback(async () => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['home'],
        queryFn: () => apiGet('/api/home'),
        staleTime: 1000 * 60,
      }),
      queryClient.prefetchQuery({
        queryKey: ['profile'],
        queryFn: () => apiGet('/api/profile'),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: ['notifications'],
        queryFn: () => apiGet('/api/notifications/'),
        staleTime: 1000 * 30,
      }),
    ]);
  }, [queryClient]);

  const applyAuthenticatedState = useCallback((nextStudent: Student | null) => {
    setStudent(nextStudent);
    setIsAuthenticated(true);
  }, []);

  const clearSession = useCallback(async () => {
    setTokenCache(null);
    setStudent(null);
    setIsAuthenticated(false);
    queryClient.removeQueries({ queryKey: ['home'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['attendance'] });
    queryClient.removeQueries({ queryKey: ['calendar'] });
    queryClient.removeQueries({ queryKey: ['academics'] });
    await deleteToken();
  }, [queryClient]);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await hydrateTokenCache();
      if (!token) {
        setIsAuthenticated(false);
        setStudent(null);
        return;
      }

      // Trust the local token for initial routing, then validate in background.
      setIsAuthenticated(true);

      const data = await apiGet<{ student: Student }>('/api/auth/me');
      applyAuthenticatedState(data.student);
      void prefetchEssentialData();
    } catch {
      await clearSession();
    } finally {
      setIsBootstrapped(true);
      setIsLoading(false);
    }
  }, [applyAuthenticatedState, clearSession, prefetchEssentialData]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiPost<{ token: string; student: Student }>(
        '/api/auth/login',
        { username, password },
      );
      await saveToken(data.token);
      applyAuthenticatedState(data.student);
      setIsBootstrapped(true);
      void prefetchEssentialData();
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthenticatedState, prefetchEssentialData]);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const contextValue = useMemo(
    () => ({
      isLoading,
      isBootstrapped,
      isAuthenticated,
      student,
      login,
      logout,
    }),
    [isLoading, isBootstrapped, isAuthenticated, student, login, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
