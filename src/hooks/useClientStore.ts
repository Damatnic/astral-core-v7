'use client';

import { useEffect, useState } from 'react';

export function useClientStore<T>(storeName: 'wellness' | 'auth'): T | null {
  const [store, setStore] = useState<T | null>(null);

  useEffect(() => {
    const loadStore = async () => {
      if (storeName === 'wellness') {
        const { useWellnessStore } = await import('@/store/useWellnessStoreClient');
        setStore(useWellnessStore as any);
      } else if (storeName === 'auth') {
        const { useAuthStore } = await import('@/store/useAuthStoreClient');
        setStore(useAuthStore as any);
      }
    };
    
    loadStore();
  }, [storeName]);

  return store;
}