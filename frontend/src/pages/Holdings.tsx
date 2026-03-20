import { useEffect, useState, useCallback } from "react";
import { getPortfolio } from "../services/api";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { CSVUpload } from "../components/dashboard/CSVUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";

const SESSION_KEY = "uploaded_holdings";

export function Holdings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isManual, setIsManual] = useState(false);

  const calculateSummary = (holdings: any[]) => {
    const totalInvested = holdings.reduce(
      (acc, h) => acc + h.holding_context.quantity * h.holding_context.avg_cost,
      0,
    );
    const currentValue = holdings.reduce(
      (acc, h) => acc + h.holding_context.current_value,
      0,
    );
    const totalPnL = currentValue - totalInvested;
    const winRate =
      holdings.length > 0
        ? (
            (holdings.filter((h) => h.holding_context.current_pnl >= 0).length /
              holdings.length) *
            100
          ).toFixed(0) + "%"
        : "0%";

    return {
      total_invested: totalInvested,
      total_value_live: currentValue,
      total_pnl: totalPnL,
      win_rate: winRate,
      health: totalPnL >= 0 ? "Strong" : "Weak",
      risk_level: totalPnL < -10000 ? "High" : "Medium",
      insight:
        totalPnL < 0
          ? "Your portfolio is currently underperforming. Consider rebalancing or reviewing entry points."
          : "Portfolio is showing healthy momentum. Stay cautious on volatile sectors.",
    };
  };

  const loadData = useCallback(async () => {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setData({
        portfolio_analysis: parsed,
        portfolio_summary: calculateSummary(parsed),
      });
      setIsManual(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getPortfolio();
      setData(res);
      setIsManual(false);
    } catch (err) {
      console.error("Failed to fetch, using mock data for demo", err);
      const mockData = {
        portfolio_summary: {
          health: "Weak",
          risk_level: "High",
          total_invested: 230071,
          total_value_live: 204832,
          total_pnl: -25239,
          win_rate: "20%",
          insight: "Majority of holdings are currently sitting at a loss.",
        },
        portfolio_analysis: [
          {
            symbol: "Karnataka Bank",
            holding_context: {
              quantity: 100,
              avg_cost: 170.71,
              current_value: 23132,
              pnl_pct: 35.5,
              current_pnl: 6061,
            },
          },
          {
            symbol: "Coal India",
            holding_context: {
              quantity: 200,
              avg_cost: 450,
              current_value: 79000,
              pnl_pct: -12.22,
              current_pnl: -11000,
            },
          },
          {
            symbol: "Tata Steel",
            holding_context: {
              quantity: 100,
              avg_cost: 250,
              current_value: 15000,
              pnl_pct: -40.0,
              current_pnl: -10000,
            },
          },
        ],
      };
      setData(mockData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDataParsed = (newHoldings: any[]) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newHoldings));
    setData({
      portfolio_analysis: newHoldings,
      portfolio_summary: calculateSummary(newHoldings),
    });
    setIsManual(true);
  };

  const clearManualData = () => {
    sessionStorage.removeItem(SESSION_KEY);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10 max-w-6xl mx-auto pb-24"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tighter text-white">
              Portfolio
            </h1>
            {isManual && (
              <span className="px-3 py-1 rounded-full bg-accent text-[10px] font-black text-bg-main uppercase tracking-tighter shadow-[0_0_20px_rgba(80,255,167,0.3)]">
                Local Session
              </span>
            )}
          </div>
          <p className="text-text-muted text-base xl:text-lg font-medium">
            Intelligent capital management & risk oversight.
          </p>
        </div>

        <AnimatePresence>
          {isManual && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={clearManualData}
              className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/2 text-text-bold border border-white/10 hover:bg-white/5 hover:border-danger/30 transition-all font-bold text-sm"
            >
              <Trash2 className="w-4.5 h-4.5 text-danger" />
              Revert to Live Data
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <div className="space-y-10">
        {data?.portfolio_summary && (
          <div className="space-y-8">
            <SummaryCards
              invested={data.portfolio_summary.total_invested}
              current={data.portfolio_summary.total_value_live}
              pnl={data.portfolio_summary.total_pnl}
            />

            <AnimatePresence>
              {data?.portfolio_summary?.insight && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-3xl border border-accent/20 bg-accent/5 backdrop-blur-2xl relative overflow-hidden group shadow-xl"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32 group-hover:bg-accent/10 transition-all duration-700" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <h3 className="text-xs font-black text-accent uppercase tracking-tighter">
                      Market Intelligence
                    </h3>
                  </div>
                  <p className="text-lg text-text-bold leading-relaxed relative z-10 font-semibold italic">
                    "{data.portfolio_summary.insight}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.3em]">
                Capital Allocation
              </h3>
              <div className="text-[10px] text-text-muted italic opacity-50">
                Click items to analyze depth
              </div>
            </div>
            <CSVUpload onDataParsed={(holdings) => {
              handleDataParsed(holdings);
            }} />
          </div>

          {data?.portfolio_analysis && (
            <HoldingsTable holdings={data.portfolio_analysis} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
