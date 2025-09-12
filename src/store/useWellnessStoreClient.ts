'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WellnessDataInput, WellnessStats } from '@/lib/types/wellness';
import type { StateSetFn } from '@/lib/types/store';

export interface WellnessState {
  todayData: WellnessDataInput | null;
  weeklyData: WellnessDataInput[];
  stats: WellnessStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTodayData: (data: WellnessDataInput | null) => void;
  setWeeklyData: (data: WellnessDataInput[]) => void;
  setStats: (stats: WellnessStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  fetchTodayData: () => Promise<void>;
  fetchWeeklyData: () => Promise<void>;
  submitWellnessData: (data: WellnessDataInput) => Promise<boolean>;
}

const storeCreator = (set: StateSetFn<WellnessState>): WellnessState => ({
      todayData: null,
      weeklyData: [],
      stats: null,
      isLoading: false,
      error: null,

      setTodayData: data => set({ todayData: data }),
      setWeeklyData: data => set({ weeklyData: data }),
      setStats: stats => set({ stats }),
      setLoading: loading => set({ isLoading: loading }),
      setError: error => set({ error }),

      fetchTodayData: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/wellness/data?limit=1');
          if (response.ok) {
            const data = await response.json();
            set({
              todayData: data.data?.items?.[0] || null,
              isLoading: false
            });
          } else {
            throw new Error('Failed to fetch wellness data');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false
          });
        }
      },

      fetchWeeklyData: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/wellness/data?limit=7');
          if (response.ok) {
            const data = await response.json();
            set({
              weeklyData: data.data?.items || [],
              stats: data.stats || null,
              isLoading: false
            });
          } else {
            throw new Error('Failed to fetch weekly data');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false
          });
        }
      },

      submitWellnessData: async (data: WellnessDataInput) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/wellness/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });

          if (response.ok) {
            const result = await response.json();
            set({
              todayData: result.data,
              isLoading: false
            });
            return true;
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit wellness data');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'An error occurred',
            isLoading: false
          });
          return false;
        }
      }
});

// Create store with persist
export const useWellnessStore = create<WellnessState>()(
  persist(
    storeCreator,
    {
      name: 'wellness-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        todayData: state.todayData,
        weeklyData: state.weeklyData,
        stats: state.stats
      })
    }
  )
);