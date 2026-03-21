import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentStock {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  viewedAt: number;
}

interface ExploreState {
  recentViews: RecentStock[];
  addRecentView: (stock: Omit<RecentStock, 'viewedAt'>) => void;
  clearRecentViews: () => void;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set) => ({
      recentViews: [],
      addRecentView: (stock) =>
        set((state) => {
          // Remove if it already exists to avoid duplicates
          const filtered = state.recentViews.filter((s) => s.symbol !== stock.symbol);
          // Insert at the beginning, keep max 10
          return {
            recentViews: [{ ...stock, viewedAt: Date.now() }, ...filtered].slice(0, 10),
          };
        }),
      clearRecentViews: () => set({ recentViews: [] }),
    }),
    { name: 'explore-storage' }
  )
);
