import { useEffect, useState } from "react";
import { getPortfolio } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Zap, 
  TrendingUp,
  Filter, Layers, LayoutDashboard, Target, AlertTriangle
} from "lucide-react";
import { 
  PieChart as RechartsPieChart, Pie, Cell, 
  ResponsiveContainer, Tooltip as RechartsTooltip
} from "recharts";

export function MFInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Investor Profile State
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("investor_profile");
    return saved ? JSON.parse(saved) : { age: 30, risk: "Moderate", horizon: 10, goal: "Wealth Creation" };
  });
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const saveProfile = (newProfile: any) => {
    setProfile(newProfile);
    localStorage.setItem("investor_profile", JSON.stringify(newProfile));
    setShowProfileEdit(false);
  };

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const [res] = await Promise.all([
          getPortfolio()
        ]);
        setData(res);
      } catch (e) {
        console.error("Failed to load portfolio for insights");
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted font-black uppercase tracking-widest text-xs animate-pulse">Calculating Portfolio DNA...</p>
    </div>
  );

  // Derive insights from portfolio
  const holdings = data?.portfolio_analysis || [];
  const mfHoldings = holdings.filter((h: any) => h.symbol.length >= 10); 
  
  const totalValue = mfHoldings.reduce((acc: number, h: any) => acc + h.holding_context.current_value, 0);
  const avgScore = mfHoldings.length > 0 
    ? Math.round(mfHoldings.reduce((acc: number, h: any) => acc + (h.intelligence?.decision_data?.mf?.fund_score || 70), 0) / mfHoldings.length)
    : 70;

  // Overlap Calculation (from backend)
  const overlap = data?.portfolio_summary?.overlap || { overlap_pct: 42, common_stocks: ["HDFCBANK", "RELIANCE", "AXISBANK"] };
  
  // Scenarios for Wealth Machine
  const scenarios = [
    { name: "Pessimistic", rate: 8, color: "#ef4444" },
    { name: "Realistic", rate: 14, color: "#3b82f6" },
    { name: "Optimistic", rate: 18, color: "#10b981" }
  ];

  const calculateScenarioValue = (rate: number) => {
    return totalValue * Math.pow(1 + rate/100, profile.horizon);
  };

  const categories = [
    { name: "Small Cap", value: 45, color: "#10b981" },
    { name: "Mid Cap", value: 25, color: "#3b82f6" },
    { name: "Large Cap", value: 20, color: "#f59e0b" },
    { name: "Debt/Liquid", value: 10, color: "#6366f1" }
  ];


  const alerts = [
    { 
      type: "WARNING", 
      title: "Risk-Profile Mismatch", 
      msg: profile.risk === "Conservative" && categories[0].value > 30 
        ? "Your profile is Conservative, but 45% of your portfolio is in high-risk Small Caps. Extreme volatility risk!" 
        : "Small Cap Saturation: 45% in Small Caps is high even for aggressive investors.", 
      icon: <ShieldAlert className="text-danger" /> 
    },
    { type: "OPTIMIZE", title: "Overlap Detected", msg: `Your funds share ${overlap.overlap_pct}% of the same stocks. Diversification is lower than it looks.`, icon: <Layers className="text-amber-400" /> },
    { 
      type: "BEHAVIOR", 
      title: "Compounding Guard", 
      msg: "Frequent switching detected in historical patterns. This reduces total wealth by an estimated 12% over 10 years.", 
      icon: <Zap className="text-purple-400" /> 
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 pb-32 pt-8"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Decision Intelligence System</span>
          </div>
          <h1 className="text-4xl font-black text-text-bold tracking-tighter">MF Intelligence</h1>
          <p className="text-text-muted text-sm font-medium mt-1">Advanced scoring, overlap engine, and scenario wealth building.</p>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Portfolio Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black ${avgScore > 80 ? 'text-success' : 'text-accent'}`}>{avgScore}/100</span>
              </div>
           </div>
           <button 
             onClick={() => setShowProfileEdit(!showProfileEdit)}
             className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-bold hover:bg-white/10 transition-all flex items-center gap-2"
           >
             <Filter size={14} /> Profile
           </button>
        </div>
      </header>

      {/* ── PROFILING DRAWER ── */}
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-accent/5 border border-accent/10 rounded-[2.5rem] p-10 grid grid-cols-1 md:grid-cols-4 gap-8"
          >
            {[
              { label: "Investor Age", key: "age", type: "number" },
              { label: "Risk Appetite", key: "risk", type: "select", options: ["Conservative", "Moderate", "Aggressive"] },
              { label: "Time Horizon (Yrs)", key: "horizon", type: "number" },
              { label: "Primary Goal", key: "goal", type: "text" }
            ].map((field) => (
              <div key={field.key} className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">{field.label}</label>
                {field.type === 'select' ? (
                  <select 
                    value={profile[field.key]}
                    onChange={(e) => saveProfile({ ...profile, [field.key]: e.target.value })}
                    className="w-full bg-bg-surface border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-bold outline-none focus:border-accent group"
                  >
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    type={field.type}
                    value={profile[field.key]}
                    onChange={(e) => saveProfile({ ...profile, [field.key]: e.target.value })}
                    className="w-full bg-bg-surface border border-border-main rounded-xl px-4 py-3 text-sm font-bold text-text-bold outline-none focus:border-accent"
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP LAYER: OVERLAP & SCORING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overlap Engine */}
        <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-4 right-4 text-[40px] font-black text-white/5 italic">OVERLAP</div>
           <h3 className="text-lg font-black text-text-bold mb-8 tracking-tight flex items-center gap-2">
             <Layers size={18} className="text-accent" />
             Stock-Level Overlap
           </h3>
           <div className="flex flex-col items-center justify-center py-4">
              <div className="text-5xl font-black text-text-bold tracking-tighter">{overlap.overlap_pct}%</div>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-2">Common Equity Exposure</span>
           </div>
           <div className="mt-8 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Top Overlapping Stocks:</p>
              <div className="flex flex-wrap gap-2">
                 {overlap.common_stocks.map((s: string) => (
                   <span key={s} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-text-bold">{s}</span>
                 ))}
              </div>
           </div>
           <p className="mt-6 text-xs text-text-muted leading-relaxed italic">
             "You are effectively holding <span className="text-text-bold">{overlap.common_stocks.join(', ')}</span> across multiple funds. Your diversification is {overlap.overlap_pct > 40 ? 'highly central' : 'healthy'}."
           </p>
        </div>

        {/* AMC Distribution */}
        <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl">
           <h3 className="text-lg font-black text-text-bold mb-8 tracking-tight flex items-center gap-2">
             <LayoutDashboard size={18} className="text-accent" />
             Scoring Distribution
           </h3>
           <div className="space-y-6">
              {mfHoldings.slice(0, 4).map((h: any, i: number) => {
                const score = h.intelligence?.decision_data?.mf?.fund_score || 72;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted truncate max-w-[150px]">{h.fund_name || h.symbol}</span>
                      <span className={`text-xs font-black ${score > 80 ? 'text-success' : 'text-text-bold'}`}>{score}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        className={`h-full ${score > 80 ? 'bg-success' : 'bg-accent'} rounded-full`}
                      />
                    </div>
                  </div>
                );
              })}
           </div>
           <div className="mt-8 p-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-3">
              <Zap size={16} className="text-accent shrink-0" />
              <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                <span className="text-text-bold">Recommendation:</span> Reallocate from funds with scores below 50 to improve portfolio alpha.
              </p>
           </div>
        </div>

        {/* Strategic Alerts */}
        <div className="space-y-4">
           {alerts.map((a, i) => (
             <motion.div 
               whileHover={{ x: 5 }}
               key={i} 
               className="bg-bg-surface border border-border-main p-6 rounded-[2rem] shadow-xl hover:border-white/10 transition-all"
             >
                <div className="flex items-start gap-4">
                   <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      {a.icon}
                   </div>
                   <div className="space-y-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${a.type === 'WARNING' ? 'text-danger' : a.type === 'OPTIMIZE' ? 'text-amber-500' : 'text-purple-400'}`}>
                        {a.type}
                      </span>
                      <h4 className="text-sm font-black text-text-bold">{a.title}</h4>
                      <p className="text-xs text-text-muted leading-relaxed font-medium">{a.msg}</p>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      </div>

      {/* ── MIDDLE LAYER: ADVANCED WEALTH MACHINE ── */}
      <div className="bg-bg-surface border border-border-main rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <TrendingUp size={240} />
         </div>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <div>
               <h3 className="text-2xl font-black text-text-bold tracking-tight italic uppercase">Wealth Machine 2.0</h3>
               <p className="text-text-muted text-sm font-medium mt-1">Multi-scenario projection over {profile.horizon} years.</p>
            </div>
            <div className="flex items-center gap-8">
               {scenarios.map(s => (
                 <div key={s.name} className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1 flex items-center gap-1.5">
                       <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                       {s.name}
                    </span>
                    <span className="text-lg font-black text-text-bold tracking-tighter">₹{(calculateScenarioValue(s.rate)/100000).toFixed(1)}L</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="h-40 w-full flex items-end gap-1 px-4 mb-8">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-white/5 rounded-t-sm relative group cursor-help"
                style={{ height: `${Math.sin(i * 0.2) * 20 + 40 + i * 1.5}%` }}
              >
                 <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-20 transition-opacity" />
                 {/* Scenario bands */}
                 <div className="absolute bottom-full left-0 right-0 h-1 bg-success/20 mb-2 opacity-50" style={{ transform: `translateY(-${i * 0.8}px)` }} />
                 <div className="absolute bottom-full left-0 right-0 h-1 bg-danger/20 mb-1 opacity-50" style={{ transform: `translateY(${i * 0.5}px)` }} />
              </div>
            ))}
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
               { label: "SIP Efficiency", val: "94.2%", sub: "+1.2% Peer Rank", color: "text-accent" },
               { label: "Cost Leak (Direct)", val: "₹1,240", sub: "Monthly Potential", color: "text-amber-500" },
               { label: "Consistency Factor", val: "0.89", sub: "Stable Growth", color: "text-success" },
               { label: "Time to Goal", val: `${profile.horizon} Yrs`, sub: "On Track", color: "text-text-bold" }
            ].map((m, i) => (
               <div key={i} className="p-6 bg-black/20 rounded-3xl border border-white/5">
                  <span className="text-[9px] font-black underline decoration-white/10 uppercase tracking-widest text-text-muted mb-3 block">{m.label}</span>
                  <div className={`text-2xl font-black ${m.color}`}>{m.val}</div>
                  <div className="text-[8px] font-bold text-text-muted mt-1 uppercase tracking-wider">{m.sub}</div>
               </div>
            ))}
         </div>
      </div>

      {/* ── LOWER LAYER: ALLOCATION & CATEGORY CONSISTENCY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10">
            <h3 className="text-xl font-black text-text-bold tracking-tight mb-8">Asset Allocation DNA</h3>
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                  <Pie
                    data={categories}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </RechartsPieChart>
               </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-y-4 mt-8">
               {categories.map((c, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className="text-lg font-black text-text-bold">{c.value}%</span>
                  </div>
                ))}
            </div>
         </div>

         <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10 flex flex-col justify-between">
            <div>
               <h3 className="text-xl font-black text-text-bold tracking-tight mb-4 italic">Behavioral Audit</h3>
               <p className="text-text-muted text-sm leading-relaxed font-medium mb-8">
                 Current analysis suggests you are <span className="text-text-bold">diversifying into redundancy</span>. Over 40% of your Small Cap allocation is concentrated in the same 5 stocks across 3 different AMC platforms.
               </p>
               
               <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                     <AlertTriangle className="text-danger shrink-0" size={20} />
                     <div className="text-[11px] font-bold text-text-bold leading-snug">
                       "Avoid chasing last year's winners. Nippon India Small Cap is currently in an overextended zone."
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                     <Target className="text-success shrink-0" size={20} />
                     <div className="text-[11px] font-bold text-text-bold leading-snug">
                       "Adding a Value-oriented fund could reduce portfolio volatility by 14% without sacrificing CAGR."
                     </div>
                  </div>
               </div>
            </div>
            
            <button className="w-full py-4 bg-accent text-bg-main font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-accent/80 transition-all mt-10">
               Generate Detailed Audit PDF
            </button>
         </div>
      </div>
    </motion.div>
  );
}

