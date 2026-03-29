import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface InsightsState {
  insights: any | null;
  lastAnalysis: number | null;
  sourceHash: string | null;
  setInsights: (insights: any, hash: string) => void;
  clearInsights: () => void;
  getValidInsights: (currentHash: string) => any | null;
}

export const useMFInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      insights: null,
      lastAnalysis: null,
      sourceHash: null,
      
      setInsights: (insights, hash) => set({ 
        insights, 
        lastAnalysis: Date.now(),
        sourceHash: hash 
      }),
      
      clearInsights: () => set({ 
        insights: null, 
        lastAnalysis: null, 
        sourceHash: null 
      }),
      
      getValidInsights: (currentHash) => {
        const { insights, lastAnalysis, sourceHash } = get();
        if (!insights || !lastAnalysis || sourceHash !== currentHash) return null;
        
        // Cache valid for 30 mins
        const thirtyMins = 30 * 60 * 1000;
        if (Date.now() - lastAnalysis > thirtyMins) return null;
        
        return insights;
      }
    }),
    {
      name: 'mf-insights-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
