import { useEffect, useState } from "react";
import { getPortfolio } from "../services/api";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import { motion } from "framer-motion";
import { Loader2, BellRing, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Nudges() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHoldings() {
      try {
        const res = await getPortfolio();
        setData(res);
      } catch (err) {
        console.error("Failed to fetch, using mock data for demo", err);
        setData({
          portfolio_summary: {
            health: "Weak",
            risk_level: "High",
            total_invested: 230071,
            total_value_live: 204832,
            total_pnl: -25239,
            win_rate: "20%",
            insight: "Majority of holdings are currently sitting at a loss but showing recovery signs. Keep an eye on Tata Steel support levels."
          },
          recommended_actions: [
             "Cut losses in deeply bearish stocks like Tata Steel to preserve capital if gap down occurs.",
             "Let your winners run. High confidence in Karnataka Bank breakout.",
             "Consider rebalancing portfolio to include more large-cap IT stocks like Infosys given current oversold conditions."
          ],
          portfolio_analysis: [
            { symbol: "Karnataka Bank", holding_context: { quantity: 100, avg_cost: 170.71, current_value: 23132, pnl_pct: 35.5, current_pnl: 6061 }, data: { portfolio_decision: "RIDE TREND", risk_tag: "LOW", urgency_score: "LOW", reasons: ["Confirmed breakout above resistance", "Volume profile is strongly bullish"] } },
            { symbol: "Tata Steel", holding_context: { quantity: 100, avg_cost: 250, current_value: 15000, pnl_pct: -40.0, current_pnl: -10000 }, data: { portfolio_decision: "CUT LOSSES", risk_tag: "HIGH", urgency_score: "HIGH", reasons: ["Bearish crossover on MACD", "Trading below 50 DMA"] } }
          ]
        });
      } finally {
        setLoading(false);
      }
    }
    fetchHoldings();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-info" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-text-bold">Your Nudges</h1>
        <p className="mt-2 text-text-muted">AI-driven actionable insights for your portfolio & assets.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 mt-12">
          {/* Individual Stock specific nudges mapped out */}
          <h2 className="text-2xl font-bold text-text-bold flex items-center gap-2 mb-6">
             Actionable Alerts <BellRing className="w-5 h-5 text-amber-500" />
          </h2>
          
          <div className="space-y-4">
             {data?.portfolio_analysis?.map((item: any, i: number) => {
               // Only show stocks that have specific nudges (urge action)
               const dec = item.data?.portfolio_decision || "WATCH";
               if (!dec.includes("CUT") && !dec.includes("RIDE") && !dec.includes("AVERAGE") && !dec.includes("BOOK")) return null;
               
               const isRed = dec.includes("CUT") || dec.includes("REDUCE");
               const badgeClr = isRed ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20";
               
               return (
                 <div key={i} className="bg-bg-surface border border-border-main p-6 rounded-xl shadow-sm hover:border-[#4b5563] transition-colors cursor-pointer group" onClick={() => navigate(`/stock/${item.symbol}`)}>
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <h3 className="text-xl font-bold text-text-bold flex items-center gap-2">
                            {item.symbol.replace('.NS','')}
                            <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                         </h3>
                         <p className="text-sm text-text-muted mt-1">Holding Value: <span className="font-medium text-[#f3f4f6]">₹{item.holding_context?.current_value.toLocaleString('en-IN')}</span></p>
                       </div>
                       <span className={`px-3 py-1.5 rounded text-xs font-bold border tracking-wider uppercase ${badgeClr}`}>
                         {dec}
                       </span>
                    </div>
                    <div className="border-t border-border-main border-dashed pt-4">
                      <ul className="space-y-3">
                        {item.data?.reasons?.map((r: string, idx: number) => (
                          <li key={idx} className="flex gap-3 text-sm text-text-muted">
                             <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                             {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* We keep the portfolio-level summary AI Intelligence Panel here */}
          <AIIntelligencePanel 
             data={{
               confidence_score: data?.portfolio_summary?.risk_level === 'Low' ? 80 : data?.portfolio_summary?.risk_level === 'High' ? 20 : 50,
               reasons: data?.recommended_actions || []
             }}
          />
        </div>
      </div>
    </motion.div>
  );
}
