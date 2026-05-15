import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiGet, apiPost } from '../lib/api';
import { deleteToken, getToken, saveToken } from '../lib/storage';
import type { Student } from '../types/api';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  student: Student | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await apiGet<{ student: Student }>('/api/auth/me');
      setStudent(data.student);
      setIsAuthenticated(true);
    } catch {
      await deleteToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<{ token: string; student: Student }>(
      '/api/auth/login',
      { username, password },
    );
    await saveToken(data.token);
    setStudent(data.student);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await deleteToken();
    setStudent(null);
    setIsAuthenticated(false);
  }, []);

  const contextValue = useMemo(
    () => ({ isLoading, isAuthenticated, student, login, logout }),
    [isLoading, isAuthenticated, student, login, logout],
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
