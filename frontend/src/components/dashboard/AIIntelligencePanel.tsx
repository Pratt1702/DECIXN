import { Info } from "lucide-react";

// Native CSS Group-Hover Tooltip 
const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-indigo-400 transition-colors" />
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
      {content}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333]"></div>
    </div>
  </div>
);

export function AIIntelligencePanel({ data }: { data: any }) {
  if (!data) return null;
  
  const score = data.confidence_score || 45; 
  let label = "Neutral";
  if (score >= 70) label = "Strong Bullish";
  else if (score >= 55) label = "Bullish";
  else if (score <= 30) label = "Strong Bearish";
  else if (score <= 45) label = "Slightly bearish";

  // create bars for the slider effect like Groww Summary
  const bars = Array.from({length: 30}, (_, i) => i);
  const activeIndex = Math.floor(Math.max(0, Math.min(29, (score / 100) * 30)));

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-text-bold mb-4 flex items-center gap-2">
        Summary <InfoTooltip content="An AI-calculated composite score blending active technical indicators, moving averages, and deep market sentiment to determine your precise trading conviction." />
      </h2>
      <p className="text-sm text-text-muted mb-6">Based on AI heuristics and technicals</p>

      <div className="bg-bg-surface border border-border-main rounded-xl p-8 shadow-sm">
        <div className="flex justify-between items-start mb-10">
           <div>
             <p className="text-sm text-text-muted mb-1">Based on technicals, this stock is</p>
             <p className={`text-xl font-bold ${score > 53 ? 'text-emerald-500' : score < 47 ? 'text-rose-500' : 'text-[#9ca3af]'}`}>{label}</p>
           </div>
           
           <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="flex items-center gap-1.5 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> <span className="text-text-muted">Bearish</span></div>
                <span className="font-bold text-text-bold">{score < 47 ? '8' : '2'}</span>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-[#6b7280]" /> <span className="text-text-muted">Neutral</span></div>
                <span className="font-bold text-text-bold">{score >= 47 && score <= 53 ? '6' : '0'}</span>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-text-muted">Bullish</span></div>
                <span className="font-bold text-text-bold">{score > 53 ? '12' : '4'}</span>
              </div>
           </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex gap-[3px] items-end h-8">
            {bars.map((b) => {
              let bg = "bg-[#6b7280]"; // neutral gray
              if (b < 12) bg = "bg-rose-500";
              else if (b > 18) bg = "bg-emerald-500";
              
              const isOpacity = b === activeIndex ? "opacity-100 h-8" : "opacity-60 h-6";
              return <div key={b} className={`flex-1 rounded-sm ${bg} ${isOpacity} transition-all duration-300`} />;
            })}
          </div>
          
          <div 
            className="mt-2 text-[#4b5563] text-xs transition-all duration-500 ease-out" 
            style={{ paddingLeft: `calc(${Math.min(99, (activeIndex / 29) * 100)}% - 4px)` }}
          >
             ▲
          </div>
        </div>

        {data.reasons && data.reasons.length > 0 && (
          <div className="mt-8 border-t border-border-main pt-6">
            <h3 className="font-bold text-text-bold mb-3">AI Nudges Context</h3>
            <ul className="space-y-3">
                {data.reasons.map((r: string, i: number) =>(
                  <li key={i} className="text-sm text-text-muted flex gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="leading-snug">{r}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
