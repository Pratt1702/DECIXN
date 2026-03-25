import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, TrendingUp, TrendingDown, 
  AlertTriangle,
  Zap, Activity, Clock, CheckCircle2, BarChart3
} from "lucide-react";
import { 
  LineChart, Line, ResponsiveContainer, YAxis, Tooltip, ReferenceLine 
} from "recharts";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import gsap from "gsap";

const PERIODS = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "All"];

function ProcessingStatus({ logs, visible }: { logs: string[], visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 z-50 bg-[#121212] border border-white/10 rounded-2xl p-4 shadow-2xl max-w-xs w-full backdrop-blur-xl"
        >
           <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-text-bold">Engine Processing</span>
           </div>
           <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-text-muted/80">
                  <CheckCircle2 size={10} className={i === logs.length - 1 ? 'text-accent animate-pulse' : 'text-success'} />
                  {log}
                </div>
              ))}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MFDetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 pt-8 px-4">
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
      <div className="h-[340px] w-full bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5 mt-4" />
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 shadow-2xl text-xs font-bold flex items-center gap-2">
        <span className="text-[#f3f4f6]">
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
  const [period, setPeriod] = useState("1Y");
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

  const currentPrice = data?.price || 0;
  const currentChart = data?.charts?.[period] || [];
  
  let priceChange = 0;
  let priceChangePct = 0;
  
  if (currentChart && currentChart.length > 0) {
    const firstPrice = currentChart[0].price || currentChart[0].nav || 0;
    if (firstPrice > 0) {
      priceChange = currentPrice - firstPrice;
      priceChangePct = (priceChange / firstPrice) * 100;
    }
  }

  const isPos = priceChange >= 0;

  useEffect(() => {
    if (!loading && data && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".animate-value",
          { opacity: 0, scale: 0.95, y: 10 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            stagger: 0.05,
            ease: "power4.inOut",
          },
        );
      }, containerRef.current);
      return () => ctx.revert();
    }
  }, [loading, data]);

  if (loading && !data) return <MFDetailsSkeleton />;

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 px-6">
      <div className="bg-danger/5 border border-danger/10 rounded-[2.5rem] p-12 text-center backdrop-blur-xl">
        <div className="h-20 w-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-danger/20">
          <AlertTriangle size={40} className="text-danger" color="#e13451" />
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

  return (
    <div ref={containerRef} className="space-y-6 max-w-3xl mx-auto pb-12 pt-8 px-4">
      <ProcessingStatus logs={statusLogs} visible={loading} />
      
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

        <div className="mt-6 text-left">
            <div className="animate-value">
              <AnimatedNumber
                value={currentPrice}
                prefix="₹"
                decimals={2}
                className="block text-3xl font-black tracking-tight text-text-bold leading-none"
              />
              <div
                className={`flex items-center gap-2 font-black mt-1.5 text-base ${isPos ? "text-success" : "text-danger"}`}
              >
                <span>
                  <AnimatedNumber
                    value={priceChange}
                    showPlusSign
                    decimals={2}
                    className="inline-block"
                  />{" "}
                  (
                  <AnimatedNumber
                    value={priceChangePct}
                    showPlusSign
                    decimals={2}
                    className="inline-block"
                  />
                  %)
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-text-muted font-bold uppercase text-xs tracking-widest">
                  {period}
                </span>
              </div>
            </div>
        </div>
      </header>

      {/* Chart Section */}
      <div className="bg-bg-surface border-b border-white/5 pb-8 mb-4 animate-value">
         <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-text-bold tracking-tight uppercase flex items-center gap-2">
               <Activity size={14} className="text-accent" />
               NAV Growth
            </h2>
         </div>
         
         <div className="h-72 sm:h-80 w-full relative mb-6">
            {currentChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentChart}>
                  <YAxis domain={["dataMin", "dataMax"]} hide />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#ffffff10", strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                  <ReferenceLine
                    y={currentChart[0].price || currentChart[0].nav}
                    stroke="#4b5563"
                    strokeDasharray="4 4"
                    opacity={0.3}
                  />
                  <Line
                    type="monotone"
                    dataKey={currentChart[0].price !== undefined ? "price" : "nav"}
                    stroke={isPos ? "#10b981" : "#e13451"}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: isPos ? "#10b981" : "#e13451", stroke: "#121212", strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-[10px] font-bold uppercase tracking-widest bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                Synthesizing Data...
              </div>
            )}
         </div>

         <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none px-4">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  period === p 
                    ? "bg-border-main text-text-bold border border-white/10 shadow-lg" 
                    : "bg-transparent text-text-muted hover:text-text-bold hover:bg-white/5"
                }`}
              >
                {p}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
}
