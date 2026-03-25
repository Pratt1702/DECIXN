import { useEffect, useState } from "react";
import { 
  Zap, TrendingUp, Info, 
  Target, ArrowUpRight,
  Layers, Wallet, RefreshCw, Fingerprint
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import { useMFProfileStore } from "../store/useMFProfileStore";
import { motion } from "framer-motion";
import { analyzeMFInsights } from "../services/api";

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
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      if (!portfolioData?.portfolio_analysis) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // We pass profile data to backend or use it to augment local results
        const res = await analyzeMFInsights(portfolioData.portfolio_analysis, profile);
        if (res.success) {
          setInsights(res.insights);
        }
      } catch (err) {
        console.error("Failed to fetch MF insights", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, [portfolioData]);

  // Derived Personalization
  const getRiskStatus = () => {
    if (!insights || !profile) return "Balanced";
    const smallCap = insights.allocation_breakdown?.caps?.small_cap || 0;
    if (profile.age > 50 && smallCap > 25) return "Too Aggressive";
    if (profile.age < 30 && smallCap < 10) return "Too Conservative";
    return "Balanced";
  };

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
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <RefreshCw className="w-12 h-12 text-accent animate-spin opacity-20" />
          <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Analyzing Allocation DNA</p>
        </div>
      </div>
    );
  }

  const riskStatus = getRiskStatus();

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-12 pb-32">
      
      {/* 🧠 1 & 12: Header + DNA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-8">
            <header className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.05] rounded-full">
                    <Fingerprint size={12} className="text-accent" />
                    <span className="text-[9px] font-black text-text-bold uppercase tracking-[0.2em]">Personalized Insights for Age {profile.age}</span>
                </div>
                <h1 className="text-6xl font-black text-text-bold tracking-tighter uppercase italic leading-[0.85] select-none">
                    Portfolio <br/> <span className="text-accent">IQ</span> Engine
                </h1>
                <p className="text-text-muted text-base font-medium leading-relaxed max-w-lg border-l-2 border-accent/20 pl-6 py-1">
                    {insights?.health_score?.insight || "Diagnostic analysis complete. Your portfolio architecture shows moderate efficiency."}
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard 
                    title="Portfolio Overlap" 
                    value={insights?.overlap?.percentage || 0} 
                    prefix="%"
                    insight={insights?.overlap?.suggestion} 
                    Icon={Layers} 
                    colorClass="text-accent"
                />
                <MetricCard 
                    title="Cost Leak" 
                    value={insights?.expense_leak?.annual_leak || 0} 
                    prefix="₹"
                    insight={insights?.expense_leak?.insight} 
                    Icon={Wallet} 
                    colorClass={insights?.expense_leak?.has_regular_plans ? "text-danger" : "text-success"}
                />
                <MetricCard 
                    title="Risk Profile" 
                    value={riskStatus} 
                    insight={`Based on your Age (${profile.age}) and Allocation.`} 
                    Icon={Target} 
                    colorClass={riskStatus === "Balanced" ? "text-success" : "text-danger"}
                />
                <MetricCard 
                    title="Portfolio DNA" 
                    value={insights?.risk_profile?.dna || "Steady Builder"} 
                    insight="Overall character of your assets." 
                    Icon={Fingerprint} 
                    colorClass="text-accent"
                />
            </div>
        </div>

        {/* Health Meter Container */}
        <div className="lg:col-span-5 bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-10 sticky top-24 shadow-2xl shadow-black/20">
            <div className="text-center space-y-6">
                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-text-muted">Total Health Score</h3>
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
            <h2 className="text-4xl font-black text-text-bold tracking-tighter italic leading-tight uppercase">Current path yields <br/> ₹{insights?.wealth_projection?.expected?.toLocaleString() || "0"} <br/> <span className="text-text-muted">by Year 10.</span></h2>
            <p className="text-sm font-medium text-text-muted leading-relaxed max-w-sm">Based on {profile.horizon} horizon with consistent compounding. This assumes target allocation parity.</p>
        </div>

        <div className="space-y-8 relative z-10">
             {[
                 { label: "Optimistic Bull", val: insights?.wealth_projection?.best_case, color: "bg-success", text: "text-success" },
                 { label: "Balanced Path", val: insights?.wealth_projection?.expected, color: "bg-accent", text: "text-accent" },
                 { label: "Market Stress", val: insights?.wealth_projection?.worst_case, color: "bg-danger", text: "text-danger" }
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

      {/* 🎯 AI Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg"><Target className="text-accent" size={18} /></div>
                <h3 className="text-lg font-black text-text-bold tracking-tight uppercase italic">Strategic Rebalance</h3>
            </div>
            <div className="space-y-2">
                {insights?.rebalancing?.suggestions?.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.03] rounded-xl transition-all">
                        <ArrowUpRight size={14} className="text-accent shrink-0" />
                        <p className="text-[11px] font-bold text-text-bold uppercase tracking-tight">{item}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-bg-surface border border-white/[0.03] rounded-2xl p-8 space-y-6 italic">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg"><Zap className="text-accent" size={18} /></div>
                <h3 className="text-lg font-black text-text-bold tracking-tight uppercase italic">Alpha Layer</h3>
            </div>
            <div className="space-y-4">
                {insights?.opportunity_signals?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-1 px-4 border-l-2 border-accent/20">
                        <span className="text-[9px] font-black uppercase text-accent tracking-[0.2em]">{item.title}</span>
                        <p className="text-sm font-bold text-text-bold leading-tight select-none">{item.message}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
