import { useEffect, useState, useCallback } from "react";
import { getPortfolio, analyzeCustomPortfolio } from "../services/api";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { CSVUpload } from "../components/dashboard/CSVUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, BarChart3 } from "lucide-react";

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

    const workingCapital = holdings.reduce(
      (acc, h) => acc + (h.data?.trend === "Bullish" ? h.holding_context.current_value : 0),
      0,
    );
    const trappedCapital = holdings.reduce(
      (acc, h) => acc + (h.data?.trend === "Bearish" ? h.holding_context.current_value : 0),
      0,
    );
    const workingCapitalPct = currentValue > 0 ? (workingCapital / currentValue) * 100 : 0;
    const trappedCapitalPct = currentValue > 0 ? (trappedCapital / currentValue) * 100 : 0;

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
      working_capital_pct: Math.round(workingCapitalPct),
      trapped_capital_pct: Math.round(trappedCapitalPct),
    };
  };

  const loadData = useCallback(async () => {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    
    // Check for both null AND the literal string "undefined" which can sometimes happen
    if (sessionData && sessionData !== "undefined") {
      try {
        const parsed = JSON.parse(sessionData);
        if (Array.isArray(parsed)) {
          const sessionSummary = sessionStorage.getItem("portfolio_summary");
          const summaryParsed = (sessionSummary && sessionSummary !== "undefined") 
            ? JSON.parse(sessionSummary) 
            : calculateSummary(parsed);

          setData({
            portfolio_analysis: parsed,
            portfolio_summary: summaryParsed,
          });
          setIsManual(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Invalid session data, falling back to API:", err);
        sessionStorage.removeItem(SESSION_KEY);
      }
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

  const handleDataParsed = async (newHoldings: any[]) => {
    try {
      setLoading(true);
      const res = await analyzeCustomPortfolio(newHoldings);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.portfolio_analysis));
      // Store summary as well if necessary, but recalculating on loadData from session is what happens currently.
      // Actually, wait, when loadData runs, it uses calculateSummary(parsed) instead of the backend's summary!
      // I should store the entire response or at least the backend's summary.
      sessionStorage.setItem("portfolio_summary", JSON.stringify(res.portfolio_summary));
      setData(res);
      setIsManual(true);
    } catch (err) {
      console.error("Failed to fetch custom portfolio analysis", err);
      // Fallback to local calculation if backend fails
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newHoldings));
      setData({
        portfolio_analysis: newHoldings,
        portfolio_summary: calculateSummary(newHoldings),
      });
      setIsManual(true);
    } finally {
      setLoading(false);
    }
  };

  const clearManualData = () => {
    sessionStorage.removeItem(SESSION_KEY);
    loadData();
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col justify-center items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-text-muted text-sm font-medium tracking-wide">
          Loading portfolio data…
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto pb-20 pt-8 space-y-8"
    >
      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-text-bold tracking-tighter">
              Portfolio
            </h1>
            {isManual && (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">
                Local Session
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm font-medium">
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bg-surface text-text-bold border border-border-main hover:border-danger/30 transition-all font-bold text-sm"
            >
              <Trash2 className="w-4 h-4 text-danger" />
              Revert to Test Data
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      {/* ── SUMMARY CARDS ── */}
      {data?.portfolio_summary && (
        <div className="space-y-6">
          <SummaryCards
            invested={data.portfolio_summary.total_invested}
            current={data.portfolio_summary.total_value_live}
            pnl={data.portfolio_summary.total_pnl}
            workingCapitalPct={data.portfolio_summary.working_capital_pct}
            trappedCapitalPct={data.portfolio_summary.trapped_capital_pct}
          />

          {/* AI Insight Banner */}
          <AnimatePresence>
            {data?.portfolio_summary?.insight && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-surface border border-border-main rounded-xl p-5"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 size={13} className="text-accent" />
                  <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
                    Market Intelligence
                  </span>
                </div>
                <p className="text-[13px] text-text-muted font-medium leading-relaxed">
                  {data.portfolio_summary.insight}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── HOLDINGS TABLE ── */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-text-bold tracking-tighter">
            Holdings
          </h2>
          <CSVUpload onDataParsed={(holdings) => {
            handleDataParsed(holdings);
          }} />
        </div>

        {data?.portfolio_analysis && (
          <HoldingsTable holdings={data.portfolio_analysis} />
        )}
      </div>
    </motion.div>
  );
}
