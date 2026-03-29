import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ComparisonCache {
  [key: string]: {
    comparison: any;
    equityCurve: any;
    clones: any;
    regret: any;
    confidence: number;
    timestamp: number;
  };
}

interface MFCompareState {
  cache: ComparisonCache;
  setComparison: (ids: string[], data: any) => void;
  getComparison: (ids: string[]) => any | null;
  clearCache: () => void;
}

export const useMFCompareStore = create<MFCompareState>()(
  persist(
    (set, get) => ({
      cache: {},

      setComparison: (ids, data) => {
        const key = [...ids].sort().join(',');
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              ...data,
              timestamp: Date.now()
            }
          }
        }));
      },

      getComparison: (ids) => {
        const key = [...ids].sort().join(',');
        const item = get().cache[key];
        if (!item) return null;

        // Valid for 2 hours
        const twoHours = 2 * 60 * 60 * 1000;
        if (Date.now() - item.timestamp > twoHours) return null;

        return item;
      },

      clearCache: () => set({ cache: {} })
    }),
    {
      name: 'mf-compare-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
