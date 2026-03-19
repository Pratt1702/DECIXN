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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-xl border border-border-main bg-bg-surface p-6 shadow-sm">
        <h3 className="text-sm font-medium text-text-muted">Current Value</h3>
        <p className="mt-2 text-3xl font-bold tracking-tight text-text-bold">₹{current.toLocaleString('en-IN')}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-xl border border-border-main bg-bg-surface p-6 shadow-sm">
        <h3 className="text-sm font-medium text-text-muted">Invested Value</h3>
        <p className="mt-2 text-3xl font-bold tracking-tight text-text-bold">₹{invested.toLocaleString('en-IN')}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="rounded-xl border border-border-main bg-bg-surface p-6 shadow-sm">
        <h3 className="text-sm font-medium text-text-muted">Total Returns</h3>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositive ? '+' : '-'}₹{Math.abs(pnl).toLocaleString('en-IN')}
        </p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="rounded-xl border border-border-main bg-bg-surface p-6 shadow-sm">
        <h3 className="text-sm font-medium text-text-muted">Returns (%)</h3>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositive ? '+' : ''}{pnlPct.toFixed(2)}%
        </p>
      </motion.div>
    </div>
  );
}
