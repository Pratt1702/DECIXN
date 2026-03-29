import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DetailCache {
  [schemeCode: string]: {
    data: any;
    timestamp: number;
  };
}

interface MFDetailsState {
  cache: DetailCache;
  setDetails: (schemeCode: string, data: any) => void;
  getDetails: (schemeCode: string) => any | null;
  clearCache: () => void;
}

export const useMFDetailsStore = create<MFDetailsState>()(
  persist(
    (set, get) => ({
      cache: {},

      setDetails: (schemeCode, data) => set((state) => ({
        cache: {
          ...state.cache,
          [schemeCode]: {
            data,
            timestamp: Date.now()
          }
        }
      })),

      getDetails: (schemeCode) => {
        const item = get().cache[schemeCode];
        if (!item) return null;

        // Valid for 1 hour
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - item.timestamp > oneHour) return null;

        return item.data;
      },

      clearCache: () => set({ cache: {} })
    }),
    {
      name: 'mf-details-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
