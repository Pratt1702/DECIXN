import { Info, Newspaper, Globe, ExternalLink, Calendar } from "lucide-react";
import { motion } from "framer-motion";

// Native CSS Group-Hover Tooltip
const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-info transition-colors" />
    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
      {content}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333]"></div>
    </div>
  </div>
);

export function AIIntelligencePanel({ data }: { data: any }) {
  const loading = !data;
  const score = data?.confidence_score || 50;
  const label = !data
    ? "Synthesizing..."
    : score >= 70
      ? "Strong Bullish"
      : score >= 55
        ? "Bullish"
        : score <= 30
          ? "Strong Bearish"
          : score <= 45
            ? "Slightly bearish"
            : "Neutral";

  // create bars for the slider effect like Groww Summary
  const bars = Array.from({ length: 30 }, (_, i) => i);
  const activeIndex = Math.floor(Math.max(0, Math.min(29, (score / 100) * 30)));

  return (
    <div className="">
      <h2 className="text-2xl font-black text-text-bold mb-4 flex items-center gap-2">
        Summary{" "}
        <InfoTooltip content="An AI-calculated composite score blending active technical indicators, moving averages, and deep market sentiment to determine your precise trading conviction." />
      </h2>
      <p className="text-sm text-text-muted mb-6 font-medium">
        Based on AI heuristics and technicals
      </p>

      <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 rounded-xl p-8">
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="text-sm text-text-muted mb-1">
              Based on technicals, this stock is
            </p>
            <div
              className={`text-xl font-bold ${loading ? "animate-pulse text-white/20" : score > 53 ? "text-success" : score < 47 ? "text-danger" : "text-[#9ca3af]"}`}
            >
              {label}
            </div>
          </div>

          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />{" "}
                <span className="text-text-muted text-[10px] uppercase tracking-tighter">
                  Bearish
                </span>
              </div>
              <span className="font-bold text-text-bold">
                {loading ? "-" : score < 47 ? "8" : "2"}
              </span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6b7280]" />{" "}
                <span className="text-text-muted text-[10px] uppercase tracking-tighter">
                  Neutral
                </span>
              </div>
              <span className="font-bold text-text-bold">
                {loading ? "-" : score >= 47 && score <= 53 ? "6" : "0"}
              </span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />{" "}
                <span className="text-text-muted text-[10px] uppercase tracking-tighter">
                  Bullish
                </span>
              </div>
              <span className="font-bold text-text-bold">
                {loading ? "-" : score > 53 ? "12" : "4"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex gap-[3px] items-end h-8">
            {bars.map((b) => {
              let bg = "bg-[#6b7280]"; // neutral gray
              if (b < 12) bg = "bg-danger";
              else if (b > 18) bg = "bg-success";

              const isOpacity =
                b === activeIndex ? "opacity-100 h-8" : "opacity-60 h-6";
              return (
                <div
                  key={b}
                  className={`flex-1 rounded-sm ${bg} ${isOpacity} transition-all duration-300`}
                />
              );
            })}
          </div>

          <motion.div
            initial={{ paddingLeft: "50%" }}
            animate={{
              paddingLeft: `calc(${Math.min(99, (activeIndex / 29) * 100)}% - 4px)`,
            }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
            className="mt-2 text-white text-xs transition-all"
          >
            ▲
          </motion.div>
        </div>

        {(loading || (data.reasons && data.reasons.length > 0)) && (
          <div className="mt-8 border-t border-white/5 pt-6 flex flex-col gap-8">
            <div>
              <h3 className="font-bold text-text-bold mb-3 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-info rounded-full" />
                AI Insights Context
              </h3>
              <ul className="space-y-3">
                {loading
                  ? [1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-4 w-full bg-white/5 animate-pulse rounded"
                      />
                    ))
                  : data.reasons.slice(0, 3).map((r: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-text-muted flex gap-3"
                      >
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-info/30 shrink-0" />
                        <span className="leading-snug">{r}</span>
                      </li>
                    ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-text-bold mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                   <div className="w-1.5 h-4 bg-accent rounded-full" />
                   Recommended Action
                </span>
                {data?.priority && (
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${data.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                    {data.priority} PRIORITY
                  </span>
                )}
              </h3>
              {loading ? (
                <div className="h-20 w-full bg-white/5 animate-pulse rounded-xl" />
              ) : (
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                       <p className="text-xl font-black text-white tracking-tight leading-none uppercase">
                          {data?.severity && data.severity !== 'MODERATE' ? (
                             <span className={`${data.severity === 'CRITICAL' ? 'text-danger' : 'text-amber-500'} mr-2`}>{data.severity}</span>
                          ) : ''}
                          {data.decision}
                       </p>
                       <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded border border-accent/10 whitespace-nowrap uppercase tracking-widest">
                          {data.trade_type || 'Positional'}
                       </span>
                    </div>
                    {data.dividends?.ex_dividend_date && (
                      <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md w-fit">
                        <Calendar size={10} className="text-indigo-400" />
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                          Ex-Dividend: {data.dividends.ex_dividend_date}
                        </span>
                      </div>
                    )}
                    {data.dividends?.dividend_yield && (
                       <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-success/10 border border-success/20 rounded-md w-fit">
                         <div className="text-[9px] font-black text-success uppercase tracking-widest">
                            Yield: {(data.dividends.dividend_yield * 100).toFixed(2)}%
                         </div>
                       </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-text-muted leading-relaxed">
                    {data.action}
                  </p>

                  <div className="flex gap-6 pt-2 border-t border-white/5">
                    <div>
                       <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Confidence</span>
                       <span className="text-sm font-black text-white">{score}%</span>
                    </div>
                    <div>
                       <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block mb-1">Risk Factor</span>
                       <span className={`text-sm font-black ${data.risk_level === 'HIGH' ? 'text-danger' : data.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-success'}`}>
                          {data.risk_level || 'LOW'}
                       </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* News Intelligence Section */}
            {data?.news_insight?.has_catalyst && (
              <div>
                <h3 className="font-bold text-text-bold mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-success/60 rounded-full" />
                  News Catalyst Impact
                </h3>
                <div className="bg-success/5 border border-success/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <Newspaper size={14} className="text-success" />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${data.news_insight.sentiment === 'positive' ? 'text-success' : 'text-danger'}`}>
                          {data.news_insight.sentiment} sentiment
                       </span>
                    </div>
                    <span className="text-[10px] font-bold text-success/60">Impact: {data.news_insight.impact_strength}/5</span>
                  </div>
                  <p className="text-sm text-[#cbd5e1] leading-relaxed font-bold">
                    {data.news_insight.title}
                  </p>
                  <p className="text-xs text-text-muted mt-2 leading-relaxed italic">
                    {data.news_insight.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Ticker News */}
            {(data?.news?.length > 0 || data?.yahoo_news?.length > 0 || data?.sector_news?.length > 0) && (
              <div>
                <h3 className="font-bold text-text-bold mb-3 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-500/40 rounded-full" />
                  Broad Market Context
                </h3>
                <div className="space-y-3">
                  {[...(data.news || []), ...(data.sector_news || []), ...(data.yahoo_news || [])].slice(0, 5).map((n: any, i: number) => (
                    <a 
                      key={i}
                      href={n.link || n.url}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="group/news flex flex-col gap-1 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all block"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-sm font-bold text-text-bold leading-tight group-hover/news:text-accent transition-colors">
                          {n.title}
                        </span>
                        <ExternalLink size={12} className="text-text-muted opacity-0 group-hover/news:opacity-100 transition-opacity shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe size={10} className="text-text-muted" />
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                          {n.publisher || 'Yahoo Finance'}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
