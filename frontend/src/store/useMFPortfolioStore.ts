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

export const useMFPortfolioStore = create<PortfolioState>()(
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
        
        // 1. If hash matches exactly, we are strictly in sync (even if empty)
        if (currentHash && currentHash === sourceHash) return false;

        if (!lastAnalysis || !data || !data.portfolio_analysis || data.portfolio_analysis.length === 0) {
          return true;
        }
        
        if (currentHash && currentHash !== sourceHash) return true;
        
        const fifteenMins = 15 * 60 * 1000;
        if (Date.now() - lastAnalysis > fifteenMins) return true;
        
        return false;
      }
    }),
    {
      name: 'mf-v6-portfolio-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
