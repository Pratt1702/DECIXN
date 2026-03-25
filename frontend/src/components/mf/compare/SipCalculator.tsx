import { useState, useEffect } from "react";
import { AnimatedNumber } from "../../ui/AnimatedNumber";

interface SipCalculatorProps {
  funds: any[];
}

export function SipCalculator({ funds }: SipCalculatorProps) {
  const [monthlySip, setMonthlySip] = useState(10000);
  const [years, setYears] = useState(5);
  
  const calculateFinalValue = (cagr: number) => {
    const rate = (cagr / 100) / 12;
    const n = years * 12;
    if (rate === 0) return monthlySip * n;
    return monthlySip * (((Math.pow(1 + rate, n)) - 1) / rate) * (1 + rate);
  };

  return (
    <div className="bg-bg-surface border border-border-main rounded-[2.5rem] p-10 space-y-10 shadow-2xl relative overflow-hidden">
      <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
        <div className="w-full lg:w-1/3 space-y-8">
          <div className="space-y-2">
            <span className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">Projection Tool</span>
            <h2 className="text-3xl font-black text-text-bold uppercase tracking-tighter italic">Scenario Simulation</h2>
            <p className="text-sm text-text-muted font-medium italic opacity-70 border-l border-white/10 pl-4 py-1 leading-relaxed">
              Model your terminal wealth based on real historical CAGR data.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 px-4 py-5 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Monthly SIP</label>
                  <span className="text-sm font-black text-accent">₹{monthlySip.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="100000" 
                  step="1000"
                  value={monthlySip} 
                  onChange={(e) => setMonthlySip(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                />
            </div>

            <div className="space-y-3 px-4 py-5 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Time Horizon</label>
                  <span className="text-sm font-black text-accent">{years} Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  step="1"
                  value={years} 
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                />
            </div>
          </div>
        </div>

        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funds.map((f, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between">
              <div className="space-y-1">
                 <span className="text-[9px] font-black text-text-muted uppercase tracking-widest opacity-40">Asset Terminal Value</span>
                 <h4 className="text-xs font-black text-text-bold uppercase line-clamp-1 italic">{f.scheme_name.split('-')[0]}</h4>
              </div>
              
              <div className="py-2">
                 <p className="text-2xl font-black text-text-bold tracking-tighter italic">
                    <AnimatedNumber value={calculateFinalValue(f.metrics.cagr_5y)} prefix="₹" decimals={0} />
                 </p>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 bg-success/10 text-[8px] font-black text-success uppercase rounded border border-success/20">
                       +{Math.round((calculateFinalValue(f.metrics.cagr_5y) / (monthlySip * years * 12) - 1) * 100)}% Gained
                    </span>
                 </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                 <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest italic leading-tight">
                    Total Invested: <span className="text-text-bold">₹{(monthlySip * years * 12).toLocaleString()}</span>
                 </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 bg-accent opacity-[0.02] blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
