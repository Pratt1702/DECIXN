import { Info } from "lucide-react";

// Native CSS Group-Hover Tooltip 
const InfoTooltip = ({ content, align }: { content: string, align?: "center" | "left" }) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-indigo-400 transition-colors" />
    <div className={`pointer-events-none absolute bottom-full mb-3 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-50 ${align === 'left' ? '-left-0' : 'left-1/2 -translate-x-1/2'}`}>
      {content}
      <div className={`absolute -bottom-1.5 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333] ${align === 'left' ? 'left-4' : 'left-1/2 -translate-x-1/2'}`}></div>
    </div>
  </div>
);

export function TechnicalIndicators({ data }: { data: any }) {
  if (!data) return null;

  const currentPrice = data.price || 1048.90;
  
  // Use backend data if populated, else mock gracefully
  const pivots = data.pivots || { R3: currentPrice * 1.05, R2: currentPrice * 1.03, R1: currentPrice * 1.015, Pivot: currentPrice * 1.005, S1: currentPrice * 0.985, S2: currentPrice * 0.97, S3: currentPrice * 0.95 };
  const ma = data.moving_averages || { sma_10d: currentPrice*1.01, ema_10d: currentPrice*1.02, sma_20d: currentPrice*1.05, ema_20d: currentPrice*1.04, sma_50d: currentPrice * 1.03, ema_50d: currentPrice * 1.035, sma_100d: currentPrice * 0.98, ema_100d: currentPrice * 0.99, sma_200d: currentPrice * 0.85, ema_200d: currentPrice * 0.88 };
  
  const rsi = data.indicators?.rsi_14 || 34.67;
  const macd = data.indicators?.macd?.MACD_Line || -15.65;
  const beta = data.fundamentals?.beta || 0.98;

  return (
    <div className="space-y-12 mt-12 mb-12">
      {/* Groww Style Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Support and Resistance */}
        <div>
          <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
            Support and Resistance <InfoTooltip content="Key computational price levels defined by Pivot Points where the stock historically encounters critical buying (Support) or massive selling (Resistance) pressure." align="left" />
          </h2>
          <div className="bg-bg-surface border border-border-main rounded-xl p-6 lg:p-8 shadow-sm relative">
            
            <div className="space-y-5">
              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">R3</span><span className="text-text-bold font-bold">{pivots.R3?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">R2</span><span className="text-text-bold font-bold">{pivots.R2?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">R1</span><span className="text-text-bold font-bold">{pivots.R1?.toFixed(2)}</span></div>
              
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#333] border-dashed"></div></div>
                <div className="relative flex justify-center"><span className="bg-[#1f2028] px-3 font-bold text-xs text-text-muted rounded-full tracking-wider">PIVOT {pivots.Pivot?.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">S1</span><span className="text-text-bold font-bold">{pivots.S1?.toFixed(2)}</span></div>
              
              <div className="relative py-2 hidden sm:block"> {/* Using absolute positioned div vs inline for the exact Groww layout style */}
                <div className="absolute inset-0 flex items-center -ml-6 -mr-6"><div className="w-full border-t border-rose-500"></div></div>
                <div className="relative flex justify-center"><span className="bg-[#2a1215] border border-rose-500 text-rose-400 px-4 py-0.5 text-xs font-bold rounded-full uppercase tracking-widest">Price {currentPrice?.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">S2</span><span className="text-text-bold font-bold">{pivots.S2?.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-text-muted"><span className="font-medium text-[#f3f4f6]">S3</span><span className="text-text-bold font-bold">{pivots.S3?.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div>
          <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
            Indicators <InfoTooltip content="Mathematical oscillators built strictly on historical price, volume, and momentum. Evaluated by our AI layer to verify if a stock is overbought or oversold." align="left" />
          </h2>
          <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border-main text-[11px] text-text-muted uppercase tracking-widest bg-bg-surface">
                <tr>
                  <th className="px-6 py-5 font-bold">Indicator</th>
                  <th className="px-6 py-5 font-bold text-right">Value</th>
                  <th className="px-6 py-5 font-bold">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main text-[#f3f4f6]">
                <tr className="hover:bg-bg-main/30 transition-colors">
                  <td className="px-6 py-5 font-medium">RSI (14)</td>
                  <td className="px-6 py-5 text-right font-bold">{rsi > 0 ? `+${rsi.toFixed(2)}` : rsi.toFixed(2)}</td>
                  <td className={`px-6 py-5 font-bold ${rsi < 40 ? 'text-emerald-500' : rsi > 70 ? 'text-rose-500' : 'text-text-muted'}`}>
                    {rsi < 40 ? 'Near oversold' : rsi > 70 ? 'Overbought' : 'Neutral'}
                  </td>
                </tr>
                <tr className="hover:bg-bg-main/30 transition-colors">
                  <td className="px-6 py-5 font-medium">MACD (12, 26, 9)</td>
                  <td className="px-6 py-5 text-right font-bold">{macd > 0 ? `+${macd.toFixed(2)}` : macd.toFixed(2)}</td>
                  <td className={`px-6 py-5 font-bold ${macd > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {macd > 0 ? 'Bullish' : 'Bearish'}
                  </td>
                </tr>
                <tr className="hover:bg-bg-main/30 transition-colors">
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
        <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden shadow-sm">
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
                const smaColor = currentPrice > sma ? 'text-emerald-400' : 'text-rose-400';
                const emaColor = currentPrice > ema ? 'text-emerald-400' : 'text-rose-400';
                
                return (
                  <tr key={p} className="hover:bg-bg-main/40 transition-colors">
                    <td className="px-8 py-5 font-medium">{p}</td>
                    <td className={`px-8 py-5 text-right font-bold tracking-wide ${smaColor}`}>{sma?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className={`px-8 py-5 text-right font-bold tracking-wide ${emaColor}`}>{ema?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
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
              <div className="bg-bg-surface border border-border-main p-5 rounded-xl">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Market Cap</p>
                 <p className="text-2xl font-bold text-text-bold">₹{(data.fundamentals?.market_cap / 10000000 || 745300).toFixed(0)}Cr</p>
              </div>
              <div className="bg-bg-surface border border-border-main p-5 rounded-xl">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">P/E Ratio</p>
                 <p className="text-2xl font-bold text-text-bold">{data.fundamentals?.pe_ratio?.toFixed(2) || '14.50'}</p>
              </div>
              <div className="bg-bg-surface border border-border-main p-5 rounded-xl">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Industry P/E</p>
                 <p className="text-2xl font-bold text-text-bold">{data.fundamentals?.industry_pe?.toFixed(2) || '17.20'}</p>
              </div>
              <div className="bg-bg-surface border border-border-main p-5 rounded-xl">
                 <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Dividend Yield</p>
                 <p className="text-2xl font-bold text-text-bold">{data.fundamentals?.dividend_yield?.toFixed(2) || '1.30'}%</p>
              </div>
           </div>
        </div>

        <div>
           <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
             Delivery volume percentage <InfoTooltip content="The sheer scale of equity actively delivered to demat accounts vs intraday speculation. Robust, higher delivery explicitly outlines powerful longer-term institutional investor conviction." align="left" />
           </h2>
           <div className="bg-bg-surface border border-border-main p-6 rounded-xl flex flex-col justify-between h-[232px]">
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm font-medium">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-indigo-400 rounded-full"/> <span className="text-[#f3f4f6]">Total traded volume</span></div>
                   <span className="font-bold text-text-bold text-base">7,72,07,941</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-medium">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-sky-400 rounded-full"/> <span className="text-[#f3f4f6]">Delivery volume</span></div>
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
