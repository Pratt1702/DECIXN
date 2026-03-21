import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bookmark, Plus } from "lucide-react";
import { useWatchlistStore } from "../../store/useWatchlistStore";
import { useAuthStore } from "../../store/useAuthStore";

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

export function WatchlistModal({ isOpen, onClose, symbol }: WatchlistModalProps) {
  const { user } = useAuthStore();
  const { watchlists, items, loading, fetchWatchlists, createWatchlist, toggleItemInWatchlist } = useWatchlistStore();
  
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen && user && watchlists.length === 0 && !loading) {
      fetchWatchlists(user.id);
    }
  }, [isOpen, user, fetchWatchlists, watchlists.length, loading]);

  if (!isOpen) return null;

  const handleToggle = async (watchlistId: string) => {
    await toggleItemInWatchlist(watchlistId, symbol);
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim() || !user) return;
    setIsCreating(true);
    const newList = await createWatchlist(user.id, newListName.trim());
    if (newList) {
      await toggleItemInWatchlist(newList.id, symbol);
      setNewListName("");
    }
    setIsCreating(false);
  };

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
          className="relative w-full max-w-sm bg-[#121212] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <h3 className="text-base font-black text-[#f3f4f6]">
              Add <span className="text-accent">{symbol}</span> to
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2 scrollbar-none">
            {watchlists.map((list) => {
              const inList = items.some(i => i.watchlist_id === list.id && i.symbol === symbol.toUpperCase());
              const count = items.filter(i => i.watchlist_id === list.id).length;
              
              return (
                <button
                  key={list.id}
                  onClick={() => handleToggle(list.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-all text-left group"
                >
                  <div className="flex flex-row items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors border ${inList ? "bg-accent/10 border-accent/20" : "bg-white/5 border-white/5 group-hover:bg-white/10"}`}>
                       <Bookmark className={`w-4 h-4 ${inList ? "text-accent fill-accent" : "text-[#9ca3af]"}`} />
                    </div>
                    <span className={`text-sm font-bold ${inList ? "text-[#f3f4f6]" : "text-[#9ca3af] group-hover:text-[#f3f4f6]"}`}>
                      {list.name}
                    </span>
                  </div>
                  <span className="text-xs text-[#9ca3af] font-medium bg-white/5 px-2 py-0.5 rounded-full">
                    {count} items
                  </span>
                </button>
              );
            })}
            
            {watchlists.length === 0 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[#9ca3af] font-medium">No watchlists yet.</p>
                <p className="text-xs text-[#9ca3af]/70 mt-1">Create one to start saving stocks.</p>
              </div>
            )}
            
            {loading && (
              <div className="px-4 py-6 text-center">
                <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest animate-pulse">Loading...</span>
              </div>
            )}
          </div>

          {/* Footer Create Action */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Create new watchlist..."
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#f3f4f6] placeholder:text-[#9ca3af]/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAdd();
                }}
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={!newListName.trim() || isCreating}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Plus className="w-5 h-5 text-[#9ca3af] group-hover:text-accent transition-colors" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
