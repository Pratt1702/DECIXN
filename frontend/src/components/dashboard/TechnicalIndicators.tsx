import { Info } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { AnimatedNumber } from "../ui/AnimatedNumber";

// Native CSS Group-Hover Tooltip
const InfoTooltip = ({
  content,
  align,
}: {
  content: string;
  align?: "center" | "left";
}) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-info transition-colors" />
    <div
      className={`pointer-events-none absolute bottom-full mb-3 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-50 ${align === "left" ? "-left-0" : "left-1/2 -translate-x-1/2"}`}
    >
      {content}
      <div
        className={`absolute -bottom-1.5 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333] ${align === "left" ? "left-4" : "left-1/2 -translate-x-1/2"}`}
      ></div>
    </div>
  </div>
);

export function YearlyRangeBar({ data }: { data: any }) {
  const barRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const loading = !data;
  const low = data?.fundamentals?.["52w_low"] || 0;
  const high = data?.fundamentals?.["52w_high"] || 0;
  const price = data?.price || 0;
  const pct =
    low > 0 && high > low
      ? Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100))
      : 0;

  useEffect(() => {
    if (!loading && barRef.current && dotRef.current) {
      // Animate from 0 to current pct using GSAP
      gsap.fromTo(
        barRef.current,
        { width: "0%" },
        { width: `${pct}%`, duration: 1.5, ease: "power4.out", delay: 0.2 },
      );
      gsap.fromTo(
        dotRef.current,
        { left: "0%" },
        { left: `${pct}%`, duration: 1.5, ease: "power4.out", delay: 0.2 },
      );
    }
  }, [loading, pct]);

  return (
    <div className="">
      <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
        52-Week Range{" "}
        <InfoTooltip content="Yearly price trajectory." align="left" />
      </h2>
      <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 rounded-xl px-6 py-5">
        <div className="flex justify-between text-[10px] text-text-muted uppercase tracking-[0.15em] font-bold mb-3 tabular-nums">
          <span>
            52W Low {loading ? "---" : `(₹${low.toLocaleString("en-IN")})`}
          </span>
          <span>
            52W High {loading ? "---" : `(₹${high.toLocaleString("en-IN")})`}
          </span>
        </div>

        <div className="relative h-1.5 w-full mb-6">
          <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
            <div ref={barRef} className="h-full bg-success rounded-full w-0" />
          </div>
          <div
            ref={dotRef}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-0"
            style={{ left: "0%", opacity: loading ? 0 : 1 }}
          >
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#121212] bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-4 text-xs">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-black text-text-bold text-lg tabular-nums ${loading ? "animate-pulse text-white/10" : ""}`}
            >
              {loading ? (
                "₹---"
              ) : (
                <AnimatedNumber value={price} prefix="₹" decimals={2} className="inline-block" />
              )}
            </span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">
              Current
            </span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">
            {loading ? "---" : (
              <AnimatedNumber value={pct} suffix="% Distance from low" decimals={2} className="inline-block" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TechnicalIndicators({ data }: { data: any }) {
  const loading = !data;
  const currentPrice = data?.price || 1000;

  // Use backend data if populated, else mock gracefully for skeleton
  const pivots = data?.pivots || {
    R3: 1100,
    R2: 1080,
    R1: 1060,
    Pivot: 1050,
    S1: 1040,
    S2: 1020,
    S3: 1000,
  };
  const ma = data?.moving_averages || {};

  const rsi = data?.indicators?.rsi_14 || 50;
  const macd = data?.indicators?.macd?.MACD_Line || 0;
  const beta = data?.fundamentals?.beta || 1.0;
  const alpha = data?.benchmark_comparison?.relative_strength || 0;
  const alphaStatus = data?.benchmark_comparison?.status || "NEUTRAL";

  return (
    <div className="space-y-8 mb-12">
      {/* Groww Style Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 mb-[64px]">
        {/* Support and Resistance */}
        <div>
          <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
            Support and Resistance{" "}
            <InfoTooltip
              content="Key computational price levels defined by Pivot Points."
              align="left"
            />
          </h2>
          <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 rounded-xl px-6 py-5 relative h-full flex flex-col justify-center min-h-[220px]">
            <div className="relative h-1.5 w-full bg-[#333] rounded-full mb-10 mt-2">
              <div className="absolute -top-7 left-0 text-[10px] text-text-muted font-bold">
                {loading ? "---" : `S3 ${pivots.S3?.toFixed(1)}`}
              </div>
              <div className="absolute -top-7 right-0 text-[10px] text-text-muted font-bold">
                {loading ? "---" : `R3 ${pivots.R3?.toFixed(1)}`}
              </div>

              {[
                pivots.S3,
                pivots.S2,
                pivots.S1,
                pivots.Pivot,
                pivots.R1,
                pivots.R2,
                pivots.R3,
              ].map((val, idx) => {
                const totalRange = pivots.R3 - pivots.S3 || 1;
                const pos = ((val - pivots.S3) / totalRange) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 h-full w-[2px] bg-white/10"
                    style={{ left: `${pos}%` }}
                  >
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-text-muted/60">
                      {["S3", "S2", "S1", "P", "R1", "R2", "R3"][idx]}
                    </div>
                  </div>
                );
              })}

              {(() => {
                const totalRange = pivots.R3 - pivots.S3 || 1;
                const targetPos =
                  ((currentPrice - pivots.S3) / totalRange) * 100;
                return (
                  <motion.div
                    initial={{ left: "50%", opacity: 0 }}
                    animate={{ left: `${targetPos}%`, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "circOut" }}
                    className="absolute top-1/2 -translate-y-1/2 z-10"
                  >
                    <div className="relative">
                      <div className="h-5 w-[2px] bg-danger" />
                      <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 bg-[#121212] border border-danger text-danger px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-xl">
                        ₹{currentPrice.toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4 border-t border-white/5 pt-6">
              <div className="flex justify-between text-xs text-text-muted font-medium">
                <span>Support 1</span>
                <span className="text-text-bold font-mono">
                  {loading ? "---" : pivots.S1?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-muted font-medium">
                <span>Resistance 1</span>
                <span className="text-text-bold font-mono">
                  {loading ? "---" : pivots.R1?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-muted font-medium">
                <span>Support 2</span>
                <span className="text-text-bold font-mono">
                  {loading ? "---" : pivots.S2?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-muted font-medium">
                <span>Resistance 2</span>
                <span className="text-text-bold font-mono">
                  {loading ? "---" : pivots.R2?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div>
          <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
            Indicators{" "}
            <InfoTooltip
              content="Momentum oscillators built strictly on price action."
              align="left"
            />
          </h2>
          <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 rounded-xl overflow-hidden h-full">
            <table className="w-full text-left text-xs h-full">
              <thead className="border-b border-white/5 text-[9px] text-text-muted uppercase tracking-[0.15em] bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 font-bold">Indicator</th>
                  <th className="px-4 py-3 font-bold text-right">Value</th>
                  <th className="px-4 py-3 font-bold text-right">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main text-[#f3f4f6]">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 font-medium">RSI (14)</td>
                  <td className="px-5 py-4 text-right font-bold font-mono">
                    +{rsi.toFixed(2)}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-bold ${rsi < 40 ? "text-success" : rsi > 70 ? "text-danger" : "text-text-muted"}`}
                  >
                    {rsi < 40
                      ? "Oversold"
                      : rsi > 70
                        ? "Overbought"
                        : "Neutral"}
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 font-medium">MACD</td>
                  <td className="px-5 py-4 text-right font-bold font-mono">
                    {macd > 0 ? "+" : ""}
                    {macd.toFixed(2)}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-bold ${macd > 0 ? "text-success" : "text-danger"}`}
                  >
                    {macd > 0 ? "Bullish" : "Bearish"}
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 font-medium">Volatility (Beta)</td>
                  <td className="px-5 py-4 text-right font-bold font-mono">
                    {beta.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-text-muted">
                    Neutral
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors border-b-0">
                  <td className="px-5 py-4 font-medium">Alpha (Nifty 50)</td>
                  <td className="px-5 py-4 text-right font-bold font-mono">
                    {alpha > 0 ? "+" : ""}
                    {alpha.toFixed(2)}%
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-bold ${alphaStatus.includes("OUTPERFORMING") ? "text-success" : alphaStatus.includes("UNDERPERFORMING") ? "text-danger" : "text-text-muted"}`}
                  >
                    {alphaStatus.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Moving Averages */}
      <div>
        <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
          Moving averages{" "}
          <InfoTooltip
            content="SMA: Simple, EMA: Exponential trajectory profile."
            align="left"
          />
        </h2>
        <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.03] text-[9px] uppercase tracking-[0.12em] text-text-muted font-black">
              <tr>
                <th className="px-6 py-3.5 font-bold">Period</th>
                <th className="px-6 py-3.5 font-bold text-right">SMA</th>
                <th className="px-6 py-3.5 font-bold text-right">EMA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main border-b border-border-main text-[#f3f4f6]">
              {["10D", "20D", "50D", "100D", "200D"].map((p) => {
                const sma = ma[`sma_${p.toLowerCase()}`];
                const ema = ma[`ema_${p.toLowerCase()}`];
                const smaColor =
                  loading || !sma
                    ? "text-white/10"
                    : currentPrice > sma
                      ? "text-success"
                      : "text-danger";
                const emaColor =
                  loading || !ema
                    ? "text-white/10"
                    : currentPrice > ema
                      ? "text-success"
                      : "text-danger";

                return (
                  <tr key={p} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-5 font-medium">{p}</td>
                    <td
                      className={`px-8 py-5 text-right font-bold tracking-wide ${smaColor}`}
                    >
                      {loading
                        ? "---"
                        : sma?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                    </td>
                    <td
                      className={`px-8 py-5 text-right font-bold tracking-wide ${emaColor}`}
                    >
                      {loading
                        ? "---"
                        : ema?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
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
          <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
            Fundamentals{" "}
            <InfoTooltip
              content="Core macro-financial metrics profile."
              align="left"
            />
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 p-5 rounded-xl">
              <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-black mb-2">
                Market Cap
              </p>
              <p className="text-2xl font-bold text-text-bold">
                {loading ? (
                  <span className="animate-pulse text-white/10">---</span>
                ) : (
                  `₹${(data.fundamentals?.market_cap / 10000000 || 0).toFixed(0)}Cr`
                )}
              </p>
            </div>
            <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
                P/E Ratio
              </p>
              <p className="text-2xl font-bold text-text-bold">
                {loading ? (
                  <span className="animate-pulse text-white/10">---</span>
                ) : (
                  data.fundamentals?.pe_ratio?.toFixed(2) || "N/A"
                )}
              </p>
            </div>
            <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
                Industry P/E
              </p>
              <p className="text-2xl font-bold text-text-bold">
                {loading ? (
                  <span className="animate-pulse text-white/10">---</span>
                ) : data.fundamentals?.industry_pe ? (
                  data.fundamentals.industry_pe.toFixed(2)
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div className="bg-[#121212]/40 backdrop-blur-xl border border-white/5 hover:border-accent/20 transition-all duration-500 p-5 rounded-2xl shadow-lg">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">
                Dividend Yield
              </p>
              <p className="text-2xl font-bold text-text-bold">
                {loading ? (
                  <span className="animate-pulse text-white/10">---</span>
                ) : (
                  `${data.fundamentals?.dividend_yield?.toFixed(2) || "0.00"}%`
                )}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
            Delivery volume %{" "}
            <InfoTooltip
              content="Scale of equity actively delivered to demat accounts."
              align="left"
            />
          </h2>
          <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all duration-200 p-6 rounded-xl flex flex-col justify-between h-[232px]">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-info rounded-full" />{" "}
                  <span className="text-[#f3f4f6]">Total traded volume</span>
                </div>
                <span className="font-bold text-text-bold text-base">
                  7,72,07,941
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-secondary rounded-full" />{" "}
                  <span className="text-[#f3f4f6]">Delivery volume</span>
                </div>
                <span className="font-bold text-text-bold text-base">
                  3,85,05,388
                </span>
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
