'use client';

import type { WellnessDataInput, WellnessStats } from '@/lib/types/wellness';
import type { WellnessState } from './useWellnessStoreClient';

// Dummy store for SSR
const dummyStore = () => ({
  todayData: null as WellnessDataInput | null,
  weeklyData: [] as WellnessDataInput[],
  stats: null as WellnessStats | null,
  isLoading: false,
  error: null as string | null,
  setTodayData: () => {},
  setWeeklyData: () => {},
  setStats: () => {},
  setLoading: () => {},
  setError: () => {},
  fetchTodayData: async () => {},
  fetchWeeklyData: async () => {},
  submitWellnessData: async () => false
});

// Dynamic import wrapper with proper typing
type WellnessStoreHook = () => WellnessState;
let realStore: WellnessStoreHook | null = null;

export const useWellnessStore = (): WellnessState => {
  if (typeof window === 'undefined') {
    return dummyStore();
  }
  
  if (!realStore) {
    const { useWellnessStore: store } = require('./useWellnessStoreClient') as { useWellnessStore: WellnessStoreHook };
    realStore = store;
  }
  
  return realStore();
};