import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, request, setSessionExpiredHandler } from '@/api/client';
import { tokenStorage } from '@/services/tokenStorage';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const queryClient = useQueryClient();

  // App start: a stored refresh token means we are signed in. No password prompt, no network wait.
  useEffect(() => {
    let alive = true;
    tokenStorage.getRefresh().then((t) => alive && setStatus(t ? 'authenticated' : 'unauthenticated'));
    return () => {
      alive = false;
    };
  }, []);

  // Fired by the API client only when refresh definitively fails (revoked / disabled / expired).
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setStatus('unauthenticated');
    });
    return () => {
      setSessionExpiredHandler(null);
    };
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { username: username.trim(), password },
      anonymous: true,
    });
    await tokenStorage.save(data.accessToken, data.refreshToken);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStorage.getRefresh();
    // Best effort: revoke server-side, but always clear the device even when offline.
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    await tokenStorage.clear();
    await tokenStorage.delPref('propertyId');
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
