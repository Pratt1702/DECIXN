import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { getPortfolio } from "../services/api";

export function MFHoldings() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await getPortfolio();
        setPortfolio(res);
      } catch (e) {
        console.error("Failed to load MF portfolio");
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const mfHoldings = portfolio?.portfolio_analysis?.filter((h: any) => h.symbol.length >= 10) || [];
  
  const totalInvested = mfHoldings.reduce((acc: number, h: any) => acc + h.holding_context.invested_value, 0);
  const totalValue = mfHoldings.reduce((acc: number, h: any) => acc + h.holding_context.current_value, 0);
  const totalPnL = totalValue - totalInvested;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
         <h1 className="text-3xl font-black text-text-bold tracking-tighter mb-2 uppercase">
            Mutual Fund Portfolio
         </h1>
         <p className="text-text-muted text-sm font-medium">
            Strategic monitoring of long-term capital allocation.
         </p>
      </header>

      <SummaryCards 
        invested={totalInvested}
        current={totalValue}
        pnl={totalPnL}
        workingCapitalPct={85}
        trappedCapitalPct={15}
      />

      <HoldingsTable holdings={mfHoldings} />
    </motion.div>
  );
}
