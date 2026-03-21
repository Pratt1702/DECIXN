import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, Check, Loader2 } from "lucide-react";
import { searchStocks } from "../../services/api";
import { useWatchlistStore } from "../../store/useWatchlistStore";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistId: string | null;
}

export function AddStockModal({ isOpen, onClose, watchlistId }: AddStockModalProps) {
  const { toggleItemInWatchlist, items } = useWatchlistStore();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingToggle, setAddingToggle] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSuggestions([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!search.trim()) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchStocks(search);
        if (res.success) {
          setSuggestions(res.results.slice(0, 10));
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleToggle = async (symbol: string) => {
    if (!watchlistId) return;
    setAddingToggle(symbol);
    try {
      await toggleItemInWatchlist(watchlistId, symbol);
    } finally {
      setAddingToggle(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#121212] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[500px]"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <h3 className="text-base font-black text-[#f3f4f6]">
              Add Stocks to Watchlist
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-md text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/5 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-white/10 relative shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] transition-colors" />
            <input
              type="text"
              autoFocus
              placeholder="Search by company name or symbol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-[#f3f4f6] focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-[#9ca3af]/50"
            />
            {isSearching && (
              <Loader2 className="absolute right-7 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
            {suggestions.map((s, i) => {
              const symClean = s.symbol.replace('.NS', '').replace('.BO', '');
              const inList = items.some(item => item.watchlist_id === watchlistId && item.symbol === symClean);
              const isToggling = addingToggle === symClean;
              
              return (
                <div key={i} className="flex justify-between items-center px-4 py-3 hover:bg-white/5 rounded-lg border-b border-transparent hover:border-white/5 transition-all">
                  <div className="flex flex-col mr-4 flex-1 overflow-hidden">
                    <span className="font-semibold text-[#f3f4f6] truncate text-[14px]">
                      {s.name}
                    </span>
                    <span className="text-[11px] font-bold tracking-widest text-[#9ca3af] mt-0.5 uppercase">
                      {symClean}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(symClean)}
                    disabled={isToggling}
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${inList ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[#9ca3af] hover:text-white'}`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : inList ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
            
            {!isSearching && search.trim() && suggestions.length === 0 && (
              <div className="px-4 py-12 text-center flex flex-col items-center">
                <Search className="w-8 h-8 text-[#9ca3af]/30 mb-3" />
                <p className="text-sm font-bold text-[#9ca3af]">No stocks found for "{search}"</p>
                <p className="text-xs text-[#9ca3af]/70 mt-1">Try another symbol or company name.</p>
              </div>
            )}
            
            {!search.trim() && (
              <div className="px-4 py-16 text-center flex flex-col items-center">
                <Search className="w-8 h-8 text-[#9ca3af]/20 mb-3" />
                <p className="text-sm font-bold text-[#9ca3af]">Search to add stocks</p>
                <p className="text-xs font-medium text-[#9ca3af]/50 mt-1 max-w-xs">Look up your favorite companies by name or ticker to add them to your watchlist.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
