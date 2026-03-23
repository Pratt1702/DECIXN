import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { SummaryCards } from "../components/dashboard/SummaryCards";

const MOCK_MF_HOLDINGS = [
  {
    name: "Quant Small Cap Fund - Direct Plan - Growth",
    category: "Equity - Small Cap",
    invested: 50000,
    currentValue: 62450,
    pnl: 12450,
    pnlPct: 24.9,
    units: 245.8,
    lastNav: 254.07
  },
  {
    name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    category: "Equity - Flexi Cap",
    invested: 100000,
    currentValue: 118200,
    pnl: 18200,
    pnlPct: 18.2,
    units: 1540.2,
    lastNav: 76.74
  },
  {
    name: "HDFC Index S&P BSE Sensex Fund - Direct Plan - Growth",
    category: "Equity - Index fund",
    invested: 30000,
    currentValue: 32100,
    pnl: 2100,
    pnlPct: 7.0,
    units: 124.5,
    lastNav: 257.83
  }
];

export function MFHoldings() {
  const totalInvested = MOCK_MF_HOLDINGS.reduce((acc, h) => acc + h.invested, 0);
  const totalValue = MOCK_MF_HOLDINGS.reduce((acc, h) => acc + h.currentValue, 0);
  const totalPnL = totalValue - totalInvested;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
         <h1 className="text-3xl font-black text-text-bold tracking-tighter mb-2">
            Mutual Fund Investments
         </h1>
         <p className="text-text-muted text-sm font-medium">
            Track your pooled capital performance and SIP health.
         </p>
      </header>

      <SummaryCards 
        invested={totalInvested}
        current={totalValue}
        pnl={totalPnL}
        workingCapitalPct={85}
        trappedCapitalPct={15}
      />

      <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.03] bg-white/[0.02]">
              <th className="p-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Scheme Name</th>
              <th className="p-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Units</th>
              <th className="p-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">NAV</th>
              <th className="p-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Returns</th>
              <th className="p-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Current Value</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_MF_HOLDINGS.map((h, i) => (
              <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-all cursor-pointer group">
                <td className="p-4">
                  <div className="font-bold text-text-bold text-sm mb-1 group-hover:text-white transition-colors">
                    {h.name}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase font-black tracking-tighter">
                    {h.category}
                  </div>
                </td>
                <td className="p-4 text-right font-medium text-text-muted text-sm italic">
                  {h.units}
                </td>
                <td className="p-4 text-right font-bold text-text-bold text-sm">
                  ₹{h.lastNav}
                </td>
                <td className="p-4 text-right">
                   <div className={`flex items-center justify-end gap-1 font-bold text-sm ${h.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {h.pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      ₹{h.pnl.toLocaleString()}
                   </div>
                   <div className="text-[10px] font-black opacity-60">
                      {h.pnlPct}% Total
                   </div>
                </td>
                <td className="p-4 text-right">
                   <div className="font-black text-text-bold text-base">₹{h.currentValue.toLocaleString()}</div>
                   <div className="text-[10px] text-accent font-black uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
                      Details <ArrowRight size={10} />
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
