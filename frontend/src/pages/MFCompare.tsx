import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Sparkles,
  ZapOff,
  ShieldCheck,
} from "lucide-react";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { EquityCurve } from "../components/mf/compare/EquityCurve";
import { RiskCompass } from "../components/mf/compare/RiskCompass";
import { IntelligenceBanners } from "../components/mf/compare/IntelligenceBanners";
import { SipCalculator } from "../components/mf/compare/SipCalculator";

interface ComparisonData {
  scheme_code: string;
  scheme_name: string;
  category: string;
  nav: number;
  metrics: {
    cagr_5y: number;
    alpha: number;
    sharpe: number;
    sortino: number;
    beta: number;
    volatility: number;
    max_drawdown: number;
    expense_ratio: number;
    aum: number;
  };
  advisor_score: number;
  verdict_chip: string;
  why_it_wins: string;
  when_to_avoid: string;
}

export function MFCompare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [clones, setClones] = useState<any[]>([]);
  const [regret, setRegret] = useState<any>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isProMode, setIsProMode] = useState(false);

  // Load from URL on mount
  useEffect(() => {
    const ids = searchParams.get("ids");
    if (ids) {
      const idList = ids.split(",").filter(Boolean).slice(0, 5);
      setSelectedIds(idList);
    }
  }, []);

  // Fetch comparison data when selectedIds change
  useEffect(() => {
    async function fetchComparison() {
      if (selectedIds.length === 0) {
        setComparison([]);
        setEquityCurve([]);
        setClones([]);
        setRegret(null);
        return;
      }

      setLoading(true);
      try {
        const res = await getMFComparison(selectedIds);
        if (res.success) {
          setComparison(res.comparison);
          setEquityCurve(res.equity_curve);
          setClones(res.clones);
          setRegret(res.regret);
          setConfidenceScore(res.confidence_score);
        }
      } catch (err) {
        console.error("Failed to fetch comparison:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();

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
    if (activeSlot !== null && activeSlot < 5) {
      newIds[activeSlot] = id;
    } else if (newIds.length < 5) {
      newIds.push(id);
    }

    setSelectedIds(newIds);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchModal(false);
  };

  const removeFund = (id: string) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  return (
    <div className="max-w-6xl mx-auto pb-48 space-y-12 pt-8 font-['Noto_Sans']">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-8 px-6">
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale size={12} className="text-text-muted" />
            <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
              Intelligence Engine
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-text-bold tracking-tighter">
            Fund <span className="text-accent">Comparison</span>
          </h1>
          <p className="text-text-muted text-base font-medium max-w-xl leading-relaxed">
            Unveiling the Alpha DNA of your selected assets. Our engine dissects
            risk efficiency, drawdown resilience, and manager consistency to
            guide your capital deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setIsProMode(false)}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${!isProMode ? "bg-accent text-bg-main shadow-lg" : "text-text-muted hover:text-text-bold"}`}
            >
              Beginner
            </button>
            <button
              onClick={() => setIsProMode(true)}
              className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${isProMode ? "bg-accent text-bg-main shadow-lg" : "text-text-muted hover:text-text-bold"}`}
            >
              Pro Matrix
            </button>
          </div>

          <div className="flex items-center gap-4 bg-bg-surface border border-border-main rounded-xl px-5 py-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Confidence
              </p>
              <p className="text-sm font-black text-text-bold">
                {confidenceScore}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <ShieldCheck size={20} className="text-accent" />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-6">
        {[0, 1, 2, 3, 4].map((idx) => {
          const id = selectedIds[idx];
          const fund = comparison.find(
            (f) => String(f.scheme_code) === String(id),
          );
          const isEmpty = !id;

          return (
            <div
              key={idx}
              className={`relative group h-48 rounded-xl border transition-all duration-300 overflow-hidden ${
                isEmpty
                  ? "bg-white/[0.02] border-dashed border-border-main hover:border-accent/40 hover:bg-white/[0.04]"
                  : "bg-bg-surface border-border-main hover:border-[#333]"
              }`}
            >
              <div className="absolute top-3 left-3 text-[9px] font-bold text-text-muted/20 uppercase tracking-widest">
                Slot {idx + 1}
              </div>

              {isEmpty ? (
                <button
                  onClick={() => {
                    setActiveSlot(idx);
                    setShowSearchModal(true);
                  }}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-text-muted group-hover:text-accent transition-all duration-300">
                    <Plus size={20} />
                  </div>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                    Initialize
                  </p>
                </button>
              ) : (
                <div className="w-full h-full p-5 flex flex-col justify-between relative z-10">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${fund?.advisor_score && fund.advisor_score > 75 ? "bg-success" : "bg-amber-500"}`}
                        />
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest truncate">
                          {fund?.category || "Asset"}
                        </p>
                      </div>
                      <h3 className="text-[13px] font-black text-text-bold line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                        {fund?.scheme_name || id}
                      </h3>
                    </div>
                    <button
                      onClick={() => removeFund(id)}
                      className="p-1.5 bg-white/5 hover:bg-danger/20 text-text-muted hover:text-danger rounded-lg transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between">
                    <span className="px-1.5 py-0.5 bg-white/[0.05] text-[9px] font-bold text-text-muted uppercase tracking-widest rounded">
                      {fund?.verdict_chip || "Analyzed"}
                    </span>
                    <div className="text-right">
                      <span className="text-xl font-black text-text-bold text-accent">
                        <AnimatedNumber
                          value={fund?.advisor_score || 0}
                          suffix="/100"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 space-y-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-bg-surface border border-border-main rounded-xl">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-accent/10 border-t-accent animate-spin" />
              <Sparkles
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent"
                size={20}
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[10px] font-black text-text-bold uppercase tracking-[0.3em] animate-pulse">
                Computing Diffusion
              </p>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest opacity-60">
                Syncing multi-dimensional return vectors...
              </p>
            </div>
          </div>
        ) : selectedIds.length >= 2 ? (
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <EquityCurve data={equityCurve} funds={comparison} />
              </div>
              <div className="lg:col-span-4">
                <RiskCompass funds={comparison} />
              </div>
            </div>

            <IntelligenceBanners clones={clones} regret={regret} />

            <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5">
                      <th className="p-6 text-[10px] font-bold text-text-muted uppercase tracking-widest w-[280px]">
                        Intelligence Metrics
                      </th>
                      {comparison.map((f, i) => (
                        <th
                          key={f.scheme_code}
                          className="p-6 min-w-[200px] border-l border-white/5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-accent uppercase tracking-widest">
                                Asset {i + 1}
                              </span>
                              {f.advisor_score ===
                                Math.max(
                                  ...comparison.map((x) => x.advisor_score),
                                ) && (
                                <div className="px-1.5 py-0.5 bg-accent text-bg-main text-[8px] font-black uppercase rounded-sm">
                                  Leader
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-black text-text-bold line-clamp-1">
                              {f.scheme_name.split("-")[0]}
                            </p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {!isProMode ? (
                      <>
                        <ComparisonRow
                          label="5Y CAGR"
                          icon={TrendingUp}
                          toolTip="Compound Annual Growth Rate over the last 5 years."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className="text-sm font-black text-text-bold"
                            >
                              <AnimatedNumber
                                value={f.metrics.cagr_5y}
                                decimals={2}
                                suffix="%"
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Expense Ratio"
                          icon={Zap}
                          toolTip="Annual fee charged by the AMC. Lower is better."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className={`text-sm font-black ${f.metrics.expense_ratio < 0.008 ? "text-success" : "text-text-bold"}`}
                            >
                              <AnimatedNumber
                                value={f.metrics.expense_ratio * 100}
                                decimals={2}
                                suffix="%"
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Risk Rating"
                          icon={Shield}
                          toolTip="Overall historical volatility profile."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className={`text-[10px] font-bold uppercase tracking-widest ${f.metrics.volatility > 18 ? "text-danger" : f.metrics.volatility > 12 ? "text-amber-500" : "text-success"}`}
                            >
                              {f.metrics.volatility > 18
                                ? "Very High"
                                : f.metrics.volatility > 12
                                  ? "Moderate"
                                  : "Conservative"}
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Wealth Scale"
                          icon={Info}
                          toolTip="Total Assets Under Management (AUM)."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className="text-sm font-black text-text-bold"
                            >
                              ₹
                              {Math.round(
                                f.metrics.aum / 10000000,
                              ).toLocaleString()}{" "}
                              <span className="text-[9px] text-text-muted font-bold uppercase ml-1 opacity-60">
                                Cr
                              </span>
                            </span>
                          ))}
                        </ComparisonRow>
                      </>
                    ) : (
                      <>
                        <ComparisonRow
                          label="Alpha %"
                          icon={Sparkles}
                          toolTip="Return beyond benchmark performance. Bullish edge."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className={`text-sm font-black ${f.metrics.alpha > 0 ? "text-success" : "text-danger"}`}
                            >
                              <AnimatedNumber
                                value={f.metrics.alpha}
                                decimals={2}
                                suffix="%"
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Sortino Ratio"
                          icon={Zap}
                          toolTip="Risk-adjusted return focusing on downside volatility. Higher is better."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className="text-sm font-black text-text-bold"
                            >
                              <AnimatedNumber
                                value={f.metrics.sortino}
                                decimals={2}
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Max Drawdown"
                          icon={TrendingDown}
                          toolTip="Maximum historical peak-to-trough decline. Resilience metric."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className="text-sm font-black text-danger"
                            >
                              <AnimatedNumber
                                value={f.metrics.max_drawdown}
                                decimals={1}
                                suffix="%"
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow
                          label="Portfolio Beta"
                          icon={Scale}
                          toolTip="Market correlation sensitivity. 1.0 matches the benchmark."
                        >
                          {comparison.map((f) => (
                            <span
                              key={f.scheme_code}
                              className="text-sm font-black text-text-bold"
                            >
                              <AnimatedNumber
                                value={f.metrics.beta}
                                decimals={2}
                              />
                            </span>
                          ))}
                        </ComparisonRow>
                      </>
                    )}
                    <ComparisonRow
                      label="Why it Wins"
                      icon={ShieldCheck}
                      toolTip="AI logic for primary differentiation."
                    >
                      {comparison.map((f) => (
                        <p
                          key={f.scheme_code}
                          className="text-[13px] font-medium text-text-muted leading-relaxed max-w-[200px]"
                        >
                          {f.why_it_wins}
                        </p>
                      ))}
                    </ComparisonRow>
                    <ComparisonRow
                      label="When to Avoid"
                      icon={ZapOff}
                      toolTip="Critical guardrails for capital safety."
                    >
                      {comparison.map((f) => (
                        <p
                          key={f.scheme_code}
                          className="text-[13px] font-medium text-text-muted leading-relaxed max-w-[200px]"
                        >
                          {f.when_to_avoid}
                        </p>
                      ))}
                    </ComparisonRow>
                  </tbody>
                </table>
              </div>
            </div>

            <SipCalculator funds={comparison} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-8 bg-white/[0.01] border border-dashed border-border-main rounded-xl text-center">
            <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center text-text-muted">
              <Scale size={48} strokeWidth={1} className="opacity-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-text-bold tracking-tighter">
                Selection Required
              </h3>
              <p className="text-sm text-text-muted font-medium max-w-sm mx-auto leading-relaxed">
                The intelligence core requires at least{" "}
                <span className="text-accent">two active slots</span> to compute
                comparative diffusion and drawdown resilience.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSlot(selectedIds.length);
                setShowSearchModal(true);
              }}
              className="px-8 py-4 bg-white text-bg-main rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-accent hover:text-white"
            >
              Open Global Search
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="absolute inset-0 bg-[#000]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-bg-surface border border-border-main rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-text-bold tracking-tighter uppercase">
                      Market Intelligence Search
                    </h2>
                    <p className="text-[9px] text-accent font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-accent animate-ping" />
                      Targeting Slot #
                      {activeSlot !== null ? activeSlot + 1 : "..."}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by fund name or code..."
                    className="w-full h-14 bg-white/[0.04] border border-white/10 rounded-xl pl-12 pr-12 text-base font-medium text-text-bold placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
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
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all group text-left border border-transparent hover:border-white/5"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-bold text-text-bold group-hover:text-accent transition-colors truncate">
                            {res.scheme_name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 opacity-50">
                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                              {res.scheme_code}
                            </span>
                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest truncate">
                              {res.category || "Mutual Fund"}
                            </span>
                          </div>
                        </div>
                        <Plus
                          size={16}
                          className="text-text-muted group-hover:text-accent"
                        />
                      </button>
                    ))
                  ) : searchQuery.length >= 3 && !isSearching ? (
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted opacity-40 space-y-3">
                      <ZapOff size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">
                        No results found
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-text-muted opacity-30 space-y-4">
                      <div className="flex items-center gap-2">
                        {["HDFC", "ICICI", "SBI", "Quant"].map((brand) => (
                          <span
                            key={brand}
                            className="px-2 py-1 border border-white/10 rounded-md text-[9px] font-bold uppercase tracking-widest"
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest">
                        Start typing to scan the market
                      </p>
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

function ComparisonRow({
  label,
  icon: Icon,
  toolTip,
  children,
}: {
  label: string;
  icon: any;
  toolTip?: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-0">
      <td className="p-6 border-r border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon
              size={12}
              className="text-text-muted group-hover:text-accent transition-colors"
            />
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {label}
            </span>
          </div>
          {toolTip && (
            <p className="text-[9px] text-text-muted/40 font-medium leading-tight max-w-[180px]">
              {toolTip}
            </p>
          )}
        </div>
      </td>
      {(children as React.ReactNode[]).map((child: any, i: number) => (
        <td key={i} className="p-6 border-l border-white/5">
          {child}
        </td>
      ))}
    </tr>
  );
}
