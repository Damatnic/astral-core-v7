'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SessionUser } from '@/lib/types/auth';

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: SessionUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const storeCreator = (set: any): AuthState => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user: SessionUser | null) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false
        }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
});

// Create store with persist
export const useAuthStore = create<AuthState>()(
  persist(
    storeCreator,
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);