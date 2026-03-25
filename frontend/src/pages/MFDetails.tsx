import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMFDetails } from "../services/api";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertTriangle,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  Info,
  Brain,
  Target,
  Scale
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import gsap from "gsap";

const PERIODS = ["1M", "6M", "1Y", "3Y", "5Y", "MAX"];

const METRIC_EXPLANATIONS: Record<string, { label: string; desc: string }> = {
  volatility: { 
    label: "Volatility (Risk)", 
    desc: "How much the fund's price swings. Lower is steadier." 
  },
  sharpe_ratio: { 
    label: "Return Efficiency", 
    desc: "How much return you get for the risk taken. Above 1.0 is great." 
  },
  alpha: { 
    label: "Market Outperformance", 
    desc: "How much the fund beat the market average (Nifty 50)." 
  },
  beta: { 
    label: "Market Sensitivity", 
    desc: "1.0 means it moves with the market. Lower is more defensive." 
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs font-medium space-y-3 min-w-[160px]">
        <div className="flex flex-col border-b border-white/5 pb-2">
            <span className="text-text-muted text-[9px] uppercase font-black tracking-widest mb-1">{data.date}</span>
        </div>
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold text-accent uppercase font-black">Fund Return</span>
                <span className="text-[#f3f4f6] font-black">{Number(data.nav).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between gap-4 opacity-60">
                <span className="text-[9px] font-bold text-text-muted uppercase">Actual NAV</span>
                <span className="text-text-muted font-bold text-[10px]">₹{Number(data.realNav).toFixed(2)}</span>
            </div>
            {data.realBench && (
                <>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-text-muted uppercase font-black">Bench. Return</span>
                        <span className="text-[#f3f4f6] font-black">{Number(data.benchmarkNav).toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 opacity-60">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Actual Index</span>
                        <span className="text-text-muted font-bold text-[10px]">{Number(data.realBench).toLocaleString()}</span>
                    </div>
                </>
            )}
        </div>
      </div>
    );
  }
  return null;
};

export function MFDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1Y");
  const [holding, setHolding] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: portfolioData } = useMFPortfolioStore();

  useEffect(() => {
    async function fetchMF() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getMFDetails(id);
        setData(res);
        
        // Match with user portfolio
        if (portfolioData?.portfolio_analysis) {
            const match = portfolioData.portfolio_analysis.find((h: any) => 
                h.scheme_code === id || h.symbol === id || h.ticker === id
            );
            setHolding(match);
        }
      } catch (err) {
        console.error("Failed to fetch MF details:", err);
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    }
    fetchMF();
  }, [id, portfolioData]);

  useEffect(() => {
    if (!loading && data && !data.error && containerRef.current) {
      gsap.fromTo(
        ".animate-mf",
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        }
      );
    }
  }, [loading, data]);

  if (loading) {
     return (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Activity className="w-10 h-10 animate-spin text-accent" />
            <p className="text-text-muted text-sm font-black uppercase tracking-widest">Digesting Fund Data...</p>
        </div>
     );
  }

  if (data?.error || !data) {
    return (
      <div className="py-32 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-danger mx-auto" />
        <h2 className="text-2xl font-black text-text-bold">Fund Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-accent font-bold uppercase text-xs tracking-widest">Go Back</button>
      </div>
    );
  }

  const allHistory = data.history || [];
  const allBenchmarkHistory = data.benchmark_history || [];
  
  // Client-side period slicing
  const getSlicedData = (history: any[], p: string) => {
    if (p === "MAX") return history;
    const now = new Date();
    let months = 12;
    if (p === "1M") months = 1;
    if (p === "6M") months = 6;
    if (p === "1Y") months = 12;
    if (p === "3Y") months = 36;
    if (p === "5Y") months = 60;
    
    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - months);
    return history.filter(h => new Date(h.date) >= cutoff);
  };

  const history = getSlicedData(allHistory, period);
  const benchmarkHistory = getSlicedData(allBenchmarkHistory, period);
  
  const firstNavReal = history.length > 0 ? history[0].nav : 0;
  const firstBenchReal = benchmarkHistory.length > 0 ? benchmarkHistory[0].nav : 0;
  const latestNav = history.length > 0 ? history[history.length - 1].nav : 0;

  const chartData = history.map((h: any) => {
    const bMatch = benchmarkHistory.find((b: any) => b.date === h.date);
    return {
      date: h.date,
      nav: firstNavReal !== 0 ? ((h.nav - firstNavReal) / firstNavReal) * 100 : 0,
      benchmarkNav: (bMatch && firstBenchReal !== 0) ? ((bMatch.nav - firstBenchReal) / firstBenchReal) * 100 : null,
      realNav: h.nav,
      realBench: bMatch ? bMatch.nav : null
    };
  });

  const navChange = latestNav - firstNavReal;
  const navChangePct = firstNavReal !== 0 ? (navChange / firstNavReal) * 100 : 0;
  const isPos = navChange >= 0;
  const strokeColor = isPos ? "#10b981" : "#f43f5e";

  // Calculate CAGR (Annualized Return)
  let yearsInput = 1;
  if (period === "1M") yearsInput = 1/12;
  else if (period === "6M") yearsInput = 0.5;
  else if (period === "1Y") yearsInput = 1;
  else if (period === "3Y") yearsInput = 3;
  else if (period === "5Y") yearsInput = 5;
  else if (period === "MAX") {
      const start = new Date(history[0].date);
      const end = new Date(history[history.length - 1].date);
      yearsInput = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }
  
  const annualizedReturn = firstNavReal !== 0 
    ? (Math.pow(latestNav / firstNavReal, 1 / Math.max(yearsInput, 0.083)) - 1) * 100 
    : 0;

  // Dynamic Decixn Score logic
  const metrics = data.metrics || {};
  const alpha = metrics.alpha || 0;
  const sharpe = metrics.sharpe_ratio || 0;
  const rawScore = 5 + (alpha * 0.5) + (sharpe * 1.5);
  const decixnScore = Math.min(Math.max(Number(rawScore.toFixed(1)), 1.0), 9.9);

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto pb-20 space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/mutual-funds/holdings")}
          className="flex items-center gap-2 text-[10px] text-text-muted hover:text-text-bold transition-all w-fit font-black uppercase tracking-widest group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <button
          onClick={() => navigate(`/mutual-funds/compare?ids=${id}`)}
          className="flex items-center gap-2 bg-white/5 border border-white/10 text-text-bold px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-xl"
        >
          <Scale size={14} />
          Compare Fund
        </button>
      </div>

      <header className="animate-mf space-y-4">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-text-bold tracking-tighter leading-tight">
                    {data.scheme_name}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20 self-center">
                    {data.stats?.category || "Equity"}
                </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                <span>ISIN: {id}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{data.ticker}</span>
            </div>
        </div>

        <div className="pt-4 space-y-1">
           <AnimatedNumber value={latestNav} prefix="₹" decimals={2} className="text-4xl font-black text-text-bold tracking-tight" />
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 font-black text-sm md:text-base ${isPos ? 'text-success' : 'text-danger'}`}>
                <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Total</span>
                    <div className="flex items-center">
                        <AnimatedNumber value={navChange} showPlusSign decimals={2} prefix="₹" />
                        <span className="ml-1">(<AnimatedNumber value={navChangePct} showPlusSign decimals={2} suffix="%" />)</span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">Annualized</span>
                    <div className="flex items-center italic">
                        <AnimatedNumber value={annualizedReturn} showPlusSign decimals={2} suffix="%" />
                    </div>
                </div>
                <div className="w-full md:w-auto flex items-center gap-2 mt-1 md:mt-0">
                    <div className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
                    <span className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded border border-white/5">{period}</span>
                </div>
            </div>
        </div>

        {/* Horizontal Stats Bar (Stock Style) */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 border-y border-white/5 py-6">
            <div className="flex items-center gap-2 border-r border-white/10 pr-8">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Expense</span>
                <span className="text-sm font-black text-text-bold italic">{(data.stats?.expense_ratio * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2 border-r border-white/10 pr-8">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">AUM</span>
                <span className="text-sm font-black text-text-bold italic">₹{(data.stats?.aum / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Alpha</span>
                <span className={`text-sm font-black ${metrics.alpha >= 0 ? 'text-success' : 'text-danger'}`}>
                    {metrics.alpha >= 0 ? '+' : ''}{metrics.alpha?.toFixed(2)}%
                </span>
            </div>
        </div>
      </header>

      {holding && (
        <div className="animate-mf bg-accent/5 border border-accent/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Shield className="w-6 h-6 text-accent" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-0.5">Your Position</p>
                    <p className="text-xl font-black text-text-bold tracking-tighter">
                        {holding.holding_context.quantity.toFixed(3)} Units
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-12">
                <div className="text-right">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">Avg Cost</p>
                    <p className="text-lg font-bold text-text-bold italic">₹{holding.holding_context.avg_cost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">PnL</p>
                    <p className={`text-lg font-black ${holding.holding_context.current_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        ₹{holding.holding_context.current_pnl.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="animate-mf bg-bg-surface border border-border-main rounded-2xl p-6 shadow-2xl shadow-black/20 relative group">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-text-bold">
                <Activity size={16} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest">Growth Analytics</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black text-text-muted uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Benchmark Sync
            </div>
        </div>

        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Tooltip 
                        content={<CustomTooltip />} 
                        cursor={{
                            stroke: "#2e303a",
                            strokeWidth: 1,
                            strokeDasharray: "4 4",
                        }}
                    />
                    {chartData.length > 0 && (
                        <ReferenceLine 
                            y={0} 
                            stroke="#4b5563" 
                            strokeDasharray="3 3" 
                        />
                    )}
                    <Line 
                        type="monotone" 
                        dataKey="benchmarkNav" 
                        stroke="#ffffff20" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={true}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="nav" 
                        stroke={strokeColor} 
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                            r: 5,
                            fill: strokeColor,
                            stroke: "#121212",
                            strokeWidth: 2,
                        }}
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between gap-4 mt-8 border-t border-white/5 pt-6">
            <div className="flex-1" />
            
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none">
                {PERIODS.map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest cursor-pointer ${period === p ? 'bg-white/10 text-white border border-white/10' : 'text-text-muted hover:text-text-bold hover:bg-white/5'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex justify-end">
                <button 
                    disabled
                    className="flex items-center gap-2 bg-white/5 border border-white/5 text-text-muted/40 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-not-allowed group"
                >
                    <span className="opacity-50">Terminal</span>
                    <Zap size={12} className="opacity-30" />
                </button>
            </div>
        </div>
      </div>

      <div className="animate-mf grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-border-main rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
                <Brain size={16} className="text-accent" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Specialist's Take</span>
            </div>
            <div className="space-y-4">
                {metrics.alpha > 0 ? (
                    <div className="flex gap-4">
                        <div className="p-2 bg-success/10 rounded-lg h-fit"><TrendingUp className="text-success" size={14} /></div>
                        <div>
                            <p className="text-xs font-black text-text-bold uppercase tracking-tight">Market Overperformer</p>
                            <p className="text-[11px] text-text-muted leading-relaxed">This fund consistently beats the market average, making it an Alpha-generating asset for your portfolio.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4">
                        <div className="p-2 bg-text-muted/10 rounded-lg h-fit"><Target className="text-text-muted" size={14} /></div>
                        <div>
                            <p className="text-xs font-black text-text-bold uppercase tracking-tight">Index Matcher</p>
                            <p className="text-[11px] text-text-muted leading-relaxed">Returns are closely aligned with the market broad indexes. Low individual risk but tracks the average.</p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <div className="p-2 bg-accent/10 rounded-lg h-fit"><Shield className="text-accent" size={14} /></div>
                    <div>
                        <p className="text-xs font-black text-text-bold uppercase tracking-tight">
                            {metrics.sharpe_ratio > 1.2 ? "High Return Efficiency" : "Standard Efficiency"}
                        </p>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            {metrics.sharpe_ratio > 1.2 
                              ? "Excellent returns per unit of risk taken. A sign of a disciplined fund manager." 
                              : "The fund covers its risk well, matching average industry standards for steady growth."}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-bg-surface border border-border-main rounded-2xl p-6 bg-gradient-to-br from-bg-surface to-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-accent" />
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Portfolio IQ Score</span>
            </div>
            <div className="flex flex-col items-center justify-center py-4">
                <div className="text-5xl font-black text-text-bold italic tracking-tighter mb-1">
                    {decixnScore}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${decixnScore > 7.5 ? 'text-success' : decixnScore > 5 ? 'text-accent' : 'text-danger'}`}>
                    {decixnScore > 7.5 ? 'Strong Potential' : decixnScore > 5 ? 'Steady Asset' : 'Needs Review'}
                </p>
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${decixnScore * 10}%` }} 
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-accent" 
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="animate-mf grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-border-main rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
                <Activity size={14} className="text-text-muted" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Advanced Risk Metrics</span>
            </div>
            <div className="space-y-6">
                {Object.entries(METRIC_EXPLANATIONS).map(([key, info]) => {
                    const val = metrics[key as keyof typeof metrics];
                    return (
                        <div key={key} className="space-y-1 group">
                            <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] p-3 rounded-xl border border-white/[0.03] transition-all">
                                <div>
                                    <p className="text-[10px] font-black text-text-bold uppercase tracking-tight">{info.label}</p>
                                    <p className="text-[9px] text-text-muted max-w-[150px]">{info.desc}</p>
                                </div>
                                <span className={`text-sm font-black transition-colors ${key === 'alpha' ? (val >= 0 ? 'text-success' : 'text-danger') : 'text-text-bold'}`}>
                                    {key === 'alpha' ? (val >= 0 ? '+' : '') : ''}{val?.toFixed(2)}{key === 'volatility' ? '%' : ''}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        <div className="bg-bg-surface border border-border-main rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <Info size={14} className="text-text-muted" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Fund Metadata</span>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center p-3 border-b border-white/5">
                    <span className="text-xs font-bold text-text-muted">Exit Load</span>
                    <span className="text-[11px] font-black text-text-bold text-right max-w-[120px]">{data.stats?.exit_load}</span>
                </div>
                <div className="flex justify-between items-center p-3 border-b border-white/5">
                    <span className="text-xs font-bold text-text-muted">Min Investment</span>
                    <span className="text-[11px] font-black text-text-bold text-right italic">₹500.00</span>
                </div>
                <div className="flex justify-between items-center p-3">
                    <span className="text-xs font-bold text-text-muted">Lock-in</span>
                    <span className="text-[11px] font-black text-text-bold text-right italic">None</span>
                </div>
            </div>
        </div>
      </div>
      <section className="animate-mf bg-bg-surface border border-border-main rounded-2xl p-8 space-y-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform duration-700">
            <TrendingUp size={120} />
         </div>
         
         <header className="space-y-1 relative z-10">
            <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-accent">SIP Calculator</h3>
            <h2 className="text-2xl font-black text-text-bold tracking-tighter italic leading-tight uppercase">Wealth Projection</h2>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">Based on this fund's {period} performance.</p>
         </header>

         <SIPCalculator cagr={firstNavReal !== 0 ? ((latestNav - firstNavReal) / firstNavReal) * 100 : 0} />
      </section>
    </div>
  );
}

function SIPCalculator({ cagr }: { cagr: number }) {
    const [amount, setAmount] = useState(5000);
    const [years, setYears] = useState(10);
    
    // Annual CAGR to monthly rate
    const r = (cagr / 100) / 12;
    const n = years * 12;
    const maturityValue = amount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const invested = amount * n;
    const wealthGained = maturityValue - invested;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-muted">
                        <span>Monthly SIP</span>
                        <span className="text-text-bold text-sm">₹{amount.toLocaleString()}</span>
                    </div>
                    <input 
                        type="range" min="500" max="100000" step="500" 
                        value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-text-muted">
                        <span>Tenure</span>
                        <span className="text-text-bold text-sm">{years} Years</span>
                    </div>
                    <input 
                        type="range" min="1" max="30" step="1" 
                        value={years} onChange={(e) => setYears(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-accent"
                    />
                </div>
            </div>

            <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Estimated Wealth</p>
                    <p className="text-4xl font-black text-text-bold tracking-tighter italic">₹{Math.round(maturityValue).toLocaleString("en-IN")}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Invested</p>
                        <p className="text-sm font-bold text-text-bold">₹{invested.toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Return Alpha</p>
                        <p className="text-sm font-bold text-success/80">₹{Math.round(wealthGained).toLocaleString("en-IN")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
