import { useEffect, useState, useCallback } from "react";
import { analyzeMFPortfolio } from "../services/api";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { CSVUpload } from "../components/dashboard/CSVUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, Plus } from "lucide-react";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import { useMFProfileStore } from "../store/useMFProfileStore";
import { MFProfileForm } from "../components/forms/MFProfileForm";
import { MFHoldingsTable } from "../components/dashboard/MFHoldingsTable";
import { AddMFHoldingModal } from "../components/dashboard/AddMFHoldingModal";

const SESSION_KEY = "uploaded_mf_holdings";

export function MFHoldings() {
  const [data, setData] = useState<any>(null);
  const {
    setData: setStoreData,
    shouldRefresh,
    data: cachedData,
    clearData,
  } = useMFPortfolioStore();
  const { profile } = useMFProfileStore();
  const [showProfileForm, setShowProfileForm] = useState(!profile.isComplete);
  const [loading, setLoading] = useState(true);
  const [isManual, setIsManual] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<any>(null);

  const loadData = useCallback(async () => {
    const sessionData = localStorage.getItem(SESSION_KEY);

    if (sessionData && sessionData !== "undefined") {
      try {
        const parsed = JSON.parse(sessionData);
        const currentHash = sessionData.length.toString() + (parsed[0]?.symbol || "");

        if (shouldRefresh(currentHash)) {
          console.log("Analysis expired, re-analyzing existing MF holdings...");
          handleDataParsed(parsed);
          return;
        }

        if (cachedData) {
          setData(cachedData);
          setIsManual(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Invalid session data:", err);
        localStorage.removeItem(SESSION_KEY);
      }
    }

    if (!shouldRefresh() && cachedData) {
      setData(cachedData);
      setIsManual(false);
      setLoading(false);
      return;
    }

    // Default: Mock data for MF if nothing uploaded
    const mockResult = {
        portfolio_summary: {
          health: "Strong",
          risk_level: "Medium",
          total_invested: 180000,
          total_value_live: 212750,
          total_pnl: 32750,
          win_rate: "100%",
          insight: "Pooled capital showing steady compounding.",
          working_capital_pct: 100,
          trapped_capital_pct: 0
        },
        portfolio_analysis: [
          {
            id: "mf-mock-1",
            scheme_name: "Quant Small Cap Fund - Direct Plan",
            holding_context: {
              quantity: 245.8,
              avg_cost: 203.41,
              current_price: 254.07,
              current_value: 62450,
              current_pnl: 12450,
              pnl_pct: 24.9,
            },
          },
          {
             id: "mf-mock-2",
             scheme_name: "Parag Parikh Flexi Cap Fund - Direct Plan",
             holding_context: {
               quantity: 1540.2,
               avg_cost: 64.92,
               current_price: 76.74,
               current_value: 118200,
               current_pnl: 18200,
               pnl_pct: 18.2,
             },
          }
        ],
      };
      
      setTimeout(() => {
        setData(mockResult);
        setStoreData(mockResult);
        setLoading(false);
      }, 500);

  }, [shouldRefresh, cachedData, setStoreData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [sortField, setSortField] = useState("current_value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedHoldings = data?.portfolio_analysis ? [...data.portfolio_analysis].sort((a, b) => {
    let valA, valB;
    if (sortField === "scheme_name") {
      valA = a.scheme_name || a.symbol || "";
      valB = b.scheme_name || b.symbol || "";
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (sortField === "isin") {
      valA = a.isin || a.holding_context?.isin || "";
      valB = b.isin || b.holding_context?.isin || "";
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = a.holding_context[sortField] ?? 0;
    valB = b.holding_context[sortField] ?? 0;
    return sortOrder === "desc" ? (valA < valB ? 1 : -1) : valA > valB ? 1 : -1;
  }) : [];

  const handleDataParsed = async (newHoldings: any[]) => {
    let interval: NodeJS.Timeout | null = null;
    try {
      setLoading(true);
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
          animatedCurrent += 2;
          setProgress({
            current: Math.min(animatedCurrent, animationTarget),
            total: animationTarget,
          });
          if (animatedCurrent >= animationTarget) {
            if (interval) clearInterval(interval);
            animationCompleteResolve();
          }
        }, 500);
      };

      startAnimation();

      const res = await analyzeMFPortfolio(newHoldings);
      await animationPromise;

      const currentHash = JSON.stringify(newHoldings).length.toString() + (newHoldings[0]?.symbol || "");
      localStorage.setItem(SESSION_KEY, JSON.stringify(newHoldings));

      setData(res);
      setStoreData(res, currentHash);
      setIsManual(true);
    } catch (err) {
      console.error("Failed to analyze MF portfolio", err);
      if (interval) clearInterval(interval);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const clearManualData = () => {
    localStorage.removeItem(SESSION_KEY);
    clearData();
    setData(null);
    setLoading(true);
    setTimeout(() => {
      loadData();
    }, 100);
  };

  const handleEdit = (holding: any) => {
    setEditingHolding(holding);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this fund?")) return;
    try {
      const existingData = localStorage.getItem(SESSION_KEY);
      if (existingData) {
        const holdings = JSON.parse(existingData);
        const filtered = holdings.filter((h: any) => h.id !== id && (h.isin !== id && h.scheme_name !== id));
        localStorage.setItem(SESSION_KEY, JSON.stringify(filtered));
        loadData();
      }
    } catch (err) {
      console.error("Local delete failed", err);
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" />
          <Loader2 className="w-12 h-12 animate-spin text-accent absolute top-0 left-0" style={{ animationDuration: "3s" }} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-text-bold text-lg font-black tracking-tighter uppercase italic">
            MF Engine Synchronizing
          </p>
          <p className="text-text-muted text-sm font-medium tracking-wide">
            {progress.total > 0
              ? `Scanning Scheme ${Math.floor(progress.current)} of ${progress.total}...`
              : "Fetching live NAV data..."}
          </p>
          {progress.total > 0 && (
            <div className="w-48 h-1 bg-white/5 rounded-full mx-auto mt-4 overflow-hidden">
                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
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
      <AnimatePresence>
        {showProfileForm && (
            <MFProfileForm onComplete={() => setShowProfileForm(false)} />
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-text-bold tracking-tighter">
              Mutual Funds
            </h1>
            {isManual ? (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">
                Live Upload
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.03] text-[9px] font-black text-text-muted uppercase tracking-widest border border-white/10">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm font-medium">
             Long-term wealth allocation & pooled asset oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
                Reset
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {data?.portfolio_summary && (
        <SummaryCards
          invested={data.portfolio_summary.total_invested}
          current={data.portfolio_summary.total_value_live}
          pnl={data.portfolio_summary.total_pnl}
          workingCapitalPct={data.portfolio_summary.working_capital_pct}
          trappedCapitalPct={data.portfolio_summary.trapped_capital_pct}
        />
      )}

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

        <MFHoldingsTable 
          holdings={sortedHoldings} 
          onSort={handleSort}
          sortField={sortField}
          sortOrder={sortOrder}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div className="flex justify-center pt-2">
          <button
            onClick={() => { setEditingHolding(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white/[0.03] text-text-bold hover:bg-white/[0.06] border border-white/10 transition-all font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg hover:border-accent/30"
          >
            <Plus className="w-4 h-4 text-accent" />
            Add Fund
          </button>
        </div>
      </div>

      <AddMFHoldingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        initialData={editingHolding}
      />
    </motion.div>
  );
}
