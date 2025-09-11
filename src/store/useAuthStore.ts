'use client';

import type { SessionUser } from '@/lib/types/auth';

// Dummy store for SSR
const dummyStore = () => ({
  user: null as SessionUser | null,
  isAuthenticated: false,
  isLoading: true,
  setUser: () => {},
  setLoading: () => {},
  logout: () => {}
});

// Dynamic import wrapper
let realStore: any = null;

export const useAuthStore = () => {
  if (typeof window === 'undefined') {
    return dummyStore();
  }
  
  if (!realStore) {
    const { useAuthStore: store } = require('./useAuthStoreClient');
    realStore = store;
  }
  
  return realStore();
};