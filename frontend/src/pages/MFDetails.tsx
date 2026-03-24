import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMFDetails } from "../services/api";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import {
  ArrowLeft,
  AlertTriangle,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import gsap from "gsap";

const PERIODS = ["1M", "6M", "1Y", "3Y", "5Y", "MAX"];

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
                <span className="text-[10px] font-bold text-accent uppercase font-black">Fund NAV</span>
                <span className="text-[#f3f4f6] font-black">₹{Number(data.nav).toFixed(2)}</span>
            </div>
            {data.benchmarkNav && (
                <div className="flex items-center justify-between gap-4 opacity-60">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Benchmark</span>
                    <span className="text-text-muted font-bold">₹{Number(data.benchmarkNav).toFixed(2)}</span>
                </div>
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

  const history = data.history || [];
  const benchmarkHistory = data.benchmark_history || [];
  
  // Sync benchmark with fund dates for chart display
  const chartData = history.map((h: any) => {
    const bMatch = benchmarkHistory.find((b: any) => b.date === h.date);
    return {
      ...h,
      benchmarkNav: bMatch ? bMatch.nav : null
    };
  });

  const latestNav = history.length > 0 ? history[history.length - 1].nav : 0;
  const firstNav = history.length > 0 ? history[0].nav : 0;
  const navChange = latestNav - firstNav;
  const navChangePct = (navChange / firstNav) * 100;
  const isPos = navChange >= 0;

  // Dynamic Decixn Score logic
  const metrics = data.metrics || {};
  const alpha = metrics.alpha || 0;
  const sharpe = metrics.sharpe_ratio || 0;
  const rawScore = 5 + (alpha * 0.5) + (sharpe * 1.5);
  const decixnScore = Math.min(Math.max(Number(rawScore.toFixed(1)), 1.0), 9.9);

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto pb-20 space-y-8">
      <button
        onClick={() => navigate("/mutual-funds/holdings")}
        className="flex items-center gap-2 text-[10px] text-text-muted hover:text-text-bold transition-all w-fit font-black uppercase tracking-widest group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back to Portfolio
      </button>

      <header className="animate-mf space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">
                    Mutual Fund
                </span>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">
                   ISIN: {id}
                </span>
            </div>
            <h1 className="text-3xl font-black text-text-bold tracking-tighter leading-tight max-w-2xl">
              {data.scheme_name}
            </h1>
          </div>
          <div className="text-left md:text-right">
             <AnimatedNumber value={latestNav} prefix="₹" decimals={4} className="text-3xl font-black text-text-bold tracking-tighter" />
             <div className={`flex items-center md:justify-end gap-1.5 font-bold mt-1 ${isPos ? 'text-success' : 'text-danger'}`}>
                {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <AnimatedNumber value={navChangePct} showPlusSign decimals={2} suffix="%" />
                <span className="text-[10px] text-text-muted font-black uppercase tracking-widest ml-1">Across Period</span>
             </div>
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
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {PERIODS.map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${period === p ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-muted hover:text-text-bold'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 text-text-muted">
                <Zap size={14} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest">Live yfinance Feed</span>
            </div>
        </div>

        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                        </linearGradient>
                         <linearGradient id="benchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#666" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#666" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                        type="monotone" 
                        dataKey="benchmarkNav" 
                        stroke="#444" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        fill="url(#benchGradient)"
                        isAnimationActive={true}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="nav" 
                        stroke="var(--color-accent)" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#navGradient)" 
                        isAnimationActive={true}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="animate-mf grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface border border-border-main rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Info size={14} className="text-text-muted" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Fund Overview</span>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center group/item">
                    <span className="text-xs font-bold text-text-muted group-hover/item:text-text-bold transition-colors">Expense Ratio</span>
                    <span className="text-sm font-black text-text-bold italic">{(data.stats?.expense_ratio * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center group/item">
                    <span className="text-xs font-bold text-text-muted group-hover/item:text-text-bold transition-colors">Exit Load</span>
                    <span className="text-[10px] font-black text-text-bold italic max-w-[100px] text-right">{data.stats?.exit_load || "1.0%"}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                    <span className="text-xs font-bold text-text-muted group-hover/item:text-text-bold transition-colors">AUM</span>
                    <span className="text-sm font-black text-text-bold italic">₹{(data.stats?.aum / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr</span>
                </div>
            </div>
        </div>

        <div className="bg-bg-surface border border-border-main rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-text-muted" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Risk Metrics</span>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-text-muted">Volatility (SD)</span>
                    <span className="text-sm font-black text-text-bold">{data.metrics?.volatility?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-text-muted">Sharpe Ratio</span>
                    <span className={`text-sm font-black ${data.metrics?.sharpe_ratio > 1 ? 'text-success' : 'text-accent'}`}>{data.metrics?.sharpe_ratio?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-text-muted">Alpha</span>
                    <span className={`text-sm font-black ${data.metrics?.alpha >= 0 ? 'text-success' : 'text-danger'}`}>
                        {data.metrics?.alpha >= 0 ? '+' : ''}{data.metrics?.alpha?.toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>

        <div className="bg-bg-surface border border-border-main rounded-2xl p-6 bg-gradient-to-br from-bg-surface to-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-accent" />
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Decixn Score</span>
            </div>
            <div className="flex flex-col items-center justify-center py-2">
                <div className="text-4xl font-black text-text-bold italic tracking-tighter mb-1">
                    {decixnScore}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${decixnScore > 7.5 ? 'text-success' : decixnScore > 5 ? 'text-accent' : 'text-danger'}`}>
                    {decixnScore > 7.5 ? 'Very Bullish' : decixnScore > 5 ? 'Balanced' : 'Underperformer'}
                </p>
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${decixnScore * 10}%` }} />
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

         <SIPCalculator cagr={((latestNav - firstNav) / firstNav) * 100} />
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
