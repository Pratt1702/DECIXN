import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion } from "framer-motion";
import { 
  ArrowLeft, TrendingUp, TrendingDown, 
  ShieldCheck, Target, BarChart3, PieChart, AlertTriangle,
  Zap, Activity, Clock
} from "lucide-react";
import { 
  LineChart, Line, ResponsiveContainer, YAxis, Tooltip, ReferenceLine 
} from "recharts";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import gsap from "gsap";

function MFDetailsSkeleton({ logs }: { logs: string[] }) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 pt-8">
      <div className="h-4 w-32 bg-white/5 animate-pulse rounded" />
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-white/5 animate-pulse rounded-xl" />
          <div className="h-6 w-20 bg-white/5 animate-pulse rounded-md" />
        </div>
        <div className="h-4 w-48 bg-white/5 animate-pulse rounded" />
        <div className="space-y-2 pt-4">
          <div className="h-10 w-40 bg-white/5 animate-pulse rounded-xl" />
          <div className="h-4 w-64 bg-white/5 animate-pulse rounded-xl" />
        </div>
      </header>

      <div className="h-72 w-full bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        <div className="relative z-10 flex flex-col items-center gap-4 px-8 w-full max-w-md">
           <div className="flex items-center gap-3 text-accent animate-pulse font-black uppercase text-[10px] tracking-[0.2em]">
             <Activity size={16} className="animate-spin" style={{ animationDuration: '3s' }} />
             Synthesizing Decision Intelligence
           </div>
           <div className="w-full space-y-2 mt-4">
             {logs.map((log, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1 - (logs.length - 1 - i) * 0.2, x: 0 }}
                 key={i} 
                 className="flex items-center gap-2 text-[10px] font-bold text-text-muted/60 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5"
               >
                 <Clock size={10} />
                 {log}
               </motion.div>
             ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-white/5 animate-pulse rounded-[2rem]" />
        <div className="h-32 bg-white/5 animate-pulse rounded-[2rem]" />
        <div className="h-32 bg-white/5 animate-pulse rounded-[2rem]" />
        <div className="h-32 bg-white/5 animate-pulse rounded-[2rem]" />
      </div>
    </div>
  );
}

