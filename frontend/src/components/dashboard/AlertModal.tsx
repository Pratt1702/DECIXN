import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Bell, Info } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { createAlert } from "../../services/api";

interface Condition {
  indicator: string;
  operator: string;
  value: string | number;
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

const INDICATORS = [
  { id: "price", label: "Price", unit: "₹", type: "numeric" },
  { id: "rsi", label: "RSI (14)", unit: "", type: "numeric" },
  { id: "volume_ratio", label: "Volume Ratio", unit: "x", type: "numeric" },
  { id: "trend", label: "Trend", unit: "", type: "string" },
  { id: "signal", label: "Signal (Buy/Sell)", unit: "", type: "string" },
  { id: "pattern", label: "Pattern", unit: "", type: "string" },
  { id: "macd", label: "MACD Line", unit: "", type: "numeric" },
  { id: "dist_ma20", label: "Price vs MA20", unit: "%", type: "numeric" },
  { id: "dist_ma50", label: "Price vs MA50", unit: "%", type: "numeric" }
];

const OPERATORS = [
  { id: ">", label: "Greater than", types: ["numeric"] },
  { id: ">=", label: "Greater or equal", types: ["numeric"] },
  { id: "<", label: "Less than", types: ["numeric"] },
  { id: "<=", label: "Less or equal", types: ["numeric"] },
  { id: "==", label: "Equals (==)", types: ["numeric", "string"] },
  { id: "!=", label: "Not Equals (!=)", types: ["numeric", "string"] },
];

const STRING_VALUES: Record<string, string[]> = {
  trend: ["Bullish", "Bearish", "Neutral"],
  signal: ["Buy", "Sell", "Hold"],
  pattern: [
    "High-Conviction Breakout",
    "Mean Reversion (Oversold)",
    "Bullish Pullback (Entry Zone)",
    "Overextended (Risk Zone)",
    "Momentum Reversal",
    "None Detected"
  ]
};

export function AlertModal({ isOpen, onClose, symbol }: AlertModalProps) {
  const { user } = useAuthStore();
  const [conditions, setConditions] = useState<Condition[]>([
    { indicator: "price", operator: ">", value: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addCondition = () => {
    setConditions([...conditions, { indicator: "price", operator: ">", value: "" }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    
    // If indicator changed, reset operator and value if incompatible
    if (field === "indicator") {
      const indicator = INDICATORS.find(i => i.id === value);
      const isNumeric = indicator?.type === "numeric";
      if (!isNumeric) {
        if (!["==", "!="].includes(newConditions[index].operator)) {
          newConditions[index].operator = "==";
        }
        // Set default value for the dropdown if not already set to a valid option
        const validValues = STRING_VALUES[value as keyof typeof STRING_VALUES] || [];
        if (!validValues.includes(newConditions[index].value as string)) {
          newConditions[index].value = validValues[0] || "";
        }
      } else if (typeof newConditions[index].value === "string" && newConditions[index].value !== "") {
        newConditions[index].value = ""; // Reset string value if switched to numeric
      }
    }
    
    setConditions(newConditions);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await createAlert({
        user_id: user.id,
        symbol: symbol.toUpperCase().replace(".NS", "").replace(".BO", ""),
        condition: conditions
      });
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(`${detail[0]?.loc[detail[0]?.loc.length - 1]}: ${detail[0]?.msg}`);
      } else {
        setError(typeof detail === 'string' ? detail : "Failed to save alert");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="pointer-events-auto relative w-full max-w-md bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_128px_-32px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.05] cursor-move active:cursor-grabbing group/header">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-accent/20 border border-accent/30 group-hover/header:scale-110 transition-transform">
                <Bell className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-black text-text-bold tracking-tight flex items-center gap-2">
                  Monitor <span className="text-white/20">/</span> {symbol}
                </h3>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
                  Intelligence Unit <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-bold hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 flex gap-2.5">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-muted leading-relaxed">
                Logic triggers only when <span className="text-text-bold font-bold uppercase">ALL</span> conditions are simultaneously satisfied.
              </p>
            </div>

            <div className="space-y-3">
              {conditions.map((cond, idx) => {
                const indicator = INDICATORS.find(i => i.id === cond.indicator);
                const isNumeric = indicator?.type === "numeric";
                const stringOptions = STRING_VALUES[cond.indicator as keyof typeof STRING_VALUES];

                return (
                  <div key={idx} className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 group relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-black tracking-widest text-text-muted/60">
                        Logic Layer {idx + 1}
                      </span>
                      {conditions.length > 1 && (
                        <button 
                          onClick={() => removeCondition(idx)}
                          className="text-white/10 hover:text-danger hover:bg-danger/10 p-1 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      <select
                        value={cond.indicator}
                        onChange={(e) => updateCondition(idx, "indicator", e.target.value)}
                        className="bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-text-bold focus:outline-none focus:border-accent/50 transition-all font-bold cursor-pointer"
                      >
                        {INDICATORS.map(i => <option key={i.id} value={i.id} className="cursor-pointer">{i.label}</option>)}
                      </select>

                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, "operator", e.target.value)}
                        className="bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-text-bold focus:outline-none focus:border-accent/50 transition-all font-bold cursor-pointer"
                      >
                        {OPERATORS.filter(o => o.types.includes(indicator?.type || "numeric")).map(o => (
                          <option key={o.id} value={o.id} className="cursor-pointer">{o.label}</option>
                        ))}
                      </select>

                      <div className="relative">
                        {isNumeric ? (
                          <input
                            type="number"
                            value={cond.value}
                            onChange={(e) => updateCondition(idx, "value", e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-text-bold focus:outline-none focus:border-accent/50 transition-all font-black placeholder:text-white/10"
                            placeholder="Val..."
                          />
                        ) : (
                          <select
                            value={cond.value}
                            onChange={(e) => updateCondition(idx, "value", e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-text-bold focus:outline-none focus:border-accent/50 transition-all font-black cursor-pointer"
                          >
                            {stringOptions?.map(val => <option key={val} value={val}>{val}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={addCondition}
              className="w-full py-2.5 rounded-xl border border-dashed border-white/10 text-text-muted hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all text-xs font-black flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Add Filter Layer
            </button>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/5 bg-white/[0.02]">
            {error && (
              <p className="text-danger text-[10px] font-bold mb-3 text-center uppercase tracking-wider">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-black text-text-muted hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-[2] py-2.5 rounded-xl bg-accent text-[#0a0a0a] text-xs font-black hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              >
                {loading ? "DEPLOYING..." : "ACTIVATE"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
