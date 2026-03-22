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
  marketData: any | null;
  marketDataTime: number | null;
  addRecentView: (stock: Omit<RecentStock, 'viewedAt'>) => void;
  clearRecentViews: () => void;
  setMarketData: (data: any) => void;
  shouldRefreshMarketData: () => boolean;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      recentViews: [],
      marketData: null,
      marketDataTime: null,
      addRecentView: (stock) =>
        set((state) => {
          const filtered = state.recentViews.filter((s) => s.symbol !== stock.symbol);
          return {
            recentViews: [{ ...stock, viewedAt: Date.now() }, ...filtered].slice(0, 10),
          };
        }),
      clearRecentViews: () => set({ recentViews: [] }),
      setMarketData: (data) => set({ marketData: data, marketDataTime: Date.now() }),
      shouldRefreshMarketData: () => {
        const { marketData, marketDataTime } = get();
        if (!marketData || !marketDataTime) return true;
        return Date.now() - marketDataTime > 900000; // 15 minutes
      },
    }),
    { name: 'explore-storage' }
  )
);
