import { motion } from "framer-motion";
import { Copy, History, AlertTriangle } from "lucide-react";

interface IntelligenceBannersProps {
  clones: any[];
  regret: any;
}

export function IntelligenceBanners({ clones, regret }: IntelligenceBannersProps) {
  if (clones.length === 0 && !regret) return null;

  return (
    <div className="space-y-4">
      {regret && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-danger/5 border border-danger/20 rounded-xl p-6 overflow-hidden group hover:bg-danger/[0.07] transition-all"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex gap-5 items-start">
              <div className="p-3.5 bg-danger/20 rounded-lg text-danger h-fit">
                <History size={20} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-danger uppercase tracking-widest">Opportunity Cost Identified</span>
                <h3 className="text-lg font-black text-text-bold tracking-tighter">
                  Regret Analysis: <span className="text-danger">₹{regret.opportunity_cost.toLocaleString()}</span> Gap
                </h3>
                <p className="text-sm font-medium text-text-muted mt-1 max-w-2xl">{regret.message}</p>
              </div>
            </div>
            <div className="px-5 py-2.5 bg-danger/10 border border-danger/20 rounded-lg">
               <span className="text-[9px] font-bold text-danger uppercase tracking-widest whitespace-nowrap">3Y Regret Delta</span>
            </div>
          </div>
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-danger opacity-[0.05] blur-3xl rounded-full" />
        </motion.div>
      )}

      {clones.map((clone, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 * idx }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 group hover:bg-amber-500/[0.07] transition-all"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex gap-5 items-start">
              <div className="p-3.5 bg-amber-500/20 rounded-lg text-amber-500 h-fit">
                <Copy size={20} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Clone Detection Signal</span>
                <h3 className="text-lg font-black text-text-bold tracking-tighter">
                   <span className="text-amber-500">{clone.similarity}% Similarity</span> Detected
                </h3>
                <p className="text-sm font-medium text-text-muted mt-1">
                   The strategy of <span className="text-text-bold">{clone.pair[0]}</span> and <span className="text-text-bold">{clone.pair[1]}</span> closely overlap. Consider consolidating to avoid redundant market risk.
                </p>
              </div>
            </div>
            <div className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
               <AlertTriangle size={16} className="text-amber-500" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
