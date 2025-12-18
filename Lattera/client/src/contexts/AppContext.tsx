import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Toast } from '../types';
import type { UserResponse } from '../types/api';

import { api } from '../services/api';
import { tokenStorage } from '../utils/apiClient';

interface AppContextType {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;

  isAuthenticated: boolean;
  authLoading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;

  toasts: Toast[];
  addToast: (type: 'success' | 'error', message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      const id = Math.random().toString(36).slice(2, 11);
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => removeToast(id), 3000);
    },
    [removeToast]
  );

  const refreshSession = useCallback(async () => {
    const hasTokens = Boolean(
      tokenStorage.getAccessToken() || tokenStorage.getRefreshToken()
    );

    if (!hasTokens) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const me = await api.users.me();
      setUser(me);
    } catch {
      api.auth.clearSession();
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      api.auth.clearSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setAuthLoading(false);
    };

    window.addEventListener('auth:tokens-cleared', handler);
    return () => window.removeEventListener('auth:tokens-cleared', handler);
  }, []);

  const value = useMemo<AppContextType>(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user),
      authLoading,
      refreshSession,
      logout,
      toasts,
      addToast,
      removeToast,
    }),
    [addToast, authLoading, logout, refreshSession, removeToast, toasts, user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
