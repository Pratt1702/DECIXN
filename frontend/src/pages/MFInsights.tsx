import { useState, useEffect } from "react";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import { useMFProfileStore } from "../store/useMFProfileStore";
import { useMFInsightsStore } from "../store/useMFInsightsStore";
import { motion } from "framer-motion";
import { analyzeMFInsights } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  type LucideIcon, 
  Info, 
  Loader2, 
  AlertTriangle, 
  Zap, 
  Target, 
  Fingerprint, 
  Layers, 
  TrendingUp, 
  ArrowUpRight, 
  RefreshCw 
} from "lucide-react";


const MetricCard = ({ title, value, insight, Icon, colorClass, prefix = "" }: { title: string, value: string | number, insight: string, Icon: LucideIcon, colorClass: string, prefix?: string }) => (
  <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-6 space-y-4 hover:border-white/10 transition-all group overflow-hidden relative">
    <div className="flex items-center justify-between relative z-10">
      <div className="space-y-1">
        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-text-muted">{title}</h3>
        <p className={`text-2xl font-black italic tracking-tighter ${colorClass}`}>{prefix}{value}</p>
      </div>
      <div className="p-2.5 bg-white/[0.03] rounded-xl group-hover:bg-white/[0.05] transition-colors">
        <Icon size={18} className={colorClass} />
      </div>
    </div>
    <p className="text-[11px] font-medium text-text-muted leading-relaxed relative z-10">{insight}</p>
    <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-5 -mr-12 -mt-12 group-hover:opacity-10 transition-all ${colorClass.replace('text-', 'bg-')}`} />
  </div>
);

export function MFInsights() {
  const { data: portfolioData } = useMFPortfolioStore();
  const { profile } = useMFProfileStore();
  const { setInsights, getValidInsights } = useMFInsightsStore();
  const [insights, setInsightsState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any = null;
    let isMounted = true;

    async function fetchInsights() {
      if (!portfolioData?.portfolio_analysis) {
        setLoading(false);
        return;
      }

      const currentHash = portfolioData.sourceHash || "default";
      const validCache = getValidInsights(currentHash);
      const isAnalyzing = location.state?.analyze;

      // Animation logic (Same as Stock Insights for satisfying UX)
      let animatedCurrent = 0;
      let animationTarget = 0;
      let animationCompleteResolve: () => void;
      const animationPromise = new Promise<void>((resolve) => {
        animationCompleteResolve = resolve;
      });

      const startAnimation = (total: number, isFast: boolean = false) => {
        animationTarget = total;
        if (total === 0) {
          animationCompleteResolve();
          return;
        }
        const step = isFast ? Math.ceil(total / 10) : 1;
        const speed = isFast ? 100 : 800;

        interval = setInterval(() => {
          animatedCurrent += step;
          setProgress({
            current: Math.min(animatedCurrent, animationTarget),
            total: animationTarget,
          });
          if (animatedCurrent >= animationTarget) {
            clearInterval(interval);
            animationCompleteResolve();
          }
        }, speed);
      };

      try {
        // Scenario 1: Valid Cache + Navigation (Smooth UX)
        if (validCache && !isAnalyzing) {
          setInsightsState(validCache);
          setLoading(false);
          return;
        }

        // Scenario 2: Valid Cache + Explicit re-analyze (Satisfying UX)
        if (validCache && isAnalyzing) {
          setLoading(true);
          startAnimation(portfolioData.portfolio_analysis.length, true);
          await animationPromise;
          if (isMounted) {
            setInsightsState(validCache);
            setLoading(false);
            navigate(".", { replace: true, state: { ...location.state, analyze: false } });
          }
          return;
        }

        // Scenario 3: Cache Miss / Initial Load
        setLoading(true);
        startAnimation(portfolioData.portfolio_analysis.length, false);
        const dataPromise = analyzeMFInsights(portfolioData.portfolio_analysis, profile);
        const [res] = await Promise.all([dataPromise, animationPromise]);

        if (res.success && isMounted) {
          setInsightsState(res.insights);
          setInsights(res.insights, currentHash);
          if (isAnalyzing) {
            navigate(".", { replace: true, state: { ...location.state, analyze: false } });
          }
        }
      } catch (err) {
        console.error("Failed to fetch MF insights", err);
      } finally {
        if (isMounted) setLoading(false);
        if (interval) clearInterval(interval);
      }
    }
    
    fetchInsights();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [portfolioData, profile, location.state]);


  if (!portfolioData) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-16 text-center space-y-4">
          <Info className="w-12 h-12 text-text-muted mx-auto opacity-20" />
          <h2 className="text-xl font-black text-text-bold uppercase tracking-tighter italic">Engine Standby</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto">Upload your portoflio data to activate the intelligence core.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <div className="py-32 flex flex-col justify-center items-center gap-6">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" />
            <Loader2
              className="w-12 h-12 animate-spin text-accent absolute top-0 left-0"
              style={{ animationDuration: "3s" }}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-text-bold text-lg font-black tracking-tighter uppercase italic">
              Calculating MF Insights
            </p>
            <p className="text-text-muted text-xs font-black uppercase tracking-widest">
              {progress.total > 0
                ? `Analyzing Fund ${progress.current} of ${progress.total}`
                : "Analyzing Allocation DNA..."}
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (insights?.error) {
    return (
      <div className="max-w-5xl mx-auto py-32 px-4">
        <div className="bg-bg-surface border border-danger/20 rounded-[2rem] p-16 text-center space-y-6 max-w-2xl mx-auto relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="p-4 bg-danger/10 rounded-2xl w-fit mx-auto text-danger">
                <AlertTriangle className="w-8 h-8 mx-auto" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-text-bold uppercase tracking-tighter italic">Analysis Failed</h2>
            <p className="text-text-muted text-sm font-medium leading-relaxed max-w-sm mx-auto">{insights.error}</p>
            <button 
                onClick={() => window.location.reload()}
                className="mt-8 px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-xl shadow-black/20"
            >
                Retry Diagnostic Core
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-danger/5 blur-[100px] -mr-32 -mt-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-12 pb-32">
      
      {/* 🧠 1 & 12: Header + DNA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-8">
            <header className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-accent/20 rounded-2xl space-y-4 relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-accent tracking-widest">Final Verdict</span>
                            <h2 className="text-2xl font-black italic text-text-bold uppercase tracking-tighter leading-none">
                                {insights?.final_verdict?.decision || "Hold & Monitor"}
                            </h2>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-text-muted uppercase">Confidence</span>
                            <span className="text-lg font-black italic text-accent">{insights?.final_verdict?.confidence}%</span>
                        </div>
                    </div>
                    <p className="text-text-muted text-sm font-medium leading-relaxed max-w-lg relative z-10">
                        {insights?.final_verdict?.why_now || "Allocation remains aligned with your long-term compounding path."}
                    </p>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] -mr-16 -mt-16 group-hover:bg-accent/10 transition-all" />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard 
                    title="Portfolio Alpha" 
                    value={insights?.portfolio_summary?.weighted_alpha || 0} 
                    prefix=""
                    insight={`Excess returns over benchmark.`} 
                    Icon={Zap} 
                    colorClass="text-accent"
                />
                <MetricCard 
                    title="Risk Score" 
                    value={insights?.portfolio_summary?.risk_score || 0} 
                    prefix=""
                    insight="Weighted volatility index (0-100)." 
                    Icon={Target} 
                    colorClass={insights?.portfolio_summary?.risk_score > 60 ? "text-danger" : "text-success"}
                />
                <MetricCard 
                    title="Confidence" 
                    value={insights?.confidence_score || "0%"} 
                    insight="Based on data completeness." 
                    Icon={Fingerprint} 
                    colorClass="text-accent"
                />
                <MetricCard 
                    title="Portfolio DNA" 
                    value={insights?.risk_analysis?.volatility + " Risk" || "Steady Builder"} 
                    insight="Overall character of your assets." 
                    Icon={Layers} 
                    colorClass="text-accent"
                />
            </div>
        </div>

        {/* Health Meter Container */}
        <div className="lg:col-span-5 bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-10 sticky top-24 shadow-2xl shadow-black/20">
            <div className="text-center space-y-6">
                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Total Health Score</h3>
            <div className="flex justify-center">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="w-56 h-56 transform -rotate-90">
                        <circle cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/[0.02]" />
                        <circle 
                            cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 90}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (insights?.health_score?.score || 0) / 100)}
                            className="text-accent transition-all duration-1000 ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-black italic tracking-tighter text-text-bold">{insights?.health_score?.score || 0}</span>
                        <div className="h-[2px] w-8 bg-accent/20 my-1 rounded-full" />
                        <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">{insights?.health_score?.label}</span>
                    </div>
                </div>
            </div>
            </div>

            <div className="space-y-6 px-4">
                {insights?.health_score?.breakdown && Object.entries(insights.health_score.breakdown).map(([key, val]: [string, any]) => (
                    <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.15em]">
                            <span className="text-text-muted">{key.replace('_', ' ')}</span>
                            <span className="text-text-bold">{val}%</span>
                        </div>
                        <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className="h-full bg-accent/40" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 🧱 4: Asset Allocation */}
      <section className="space-y-8 bg-bg-surface border border-white/[0.03] p-10 rounded-2xl">
        <header className="flex items-center justify-between">
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-text-bold tracking-tighter uppercase italic">Market Cap Allocation</h2>
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest">{insights?.allocation_breakdown?.insight}</p>
            </div>
            <div className="flex items-center gap-6">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded">Source: {insights?.allocation_breakdown?.source || "Estimated"}</span>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent"></div><span className="text-[10px] font-black text-text-muted uppercase">Large</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent/40"></div><span className="text-[10px] font-black text-text-muted uppercase">Mid</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent/20"></div><span className="text-[10px] font-black text-text-muted uppercase">Small</span></div>
            </div>
        </header>

        <div className="h-4 bg-white/[0.02] rounded-full flex overflow-hidden border border-white/5">
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${insights?.allocation_breakdown?.caps?.large_cap || 45}%` }} 
                className="h-full bg-accent" 
            />
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${insights?.allocation_breakdown?.caps?.mid_cap || 35}%` }} 
                className="h-full bg-accent/40" 
            />
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${insights?.allocation_breakdown?.caps?.small_cap || 20}%` }} 
                className="h-full bg-accent/20" 
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
             {insights?.allocation_breakdown?.caps?.sectors?.slice(0, 3).map((sector: any) => (
                 <div key={sector.name} className="p-4 bg-white/[0.01] rounded-xl border border-white/[0.03] space-y-1">
                     <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{sector.name} exposure</span>
                     <p className="text-xl font-black italic text-text-bold">{sector.value}%</p>
                 </div>
             ))}
        </div>
      </section>

      {/* 🔮 10: Goals & Projections */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-bg-surface border border-white/[0.03] p-12 rounded-2xl relative overflow-hidden group">
        <div className="absolute bottom-0 right-0 p-12 opacity-5 scale-150 group-hover:rotate-6 transition-transform duration-1000">
            <TrendingUp size={200} />
        </div>
        
        <div className="space-y-6 relative z-10">
            <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-accent">Wealth Projection</h3>
            <h2 className="text-4xl font-black text-text-bold tracking-tighter italic leading-tight uppercase">Current path yields <br/> ₹{insights?.wealth_projection?.expected?.toLocaleString() || "0"} <br/> <span className="text-text-muted">by Year {insights?.wealth_projection?.years}.</span></h2>
            <p className="text-sm font-medium text-text-muted leading-relaxed max-w-sm">Rebalancing to an optimized strategy could gain you an additional <span className="text-success">₹{(insights?.wealth_projection?.improvement || 0).toLocaleString()}</span>.</p>
        </div>

        <div className="space-y-8 relative z-10">
             {[
                 { label: "Optimized Path", val: insights?.wealth_projection?.optimized, color: "bg-success", text: "text-success font-black" },
                 { label: "Current Path", val: insights?.wealth_projection?.expected, color: "bg-accent", text: "text-accent" },
                 { label: "Market Stress (Est)", val: insights?.wealth_projection?.worst_case, color: "bg-danger", text: "text-danger" }
             ].map((proj) => (
                 <div key={proj.label} className="space-y-2">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                         <span className="text-text-muted">{proj.label}</span>
                         <span className={proj.text}>₹{proj.val?.toLocaleString() || "0"}</span>
                     </div>
                     <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1 }} className={`h-full ${proj.color} opacity-40`} />
                     </div>
                 </div>
             ))}
        </div>
      </section>

      {/* 🎯 DECISION LAYER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg"><Target className="text-accent" size={18} /></div>
                <h3 className="text-lg font-black text-text-bold tracking-tight uppercase italic">Decision Engine</h3>
            </div>
            <div className="space-y-4">
                {insights?.recommended_actions?.map((item: any, idx: number) => (
                    <div key={idx} className="p-5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] rounded-xl transition-all space-y-2">
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                item.action === 'Hold' ? 'bg-success/10 text-success' : 
                                item.action === 'Rebalance' ? 'bg-accent/10 text-accent' : 
                                'bg-danger/10 text-danger'
                            }`}>
                                {item.action}
                            </span>
                            <ArrowUpRight size={14} className="text-text-muted" />
                        </div>
                        <p className="text-sm font-bold text-text-bold uppercase tracking-tight leading-tight">{item.reason}</p>
                        <p className="text-[10px] font-medium text-text-muted italic">Impact: {item.impact}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg"><Zap className="text-accent" size={18} /></div>
                <h3 className="text-lg font-black text-text-bold tracking-tight uppercase italic">Opportunity Radar</h3>
            </div>
            <div className="space-y-4">
                {insights?.opportunity_radar?.length > 0 ? (
                    insights.opportunity_radar.map((radar: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white/[0.01] border-l-2 border-accent rounded-r-xl space-y-2 group hover:bg-white/[0.02] transition-all">
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                    radar.urgency === 'High' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'
                                }`}>
                                    {radar.type} Signal
                                </span>
                                <span className="text-[9px] font-medium text-text-muted uppercase">{radar.urgency} Priority</span>
                            </div>
                            <h4 className="text-[11px] font-black text-text-bold uppercase tracking-tight">{radar.title}</h4>
                            <p className="text-[11px] font-medium text-text-muted leading-tight">{radar.signal}</p>
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center text-text-muted/20">
                        <RefreshCw size={24} className="mx-auto mb-2 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Scanning for market signals...</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
