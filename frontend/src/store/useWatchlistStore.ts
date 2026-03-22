import { create } from 'zustand';
import { supabase } from '../config/supabaseClient';

export interface Watchlist {
  id: string;
  name: string;
  created_at?: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at?: string;
}

interface WatchlistState {
  watchlists: Watchlist[];
  items: WatchlistItem[];
  loading: boolean;
  error: string | null;
  fetchWatchlists: (userId: string) => Promise<void>;
  createWatchlist: (userId: string, name: string) => Promise<Watchlist | null>;
  deleteWatchlist: (watchlistId: string) => Promise<boolean>;
  renameWatchlist: (watchlistId: string, newName: string) => Promise<boolean>;
  toggleItemInWatchlist: (watchlistId: string, symbol: string) => Promise<boolean>;
  removeItemsFromWatchlist: (watchlistId: string, symbols: string[]) => Promise<boolean>;
  getSymbolsInWatchlist: (watchlistId: string) => string[];
  isSymbolInAnyWatchlist: (symbol: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlists: [],
  items: [],
  loading: false,
  error: null,

  fetchWatchlists: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Fetch watchlists
      const { data: wlData, error: wlError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (wlError) throw wlError;

      // Fetch all items for these watchlists
      const watchlistIds = wlData?.map(w => w.id) || [];
      
      let itemsData: WatchlistItem[] = [];
      if (watchlistIds.length > 0) {
        const { data: iData, error: iError } = await supabase
          .from('watchlist_items')
          .select('*')
          .in('watchlist_id', watchlistIds);
        
        if (iError) throw iError;
        if (iData) itemsData = iData;
      }

      set({ watchlists: wlData || [], items: itemsData, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createWatchlist: async (userId: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .insert([{ user_id: userId, name }])
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({ 
        watchlists: [...state.watchlists, data],
        loading: false 
      }));
      return data;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  deleteWatchlist: async (watchlistId: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);

      if (error) throw error;

      set((state) => ({
        watchlists: state.watchlists.filter(w => w.id !== watchlistId),
        items: state.items.filter(i => i.watchlist_id !== watchlistId)
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  renameWatchlist: async (watchlistId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .update({ name: newName })
        .eq('id', watchlistId);

      if (error) throw error;

      set((state) => ({
        watchlists: state.watchlists.map(w => w.id === watchlistId ? { ...w, name: newName } : w)
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  toggleItemInWatchlist: async (watchlistId: string, symbol: string) => {
    try {
      const { items } = get();
      const cleanSymbol = symbol.trim().toUpperCase();
      const existingItem = items.find(
        i => i.watchlist_id === watchlistId && i.symbol === cleanSymbol
      );

      if (existingItem) {
        // Remove it
        const { error } = await supabase
          .from('watchlist_items')
          .delete()
          .eq('id', existingItem.id);

        if (error) throw error;

        set((state) => ({
          items: state.items.filter(i => i.id !== existingItem.id)
        }));
        return false; // Removed
      } else {
        // Add it
        const { data, error } = await supabase
          .from('watchlist_items')
          .insert([{ watchlist_id: watchlistId, symbol: cleanSymbol }])
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          items: [...state.items, data]
        }));
        return true; // Added
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  removeItemsFromWatchlist: async (watchlistId: string, symbols: string[]) => {
    if (symbols.length === 0) return true;
    
    try {
      const { error } = await supabase
        .from('watchlist_items')
        .delete()
        .eq('watchlist_id', watchlistId)
        .in('symbol', symbols);

      if (error) throw error;

      set((state) => ({
        items: state.items.filter(i => 
          !(i.watchlist_id === watchlistId && symbols.includes(i.symbol))
        )
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  getSymbolsInWatchlist: (watchlistId: string) => {
    return get().items
      .filter(i => i.watchlist_id === watchlistId)
      .map(i => i.symbol);
  },

  isSymbolInAnyWatchlist: (symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    return get().items.some(i => i.symbol === cleanSymbol);
  }
}));
