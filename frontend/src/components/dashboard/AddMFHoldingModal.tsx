import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, Save } from "lucide-react";
import { searchMF, getMFDetails } from "../../services/api";
import { useMFPortfolioStore } from "../../store/useMFPortfolioStore";

interface AddMFHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function AddMFHoldingModal({ isOpen, onClose, onSuccess, initialData }: AddMFHoldingModalProps) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { data } = useMFPortfolioStore();

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSuggestions([]);
      setSelectedFund(null);
      setQuantity("");
      setAvgPrice("");
      return;
    }
    if (initialData) {
      const code = initialData.isin || initialData.scheme_code || initialData.scheme_name;
      setSelectedFund({ 
        scheme_code: code, 
        scheme_name: initialData.scheme_name 
      });
      setQuantity(initialData.holding_context?.quantity?.toString() || "");
      setAvgPrice(initialData.holding_context?.avg_cost?.toString() || "");
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!search.trim() || selectedFund) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchMF(search);
        // searchMF returns an array directly
        const results = res.results || (Array.isArray(res) ? res : []);
        if (Array.isArray(results)) {
          setSuggestions(results.slice(0, 5));
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
  }, [search, selectedFund]);

  const handleSave = async () => {
    if (!selectedFund || !quantity || !avgPrice) return;
    setIsSaving(true);
    try {
      const SESSION_KEY = "uploaded_mf_holdings";
      const existingData = localStorage.getItem(SESSION_KEY);
      
      // Promotion Logic: If no local data, but store has data (mock), use it as base
      let holdings: any[] = [];
      if (existingData) {
        holdings = JSON.parse(existingData);
      } else if (data?.portfolio_analysis) {
        holdings = [...data.portfolio_analysis];
      }

      const newHolding = {
        id: initialData?.id || crypto.randomUUID(),
        scheme_name: selectedFund.scheme_name,
        isin: selectedFund.isin_div_payout || 
              selectedFund.isin_reinvest || 
              selectedFund.isin || 
              selectedFund.scheme_code?.toString() || 
              selectedFund.scheme_name,
        holding_context: {
          quantity: parseFloat(quantity),
          avg_cost: parseFloat(avgPrice),
          isin: selectedFund.isin_div_payout || selectedFund.isin_reinvest || selectedFund.isin,
          current_value: initialData?.holding_context?.current_value || 0,
          pnl_pct: initialData?.holding_context?.pnl_pct || 0,
          current_pnl: initialData?.holding_context?.current_pnl || 0
        }
      };

      if (initialData) {
        // Edit mode - prefer ID matching, fallback to Name+ISIN only if ID is missing (legacy)
        holdings = holdings.map(h => {
          const isMatch = (h.id && h.id === initialData.id) || 
                          (!h.id && !initialData.id && h.isin === initialData.isin && h.scheme_name === initialData.scheme_name);
          return isMatch ? newHolding : h;
        });
      } else {
        // Add mode
        holdings.push(newHolding);
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(holdings));
      
      // Delay for UX
      await new Promise(r => setTimeout(r, 400));
      
      onSuccess();
      onClose();
    } catch (e) {
      console.error("Local save failed", e);
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
              {initialData ? 'Edit' : 'Add'} Mutual Fund
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-md text-[#9ca3af] hover:text-[#f3f4f6] hover:bg-white/5 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {!initialData && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Search Fund</label>
                {!selectedFund ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                    <input
                      type="text"
                      placeholder="e.g. Parag Parikh Flexi Cap..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm font-medium text-[#f3f4f6] focus:outline-none focus:border-accent/40 transition-all font-bold"
                    />
                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />}
                    
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[280px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                        {suggestions.map((s, i) => {
                          const isDirect = s.scheme_name.toLowerCase().includes('direct');
                          
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedFund(s)}
                              className="w-full px-4 py-3 text-left hover:bg-accent/10 flex flex-col gap-1 transition-all group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[12px] font-bold text-text-bold leading-tight group-hover:text-accent transition-colors">
                                  {s.scheme_name}
                                </span>
                                {isDirect && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black bg-success/20 text-success uppercase tracking-tighter border border-success/20">
                                    Direct
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-text-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                  {s.scheme_code}
                                </span>
                                {s.category && (
                                  <span className="text-[9px] text-text-muted font-medium opacity-60 italic">
                                    {s.category}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-accent italic tracking-tight">{selectedFund.scheme_name}</span>
                      <span className="text-[9px] text-text-muted font-mono">{selectedFund.scheme_code}</span>
                    </div>
                    <button onClick={() => setSelectedFund(null)} className="text-text-muted hover:text-danger p-1">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {initialData && (
               <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Fund Name</label>
                <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3">
                  <span className="text-[13px] font-black text-text-bold italic">{initialData.scheme_name}</span>
                </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Units Held</label>
                <input
                  type="number"
                  placeholder="0.000"
                  step="0.001"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2 text-sm font-bold text-[#f3f4f6] focus:outline-none focus:border-accent/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Avg Price (NAV)</label>
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
              disabled={!selectedFund || !quantity || !avgPrice || isSaving}
              className="w-full bg-accent text-white py-3.5 rounded-lg font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {initialData ? 'Update Fund Data' : 'Add to Portfolio'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
