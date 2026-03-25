import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HoldingsTable } from "../components/dashboard/HoldingsTable";
import { getPortfolio, syncMutualFunds, analyzeCustomPortfolio } from "../services/api";
import { RefreshCw, CheckCircle2, AlertCircle, Trash2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MFUpload } from "../components/dashboard/MFUpload";

const SESSION_KEY = "mf_uploaded_holdings";

export function MFHoldings() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const navigate = useNavigate();

  const loadPortfolio = useCallback(async () => {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    
    if (sessionData && sessionData !== "undefined") {
      try {
        const parsed = JSON.parse(sessionData);
        if (Array.isArray(parsed)) {
          setPortfolio({
            portfolio_analysis: parsed,
            is_manual: true
          });
          setIsManual(true);
          setLoading(false);
          return;
        }
      } catch (e) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    setLoading(true);
    try {
      const res = await getPortfolio();
      setPortfolio(res);
      setIsManual(false);
    } catch (e) {
      console.error("Failed to load MF portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncMutualFunds();
      if (res.success) {
        setSyncStatus({ type: 'success', msg: `Successfully synced ${res.count} funds.` });
        sessionStorage.removeItem(SESSION_KEY); 
        await loadPortfolio();
      } else {
        setSyncStatus({ type: 'error', msg: 'Sync failed. Check file format.' });
      }
    } catch (e) {
      setSyncStatus({ type: 'error', msg: 'Sync server error.' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleDataParsed = async (holdings: any[]) => {
    localStorage.removeItem("decixn_portfolio"); // Clear old stale cache
    setLoading(true);
    try {
      const res = await analyzeCustomPortfolio(holdings);
      const enriched = res.portfolio_analysis.map((h: any) => ({ ...h, asset_type: "MUTUAL_FUND" }));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(enriched));
      setPortfolio({ ...res, portfolio_analysis: enriched });
      setIsManual(true);
    } catch (e) {
      console.error("Failed to analyze uploaded portfolio", e);
    } finally {
      setLoading(false);
    }
  };

  const clearManualData = () => {
    sessionStorage.removeItem(SESSION_KEY);
    loadPortfolio();
  };

  if (loading && !portfolio) return (
    <div className="flex items-center justify-center py-40">
      <div className="h-10 w-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const mfHoldings = portfolio?.portfolio_analysis?.filter((h: any) => h.asset_type === "MUTUAL_FUND" || h.symbol.length >= 10) || [];
  
  const totalInvested = mfHoldings.reduce((acc: number, h: any) => acc + (h.holding_context.invested_value || (h.holding_context.quantity * h.holding_context.avg_cost)), 0);
  const totalValue = mfHoldings.reduce((acc: number, h: any) => acc + h.holding_context.current_value, 0);
  const totalPnL = totalValue - totalInvested;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto pb-20 pt-8 space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-text-bold tracking-tighter">
              Mutual Fund Portfolio
            </h1>
            {isManual ? (
              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">
                Local Session
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.03] text-[9px] font-black text-text-muted uppercase tracking-widest border border-white/10">
                Verified Mode
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm font-medium">
             Strategic monitoring and wealth compounding oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/mutual-funds/insights")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 cursor-pointer transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            Analyze Portfolio
          </button>
          
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-muted hover:text-accent hover:bg-white/10 transition-all group"
            title="Sync Kite Excel"
          >
             <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
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
                Revert
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {syncStatus && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`flex items-center gap-3 p-4 rounded-2xl border ${syncStatus.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}
        >
          {syncStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold">{syncStatus.msg}</span>
        </motion.div>
      )}

      <SummaryCards 
        invested={totalInvested}
        current={totalValue}
        pnl={totalPnL}
      />

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black text-text-bold tracking-tighter">
            Fund Holdings
          </h2>
          <MFUpload 
            isManual={isManual}
            onDataParsed={handleDataParsed}
          />
        </div>

        {mfHoldings.length > 0 ? (
          <HoldingsTable holdings={mfHoldings} />
        ) : (
          <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
             <p className="text-text-muted font-medium mb-4 italic">No active holdings detected in your portfolio.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
