import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Save } from "lucide-react";
import { searchStocks, upsertHolding } from "../../services/api";

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  initialData?: any; // For editing
}

export function AddHoldingModal({ isOpen, onClose, onSuccess, userId, initialData }: AddHoldingModalProps) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSuggestions([]);
      setSelectedStock(null);
      setQuantity("");
      setAvgPrice("");
      return;
    }
    if (initialData) {
      setSelectedStock({ symbol: initialData.symbol, name: initialData.symbol });
      setQuantity(initialData.holding_context.quantity.toString());
      setAvgPrice(initialData.holding_context.avg_cost.toString());
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!search.trim() || selectedStock) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchStocks(search);
        if (res.success) {
          setSuggestions(res.results.slice(0, 5));
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
  }, [search, selectedStock]);

  const handleSave = async () => {
    if (!selectedStock || !quantity || !avgPrice) return;
    setIsSaving(true);
    try {
      await upsertHolding({
        user_id: userId,
        symbol: selectedStock.symbol,
        asset_type: 'stock',
        quantity: parseFloat(quantity),
        avg_cost: parseFloat(avgPrice)
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setIsSaving(false);
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
          className="relative w-full max-w-md bg-[#121212] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <h3 className="text-base font-black text-[#f3f4f6] uppercase tracking-tighter italic">
              {initialData ? 'Edit' : 'Add'} Stock Holding
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-md text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/5 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Search/Stock Selection */}
            {!initialData && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Select Asset</label>
                {!selectedStock ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                    <input
                      type="text"
                      placeholder="Search symbol (e.g. RELIANCE)..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm font-medium text-[#f3f4f6] focus:outline-none focus:border-accent/40 transition-all"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />}
                    
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl z-10 overflow-hidden divide-y divide-white/5">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedStock(s)}
                            className="w-full px-4 py-2.5 text-left hover:bg-white/5 flex flex-col transition-colors"
                          >
                            <span className="text-sm font-bold text-text-bold">{s.symbol.replace('.NS', '')}</span>
                            <span className="text-[10px] text-text-muted truncate">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-lg px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-accent">{selectedStock.symbol.replace('.NS', '')}</span>
                      <span className="text-[10px] text-text-muted truncate max-w-[200px]">{selectedStock.name}</span>
                    </div>
                    <button onClick={() => setSelectedStock(null)} className="text-text-muted hover:text-danger p-1">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {initialData && (
               <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Asset</label>
                <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2">
                  <span className="text-sm font-black text-text-bold">{initialData.symbol}</span>
                </div>
               </div>
            )}

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Quantity</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm font-bold text-[#f3f4f6] focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Avg Buy Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={avgPrice}
                    onChange={e => setAvgPrice(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-7 pr-4 py-2 text-sm font-bold text-[#f3f4f6] focus:outline-none focus:border-accent/40"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!selectedStock || !quantity || !avgPrice || isSaving}
              className="w-full bg-accent text-white py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-accent/10 hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {initialData ? 'Update Holding' : 'Save To Portfolio'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
