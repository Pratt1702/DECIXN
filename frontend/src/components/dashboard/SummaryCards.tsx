import { motion } from "framer-motion";

interface SummaryProps {
  invested: number;
  current: number;
  pnl: number;
}

export function SummaryCards({ invested, current, pnl }: SummaryProps) {
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isPositive = pnl >= 0;

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-7 rounded-[2rem] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Current Value</h3>
        <p className="text-2xl xl:text-3xl font-black text-white leading-none tracking-tighter">₹{current.toLocaleString('en-IN')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-7 rounded-[2rem] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Invested Value</h3>
        <p className="text-2xl xl:text-3xl font-black text-white leading-none tracking-tighter">₹{invested.toLocaleString('en-IN')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-7 rounded-[2rem] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Total Returns</h3>
        <p className={`text-2xl xl:text-3xl font-black leading-none tracking-tighter ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : '-'}₹{Math.abs(pnl).toLocaleString('en-IN')}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-7 rounded-[2rem] border-white/5 hover:border-white/10 transition-all group relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Overall Returns</h3>
        <p className={`text-2xl xl:text-3xl font-black leading-none tracking-tighter ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
        </p>
      </motion.div>
    </div>
  );
}
