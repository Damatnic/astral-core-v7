'use client';

import type { WellnessDataInput, WellnessStats } from '@/lib/types/wellness';

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

// Dynamic import wrapper
let realStore: any = null;

export const useWellnessStore = () => {
  if (typeof window === 'undefined') {
    return dummyStore();
  }
  
  if (!realStore) {
    const { useWellnessStore: store } = require('./useWellnessStoreClient');
    realStore = store;
  }
  
  return realStore();
};