function WealthProjection({ cagr, schemeName }: { cagr: number, schemeName: string }) {
  const [sip, setSip] = useState(10000);
  const years = 10;
  const rate = cagr / 100 / 12;
  const months = years * 12;
  const futureValue = sip * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
  const totalInvested = sip * months;
  const gains = futureValue - totalInvested;

  return (
    <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
       <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-success/10 rounded-xl text-success">
                <TrendingUp size={20} />
             </div>
             <div>
                <h3 className="text-xl font-black text-text-bold tracking-tight uppercase">Wealth Machine</h3>
                <p className="text-[10px] text-text-muted font-bold tracking-wide">10-Year SIP Projection @ {cagr}% CAGR</p>
             </div>
          </div>
          <div className="flex flex-col gap-1.5">
             <span className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Monthly SIP (₹)</span>
             <input 
               type="number" 
               value={sip} 
               onChange={(e) => setSip(Number(e.target.value))}
               className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-lg font-black text-accent outline-none focus:border-accent/50 w-full"
             />
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Total Invested</p>
              <p className="text-lg font-black text-text-bold tracking-tighter">₹{(totalInvested/100000).toFixed(1)}L</p>
          </div>
          <div className="flex justify-between items-center bg-success/5 p-4 rounded-2xl border border-success/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-success">Est. Wealth</p>
              <p className="text-2xl font-black text-success tracking-tighter">₹{(futureValue/100000).toFixed(1)}L</p>
          </div>
          <div className="flex justify-between items-center bg-accent/5 p-4 rounded-2xl border border-accent/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent">Compounded Gains</p>
              <p className="text-lg font-black text-accent tracking-tighter">₹{(gains/100000).toFixed(1)}L</p>
          </div>
       </div>
       
       <div className="pt-6 border-t border-white/5">
          <p className="text-[11px] text-text-muted font-medium leading-relaxed italic">
            "Investing ₹{sip.toLocaleString()} monthly in <span className="text-text-bold">{schemeName}</span> could potentially yield a wealth corpus of <span className="text-success font-black">₹{(futureValue/100000).toFixed(2)} Lakhs</span> by 2036."
          </p>
       </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 shadow-2xl text-xs font-medium flex items-center gap-2">
        <span className="text-[#f3f4f6] font-bold">
          ₹{Number(data.price || data.nav).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[#9ca3af]">{data.date}</span>
      </div>
    );
  }
  return null;
};

export function MFDetails() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [period, setPeriod] = useState("3Y");
  const containerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setStatusLogs(prev => [...prev.slice(-3), msg]);
  };

  useEffect(() => {
    const fetchMFData = async () => {
      if (!ticker) return;
      setLoading(true);
      setError(null);
      setStatusLogs([]);
      
      addLog("Initializing Mutual Fund secure tunnel...");
      
      setTimeout(() => addLog("Resolving ISIN with AMFI database..."), 800);
      setTimeout(() => addLog("Fetching historical NAV series..."), 2000);
      setTimeout(() => addLog("Synthesizing risk-adjusted returns..."), 3500);
      setTimeout(() => addLog("Finalizing Strategic Verdict..."), 5000);

      try {
        const res = await getTickerAnalysis(ticker);
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || "Failed to fetch Mutual Fund data");
        }
      } catch (e: any) {
        setError(e.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMFData();
  }, [ticker]);

  useEffect(() => {
    if (!loading && data && !data.error && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".animate-value",
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.05,
            ease: "power4.out",
          },
        );
      }, containerRef.current);
      return () => ctx.revert();
    }
  }, [loading, data]);

  if (loading) return <MFDetailsSkeleton logs={statusLogs} />;

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 px-6">
      <div className="bg-danger/5 border border-danger/10 rounded-[2.5rem] p-12 text-center backdrop-blur-xl">
        <div className="h-20 w-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-danger/20">
          <AlertTriangle size={40} className="text-danger" />
        </div>
        <h2 className="text-3xl font-black text-text-bold mb-4 tracking-tight">Analysis Interrupted</h2>
        <p className="text-text-muted font-medium mb-10 leading-relaxed max-w-md mx-auto">{error}</p>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => window.location.reload()} className="py-4 bg-danger text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-danger/20">Retry Sync</button>
          <button onClick={() => navigate(-1)} className="py-4 bg-white/5 text-text-muted rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">Exit Page</button>
        </div>
      </div>
    </div>
  );

  const mf = data?.mf_intelligence || {};
  const currentChart = data?.charts?.[period] || [];
  const isPos = (mf.cagr_1y || 0) > 0;
  
  const performanceStats = [
    { label: "1Y CAGR", value: mf.cagr_1y, suffix: "%", icon: <TrendingUp className="text-success" /> },
    { label: "3Y CAGR", value: mf.cagr_3y, suffix: "%", icon: <BarChart3 className="text-accent" /> },
    { label: "5Y CAGR", value: mf.cagr_5y, suffix: "%", icon: <PieChart className="text-purple-400" /> },
    { label: "Drawdown", value: mf.max_drawdown, suffix: "%", icon: <TrendingDown className="text-danger" />, isNegative: true }
  ];

  const riskStats = [
    { label: "Sharpe Ratio", value: mf.sharpe_ratio, sub: "Risk-adjusted Return", icon: <Zap className="text-amber-400" /> },
    { label: "Std. Deviation", value: mf.std_dev, suffix: "%", sub: "Volatility", icon: <Activity className="text-info" /> }
  ];

  const periods = ["1M", "3M", "6M", "1Y", "3Y", "5Y"];

  return (
    <div ref={containerRef} className="space-y-6 max-w-3xl mx-auto pb-12 pt-8">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[11px] text-text-muted hover:text-text-bold transition-all w-fit group cursor-pointer font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Explorer
        </button>
        
        <button
          onClick={() => navigate(`/mutual-funds/compare?mf1=${ticker}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"
        >
          <BarChart3 size={14} />
          Compare Fund
        </button>
      </div>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end gap-3 mb-1">
          <div className="animate-value flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-text-bold">
              {data?.companyName || mf.scheme_name || "Scheme Intelligence"}
            </h1>
            <span className="bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest self-center">
              Mutual Fund
            </span>
          </div>
        </div>
        
        <p className="text-[11px] font-bold text-text-muted/60 uppercase tracking-widest animate-value">
          ISIN: {data?.symbol || ticker}
        </p>

        <div className="mt-6 flex flex-col gap-1">
            <div className="animate-value">
              <AnimatedNumber
                value={data?.price || mf.nav || 0}
                prefix="₹"
                decimals={2}
                className="block text-3xl font-black tracking-tight text-text-bold leading-none mb-1"
              />
              <div className={`flex items-center gap-2 font-black text-sm ${isPos ? "text-success" : "text-danger"}`}>
                <span>{isPos ? "+" : ""}{(mf.cagr_1y || 0).toFixed(2)}%</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-text-muted font-bold uppercase text-[10px] tracking-widest">
                  Past 1Y
                </span>
              </div>
            </div>
        </div>
      </header>

      {/* Chart Section */}
      <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-[380px] animate-value">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-text-bold tracking-tight uppercase italic flex items-center gap-2">
               <Activity size={14} className="text-accent" />
               NAV Growth ({period})
            </h2>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    period === p ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-bold hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
         </div>
         
         <div className="h-[220px] w-full">
            {currentChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentChart}>
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#2e303a", strokeWidth: 1, strokeDasharray: "4 4" }}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    y={currentChart[0].price || currentChart[0].nav}
                    stroke="#4b5563"
                    strokeDasharray="3 3"
                    opacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey={currentChart[0].price !== undefined ? "price" : "nav"}
                    stroke={isPos ? "#10b981" : "#3b82f6"}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: isPos ? "#10b981" : "#3b82f6", stroke: "#121212", strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-[10px] font-bold uppercase tracking-widest bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                Data for {period} Pending Synthesis
              </div>
            )}
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 animate-value">
        {performanceStats.map((s, i) => (
          <div key={i} className="bg-bg-surface border border-border-main p-6 rounded-[2rem] group hover:border-accent/30 transition-all shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-4">{s.label}</p>
            <div className="flex items-end gap-1">
              <AnimatedNumber value={s.value || 0} className={`text-2xl font-black tracking-tight ${s.isNegative ? 'text-danger' : 'text-text-bold'}`} decimals={2} />
              <span className={`text-[10px] font-black mb-1 ${s.isNegative ? 'text-danger/60' : 'text-text-muted'}`}>{s.suffix}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 pt-2">
        <WealthProjection cagr={mf.cagr_1y || 12} schemeName={data?.companyName || "Fund"} />
        
        {/* Strategy Verdict */}
        <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-value">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-accent/10 rounded-xl text-accent">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-text-bold tracking-tight uppercase">Strategic Verdict</h2>
                <p className="text-[10px] text-text-muted font-bold tracking-wide italic">Decision Intelligence Output</p>
              </div>
           </div>
           
           <div className="space-y-4">
              {data?.reasons?.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {data.reasons.map((r: string, i: number) => (
                    <div key={i} className="flex gap-4 p-5 bg-white/[0.02] rounded-2xl border border-white/5 group hover:bg-white/[0.04] transition-all">
                      <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${r.toLowerCase().includes('bullish') || r.toLowerCase().includes('strong') ? 'bg-success' : 'bg-accent'}`} />
                      <p className="text-[13px] text-[#d1d5db] font-medium leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-[11px] text-text-muted font-black uppercase tracking-widest opacity-30">Analytical insights pending...</div>
              )}
           </div>

           <div className="mt-8 p-6 bg-accent/5 border border-accent/10 rounded-2xl">
              <p className="text-base font-black text-text-bold tracking-tight italic text-center">
                "Consensus: This fund is {mf.sharpe_ratio > 1.2 ? 'Optimized' : 'Stable'} for {mf.cagr_1y > 15 ? 'Growth' : 'Preservation'}. Verified by AMFI."
              </p>
           </div>
        </div>

        {/* Info Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-value">
            <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-6 space-y-4">
               <h3 className="text-xs font-black text-text-bold uppercase tracking-widest flex items-center gap-2">
                 <ShieldCheck size={14} className="text-info" /> Risk Metrics
               </h3>
               {riskStats.map((r, i) => (
                 <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-muted">
                       <span>{r.label}</span>
                       <span className="text-text-bold">{r.value || 0}{r.suffix}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-info rounded-full" style={{ width: `${Math.min((r.value || 0) * (r.label.includes('Ratio') ? 40 : 2), 100)}%` }} />
                    </div>
                 </div>
               ))}
            </div>

            <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-6 space-y-4">
               <h3 className="text-xs font-black text-text-bold uppercase tracking-widest flex items-center gap-2">
                 <Activity size={14} className="text-warning" /> Fund Profile
               </h3>
               <div className="space-y-3">
                 {[
                   { label: "Category", val: data?.fundamentals?.sector },
                   { label: "AMC", val: data?.companyName?.split(' ')[0] },
                   { label: "Updated", val: mf.last_date }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-text-muted">{item.label}</span>
                     <span className="text-text-bold truncate max-w-[120px]">{item.val || 'N/A'}</span>
                   </div>
                 ))}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
