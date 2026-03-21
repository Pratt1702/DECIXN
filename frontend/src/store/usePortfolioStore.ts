import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface PortfolioState {
  data: any | null;
  lastAnalysis: number | null; // Timestamp
  sourceHash: string | null;  // To detect CSV changes
  setData: (data: any, hash?: string) => void;
  clearData: () => void;
  shouldRefresh: (currentHash?: string) => boolean;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      data: null,
      lastAnalysis: null,
      sourceHash: null,
      
      setData: (data, hash) => set({ 
        data, 
        lastAnalysis: Date.now(),
        sourceHash: hash || null 
      }),
      
      clearData: () => set({ 
        data: null, 
        lastAnalysis: null, 
        sourceHash: null 
      }),
      
      shouldRefresh: (currentHash) => {
        const { lastAnalysis, sourceHash, data } = get();
        
        // 1. If no data or data is effectively empty, refresh
        if (!lastAnalysis || !data || !data.portfolio_analysis || data.portfolio_analysis.length === 0) {
          return true;
        }
        
        // 2. If source (CSV) changed, refresh
        if (currentHash && currentHash !== sourceHash) return true;
        
        // 3. If older than 15 mins (900,000 ms), refresh
        const fifteenMins = 15 * 60 * 1000;
        if (Date.now() - lastAnalysis > fifteenMins) return true;
        
        return false;
      }
    }),
    {
      name: 'portfolio-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
