import { Zap, Shield, TrendingUp, BarChart, AlertCircle } from "lucide-react";
import { MFSubNav } from "../components/layout/MFSubNav";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
import { motion } from "framer-motion";

export function MFInsights() {
  const { data } = useMFPortfolioStore();

  const insights = [
    {
      title: "Allocation Efficiency",
      value: "84%",
      desc: "Your portfolio is well-diversified across Large and Mid-cap segments.",
      icon: Shield,
      color: "text-success",
    },
    {
      title: "Overlap Detection",
      value: "Low (12%)",
      desc: "Minimal concentration risk. Your funds have unique underlying holdings.",
      icon: Zap,
      color: "text-accent",
    },
    {
      title: "Projected 3Y Growth",
      value: "₹2.45L",
      desc: "Based on historical 12% CAGR across your selected categories.",
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <MFSubNav />
        <div className="bg-bg-surface border border-border-main rounded-2xl p-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto" />
          <h2 className="text-xl font-black text-text-bold uppercase tracking-tighter">No Portfolio Data</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto">Upload your Mutual Fund portfolio on the Holdings page to unlock deep intelligence and allocation insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8">
      <MFSubNav />
      
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-text-bold tracking-tighter uppercase italic">Mutual Fund Intelligence</h1>
        <p className="text-text-muted text-sm font-medium">Deep-dive into allocation, risk, and long-term compounding profile.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-bg-surface border border-border-main rounded-2xl p-6 space-y-4 hover:border-accent/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:bg-accent/10 group-hover:border-accent/20 transition-all">
                  <Icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <span className={`text-2xl font-black italic tracking-tighter ${insight.color}`}>
                  {insight.value}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-xs uppercase tracking-widest text-text-bold">{insight.title}</h3>
                <p className="text-[11px] text-text-muted leading-relaxed font-medium">{insight.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-bg-surface border border-border-main rounded-3xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <BarChart size={200} />
        </div>
        <div className="relative z-10 max-w-xl space-y-6">
            <div className="space-y-2">
                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[9px] font-black text-accent uppercase tracking-widest border border-accent/20">Strategy Optimization</span>
                <h2 className="text-2xl font-black text-text-bold tracking-tighter leading-tight italic">Your portfolio is currently leaning towards Large-Cap stability.</h2>
                <p className="text-text-muted text-sm font-medium leading-relaxed">To maximize compounding over the next 5-10 years, consider a 15% shift towards Mid-Cap opportunities where historical Alpha has been higher.</p>
            </div>
            <button className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">View Allocation Roadmap</button>
        </div>
      </div>
    </div>
  );
}
