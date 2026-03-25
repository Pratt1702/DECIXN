import { useEffect, useState, useCallback } from "react";
import { getPortfolio, analyzeCustomPortfolio } from "../services/api";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { CSVUpload } from "../components/dashboard/CSVUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { usePortfolioStore } from "../store/usePortfolioStore";

const SESSION_KEY = "uploaded_holdings";

export function Holdings() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const {
    setData: setStoreData,
    shouldRefresh,
    data: cachedData,
    clearData,
  } = usePortfolioStore();
  const [loading, setLoading] = useState(true);
  const [isManual, setIsManual] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

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
      (acc, h) =>
        acc +
        (h.data?.trend === "Bullish" ? h.holding_context.current_value : 0),
      0,
    );
    const trappedCapital = holdings.reduce(
      (acc, h) =>
        acc +
        (h.data?.trend === "Bearish" ? h.holding_context.current_value : 0),
      0,
    );
    const workingCapitalPct =
      currentValue > 0 ? (workingCapital / currentValue) * 100 : 0;
    const trappedCapitalPct =
      currentValue > 0 ? (trappedCapital / currentValue) * 100 : 0;

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

    // Priority 1: Uploaded session data (Current CSV)
    if (sessionData && sessionData !== "undefined") {
      try {
        const parsed = JSON.parse(sessionData);
        // Create a simple hash/identifier for this CSV session
        const currentHash =
          sessionData.length.toString() + (parsed[0]?.symbol || "");

        // If store has valid, non-expired data for THIS CSV, use it
        if (!shouldRefresh(currentHash) && cachedData) {
          setData(cachedData);
          setIsManual(true);
          setLoading(false);
          return;
        }

        if (Array.isArray(parsed)) {
          const sessionSummary = sessionStorage.getItem("portfolio_summary");
          const summaryParsed =
            sessionSummary && sessionSummary !== "undefined"
              ? JSON.parse(sessionSummary)
              : calculateSummary(parsed);

          const result = {
            portfolio_analysis: parsed,
            portfolio_summary: summaryParsed,
          };
          setData(result);
          setStoreData(result, currentHash);
          setIsManual(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Invalid session data, falling back to API:", err);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    // Priority 2: Standard API/Mock data
    if (!shouldRefresh() && cachedData) {
      setData(cachedData);
      setIsManual(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getPortfolio();
      setData(res);
      setStoreData(res);
      setIsManual(false);
    } catch (err) {
      console.error("Failed to fetch, using mock data for demo", err);
      const mockResult = {
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
      setData(mockResult);
      setStoreData(mockResult);
    } finally {
      setLoading(false);
    }
  }, [shouldRefresh, cachedData, setStoreData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDataParsed = async (newHoldings: any[]) => {
    localStorage.removeItem("decixn_portfolio"); // Clear old stale cache
    let interval: NodeJS.Timeout | null = null;
    try {
      setLoading(true);

      // Setup Animation Synchronization
      let animatedCurrent = 0;
      const animationTarget = newHoldings.length;
      let animationCompleteResolve: () => void;
      const animationPromise = new Promise<void>((resolve) => {
        animationCompleteResolve = resolve;
      });

      setProgress({ current: 0, total: animationTarget });

      const startAnimation = () => {
        if (animationTarget === 0) {
          animationCompleteResolve();
          return;
        }
        interval = setInterval(() => {
          animatedCurrent += 5;
          setProgress({
            current: Math.min(animatedCurrent, animationTarget),
            total: animationTarget,
          });
          if (animatedCurrent >= animationTarget) {
            if (interval) clearInterval(interval);
            animationCompleteResolve();
          }
        }, 1000);
      };

      startAnimation();

      const dataPromise = analyzeCustomPortfolio(newHoldings);

      // WAIT FOR BOTH: API and Animation
      const [res] = await Promise.all([dataPromise, animationPromise]);

      const currentHash =
        JSON.stringify(newHoldings).length.toString() +
        (newHoldings[0]?.symbol || "");
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(res.portfolio_analysis),
      );
      sessionStorage.setItem(
        "portfolio_summary",
        JSON.stringify(res.portfolio_summary),
      );

      setData(res);
      setStoreData(res, currentHash);
      setIsManual(true);
    } catch (err) {
      console.error("Failed to fetch custom portfolio analysis", err);
      if (interval) clearInterval(interval);
      // Fallback to local calculation if backend fails
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newHoldings));
      const fallback = {
        portfolio_analysis: newHoldings,
        portfolio_summary: calculateSummary(newHoldings),
      };
      setData(fallback);
      setIsManual(true);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const clearManualData = () => {
    // 1. Clear session data
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("portfolio_summary");

    // 2. Clear Zustand store (persistent)
    clearData();

    // 3. Clear API cache specifically
    localStorage.removeItem("decixn_portfolio");
    localStorage.removeItem("decixn_portfolio_time");

    // 4. Force a fresh data load
    setData(null);
    setLoading(true);
    setTimeout(() => {
      loadData();
    }, 100);
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" />
          <Loader2
            className="w-12 h-12 animate-spin text-accent absolute top-0 left-0"
            style={{ animationDuration: "3s" }}
          />
        </div>
        <div className="text-center space-y-2">
          <p className="text-text-bold text-lg font-black tracking-tighter uppercase italic">
            AI Engine Synchronizing
          </p>
          <p className="text-text-muted text-sm font-medium tracking-wide">
            {progress.total > 0
              ? `Processing Asset ${Math.floor(progress.current)} of ${progress.total}...`
              : "Fetching live market intelligence..."}
          </p>
          {progress.total > 0 && (
            <div className="w-48 h-1 bg-white/5 rounded-full mx-auto mt-4 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
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
            {isManual ? (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">
                Local Session
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.03] text-[9px] font-black text-text-muted uppercase tracking-widest border border-white/10">
                Test Mode
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm font-medium">
            Intelligent capital management & risk oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/insights", { state: { analyze: true } })}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent/75 text-white hover:bg-accent/90 cursor-pointer transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Analyze Portfolio
          </button>
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
        </div>
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
          {/* <AnimatePresence>
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
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => navigate("/insights", { state: { analyze: true } })}
                    className="text-[10px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2 group"
                  >
                    View Full Intelligence Report
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      →
                    </motion.span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence> */}
        </div>
      )}

      {/* ── HOLDINGS TABLE ── */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-text-bold tracking-tighter">
            Holdings
          </h2>
          <CSVUpload
            isManual={isManual}
            onDataParsed={(holdings) => {
              handleDataParsed(holdings);
            }}
          />
        </div>

        {data?.portfolio_analysis && (
          <HoldingsTable holdings={data.portfolio_analysis} />
        )}
      </div>
    </motion.div>
  );
}
