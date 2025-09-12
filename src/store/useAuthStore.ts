'use client';

import type { SessionUser } from '@/lib/types/auth';
import type { AuthState } from './useAuthStoreClient';

// Dummy store for SSR
const dummyStore = () => ({
  user: null as SessionUser | null,
  isAuthenticated: false,
  isLoading: true,
  setUser: () => {},
  setLoading: () => {},
  logout: () => {}
});

// Dynamic import wrapper with proper typing
type AuthStoreHook = () => AuthState;
let realStore: AuthStoreHook | null = null;

export const useAuthStore = (): AuthState => {
  if (typeof window === 'undefined') {
    return dummyStore();
  }
  
  if (!realStore) {
    const { useAuthStore: store } = require('./useAuthStoreClient') as { useAuthStore: AuthStoreHook };
    realStore = store;
  }
  
  return realStore();
};