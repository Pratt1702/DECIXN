import { useEffect, useState } from "react";
import { getPortfolio } from "../services/api";
import { motion } from "framer-motion";
import { 
  PieChart as PieChartIcon, ShieldAlert, Zap, 
  TrendingUp, Info, ArrowUpRight, Target,
  Filter, Layers, LayoutDashboard
} from "lucide-react";
import { 
  PieChart as RechartsPieChart, Pie, Cell, 
  ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis
} from "recharts";

export function MFInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const res = await getPortfolio();
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
  const mfHoldings = holdings.filter((h: any) => h.symbol.length >= 10); // Simple heuristic for now
  
  const totalValue = mfHoldings.reduce((acc: number, h: any) => acc + h.holding_context.current_value, 0);
  
  // Categorization (Mocked for now since we don't have metadata for all funds)
  const categories = [
    { name: "Small Cap", value: 45, color: "#10b981" },
    { name: "Mid Cap", value: 25, color: "#3b82f6" },
    { name: "Large Cap", value: 20, color: "#f59e0b" },
    { name: "Debt/Liquid", value: 10, color: "#6366f1" }
  ];

  const topAMC = [
    { name: "Quant", weight: 35 },
    { name: "HDFC", weight: 25 },
    { name: "Nippon", weight: 20 },
    { name: "ICICI", weight: 15 },
    { name: "Others", weight: 5 }
  ];

  const alerts = [
    { type: "WARNING", title: "Small Cap Saturation", msg: "45% of your portfolio is in Small Caps. High volatility risk in bearish regimes.", icon: <ShieldAlert className="text-danger" /> },
    { type: "OPTIMIZE", title: "Expense Ratio Leak", msg: "Switching to Direct Plans for HDFC Index could save ~0.8% annually.", icon: <Zap className="text-amber-400" /> },
    { type: "INSIGHT", title: "SIP Momentum", msg: "Your average entry in Quant Small Cap is 15% below CMNAV. Strong accumulation.", icon: <TrendingUp className="text-success" /> }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 pb-32 pt-8"
    >
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Strategic Portfolio Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-text-bold tracking-tighter">Mutual Fund Alpha</h1>
          <p className="text-text-muted text-sm font-medium mt-1">Cross-fund analysis and long-term optimization audit.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-bold hover:bg-white/10 transition-all flex items-center gap-2">
             <Filter size={14} /> Filter AMC
           </button>
           <button className="px-5 py-2.5 rounded-xl bg-accent text-[10px] font-black uppercase tracking-widest text-white hover:brightness-110 shadow-lg shadow-accent/20 transition-all flex items-center gap-2">
             <Target size={14} /> Rebalance Plan
           </button>
        </div>
      </header>

      {/* ── TOP LAYER: ALLOCATION & RISK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Pie */}
        <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
           <h3 className="text-lg font-black text-text-bold mb-8 tracking-tight flex items-center gap-2">
             <PieChartIcon size={18} className="text-accent" />
             Capital Allocation
           </h3>
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
           <div className="grid grid-cols-2 gap-4 mt-8">
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

        {/* AMC Distribution */}
        <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-8 shadow-2xl">
           <h3 className="text-lg font-black text-text-bold mb-8 tracking-tight flex items-center gap-2">
             <Layers size={18} className="text-accent" />
             AMC Concentration
           </h3>
           <div className="space-y-6">
              {topAMC.map((amc, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{amc.name}</span>
                    <span className="text-xs font-black text-text-bold">{amc.weight}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${amc.weight}%` }}
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className="h-full bg-accent rounded-full opacity-60"
                    />
                  </div>
                </div>
              ))}
           </div>
           <div className="mt-8 p-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-center gap-3">
              <Info size={16} className="text-accent shrink-0" />
              <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                You are heavily weighted in <span className="text-text-bold">Quant AMC</span>. Consider diversification to reduce AMC-specific risk.
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
                      <span className={`text-[9px] font-black uppercase tracking-widest ${a.type === 'WARNING' ? 'text-danger' : a.type === 'OPTIMIZE' ? 'text-amber-500' : 'text-success'}`}>
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

      {/* ── LOWER LAYER: GROWTH & SIP PLANNING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-gradient-to-br from-bg-surface to-accent/5 border border-border-main rounded-[2.5rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
               <TrendingUp size={120} />
            </div>
            <h3 className="text-2xl font-black text-text-bold tracking-tight mb-2 italic uppercase">SIP Wealth Machine</h3>
            <p className="text-text-muted text-sm font-medium mb-10 max-w-sm">Projecting your portfolio value over the next 10 years at current CAGR.</p>
            
            <div className="flex gap-12 items-end">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Portfolio Value Today</p>
                  <p className="text-4xl font-black text-text-bold tracking-tighter">₹{(totalValue/100000).toFixed(1)}L</p>
               </div>
               <div className="mb-1 text-accent opacity-20">
                  <ArrowUpRight size={32} />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#10b981] mb-2 font-black">Value in 10 Yrs</p>
                  <p className="text-4xl font-black text-[#10b981] tracking-tighter flex items-center gap-2">
                    ₹{(totalValue * 3.7 / 100000).toFixed(1)}L
                    <span className="text-xs text-text-muted/40 font-black">@ 14%</span>
                  </p>
               </div>
            </div>
            
            <div className="mt-12 flex gap-4">
               <div className="flex-1 p-6 bg-black/20 rounded-3xl border border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">SIP Efficiency</h5>
                  <div className="text-xl font-black text-text-bold">92.4%</div>
                  <div className="text-[9px] text-success font-black mt-1">+2.1% VS LAST MONTH</div>
               </div>
               <div className="flex-1 p-6 bg-black/20 rounded-3xl border border-white/5">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Est. Annual Div.</h5>
                  <div className="text-xl font-black text-text-bold">₹12,450</div>
                  <div className="text-[9px] text-text-muted font-black mt-1">REINVESTED ADVICE</div>
               </div>
            </div>
         </div>

         <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10">
            <h3 className="text-xl font-black text-text-bold tracking-tight mb-8">Performance Consistency</h3>
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories}>
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
                     <YAxis hide />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '12px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                     />
                     <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 10, 10]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <p className="mt-8 text-xs text-text-muted font-medium leading-relaxed italic">
              "Your <span className="text-text-bold">Small Cap</span> consistency is the primary alpha driver. However, the <span className="text-text-bold">Debt</span> cushion is currently below the recommended 15% safety threshold for your age profile."
            </p>
         </div>
      </div>
    </motion.div>
  );
}
