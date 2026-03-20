import { Info } from "lucide-react";
import { motion } from "framer-motion";

// Native CSS Group-Hover Tooltip 
const InfoTooltip = ({ content, align }: { content: string, align?: "center" | "left" }) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-info transition-colors" />
    <div className={`pointer-events-none absolute bottom-full mb-3 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-50 ${align === 'left' ? '-left-0' : 'left-1/2 -translate-x-1/2'}`}>
      {content}
      <div className={`absolute -bottom-1.5 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333] ${align === 'left' ? 'left-4' : 'left-1/2 -translate-x-1/2'}`}></div>
    </div>
  </div>
);

export function TechnicalIndicators({ data }: { data: any }) {
  const loading = !data;
  const currentPrice = data?.price || 1000;
  
  // Use backend data if populated, else mock gracefully for skeleton
  const pivots = data?.pivots || { R3: 1100, R2: 1080, R1: 1060, Pivot: 1050, S1: 1040, S2: 1020, S3: 1000 };
  const ma = data?.moving_averages || {};
  
  const rsi = data?.indicators?.rsi_14 || 50;
  const macd = data?.indicators?.macd?.MACD_Line || 0;
  const beta = data?.fundamentals?.beta || 1.0;

  return (
    <div className="space-y-12 mt-12 mb-12">
      {/* Groww Style Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Support and Resistance */}
        <div>
          <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
            Support and Resistance <InfoTooltip content="Key computational price levels defined by Pivot Points where the stock historically encounters critical buying (Support) or massive selling (Resistance) pressure." align="left" />
          </h2>
          <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 rounded-2xl p-6 lg:p-8 shadow-lg relative h-full flex flex-col justify-center">
            
            <div className="relative h-2 w-full bg-[#333] rounded-full mb-12 mt-4">
              {/* Range labels */}
              <div className="absolute -top-7 left-0 text-[10px] text-text-muted font-bold">{loading ? '---' : `S3 ${pivots.S3?.toFixed(1)}`}</div>
              <div className="absolute -top-7 right-0 text-[10px] text-text-muted font-bold">{loading ? '---' : `R3 ${pivots.R3?.toFixed(1)}`}</div>
              
              {/* Scale points */}
              {[pivots.S3, pivots.S2, pivots.S1, pivots.Pivot, pivots.R1, pivots.R2, pivots.R3].map((val, idx) => {
                const totalRange = pivots.R3 - pivots.S3;
                const pos = ((val - pivots.S3) / totalRange) * 100;
                const label = ["S3", "S2", "S1", "P", "R1", "R2", "R3"][idx];
                return (
                  <div key={idx} className="absolute top-0 h-full w-[2px] bg-white/10" style={{ left: `${pos}%` }}>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-text-muted/60">{label}</div>
                  </div>
                );
              })}

              {/* Price Indicator - Animate from center (Pivot) to target price */}
              {(() => {
                const totalRange = pivots.R3 - pivots.S3;
                // Target position
                const targetPos = ((currentPrice - pivots.S3) / totalRange) * 100;
                // Pivot position (initial)
                const pivotPos = ((pivots.Pivot - pivots.S3) / totalRange) * 100;

                 return (
                  <motion.div 
                    initial={{ left: loading ? "50%" : `${pivotPos}%`, opacity: 0 }}
                    animate={{ left: `${targetPos}%`, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "circOut", delay: 0.3 }}
                    className="absolute top-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="relative">
                      <div className="h-6 w-[3px] bg-danger shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
                      {!loading && (
                        <div className="absolute top-[-34px] left-1/2 -translate-x-1/2 bg-[#2a1215] border border-danger text-danger px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shadow-xl">
                          Price {currentPrice.toFixed(2)}
                        </div>
                      )}
                      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-danger" />
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4 border-t border-white/5 pt-6">
               <div className="flex justify-between text-xs text-text-muted font-medium"><span>Support 1</span><span className="text-text-bold font-mono">{loading ? '---' : pivots.S1?.toFixed(2)}</span></div>
               <div className="flex justify-between text-xs text-text-muted font-medium"><span>Resistance 1</span><span className="text-text-bold font-mono">{loading ? '---' : pivots.R1?.toFixed(2)}</span></div>
               <div className="flex justify-between text-xs text-text-muted font-medium"><span>Support 2</span><span className="text-text-bold font-mono">{loading ? '---' : pivots.S2?.toFixed(2)}</span></div>
               <div className="flex justify-between text-xs text-text-muted font-medium"><span>Resistance 2</span><span className="text-text-bold font-mono">{loading ? '---' : pivots.R2?.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div>
          <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
            Indicators <InfoTooltip content="Mathematical oscillators built strictly on historical price, volume, and momentum. Evaluated by our AI layer to verify if a stock is overbought or oversold." align="left" />
          </h2>
          <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-main text-[11px] text-text-muted uppercase tracking-widest bg-bg-surface">
                <tr>
                  <th className="px-6 py-5 font-bold">Indicator</th>
                  <th className="px-6 py-5 font-bold text-right">Value</th>
                  <th className="px-6 py-5 font-bold">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main text-[#f3f4f6]">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-medium">RSI (14)</td>
                  <td className="px-6 py-5 text-right font-bold">{rsi > 0 ? `+${rsi.toFixed(2)}` : rsi.toFixed(2)}</td>
                  <td className={`px-6 py-5 font-bold ${rsi < 40 ? 'text-success' : rsi > 70 ? 'text-danger' : 'text-text-muted'}`}>
                    {rsi < 40 ? 'Near oversold' : rsi > 70 ? 'Overbought' : 'Neutral'}
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-medium">MACD (12, 26, 9)</td>
                  <td className="px-6 py-5 text-right font-bold">{macd > 0 ? `+${macd.toFixed(2)}` : macd.toFixed(2)}</td>
                  <td className={`px-6 py-5 font-bold ${macd > 0 ? 'text-success' : 'text-danger'}`}>
                    {macd > 0 ? 'Bullish' : 'Bearish'}
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-5 font-medium">Beta</td>
                  <td className="px-6 py-5 text-right font-bold">+{beta.toFixed(2)}</td>
                  <td className="px-6 py-5 font-medium text-text-muted">Volatile like mkt</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <div>
        <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
          Moving averages <InfoTooltip content="The trailing average stock price over designated lookback time frames (SMA: Simple, EMA: Exponential). Extensively used visually to identify broad trajectory changes." align="left" />
        </h2>
        <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 rounded-2xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-main text-[11px] text-text-muted uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5 font-bold">Period</th>
                <th className="px-8 py-5 font-bold text-right">SMA</th>
                <th className="px-8 py-5 font-bold text-right">EMA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main border-b border-border-main text-[#f3f4f6]">
              {['10D', '20D', '50D', '100D', '200D'].map((p) => {
                const sma = ma[`sma_${p.toLowerCase()}`];
                const ema = ma[`ema_${p.toLowerCase()}`];
                const smaColor = (loading || !sma) ? 'text-white/10' : (currentPrice > sma ? 'text-success' : 'text-danger');
                const emaColor = (loading || !ema) ? 'text-white/10' : (currentPrice > ema ? 'text-success' : 'text-danger');
                
                return (
                  <tr key={p} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5 font-medium">{p}</td>
                    <td className={`px-8 py-5 text-right font-bold tracking-wide ${smaColor}`}>
                      {loading ? '---' : sma?.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className={`px-8 py-5 text-right font-bold tracking-wide ${emaColor}`}>
                      {loading ? '---' : ema?.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Fundamentals & Delivery Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
           <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
             Fundamentals <InfoTooltip content="Core macro-financial metrics showcasing intrinsic enterprise valuation, sheer profitability profiles, and baseline dividend yields compared intensely against industry peers." align="left" />
           </h2>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Market Cap</p>
                 <p className="text-2xl font-bold text-text-bold">
                   {loading ? <span className="animate-pulse text-white/10">---</span> : `₹${(data.fundamentals?.market_cap / 10000000 || 0).toFixed(0)}Cr`}
                 </p>
              </div>
              <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">P/E Ratio</p>
                 <p className="text-2xl font-bold text-text-bold">
                   {loading ? <span className="animate-pulse text-white/10">---</span> : (data.fundamentals?.pe_ratio?.toFixed(2) || 'N/A')}
                 </p>
              </div>
              <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Industry P/E</p>
                 <p className="text-2xl font-bold text-text-bold">
                   {loading ? <span className="animate-pulse text-white/10">---</span> : (data.fundamentals?.industry_pe ? data.fundamentals.industry_pe.toFixed(2) : 'N/A')}
                 </p>
              </div>
              <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Dividend Yield</p>
                 <p className="text-2xl font-bold text-text-bold">
                   {loading ? <span className="animate-pulse text-white/10">---</span> : `${(data.fundamentals?.dividend_yield?.toFixed(2) || '0.00')}%`}
                 </p>
              </div>
           </div>
        </div>

        <div>
           <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
             Delivery volume percentage <InfoTooltip content="The sheer scale of equity actively delivered to demat accounts vs intraday speculation. Robust, higher delivery explicitly outlines powerful longer-term institutional investor conviction." align="left" />
           </h2>
           <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-6 rounded-2xl shadow-lg flex flex-col justify-between h-[232px]">
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm font-medium">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-info rounded-full"/> <span className="text-[#f3f4f6]">Total traded volume</span></div>
                   <span className="font-bold text-text-bold text-base">7,72,07,941</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-medium">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-secondary rounded-full"/> <span className="text-[#f3f4f6]">Delivery volume</span></div>
                   <span className="font-bold text-text-bold text-base">3,85,05,388</span>
                 </div>
              </div>
              <div className="border-t border-border-main border-dashed pt-4 mt-4 flex justify-between items-center text-sm font-medium">
                 <span className="text-text-muted">Delivery percentage</span>
                 <span className="font-bold text-text-bold text-lg">49.87%</span>
              </div>
           </div>
        </div>
      </div>
      
    </div>
  );
}
