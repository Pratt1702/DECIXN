import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getMFComparison, searchMF } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  X, 
  Plus, 
  Scale, 
  TrendingUp, 
  Shield, 
  Zap, 
  Info,
  TrendingDown,
  ArrowRight,
  ChevronRight,
  Sparkles,
  BarChart3
} from "lucide-react";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";

interface ComparisonData {
  scheme_code: string;
  scheme_name: string;
  category: string;
  expense_ratio: number;
  aum: number;
  alpha: number;
  sharpe_ratio: number;
  volatility: number;
  nav: number;
}

export function MFCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  // Load from URL on mount
  useEffect(() => {
    const ids = searchParams.get("ids");
    if (ids) {
      const idList = ids.split(",").filter(Boolean).slice(0, 3);
      setSelectedIds(idList);
    }
  }, []);

  // Fetch comparison data when selectedIds change
  useEffect(() => {
    async function fetchComparison() {
      if (selectedIds.length === 0) {
        setComparison([]);
        setInsights([]);
        setConclusion("");
        return;
      }

      setLoading(true);
      try {
        const res = await getMFComparison(selectedIds);
        if (res.success) {
          setComparison(res.comparison);
          setInsights(res.insights);
          setConclusion(res.conclusion);
        }
      } catch (err) {
        console.error("Failed to fetch comparison:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
    
    // Update URL without blocking
    const newParams = new URLSearchParams(searchParams);
    if (selectedIds.length > 0) {
        newParams.set("ids", selectedIds.join(","));
    } else {
        newParams.delete("ids");
    }
    setSearchParams(newParams, { replace: true });
  }, [selectedIds]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchMF(val);
      if (res.success) {
        setSearchResults(res.results.slice(0, 8));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addFund = (fund: any) => {
    const id = fund.scheme_code || fund.isin;
    if (selectedIds.includes(id)) {
        setShowSearchModal(false);
        return;
    }
    
    const newIds = [...selectedIds];
    if (activeSlot !== null && activeSlot < newIds.length) {
        newIds[activeSlot] = id;
    } else if (newIds.length < 3) {
        newIds.push(id);
    }
    
    setSelectedIds(newIds);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchModal(false);
  };

  const removeFund = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  return (
    <div className="max-w-6xl mx-auto pb-32 space-y-12 pt-8">
      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-[9px] font-black text-accent uppercase tracking-widest">Analytics Core</div>
                <div className="h-px w-8 bg-white/10" />
            </div>
          <h1 className="text-5xl font-black text-text-bold tracking-tighter italic uppercase flex items-center gap-4 select-none">
            Fund <span className="text-accent underline decoration-white/10 underline-offset-8">Versus</span>
          </h1>
          <p className="text-text-muted text-sm font-medium max-w-lg leading-relaxed border-l border-white/10 pl-4 py-1">
            Institutional-grade side-by-side analysis. We dissect returns, risk, and alpha DNA to identify the superior asset for your portfolio.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Analysis Mode</p>
                <p className="text-xs font-bold text-text-bold">Side-by-Side Diffusion</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${loading ? 'animate-pulse' : ''}`}>
               <Scale size={20} className={loading ? 'text-accent' : 'text-text-muted'} />
            </div>
        </div>
      </header>

      {/* ── SLOTS / SELECTORS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        {[0, 1, 2].map((idx) => {
          const id = selectedIds[idx];
          const fund = comparison.find(f => f.scheme_code === id);
          const isEmpty = !id;

          return (
            <div 
                key={idx}
                className={`relative group h-48 rounded-3xl border transition-all duration-500 overflow-hidden ${
                    isEmpty 
                    ? 'bg-white/[0.02] border-dashed border-white/10 hover:border-accent/40 hover:bg-white/[0.04]' 
                    : 'bg-bg-surface border-border-main shadow-2xl hover:border-white/20'
                }`}
            >
                {isEmpty ? (
                    <button 
                        onClick={() => { setActiveSlot(idx); setShowSearchModal(true); }}
                        className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-accent group-hover:scale-110 transition-all duration-300">
                             <Plus size={24} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Slot {idx + 1}</p>
                            <p className="text-xs font-bold text-text-muted/60">Select Mutual Fund</p>
                        </div>
                    </button>
                ) : (
                    <div className="w-full h-full p-6 flex flex-col justify-between relative">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1 min-w-0 pr-4">
                                <p className="text-[9px] font-black text-accent uppercase tracking-widest">{fund?.category || 'Loading...'}</p>
                                <h3 className="text-sm font-black text-text-bold line-clamp-2 italic uppercase leading-tight group-hover:text-white transition-colors">{fund?.scheme_name || id}</h3>
                            </div>
                            <button 
                                onClick={() => removeFund(id)}
                                className="p-2 bg-white/5 hover:bg-danger/20 text-text-muted hover:text-danger rounded-xl transition-all active:scale-95"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="flex items-end justify-between pt-4">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Latest NAV</p>
                                <p className="text-xl font-black italic tracking-tighter text-text-bold">
                                    <AnimatedNumber value={fund?.nav || 0} prefix="₹" decimals={2} />
                                </p>
                            </div>
                            <div className="p-2 bg-white/[0.02] rounded-lg">
                                <BarChart3 size={16} className="text-text-muted opacity-30" />
                            </div>
                        </div>

                        {/* Background subtle glow */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent opacity-5 blur-3xl rounded-full group-hover:opacity-10 transition-opacity" />
                    </div>
                )}
            </div>
          );
        })}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-4">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-40 space-y-6 bg-white/[0.01] border border-white/5 rounded-[3rem]">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-accent/10 border-t-accent animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" size={20} />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-text-bold uppercase tracking-[0.4em] animate-pulse">Processing diffusion</p>
                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Aggregating market intelligence...</p>
                </div>
           </div>
        ) : selectedIds.length >= 2 ? (
            <div className="space-y-12">
                {/* Comparison Matrix */}
                <div className="bg-bg-surface border border-border-main rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <div className="overflow-x-auto scrollbar-none">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.03] border-b border-white/5">
                                    <th className="p-8 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] w-1/4">Analysis Vectors</th>
                                    {comparison.map(f => (
                                        <th key={f.scheme_code} className="p-8 min-w-[200px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Asset {comparison.indexOf(f) + 1}</span>
                                                <span className="text-xs font-black text-text-bold uppercase italic line-clamp-1">{f.scheme_name.split('-')[0]}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                <ComparisonRow label="Expense Ratio" icon={Zap} sub="Efficiency efficiency">
                                    {comparison.map(f => {
                                        const isBest = f.expense_ratio === Math.min(...comparison.map(x => x.expense_ratio));
                                        return (
                                            <div key={f.scheme_code} className="flex items-center gap-3">
                                                <span className={`text-lg font-black italic tracking-tighter ${isBest ? 'text-success' : 'text-text-bold'}`}>
                                                    <AnimatedNumber value={f.expense_ratio * 100} decimals={2} suffix="%" />
                                                </span>
                                                {isBest && <div className="px-1.5 py-0.5 bg-success/10 text-[8px] font-black text-success uppercase rounded border border-success/20">Leader</div>}
                                            </div>
                                        );
                                    })}
                                </ComparisonRow>
                                <ComparisonRow label="Alpha" icon={TrendingUp} sub="Return dominance">
                                    {comparison.map(f => {
                                        const isBest = f.alpha === Math.max(...comparison.map(x => x.alpha));
                                        return (
                                            <div key={f.scheme_code} className="flex items-center gap-3">
                                                <span className={`text-lg font-black italic tracking-tighter ${f.alpha >= 0 ? 'text-success' : 'text-danger'}`}>
                                                    {f.alpha >= 0 ? '+' : ''}<AnimatedNumber value={f.alpha} decimals={2} suffix="%" />
                                                </span>
                                                {isBest && f.alpha > 0 && <div className="px-1.5 py-0.5 bg-success/10 text-[8px] font-black text-success uppercase rounded border border-success/20">Elite</div>}
                                            </div>
                                        );
                                    })}
                                </ComparisonRow>
                                <ComparisonRow label="Sharpe Ratio" icon={Shield} sub="Risk-Adj Strength">
                                    {comparison.map(f => {
                                        const isBest = f.sharpe_ratio === Math.max(...comparison.map(x => x.sharpe_ratio));
                                        return (
                                            <div key={f.scheme_code} className="flex items-center gap-3">
                                                <span className={`text-lg font-black italic tracking-tighter ${f.sharpe_ratio > 1.2 ? 'text-success' : 'text-text-bold'}`}>
                                                    <AnimatedNumber value={f.sharpe_ratio} decimals={2} />
                                                </span>
                                                {isBest && <div className="px-1.5 py-0.5 bg-accent/10 text-[8px] font-black text-accent uppercase rounded border border-accent/20">Optimal</div>}
                                            </div>
                                        );
                                    })}
                                </ComparisonRow>
                                <ComparisonRow label="Volatility" icon={TrendingDown} sub="Systemic Risk">
                                    {comparison.map(f => {
                                        return (
                                            <span key={f.scheme_code} className="text-lg font-black italic tracking-tighter text-text-bold">
                                                <AnimatedNumber value={f.volatility} decimals={1} suffix="%" />
                                            </span>
                                        );
                                    })}
                                </ComparisonRow>
                                <ComparisonRow label="AUM Size" icon={Info} sub="Capital Trust">
                                    {comparison.map(f => {
                                        return (
                                            <span key={f.scheme_code} className="text-lg font-black italic tracking-tighter text-text-bold">
                                                ₹{Math.round(f.aum / 10000000).toLocaleString()} <span className="text-[10px] text-text-muted not-italic uppercase ml-1">Cr</span>
                                            </span>
                                        );
                                    })}
                                </ComparisonRow>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Insights Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {insights.map((insight, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={idx} 
                            className="bg-bg-surface border border-border-main p-8 rounded-[2rem] space-y-4 shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl h-fit ${
                                    insight.type === 'success' ? 'bg-success/10 text-success' : 
                                    insight.type === 'warning' ? 'bg-warning/10 text-warning' : 
                                    'bg-accent/10 text-accent'
                                }`}>
                                    {insight.type === 'success' ? <TrendingUp size={18} /> : insight.type === 'warning' ? <Shield size={18} /> : <Zap size={18} />}
                                </div>
                                <h4 className="text-[11px] font-black text-text-bold uppercase tracking-widest">{insight.title}</h4>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed font-bold border-l-2 border-white/5 pl-4">{insight.text}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Final Conclusion */}
                <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-8 space-y-8">
                             <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-accent text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-full">Automated Decision Support</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-text-bold tracking-tighter leading-tight italic uppercase">AI Analyst's Conclusion</h2>
                                <p className="text-xl font-black text-text-bold leading-relaxed italic opacity-85 select-none text-accent">
                                    "{conclusion}"
                                </p>
                            </div>
                        </div>
                        <div className="lg:col-span-4 flex justify-end">
                            <button 
                                onClick={() => {
                                    const best = comparison.find(f => conclusion.includes(f.scheme_name.split('-')[0]));
                                    if (best) navigate(`/mutual-funds/details/${best.scheme_code}`);
                                }}
                                className="group/btn flex items-center justify-center gap-4 bg-white text-bg-main w-full h-16 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all duration-300 active:scale-95 shadow-2xl shadow-white/5"
                            >
                                Deep Analysis
                                <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    </div>
                    {/* Abstract background element */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent opacity-[0.03] blur-3xl rounded-full" />
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-40 space-y-8 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] text-center border-spacing-8">
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center text-text-muted rotate-3 group shadow-inner">
                    <Scale size={48} strokeWidth={1.5} className="opacity-20" />
                </div>
                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-text-bold uppercase italic tracking-tighter">Selection Required</h3>
                    <p className="text-xs text-text-muted font-medium max-w-xs mx-auto leading-relaxed">
                        Select at least <span className="text-text-bold">two assets</span> from the diffusion grid to initiate cross-dimensional comparison logic.
                    </p>
                </div>
                <button 
                    onClick={() => { setActiveSlot(selectedIds.length); setShowSearchModal(true); }}
                    className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={16} />
                    Add First Asset
                </button>
            </div>
        )}
      </div>

      {/* ── SEARCH MODAL ── */}
      <AnimatePresence>
        {showSearchModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSearchModal(false)}
                    className="absolute inset-0 bg-[#000]/80 backdrop-blur-xl"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-bg-surface border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-text-bold tracking-tighter uppercase italic">Search Intelligence</h2>
                                <p className="text-[10px] text-accent font-black uppercase tracking-widest">Adding to Slot {activeSlot !== null ? activeSlot + 1 : '...'}</p>
                            </div>
                            <button 
                                onClick={() => setShowSearchModal(false)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-text-muted transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="relative group">
                            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
                            <input 
                                autoFocus
                                type="text"
                                placeholder="TYPE FUND NAME, AMC OR SCHEME CODE..."
                                className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-12 text-sm font-black text-text-bold placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all uppercase tracking-tight"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            {isSearching && (
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="min-h-[300px] max-h-[400px] overflow-y-auto scrollbar-none space-y-2">
                            {searchResults.length > 0 ? (
                                searchResults.map((res) => (
                                    <button
                                        key={res.scheme_code}
                                        onClick={() => addFund(res)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5 group text-left"
                                    >
                                        <div className="min-w-0 pr-4">
                                            <p className="text-[11px] font-black text-text-bold uppercase italic group-hover:text-accent transition-colors truncate">{res.scheme_name}</p>
                                            <div className="flex items-center gap-3 mt-1 opacity-60">
                                                <span className="text-[9px] text-text-muted font-black uppercase tracking-widest">{res.scheme_code}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] text-text-muted font-black uppercase tracking-widest truncate">{res.category || 'Equity'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 group-hover:text-accent transition-all" />
                                    </button>
                                ))
                            ) : searchQuery.length >= 3 && !isSearching ? (
                                <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-40">
                                    <Search size={32} strokeWidth={1} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No matching assets found</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-20">
                                    <Plus size={32} strokeWidth={1} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic">Input at least 3 characters</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComparisonRow({ label, icon: Icon, sub, children }: { label: string; icon: any; sub?: string, children: React.ReactNode }) {
  return (
    <tr className="group hover:bg-white/[0.01] transition-all">
      <td className="p-8 border-r border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <Icon size={16} className="text-text-muted group-hover:text-accent transition-colors" />
          <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</span>
        </div>
        {sub && <p className="text-[9px] text-text-muted/40 uppercase font-bold ml-7 italic">{sub}</p>}
      </td>
      {(children as React.ReactNode[]).map((child: any, i: number) => (
        <td key={i} className="p-8">{child}</td>
      ))}
    </tr>
  );
}
