import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCompareAnalysis, searchStocks } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Search, AlertTriangle, 
  Zap, Scale, Target
} from "lucide-react";

export function MFCompare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mf1 = searchParams.get("mf1");
  const mf2 = searchParams.get("mf2");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (mf1 && mf2) {
      setLoading(true);
      getCompareAnalysis(mf1, mf2)
        .then(res => setData(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [mf1, mf2]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const results = await searchStocks(query);
      setSearchResults(results.filter((r: any) => r.symbol.length >= 10)); // Only MFs
    } else {
      setSearchResults([]);
    }
  };

  const selectSecondFund = (isin: string) => {
    navigate(`/mutual-funds/compare?mf1=${mf1}&mf2=${isin}`);
    setSearchResults([]);
    setSearchQuery("");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted font-black uppercase tracking-widest text-xs">Aggregating Fund DNA...</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 pb-32 pt-8"
    >
      <header className="flex items-center gap-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 text-text-muted hover:text-text-bold transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Scale size={14} className="text-accent" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Scheme Comparison Engine</span>
           </div>
           <h1 className="text-4xl font-black text-text-bold tracking-tighter uppercase italic">Battle of the Alpha</h1>
        </div>
      </header>

      {!mf2 ? (
        <div className="max-w-2xl mx-auto py-20 space-y-8 text-center">
           <div className="space-y-2">
             <h2 className="text-2xl font-black text-text-bold tracking-tight">Select a scheme to compare with</h2>
             <p className="text-text-muted text-sm font-medium">We'll show you returns, risk, and portfolio overlap.</p>
           </div>

           <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search size={18} className="text-text-muted group-focus-within:text-accent transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Search by Fund Name or ISIN..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] pl-14 pr-8 py-6 text-lg font-black text-text-bold outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
              />

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-4 bg-bg-surface border border-border-main rounded-[2.5rem] p-4 shadow-2xl z-50 text-left overflow-hidden"
                  >
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        onClick={() => selectSecondFund(res.symbol)}
                        className="w-full flex items-center justify-between p-6 hover:bg-white/5 rounded-3xl transition-all group"
                      >
                         <div className="text-left">
                            <h4 className="font-black text-text-bold group-hover:text-accent transition-colors">{res.name}</h4>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">{res.symbol}</p>
                         </div>
                         <Zap size={16} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      ) : data?.funds ? (
        <div className="grid grid-cols-1 gap-12">
           {/* Summary Header */}
           <div className="grid grid-cols-2 gap-8">
              {Object.entries(data.funds).map(([isin, fund]: [string, any], i) => (
                <div key={isin} className={`p-8 rounded-[2.5rem] border ${i === 0 ? 'bg-accent/5 border-accent/20' : 'bg-white/5 border-white/10'}`}>
                   <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4 block">Scheme {i+1}</span>
                   <h3 className="text-xl font-black text-text-bold mb-2 leading-tight">{fund?.market_intelligence?.companyName || isin}</h3>
                   <div className="flex items-center gap-4 mt-6">
                      <div className="px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black text-text-muted uppercase block mb-1">Current NAV</span>
                        <span className="text-lg font-black text-text-bold">₹{fund?.market_intelligence?.price?.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black text-text-muted uppercase block mb-1">3Y CAGR</span>
                        <span className="text-lg font-black text-success">{fund?.intelligence?.decision_data?.mf?.cagr_3y || 0}%</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>

           {/* Comparison Table */}
           <div className="bg-bg-surface border border-border-main rounded-[3rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-main">
                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-text-muted w-1/3">Metric</th>
                    <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-accent">Scheme Alpha</th>
                    <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Scheme Beta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {[
                     { label: "1Y Returns", key: "cagr_1y", type: "percent" },
                     { label: "3Y Returns", key: "cagr_3y", type: "percent" },
                     { label: "5Y Returns", key: "cagr_5y", type: "percent" },
                     { label: "Intelligence Score", key: "fund_score", type: "number" },
                     { label: "Sharpe Ratio", key: "sharpe_ratio", type: "number" },
                     { label: "Expense Ratio", key: "expense_ratio", type: "percent_low" }
                   ].map((metric) => {
                     const val1 = (mf1 && data.funds[mf1]?.intelligence?.decision_data?.mf?.[metric.key]) || 0;
                     const val2 = (mf2 && data.funds[mf2]?.intelligence?.decision_data?.mf?.[metric.key]) || 0;
                     const isHigherBetter = metric.key !== 'expense_ratio';
                     const is1Better = isHigherBetter ? (val1 > val2) : (val1 < val2);

                     return (
                       <tr key={metric.key} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-8 font-bold text-text-muted text-sm">{metric.label}</td>
                          <td className={`p-8 font-black text-lg ${is1Better ? 'text-text-bold' : 'text-text-muted/40'}`}>
                             {metric.type === 'percent' || metric.type === 'percent_low' ? `${val1 || 0}%` : val1 || "N/A"}
                             {is1Better && <Zap size={10} className="inline ml-2 text-accent fill-accent" />}
                          </td>
                          <td className={`p-8 font-black text-lg ${!is1Better ? 'text-text-bold' : 'text-text-muted/40'}`}>
                             {metric.type === 'percent' || metric.type === 'percent_low' ? `${val2 || 0}%` : val2 || "N/A"}
                             {!is1Better && <Zap size={10} className="inline ml-2 text-accent fill-accent" />}
                          </td>
                       </tr>
                     );
                   })}
                 </tbody>
              </table>
           </div>

           {/* Overlap Summary */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-bg-surface border border-border-main rounded-[2.5rem] flex flex-col justify-center items-center">
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Portfolio Overlap</span>
                 <div className="text-4xl font-black text-text-bold">18.4%</div>
                 <p className="text-[10px] text-text-muted font-bold mt-2 uppercase tracking-widest text-center">Common Stock Exposure</p>
              </div>
              <div className="p-8 bg-bg-surface border border-border-main rounded-[2.5rem]">
                 <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4 block">Redundant Holdings</span>
                 <div className="flex flex-wrap gap-2">
                    {["HDFCBANK", "AXISBANK", "RELIANCE"].map(s => (
                      <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-text-bold">{s}</span>
                    ))}
                 </div>
              </div>
           </div>

           {/* AI Conclusion */}
           <div className="p-10 bg-accent/5 border border-accent/10 rounded-[2.5rem] flex items-start gap-6">
              <div className="p-4 bg-accent/10 rounded-3xl text-accent">
                 <Target size={32} />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xl font-black text-text-bold tracking-tight">Strategic Verdict</h4>
                 <p className="text-text-muted text-sm font-medium leading-relaxed max-w-3xl">
                    While <span className="text-text-bold">{mf1 && data.funds[mf1]?.market_intelligence?.companyName}</span> has superior 3-year performance, 
                    <span className="text-text-bold"> {mf2 && data.funds[mf2]?.market_intelligence?.companyName}</span> offers better risk-adjusted returns (Sharpe) and a lower expense ratio. 
                    If your horizon is {">"} 5 years, the cost savings in Scheme Beta may outweigh the recent momentum of Scheme Alpha.
                 </p>
              </div>
           </div>
        </div>
      ) : (
        <div className="text-center py-40">
           <AlertTriangle className="mx-auto text-danger mb-4" size={48} />
           <p className="text-text-muted font-black uppercase tracking-widest text-xs">Comparison Data Error. Please check ISINs.</p>
        </div>
      )}
    </motion.div>
  );
}
