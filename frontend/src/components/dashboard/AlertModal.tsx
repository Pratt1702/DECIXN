import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Bell, Info } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { createAlert } from "../../services/api";

interface Condition {
  indicator: string;
  operator: string;
  value: number;
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

const INDICATORS = [
  { id: "price", label: "Price", unit: "₹" },
  { id: "rsi", label: "RSI (14)", unit: "" },
  { id: "volume_ratio", label: "Volume Ratio", unit: "x" },
  { id: "macd", label: "MACD Line", unit: "" },
  { id: "macd_hist", label: "MACD Histogram", unit: "" },
  { id: "dist_ma20", label: "Price vs MA20", unit: "%" },
  { id: "dist_ma50", label: "Price vs MA50", unit: "%" }
];

const OPERATORS = [
  { id: ">", label: "Greater than" },
  { id: ">=", label: "Greater or equal" },
  { id: "<", label: "Less than" },
  { id: "<=", label: "Less or equal" },
  { id: "==", label: "Exactly equal" }
];

export function AlertModal({ isOpen, onClose, symbol }: AlertModalProps) {
  const { user } = useAuthStore();
  const [conditions, setConditions] = useState<Condition[]>([
    { indicator: "price", operator: ">", value: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addCondition = () => {
    setConditions([...conditions, { indicator: "rsi", operator: ">", value: 70 }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
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
      setError(err.response?.data?.detail || "Failed to save alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-bold tracking-tight">
                  Set Intelligent Alert
                </h3>
                <p className="text-xs text-text-muted mt-0.5 font-bold uppercase tracking-wider">
                  Target: <span className="text-accent">{symbol}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-bold hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-relaxed">
                Alerts will trigger only when <span className="text-text-bold font-bold">ALL</span> conditions listed below are simultaneously satisfied during the scan.
              </p>
            </div>

            <div className="space-y-4">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 group relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-widest text-text-muted">
                      Condition {idx + 1}
                    </span>
                    {conditions.length > 1 && (
                      <button 
                        onClick={() => removeCondition(idx)}
                        className="text-white/20 hover:text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={cond.indicator}
                      onChange={(e) => updateCondition(idx, "indicator", e.target.value)}
                      className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-text-bold focus:outline-none focus:border-accent/50 transition-all font-bold cursor-pointer"
                    >
                      {INDICATORS.map(i => <option key={i.id} value={i.id} className="cursor-pointer">{i.label}</option>)}
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, "operator", e.target.value)}
                      className="bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-text-bold focus:outline-none focus:border-accent/50 transition-all font-bold cursor-pointer"
                    >
                      {OPERATORS.map(o => <option key={o.id} value={o.id} className="cursor-pointer">{o.label}</option>)}
                    </select>

                    <div className="relative">
                      <input
                        type="number"
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, "value", parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-sm text-text-bold focus:outline-none focus:border-accent/50 transition-all font-black placeholder:text-white/10"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-black text-white/20 uppercase">
                        {INDICATORS.find(i => i.id === cond.indicator)?.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addCondition}
              className="w-full py-3 rounded-xl border border-dashed border-white/10 text-text-muted hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all text-sm font-black flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Add Filter Condition
            </button>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-white/[0.02]">
            {error && (
              <p className="text-danger text-xs font-bold mb-4 text-center">{error}</p>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-black text-text-muted hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-[2] py-3.5 rounded-xl bg-accent text-[#0a0a0a] text-sm font-black hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              >
                {loading ? "CONFIGURING..." : "ACTIVATE ALERT"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
