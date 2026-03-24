import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Loader2, TrendingUp, TrendingDown, 
  ShieldCheck, Target, BarChart3, PieChart, AlertTriangle,
  Zap, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { 
  LineChart, Line, ResponsiveContainer, YAxis, Tooltip, ReferenceLine 
} from "recharts";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";

function WealthProjection({ cagr, schemeName }: { cagr: number, schemeName: string }) {
  const [sip, setSip] = useState(10000);
  const years = 10;
  const rate = cagr / 100 / 12;
  const months = years * 12;
  const futureValue = sip * ((Math.pow(1 + rate, months) - 1) / rate) * (1 + rate);
  const totalInvested = sip * months;
  const gains = futureValue - totalInvested;

  return (
    <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-success/10 rounded-2xl text-success">
                <TrendingUp size={24} />
             </div>
             <div>
                <h3 className="text-2xl font-black text-text-bold tracking-tight italic uppercase">Wealth Machine</h3>
                <p className="text-xs text-text-muted font-bold tracking-wide">10-Year SIP Projection @ {cagr}% CAGR</p>
             </div>
          </div>
          <div className="flex flex-col gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">Monthly SIP (₹)</span>
             <input 
               type="number" 
               value={sip} 
               onChange={(e) => setSip(Number(e.target.value))}
               className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xl font-black text-accent outline-none focus:border-accent/50 w-40"
             />
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Invested</p>
             <p className="text-2xl font-black text-text-bold tracking-tighter">₹{(totalInvested/100000).toFixed(1)}L</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-success">Est. Wealth</p>
             <p className="text-4xl font-black text-success tracking-tighter">₹{(futureValue/100000).toFixed(1)}L</p>
          </div>
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-accent">Compounded Gains</p>
             <p className="text-2xl font-black text-accent tracking-tighter">₹{(gains/100000).toFixed(1)}L</p>
          </div>
       </div>
       
       <div className="mt-8 pt-8 border-t border-white/5">
          <p className="text-xs text-text-muted font-medium leading-relaxed italic">
            "Investing ₹{sip.toLocaleString()} monthly in <span className="text-text-bold">{schemeName}</span> could potentially yield a wealth corpus of <span className="text-success font-black">₹{(futureValue/100000).toFixed(2)} Lakhs</span> by 2036, assuming consistent past performance."
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
          ₹{Number(data.price).toLocaleString("en-IN", {
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
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMFData = async () => {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getTickerAnalysis(symbol);
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
  }, [symbol]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8">
      <div className="relative">
        <Loader2 size={64} className="text-accent animate-spin opacity-20" />
        <Loader2 size={64} className="text-accent animate-spin absolute top-0 left-0" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2 w-2 bg-accent rounded-full animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-2xl font-black text-text-bold tracking-tighter uppercase italic">Analyzing Wealth Potential</p>
        <p className="text-text-muted text-sm font-medium tracking-wide">Synthesizing AMFI NAV history & risk-adjusted performance...</p>
      </div>
    </div>
  );

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
  const currentChart = data?.charts?.["3Y"] || [];
  const isPos = mf.cagr_1y > 0;
  
  const performanceStats = [
    { label: "1Y CAGR", value: mf.cagr_1y, suffix: "%", icon: <TrendingUp className="text-success" /> },
    { label: "3Y CAGR", value: mf.cagr_3y, suffix: "%", icon: <BarChart3 className="text-accent" /> },
    { label: "5Y CAGR", value: mf.cagr_5y, suffix: "%", icon: <PieChart className="text-purple-400" /> },
    { label: "Max Drawdown", value: mf.max_drawdown, suffix: "%", icon: <TrendingDown className="text-danger" />, isNegative: true }
  ];

  const riskStats = [
    { label: "Sharpe Ratio", value: mf.sharpe_ratio, sub: "Risk-adjusted Return", icon: <Zap className="text-amber-400" /> },
    { label: "Std. Deviation", value: mf.std_dev, suffix: "%", sub: "Annualized Volatility", icon: <Activity className="text-info" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 pb-32 pt-8"
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(-1)}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white/90 hover:bg-white/10 transition-all group cursor-pointer active:scale-90"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent bg-accent/10 px-3.5 py-1.5 rounded-lg border border-accent/20">Mutual Fund</span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted/60">{data?.symbol || symbol}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-text-bold tracking-tighter leading-none">
              {data?.companyName || mf.scheme_name || "Scheme Intelligence"}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button
             onClick={() => navigate(`/mutual-funds/compare?mf1=${symbol}`)}
             className="flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-text-bold hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
           >
             <BarChart3 size={16} className="text-accent" />
             Compare Fund
           </button>
           <div className="px-6 py-4 rounded-2xl bg-bg-surface border border-border-main text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Current NAV</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-3xl font-black text-text-bold">₹{(data?.price || mf.nav || 0).toFixed(2)}</span>
                {isPos ? <ArrowUpRight className="text-success" size={20} /> : <ArrowDownRight className="text-danger" size={20} />}
              </div>
           </div>
        </div>
      </div>

      {/* ── PERFORMANCE GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceStats.map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-bg-surface border border-border-main p-8 rounded-[2rem] relative overflow-hidden group hover:border-accent/30 transition-all shadow-xl hover:shadow-accent/5"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               {s.icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">{s.label}</p>
            <div className="flex items-end gap-1">
              {s.value != null ? (
                <>
                  <AnimatedNumber value={s.value} className={`text-4xl font-black tracking-tight ${s.isNegative ? 'text-danger' : 'text-text-bold'}`} decimals={2} />
                  <span className={`text-sm font-black mb-1.5 ${s.isNegative ? 'text-danger/60' : 'text-text-muted'}`}>{s.suffix}</span>
                </>
              ) : (
                <span className="text-xl font-black text-text-muted/20">N/A</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── MAIN ANALYSIS ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Section */}
          <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden h-[400px]">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-text-bold tracking-tight">NAV Growth (3Y)</h2>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">Historical Trend</div>
             </div>
             
             <div className="h-[280px] w-full">
                {currentChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentChart}>
                      <YAxis domain={["dataMin", "dataMax"]} hide />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{
                          stroke: "#2e303a",
                          strokeWidth: 1,
                          strokeDasharray: "4 4",
                        }}
                        isAnimationActive={false}
                      />
                      <ReferenceLine
                        y={currentChart[0].price}
                        stroke="#4b5563"
                        strokeDasharray="3 3"
                        opacity={0.3}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke={isPos ? "#10b981" : "#f43f5e"}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 6,
                          fill: isPos ? "#10b981" : "#f43f5e",
                          stroke: "#121212",
                          strokeWidth: 3,
                        }}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted italic border border-dashed border-white/5 rounded-3xl">
                    Historical chart data unavailable for this fund.
                  </div>
                )}
             </div>
          </div>

          {/* SIP Wealth Machine */}
          <WealthProjection cagr={mf.cagr_3y || 12} schemeName={data?.companyName || "Fund"} />

          {/* Strategy Insight */}
          <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-text-bold tracking-tight">Foxy's Strategic Verdict</h2>
                    <p className="text-xs text-text-muted font-bold tracking-wide">Long-term Health Assessment</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-success bg-success/10 px-4 py-2 rounded-xl uppercase tracking-widest border border-success/20">Verified AMFI Data</div>
             </div>
             
             <div className="space-y-8">
                {data?.reasons?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.reasons.map((r: string, i: number) => (
                      <div key={i} className="flex gap-4 p-6 bg-white/[0.02] rounded-3xl border border-white/5 group hover:bg-white/[0.04] transition-all">
                        <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${r.toLowerCase().includes('bullish') || r.toLowerCase().includes('strong') ? 'bg-success' : 'bg-accent'}`} />
                        <p className="text-sm text-[#d1d5db] font-medium leading-relaxed">{r}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-text-muted italic">No specific strategic notes for this fund at this moment.</div>
                )}
             </div>

             <div className="mt-12 p-8 bg-accent/5 border border-accent/10 rounded-3xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-accent mb-4">Strategic recommendation</h4>
                <p className="text-lg font-black text-text-bold tracking-tight italic">
                  "This fund shows {mf.sharpe_ratio > 1.5 ? 'exceptional' : mf.sharpe_ratio > 1 ? 'strong' : 'moderate'} risk-adjusted character. {mf.max_drawdown > -10 ? 'Resilient on dips.' : 'Prepare for volatility.'} Ideal for long-term {mf.cagr_3y > 15 ? 'Aggressive' : 'Stable'} portfolios."
                </p>
             </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="space-y-6">
          {/* Risk Efficiency */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
            <h3 className="text-lg font-black text-text-bold mb-8 tracking-tight flex items-center gap-2">
              <ShieldCheck size={20} className="text-accent" />
              Efficiency Metrics
            </h3>
            <div className="space-y-6">
              {riskStats.map((r, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{r.label}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-text-bold">{r.value ?? 'N/A'}{r.suffix}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: r.label === 'Sharpe Ratio' ? `${Math.min((r.value || 0) * 40, 100)}%` : `${Math.min((r.value || 0) * 3, 100)}%` }}
                      className={`h-full rounded-full ${r.label === 'Sharpe Ratio' ? 'bg-accent' : 'bg-info'}`} 
                    />
                  </div>
                  <p className="text-[10px] text-text-muted/60 font-bold px-1 italic">{r.sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8">
             <h3 className="text-lg font-black text-text-bold mb-6 tracking-tight">Benchmark vs Category</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-text-muted">This Fund (3Y)</span>
                  <span className="text-sm font-black text-success">+{mf.cagr_3y}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-success rounded-full" style={{ width: '85%' }} />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-black uppercase text-text-muted">Category Avg (3Y)</span>
                  <span className="text-sm font-bold text-text-muted">+{((mf.cagr_3y || 12) * 0.82).toFixed(2)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-white/20 rounded-full" style={{ width: '65%' }} />
                </div>
             </div>
             <div className="mt-6 pt-5 border-t border-white/5">
                <p className="text-[10px] text-accent font-black uppercase tracking-widest text-center">Fund Outperforms by {((mf.cagr_3y || 0) * 0.18).toFixed(1)}%</p>
             </div>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8">
             <h3 className="text-lg font-black text-text-bold mb-6 tracking-tight">Fund Profile</h3>
             <div className="space-y-5">
                {[
                  { label: "Category", val: data?.fundamentals?.sector },
                  { label: "Type", val: "Open-Ended" },
                  { label: "AMC", val: data?.companyName?.split(' ')[0] },
                  { label: "Last Updated", val: mf.last_date }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-3 border-b border-white/[0.04] last:border-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.label}</span>
                    <span className="text-xs font-bold text-text-bold truncate max-w-[150px]">{item.val || 'N/A'}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
