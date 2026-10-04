import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, request, setSessionExpiredHandler, tokens } from '@/api/client';

type Status = 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // A stored refresh token means the user is signed in: no login screen on every visit.
  const [status, setStatus] = useState<Status>(() => (tokens.refresh() ? 'authenticated' : 'unauthenticated'));
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fired only when the server definitively rejects the session (revoked, disabled, expired).
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setStatus('unauthenticated');
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await request<{ accessToken: string; refreshToken: string }>('/auth/login', { method: 'POST', body: { username: username.trim(), password }, anonymous: true });
    tokens.save(data.accessToken, data.refreshToken);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokens.refresh();
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined); // always sign out locally, even offline
    tokens.clear();
    localStorage.removeItem('pref.propertyId');
    queryClient.clear();
    setStatus('unauthenticated');
  }, [queryClient]);

  const value = useMemo(() => ({ status, login, logout }), [status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
