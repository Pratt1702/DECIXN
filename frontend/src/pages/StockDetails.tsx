import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis, getPortfolio, getForecast, getStockFundamentals } from "../services/api";
import { motion } from "framer-motion";
import { useExploreStore } from "../store/useExploreStore";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  Activity,
  BarChart2,
  CandlestickChart,
  Bookmark,
  Bell,
  Zap,
  ExternalLink,
  TrendingUp,
  Building2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  ReferenceLine,
  XAxis,
} from "recharts";
import ReactApexChart from "react-apexcharts";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import {
  TechnicalIndicators,
  YearlyRangeBar,
} from "../components/dashboard/TechnicalIndicators";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { WatchlistModal } from "../components/dashboard/WatchlistModal";
import { AlertModal } from "../components/dashboard/AlertModal";
import { useWatchlistStore } from "../store/useWatchlistStore";
import gsap from "gsap";

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "All"];
const CANDLE_COUNT = 100; // Tweak this to change chart density

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.forecast_mean !== undefined;

    return (
      <div className="bg-[#121212]/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs font-medium flex flex-col gap-2 min-w-[140px]">
        <div className="flex justify-between items-center gap-4">
          <span className="text-[#9ca3af]">{data.date || "Today"}</span>
          {isForecast && (
            <span
              className={`${data.price !== undefined ? "bg-white/10 text-white/40" : "bg-accent/20 text-accent"} text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-tighter uppercase`}
            >
              {data.price !== undefined ? "Back-Test" : "Forecast"}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {isForecast ? (
            <>
              {data.price !== undefined && (
                <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-1.5">
                  <span className="text-white/60">Actual Close</span>
                  <span className="text-[#94a3b8] font-bold underline decoration-white/20 underline-offset-4">
                    ₹{Number(data.price).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-white/40">Range High</span>
                <span className="text-success font-bold text-[10px]">
                  ₹{Number(data.forecast_high).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 font-bold">Mean Est.</span>
                <span className="text-white font-bold">
                  ₹{Number(data.forecast_mean).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40">Range Low</span>
                <span className="text-danger font-bold text-[10px]">
                  ₹{Number(data.forecast_low).toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center gap-4">
              <span className="text-white/40">Price</span>
              <span className="text-[#f3f4f6] font-bold text-sm">
                ₹
                {Number(data.price).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// DUAL SIGNAL HEADER — Short-Term (Technical) vs Long-Term (Fundamental)
// ─────────────────────────────────────────────────────────────────────────────

function DualSignalHeader({ data, quarterlyFundamentals, loading }: { data: any; quarterlyFundamentals: any; loading: boolean }) {
  const decisionColor = (d: string) => {
    if (!d) return "text-white/50";
    const u = d.toUpperCase();
    if (u.includes("STRONG BUY")) return "text-emerald-400";
    if (u.includes("BUY")) return "text-emerald-400";
    if (u.includes("SELL") || u.includes("REDUCE")) return "text-red-400";
    if (u.includes("WATCH")) return "text-amber-400";
    return "text-white/80";
  };

  const gradeColor = (g: string) => {
    if (g === "A") return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    if (g === "B") return "text-sky-400 border-sky-400/30 bg-sky-400/10";
    if (g === "C") return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    return "text-red-400 border-red-400/30 bg-red-400/10";
  };

  const verdictColor = (v: string) => {
    if (!v) return "text-white/40";
    const u = v.toUpperCase();
    if (u.includes("STRONG") || u === "FUNDAMENTALLY STRONG") return "text-emerald-400";
    if (u === "SOLID") return "text-sky-400";
    if (u === "POSITIVE") return "text-emerald-400";
    if (u === "NEGATIVE") return "text-red-400";
    if (u === "WEAK") return "text-red-400";
    return "text-amber-400";
  };

  const lt = quarterlyFundamentals?.long_term;
  const mt = quarterlyFundamentals?.medium_term;
  const dataQuality = quarterlyFundamentals?.data_quality;
  const ltAvailable = lt?.available && dataQuality !== "SMALL_CAP" && dataQuality !== "NO_DATA";
  const mtAvailable = mt?.available && dataQuality !== "SMALL_CAP" && dataQuality !== "NO_DATA";

  if (loading || !data) {
    return (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* ── SHORT TERM ── */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent/5 p-4 flex flex-col gap-2">
        <div className="absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-10 bg-accent -mr-6 -mt-6 pointer-events-none" />
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/70">📈 Short-Term Signal</span>
          <span className="ml-auto text-[9px] text-white/30 font-bold uppercase tracking-widest">Days to Weeks</span>
        </div>
        <div className={`text-2xl font-black tracking-tight leading-none ${decisionColor(data.decision)}`}>
          {data.decision || "—"}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Confidence</span>
          <div className="flex-1 h-1 rounded-full bg-white/5">
            <div
              className="h-1 rounded-full bg-accent transition-all duration-700"
              style={{ width: `${data.confidence_score || 0}%` }}
            />
          </div>
          <span className="text-[11px] font-black text-accent">{data.confidence_score || 0}%</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Pattern</span>
          <span className="text-[9px] font-black text-white/60">{data.pattern || "—"}</span>
        </div>
      </div>

      {/* ── LONG TERM ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex flex-col gap-2">
        <div className="absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-10 bg-amber-400 -mr-6 -mt-6 pointer-events-none" />
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70">🏛 Long-Term Fundamentals</span>
          <span className="ml-auto text-[9px] text-white/30 font-bold uppercase tracking-widest">1–3 Years</span>
        </div>

        {ltAvailable ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${gradeColor(lt.grade)}`}>
                Grade {lt.grade}
              </span>
              <span className={`text-xl font-black tracking-tight leading-none ${verdictColor(lt.verdict)}`}>
                {lt.verdict}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {lt.revenue_cagr_3y != null && (
                <span className="text-[9px] font-bold text-white/40">
                  Rev CAGR <span className={`font-black ${lt.revenue_cagr_3y > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {lt.revenue_cagr_3y > 0 ? "+" : ""}{lt.revenue_cagr_3y}%
                  </span>
                </span>
              )}
              {lt.fcf_positive != null && (
                <span className="text-[9px] font-bold text-white/40">
                  FCF <span className={`font-black ${lt.fcf_positive ? "text-emerald-400" : "text-red-400"}`}>
                    {lt.fcf_positive ? "✓ Positive" : "✗ Negative"}
                  </span>
                </span>
              )}
              {mtAvailable && mt.earnings_beat_rate != null && (
                <span className="text-[9px] font-bold text-white/40">
                  Beat Rate <span className={`font-black ${mt.earnings_beat_rate >= 75 ? "text-emerald-400" : mt.earnings_beat_rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                    {mt.earnings_beat_rate}%
                  </span>
                </span>
              )}
            </div>
          </>
        ) : dataQuality === "SMALL_CAP" ? (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[11px] font-black text-amber-400/70">Small Cap</span>
            <span className="text-[10px] text-white/30 font-medium leading-snug">Filings data sparse. Long-term view unavailable.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[11px] font-black text-white/30">Data Unavailable</span>
            <span className="text-[10px] text-white/20 font-medium">Yahoo Finance has no filings for this ticker.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function FundamentalsSection({ quarterlyFundamentals, data }: { quarterlyFundamentals: any; data: any }) {
  const ct = quarterlyFundamentals?.comprehensive_table;
  const mt = quarterlyFundamentals?.medium_term;
  const lt = quarterlyFundamentals?.long_term;
  const dataQuality = quarterlyFundamentals?.data_quality;
  const smallCap = dataQuality === "SMALL_CAP" || dataQuality === "NO_DATA";

  const fmtNum = (v: number | null | undefined, decimals = 2, suffix = "") => {
    if (v == null) return "—";
    const formatted = v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${formatted}${suffix}`;
  };

  const fmtCr = (cr: number | null | undefined) => {
    if (cr == null) return "—";
    if (cr >= 100000) return `₹${(cr / 100000).toFixed(1)}L Cr`;
    return `₹${cr.toLocaleString("en-IN")} Cr`;
  };

  const fmtPct = (v: number | null | undefined) => v == null ? "—" : `${v > 0 ? "+" : ""}${v}%`;

  const tableRows = [
    { category: "Valuation", label: "P/E Ratio (TTM)", value: ct?.pe_ratio ? `${fmtNum(ct.pe_ratio, 1)}x` : "—" },
    { category: "Valuation", label: "Forward P/E", value: ct?.forward_pe ? `${fmtNum(ct.forward_pe, 1)}x` : "—" },
    { category: "Valuation", label: "PEG Ratio", value: ct?.peg_ratio ? fmtNum(ct.peg_ratio, 2) : "—", highlight: ct?.peg_ratio && ct.peg_ratio < 1 ? "green" : null },
    { category: "Valuation", label: "Price / Book", value: ct?.price_to_book ? `${fmtNum(ct.price_to_book, 2)}x` : "—" },
    { category: "Valuation", label: "Market Cap", value: fmtCr(ct?.market_cap_cr) },
    
    { category: "Performance", label: "ROE", value: ct?.roe != null ? `${ct.roe}%` : "—", highlight: ct?.roe != null ? (ct.roe > 15 ? "green" : ct.roe < 5 ? "red" : null) : null },
    { category: "Performance", label: "Profit Margin", value: ct?.profit_margin != null ? `${ct.profit_margin}%` : "—", highlight: ct?.profit_margin != null ? (ct.profit_margin > 12 ? "green" : ct.profit_margin < 0 ? "red" : null) : null },
    { category: "Performance", label: "Revenue Growth (YoY)", value: fmtPct(ct?.revenue_growth_yoy), highlight: ct?.revenue_growth_yoy != null ? (ct.revenue_growth_yoy > 15 ? "green" : ct.revenue_growth_yoy < 0 ? "red" : null) : null },
    { category: "Performance", label: "Earnings Growth (YoY)", value: fmtPct(ct?.earnings_growth_yoy), highlight: ct?.earnings_growth_yoy != null ? (ct.earnings_growth_yoy > 15 ? "green" : ct.earnings_growth_yoy < 0 ? "red" : null) : null },
    
    { category: "Quarterly Intelligence", label: "EPS Beat Rate", value: mt?.earnings_beat_rate != null ? `${mt.earnings_beat_rate}%` : "—", highlight: mt?.earnings_beat_rate >= 75 ? "green" : mt?.earnings_beat_rate < 50 ? "red" : null },
    { category: "Quarterly Intelligence", label: "Earnings Momentum", value: mt?.earnings_momentum || "—", highlight: mt?.earnings_momentum === "Accelerating" ? "green" : mt?.earnings_momentum === "Decelerating" ? "red" : null },
    { category: "Quarterly Intelligence", label: "Last Surprise", value: mt?.quarterly_earnings?.[0]?.surprise_pct != null ? `${mt.quarterly_earnings[0].surprise_pct}%` : "—", highlight: mt?.quarterly_earnings?.[0]?.surprise_pct > 0 ? "green" : (mt?.quarterly_earnings?.[0]?.surprise_pct < 0 ? "red" : null) },

    { category: "Long-Term Growth", label: "3Y Revenue CAGR", value: lt?.revenue_cagr_3y != null ? `${lt.revenue_cagr_3y}%` : "—", highlight: lt?.revenue_cagr_3y > 20 ? "green" : (lt?.revenue_cagr_3y < 5 ? "red" : null) },
    { category: "Long-Term Growth", label: "FCF Status (Annual)", value: lt?.fcf_positive != null ? (lt.fcf_positive ? "Positive ✅" : "Negative ⚠️") : "—", highlight: lt?.fcf_positive ? "green" : "red" },
    { category: "Long-Term Growth", label: "Debt / Equity", value: ct?.debt_to_equity != null ? `${ct.debt_to_equity}x` : "—", highlight: ct?.debt_to_equity < 0.6 ? "green" : (ct?.debt_to_equity > 1.5 ? "red" : null) },

    { category: "Liquidity & Range", label: "Average Volume", value: ct?.avg_volume ? (ct.avg_volume / 1000000 >= 1 ? `${(ct.avg_volume / 1000000).toFixed(1)}M` : (ct.avg_volume / 1000).toFixed(0) + "K") : "—" },
    { category: "Liquidity & Range", label: "Delivery Conviction", value: "High / Stable", highlight: "green" },
    { category: "Liquidity & Range", label: "52W High", value: ct?.fifty_two_week_high ? `₹${fmtNum(ct.fifty_two_week_high, 1)}` : "—" },
    { category: "Liquidity & Range", label: "52W Low", value: ct?.fifty_two_week_low ? `₹${fmtNum(ct.fifty_two_week_low, 1)}` : "—" },
  ];

  const categories = [...new Set(tableRows.map(r => r.category))];

  const highlightClass = (h: string | null | undefined) => {
    if (h === "green") return "text-emerald-400";
    if (h === "red") return "text-red-400";
    return "text-white/70";
  };

  if (!quarterlyFundamentals && !data) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Table-based Fundamentals ── */}
      <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/30" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Extended Fundamentals Intelligence</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {categories.map(cat => (
            <div key={cat}>
              <div className="px-5 pt-3 pb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">{cat}</span>
              </div>
              {tableRows.filter(r => r.category === cat).map(row => (
                <div key={row.label} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <span className="text-[12px] font-bold text-white/50">{row.label}</span>
                  <span className={`text-[12px] font-black tabular-nums ${highlightClass(row.highlight)}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Small Cap / No Data Banner ── */}
      {smallCap && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
          <AlertCircle className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
          <p className="text-[11px] text-white/40 font-bold leading-relaxed">
            {quarterlyFundamentals?.message || "Detailed filings data unavailable. Analysis is based on technical signals only."}
          </p>
        </div>
      )}

      {/* ── Medium-Term Quarterly Panel ── */}
      {mt?.available && !smallCap && (
        <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Medium-Term · Quarterly Results</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                mt.verdict === "POSITIVE" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
                mt.verdict === "NEGATIVE" ? "text-red-400 border-red-400/30 bg-red-400/10" :
                "text-amber-400 border-amber-400/30 bg-amber-400/10"
              }`}>
                {mt.verdict}
              </span>
              {mt.upcoming_earnings && (
                <span className="text-[9px] font-black text-amber-400 border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 rounded-md">
                  Earnings {mt.upcoming_earnings.days_away}d
                </span>
              )}
            </div>
          </div>

          {/* EPS Beat/Miss Table */}
          {mt.quarterly_earnings?.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black mb-3">EPS — Actual vs Estimate</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left pb-2 font-black text-white/30 uppercase tracking-widest text-[9px]">Quarter</th>
                      <th className="text-right pb-2 font-black text-white/30 uppercase tracking-widest text-[9px]">Estimate</th>
                      <th className="text-right pb-2 font-black text-white/30 uppercase tracking-widest text-[9px]">Actual</th>
                      <th className="text-right pb-2 font-black text-white/30 uppercase tracking-widest text-[9px]">Surprise</th>
                      <th className="text-right pb-2 font-black text-white/30 uppercase tracking-widest text-[9px]">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {mt.quarterly_earnings.map((q: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 font-black text-white/60">{q.quarter}</td>
                        <td className="py-2.5 text-right font-bold text-white/40">
                          {q.eps_estimate != null ? `₹${q.eps_estimate.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2.5 text-right font-black text-white/80">
                          ₹{q.eps_actual?.toFixed(2) ?? "—"}
                        </td>
                        <td className={`py-2.5 text-right font-black ${q.surprise_pct != null ? (q.surprise_pct > 0 ? "text-emerald-400" : "text-red-400") : "text-white/30"}`}>
                          {q.surprise_pct != null ? `${q.surprise_pct > 0 ? "+" : ""}${q.surprise_pct}%` : "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          {q.beat === true ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-black">
                              <CheckCircle2 className="w-3 h-3" /> Beat
                            </span>
                          ) : q.beat === false ? (
                            <span className="inline-flex items-center gap-1 text-red-400 font-black">
                              <XCircle className="w-3 h-3" /> Miss
                            </span>
                          ) : (
                            <span className="text-white/20 font-bold">
                              <MinusCircle className="w-3 h-3 inline" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary row */}
              <div className="flex flex-wrap gap-4 mt-4 pt-3.5 border-t border-white/5">
                {mt.earnings_beat_rate != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-white/25 font-black">Beat Rate</span>
                    <span className={`text-[11px] font-black ${mt.earnings_beat_rate >= 75 ? "text-emerald-400" : mt.earnings_beat_rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {mt.earnings_beat_rate}%
                    </span>
                  </div>
                )}
                {mt.earnings_momentum && mt.earnings_momentum !== "Unknown" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-white/25 font-black">EPS Momentum</span>
                    <span className={`text-[11px] font-black ${mt.earnings_momentum === "Accelerating" ? "text-emerald-400" : mt.earnings_momentum === "Decelerating" ? "text-red-400" : "text-amber-400"}`}>
                      {mt.earnings_momentum === "Accelerating" ? "↑ Accelerating" : mt.earnings_momentum === "Decelerating" ? "↓ Decelerating" : "→ Stable"}
                    </span>
                  </div>
                )}
                {mt.debt_equity != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-white/25 font-black">D/E (Current)</span>
                    <span className={`text-[11px] font-black ${mt.debt_equity < 0.5 ? "text-emerald-400" : mt.debt_equity > 2 ? "text-red-400" : "text-white/70"}`}>
                      {mt.debt_equity}x
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quarterly Revenue Bars */}
          {mt.quarterly_revenue?.length > 0 && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black mb-3">Quarterly Revenue (₹ Cr)</p>
              <div className="flex items-end gap-2 h-20">
                {[...mt.quarterly_revenue].reverse().map((q: any, i: number) => {
                  const maxRev = Math.max(...mt.quarterly_revenue.map((x: any) => x.revenue_cr || 0));
                  const pct = maxRev > 0 && q.revenue_cr ? (q.revenue_cr / maxRev) * 100 : 10;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-[8px] font-black ${q.qoq_change != null ? (q.qoq_change >= 0 ? "text-emerald-400" : "text-red-400") : "text-white/20"}`}>
                        {q.qoq_change != null ? `${q.qoq_change > 0 ? "+" : ""}${q.qoq_change}%` : ""}
                      </span>
                      <div className="w-full flex justify-center">
                        <div
                          className={`w-full rounded-t-sm transition-all duration-500 ${q.qoq_change != null && q.qoq_change >= 0 ? "bg-emerald-400/30" : "bg-red-400/25"}`}
                          style={{ height: `${Math.max(pct * 0.48, 4)}px` }}
                        />
                      </div>
                      <span className="text-[8px] text-white/30 font-bold text-center w-full truncate">{q.quarter}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Medium-term signal bullets */}
          {mt.signals?.length > 0 && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black mb-3">Key Observations</p>
              <div className="flex flex-col gap-2">
                {mt.signals.slice(0, 4).map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                    <p className="text-[11px] text-white/50 font-bold leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Long-Term Scorecard ── */}
      {lt?.available && !smallCap && (
        <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/30" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Long-Term Scorecard · 1–3 Years</h3>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
              lt.grade === "A" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
              lt.grade === "B" ? "text-sky-400 border-sky-400/30 bg-sky-400/10" :
              lt.grade === "C" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
              "text-red-400 border-red-400/30 bg-red-400/10"
            }`}>
              Grade {lt.grade} · {lt.verdict}
            </span>
          </div>

          {/* Annual Revenue Trend */}
          {lt.annual_revenue?.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black mb-3">Annual Revenue (₹ Cr)</p>
              <div className="flex items-end gap-2 h-16">
                {[...lt.annual_revenue].reverse().map((y: any, i: number) => {
                  const maxRev = Math.max(...lt.annual_revenue.map((x: any) => x.revenue_cr || 0));
                  const pct = maxRev > 0 && y.revenue_cr ? (y.revenue_cr / maxRev) * 100 : 10;
                  const isNewest = i === lt.annual_revenue.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full flex justify-center">
                        <div
                          className={`w-full rounded-t-sm transition-all duration-500 ${isNewest ? "bg-amber-400/40" : "bg-white/10"}`}
                          style={{ height: `${Math.max(pct * 0.4, 4)}px` }}
                        />
                      </div>
                      <span className="text-[8px] text-white/30 font-bold">{y.year}</span>
                    </div>
                  );
                })}
              </div>
              {lt.revenue_cagr_3y != null && (
                <p className={`text-[10px] font-black mt-1 ${lt.revenue_cagr_3y > 5 ? "text-emerald-400" : lt.revenue_cagr_3y < 0 ? "text-red-400" : "text-white/40"}`}>
                  3Y CAGR: {lt.revenue_cagr_3y > 0 ? "+" : ""}{lt.revenue_cagr_3y}%
                </p>
              )}
            </div>
          )}

          {/* Key metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-white/5 mt-2">
            {[
              { label: "ROE", val: lt.roe != null ? `${lt.roe}%` : "—", good: lt.roe != null && lt.roe > 15 },
              { label: "Profit Margin", val: lt.profit_margin != null ? `${lt.profit_margin}%` : "—", good: lt.profit_margin != null && lt.profit_margin > 10 },
              { label: "FCF", val: lt.fcf_positive != null ? (lt.fcf_positive ? "Positive" : "Negative") : "—", good: lt.fcf_positive === true },
              { label: "PEG Ratio", val: lt.peg_ratio != null ? lt.peg_ratio.toFixed(1) : "—", good: lt.peg_ratio != null && lt.peg_ratio < 1.5 },
            ].map(({ label, val, good }) => (
              <div key={label} className="px-4 py-3 border-r border-white/5 last:border-0 flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-widest text-white/25 font-black">{label}</span>
                <span className={`text-[13px] font-black ${good ? "text-emerald-400" : "text-white/60"}`}>{val}</span>
              </div>
            ))}
          </div>

          {lt.signals?.length > 0 && (
            <div className="px-5 py-4 border-t border-white/5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black mb-3">Fundamental Signals</p>
              <div className="flex flex-col gap-2">
                {lt.signals.slice(0, 4).map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-400/40 mt-1.5 shrink-0" />
                    <p className="text-[11px] text-white/50 font-bold leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StockDetails() {

  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [quarterlyFundamentals, setQuarterlyFundamentals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(
    localStorage.getItem("preferred_period") || "1D",
  );
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [holding, setHolding] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addRecentView } = useExploreStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const { isSymbolInAnyWatchlist } = useWatchlistStore();

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    localStorage.setItem("preferred_period", p);
  };

  useEffect(() => {
    async function checkPortfolio() {
      try {
        const port = await getPortfolio();
        if (port && port.portfolio_analysis && ticker) {
          const cleanTicker = ticker
            .toLowerCase()
            .trim()
            .split(".")[0] // Strip .NS, .BO, etc reliably
            .replace(/\s+/g, "");

          const match = port.portfolio_analysis.find((h: any) => {
            if (!h.symbol) return false;

            const hSymClean = h.symbol
              .toLowerCase()
              .trim()
              .split(".")[0]
              .replace(/\s+/g, "");

            const dataNameClean = (data?.companyName || "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "");

            return (
              hSymClean === cleanTicker ||
              hSymClean === dataNameClean ||
              (dataNameClean && dataNameClean.includes(hSymClean)) ||
              cleanTicker.includes(hSymClean)
            );
          });
          setHolding(match);
        }
      } catch (e) {
        console.error("Failed to cross-reference portfolio cache");
      }
    }
    checkPortfolio();
  }, [ticker, data]);

  useEffect(() => {
    async function fetchTicker() {
      if (!ticker) return;

      const cleanTicker = ticker
        .toUpperCase()
        .replace(".NS", "")
        .replace(".BO", "");

      setLoading(true);
      setData(null);
      try {
        const res = await getTickerAnalysis(cleanTicker);
        setData({
          symbol: res.symbol,
          companyName: res.data.companyName,
          price: res.data.price,
          decision: res.data.decision,
          confidence_score: res.data.confidence_score,
          trend: res.data.trend,
          reasons: res.data.reasons,
          charts: res.data.charts || {},
          fundamentals: res.data.fundamentals,
          quarterly_fundamentals: res.data.quarterly_fundamentals,
          pivots: res.data.pivots,
          moving_averages: res.data.moving_averages,
          indicators: res.data.indicators,
          benchmark_comparison: res.data.benchmark_comparison,
          news_insight: res.data.news_insight,
          yahoo_news: res.data.yahoo_news,
          dividend_calendar: res.data.dividend_calendar,
          next_day_range: res.data.next_day_range,
        });
        // Set quarterly fundamentals from the main response immediately
        if (res.data.quarterly_fundamentals) {
          setQuarterlyFundamentals(res.data.quarterly_fundamentals);
        }
        try {
          const fRes = await getForecast(cleanTicker);
          if (fRes.success) {
            setForecast(fRes.forecast);
          }
        } catch (e) {
          console.warn("Forecast fetch failed", e);
        }
        // Fire standalone fundamentals fetch as well (enriches if main response is stale)
        try {
          const fndRes = await getStockFundamentals(cleanTicker);
          if (fndRes?.quarterly_fundamentals) {
            setQuarterlyFundamentals(fndRes.quarterly_fundamentals);
          }
        } catch (e) {
          console.warn("Standalone fundamentals fetch failed", e);
        }
      } catch (err) {
        console.error("Failed to fetch ticker:", err);
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    }
    fetchTicker();
  }, [ticker]);

  useEffect(() => {
    if (data && !data.error) {
      let priceChange = 0;
      let priceChangePct = 0;
      const currentChart = data.charts?.[period] || [];
      if (currentChart && currentChart.length > 0) {
        const firstPrice = currentChart[0].price;
        priceChange = data.price - firstPrice;
        priceChangePct = (priceChange / firstPrice) * 100;
      }

      addRecentView({
        symbol: data.symbol,
        companyName: data.companyName || data.symbol,
        price: data.price,
        change: priceChange,
        changePercent: priceChangePct,
      });
    }
  }, [data, period, addRecentView]);

  useEffect(() => {
    if (!loading && data && !data.error && containerRef.current) {
      const ctx = gsap.context(() => {
        // Animate ONLY the newly revealed dynamic content, not the shells
        gsap.fromTo(
          ".animate-value",
          { opacity: 0, scale: 0.95, y: 10 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1,
            stagger: 0.05,
            ease: "power4.inOut",
          },
        );
      }, containerRef.current);
      return () => ctx.revert();
    }
  }, [loading, data]);

  if (data?.error) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center space-y-5 text-center px-4 font-body">
        <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center border border-danger/20">
          <AlertTriangle className="w-10 h-10 text-danger" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-text-bold mb-2">
            Stock Not Found
          </h2>
          <p className="text-text-muted max-w-sm mx-auto">
            {" "}
            Intelligence for '
            <span className="text-[#f3f4f6] font-medium">{ticker}</span>' is
            unavailable.
          </p>
        </div>
        <button
          onClick={() => navigate("/stocks/holdings")}
          className="px-6 py-2.5 mt-4 bg-border-main hover:bg-[#3f3f46] rounded-full text-sm font-medium transition-all text-text-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const currentChart = data?.charts?.[period] || [];
  const oneMonthData = data?.charts?.["1M"] || [];
  const currentPrice = data?.price || 0;

  // Dedicated forecast chart data (30d History + 14d forecast)
  // CRITICAL: We use DAILY data from "1Y" to match the DAILY forecast perfectly.
  // Using hourly data (1M chart) causes jumps and misalignments.
  const oneYearDaily = data?.charts?.["1Y"] || [];
  const forecastBaseline = oneYearDaily.slice(-30);

  const forecastChartData = forecastBaseline.map((d: any) => ({ ...d }));

  if (forecast?.series) {
    forecast.series.forEach((fPoint: any) => {
      const existingIdx = forecastChartData.findIndex(
        (d: any) => d.date === fPoint.date,
      );

      if (existingIdx !== -1) {
        forecastChartData[existingIdx] = {
          ...forecastChartData[existingIdx],
          ...fPoint,
          forecast_range_upper: [fPoint.forecast_mean, fPoint.forecast_high],
          forecast_range_lower: [fPoint.forecast_low, fPoint.forecast_mean],
          forecast_future_only: fPoint.is_future
            ? fPoint.forecast_mean
            : undefined,
        };
      } else if (fPoint.is_future) {
        forecastChartData.push({
          ...fPoint,
          forecast_range_upper: [fPoint.forecast_mean, fPoint.forecast_high],
          forecast_range_lower: [fPoint.forecast_low, fPoint.forecast_mean],
          forecast_future_only: fPoint.forecast_mean,
        });
      }
    });
  }

  let priceChange = 0;
  let priceChangePct = 0;

  if (currentChart && currentChart.length > 0) {
    const firstPrice = currentChart[0].price;
    priceChange = currentPrice - firstPrice;
    priceChangePct = (priceChange / firstPrice) * 100;
  }

  const isPos = priceChange >= 0;
  const strokeColor = isPos ? "#10b981" : "#f43f5e";

  return (
    <div ref={containerRef} className="space-y-6 max-w-3xl mx-auto pb-12">
      <button
        onClick={() => navigate("/stocks/holdings")}
        className="flex items-center gap-2 text-[11px] text-text-muted hover:text-text-bold transition-all w-fit group cursor-pointer font-bold uppercase tracking-widest"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />{" "}
        Back to Dashboard
      </button>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end gap-3 md:gap-4 mb-1">
          {!data && loading ? (
            <div className="h-10 w-64 bg-white/5 animate-pulse rounded-xl" />
          ) : (
            <div className="animate-value flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-text-bold drop-shadow-sm truncate">
                {data?.companyName ||
                  data?.symbol?.replace(".NS", "").replace(".BO", "") ||
                  ticker}
              </h1>
              <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-md text-xs font-bold font-mono self-end shrink-0 tracking-wider mb-1">
                {data?.symbol?.replace(".NS", "").replace(".BO", "") || ticker}
              </span>
              <button
                onClick={() => setModalOpen(true)}
                className={`ml-1 p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${isSymbolInAnyWatchlist(ticker || "") ? "bg-accent/10 border-accent/20 text-accent" : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10"}`}
                title="Save to Watchlist"
              >
                <Bookmark
                  className={`w-5 h-5 ${isSymbolInAnyWatchlist(ticker || "") ? "fill-accent" : ""}`}
                />
              </button>
              <button
                onClick={() => setAlertModalOpen(true)}
                className="ml-1 p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                title="Set Alert"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {data?.fundamentals && (
          <div className="flex items-center gap-2 mb-2 animate-value">
            {data.fundamentals.sector &&
              data.fundamentals.sector !== "Unknown" && (
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] uppercase font-bold tracking-widest text-[#a1a1aa] border border-white/10">
                  {data.fundamentals.sector}
                </span>
              )}
            {data.fundamentals.industry &&
              data.fundamentals.industry !== "Unknown" && (
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] uppercase font-bold tracking-widest text-[#a1a1aa] border border-white/10">
                  {data.fundamentals.industry}
                </span>
              )}
            {data.fundamentals.quote_type && (
              <span className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] uppercase font-bold tracking-widest text-[#a1a1aa] border border-white/10">
                {data.fundamentals.quote_type}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 text-left">
          {!data && loading ? (
            <div className="space-y-4">
              <div className="h-10 w-40 bg-white/5 animate-pulse rounded-xl" />
              <div className="h-4 w-64 bg-white/5 animate-pulse rounded-xl" />
            </div>
          ) : (
            <div className="animate-value">
              <AnimatedNumber
                value={currentPrice}
                prefix="₹"
                decimals={2}
                className="block text-3xl font-black tracking-tight text-text-bold"
              />
              <div
                className={`flex items-center gap-2 font-black mt-1.5 text-base ${isPos ? "text-success" : "text-danger"}`}
              >
                <span>
                  <AnimatedNumber
                    value={priceChange}
                    showPlusSign
                    decimals={2}
                    className="inline-block"
                  />{" "}
                  (
                  <AnimatedNumber
                    value={priceChangePct}
                    showPlusSign
                    decimals={2}
                    className="inline-block"
                  />
                  %)
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span className="text-text-muted font-bold uppercase text-xs tracking-widest">
                  {period}
                </span>
              </div>
            </div>
          )}

          {/* Dual Signal Header: Short-Term vs Long-Term */}
          <DualSignalHeader data={data} quarterlyFundamentals={quarterlyFundamentals} loading={loading} />
        </div>
      </header>

      {/* HIGH IMPACT CATALYST SIGNAL */}
      {!!data?.news_insight?.has_catalyst && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden p-6 rounded-2xl border ${
            data.news_insight.sentiment === "positive"
              ? "bg-success/5 border-success/20 ring-1 ring-success/10"
              : "bg-danger/5 border-danger/20 ring-1 ring-danger/10"
          }`}
        >
          {/* Glow Effect */}
          <div
            className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-10 -mt-10 ${
              data.news_insight.sentiment === "positive"
                ? "bg-success"
                : "bg-danger"
            }`}
          />

          <div className="relative flex items-start gap-5">
            <div
              className={`p-3 rounded-xl ${
                data.news_insight.sentiment === "positive"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              <Zap size={24} className="animate-pulse" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    data.news_insight.sentiment === "positive"
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  Live Catalyst Detected
                </span>
              </div>
              <h3 className="text-lg font-black text-text-bold leading-snug mb-2">
                A news - {data.news_insight.title} might have a{" "}
                <span
                  className={
                    data.news_insight.sentiment === "positive"
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {data.news_insight.sentiment === "positive"
                    ? "positive"
                    : "negative"}
                </span>{" "}
                impact on this stock
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-[#cbd5e1] leading-relaxed font-black uppercase tracking-widest opacity-60">
                  Impact score {data.news_insight.impact_strength}/5
                </p>
                {data.news_insight.url && (
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <a
                      href={data.news_insight.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-accent/60 uppercase tracking-widest hover:text-accent transition-colors flex items-center gap-1"
                    >
                      Source <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="border-b border-white/5 pb-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-lg border border-border-main">
            <button
              onClick={() => setChartType("line")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                chartType === "line"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType("candle")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                chartType === "candle"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-64 sm:h-72 w-full relative mb-6">
          {!data && loading ? (
            <div className="h-full w-full bg-white/5 animate-pulse rounded-xl border border-white/5 flex items-center justify-center">
              <span className="text-xs text-text-muted font-bold tracking-widest animate-pulse">
                SYNTHESIZING...
              </span>
            </div>
          ) : (
            <div className="animate-value h-full w-full min-h-[288px]">
              {chartType === "line" ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                  <ComposedChart data={currentChart}>
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "#2e303a",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      isAnimationActive={false}
                    />

                    {/* Historical Price line */}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: strokeColor,
                        stroke: "#121212",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                (() => {
                  const n = currentChart.length;
                  const sampledChart =
                    n <= CANDLE_COUNT
                      ? currentChart
                      : (() => {
                          const sampled = [];
                          for (let i = 0; i < CANDLE_COUNT; i++) {
                            sampled.push(
                              currentChart[Math.floor(i * (n / CANDLE_COUNT))],
                            );
                          }
                          return sampled;
                        })();

                  return (
                    <ReactApexChart
                      options={{
                        chart: {
                          type: "candlestick",
                          background: "transparent",
                          toolbar: { show: false },
                          animations: { enabled: false },
                          sparkline: { enabled: false },
                        },
                        stroke: {
                          show: true,
                          width: [1, 0],
                        },
                        plotOptions: {
                          candlestick: {
                            colors: { upward: "#10b981", downward: "#f43f5e" },
                            wick: { useFillColor: true },
                          },
                          bar: {
                            columnWidth: "70%",
                            borderRadius: 0,
                          },
                        },
                        xaxis: {
                          type: "category",
                          labels: { show: false },
                          axisBorder: { show: false },
                          axisTicks: { show: false },
                          tooltip: { enabled: false },
                          crosshairs: {
                            show: true,
                            position: "back",
                            stroke: {
                              color: "#ffffff20",
                              width: 1,
                              dashArray: 4,
                            },
                          },
                        },
                        yaxis: [
                          {
                            labels: { show: false },
                            tooltip: { enabled: true },
                            axisBorder: { show: false },
                            axisTicks: { show: false },
                            min: (min: any) => min * 0.99,
                            max: (max: any) => max * 1.01,
                            crosshairs: {
                              show: true,
                              stroke: {
                                color: "#ffffff20",
                                width: 1,
                                dashArray: 4,
                              },
                            },
                          },
                          {
                            seriesName: "Volume",
                            show: false,
                            min: 0,
                            max: (max) => max * 3.5,
                          },
                        ],
                        legend: {
                          show: false,
                        },
                        grid: {
                          show: false,
                          padding: { left: -10, right: -10, top: 0, bottom: 0 },
                        },
                        tooltip: {
                          theme: "dark",
                          shared: true,
                          custom: function ({ dataPointIndex, w }: any) {
                            if (
                              !w.globals.seriesCandleO[0] ||
                              !w.globals.seriesCandleO[0][dataPointIndex]
                            )
                              return "";
                            const o =
                              w.globals.seriesCandleO[0][dataPointIndex];
                            const h =
                              w.globals.seriesCandleH[0][dataPointIndex];
                            const l =
                              w.globals.seriesCandleL[0][dataPointIndex];
                            const c =
                              w.globals.seriesCandleC[0][dataPointIndex];
                            const v = w.globals.series[1]
                              ? w.config.series[1].data[dataPointIndex].y
                              : 0;
                            const date =
                              w.globals.categoryLabels[dataPointIndex];

                            return `
                              <div class="px-3 py-2 bg-[#121212] border border-white/10 rounded-lg shadow-xl text-[11px] font-bold">
                                <div class="mb-1 text-white/30">${date}</div>
                                <div class="flex gap-4">
                                  <span class="text-white/40">O <span class="text-white">${o.toFixed(2)}</span></span>
                                  <span class="text-white/40">H <span class="text-white">${h.toFixed(2)}</span></span>
                                </div>
                                <div class="flex gap-4 mb-2">
                                  <span class="text-white/40">L <span class="text-white">${l.toFixed(2)}</span></span>
                                  <span class="text-white/40">C <span class="text-white text-[#10b981]">${c.toFixed(2)}</span></span>
                                </div>
                                <div class="pt-1 border-t border-white/5">
                                  <span class="text-white/40 text-[10px]">VOL <span class="text-white">${v ? v.toLocaleString() : "-"}</span></span>
                                </div>
                              </div>
                            `;
                          },
                        },
                      }}
                      series={[
                        {
                          name: "Price",
                          type: "candlestick",
                          data: sampledChart.map((d: any) => ({
                            x: d.date,
                            y: [
                              d.open || d.price,
                              d.high || d.price,
                              d.low || d.price,
                              d.price,
                            ],
                          })),
                        },
                        {
                          name: "Volume",
                          type: "bar",
                          data: sampledChart.map((d: any) => ({
                            x: d.date,
                            y: d.volume || 0,
                            fillColor:
                              d.price >= (d.open || d.price)
                                ? "#10b98180"
                                : "#f43f5e80",
                          })),
                        },
                      ]}
                      type="line"
                      height="100%"
                    />
                  );
                })()
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 mt-6">
          <div className="flex-1" /> {/* Spacer to keep center row centered */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none">
            {PERIODS.map((p) => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-border-main text-text-bold border border-white/10"
                      : "bg-transparent text-text-muted hover:text-text-bold hover:bg-white/5"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => window.open(`/terminal/${ticker}`, "_blank")}
              className="group flex items-center gap-2.5 bg-bg-surface hover:bg-white/5 border border-border-main hover:border-white/10 text-text-muted hover:text-text-bold px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Open Advanced Terminal"
            >
              <span className="group-hover:text-text-bold transition-colors">
                Terminal
              </span>
              <CandlestickChart className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {holding && currentPrice > 0 && (
        <div
          className="bg-bg-surface border border-border-main rounded-xl px-6 py-5 mt-4 mb-4 flex flex-row items-center justify-between cursor-pointer hover:border-[#333] transition-all group"
          onClick={() => navigate("/stocks/holdings")}
        >
          <div>
            <p className="text-lg font-black text-text-bold tracking-tight">
              {holding.holding_context.quantity} Shares
            </p>
            <p className="text-[13px] text-text-muted mt-1 font-bold">
              Avg Price ₹
              {holding.holding_context.avg_cost.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right flex flex-col items-end">
              {(() => {
                const holdingPnl =
                  (currentPrice - holding.holding_context.avg_cost) *
                  holding.holding_context.quantity;
                const holdingPnlPct =
                  ((currentPrice - holding.holding_context.avg_cost) /
                    holding.holding_context.avg_cost) *
                  100;
                const isHPnlPos = holdingPnl >= 0;
                return (
                  <div className="animate-value text-right flex flex-col items-end">
                    <AnimatedNumber
                      value={holding.holding_context.quantity * currentPrice}
                      prefix="₹"
                      decimals={2}
                      className="text-lg font-black text-text-bold"
                    />
                    <div
                      className={`text-[13px] font-black mt-1 ${isHPnlPos ? "text-success" : "text-danger"}`}
                    >
                      <AnimatedNumber
                        value={holdingPnl}
                        showPlusSign
                        prefix="₹"
                        decimals={2}
                        className="inline-block"
                      />{" "}
                      (
                      <AnimatedNumber
                        value={holdingPnlPct}
                        showPlusSign
                        decimals={2}
                        className="inline-block"
                      />
                      %)
                    </div>
                  </div>
                );
              })()}
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-bold transition-colors shrink-0" />
          </div>
        </div>
      )}

      <div className="pt-2 flex flex-col gap-6">
        {forecast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#121212] border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-black text-text-bold">
                Price Forecast ({forecast.horizon_days - 2} Days)
              </h3>
              <span
                className={`ml-auto px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest ${forecast.bias === "Bullish" ? "bg-success/10 text-success" : forecast.bias === "Bearish" ? "bg-danger/10 text-danger" : "bg-white/10 text-white/70"}`}
              >
                {forecast.bias} Bias
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-1">
              <div className="flex items-center gap-2 pr-8 border-r border-white/5">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Target High
                </span>
                <span className="text-lg font-black text-success">
                  ₹
                  {(forecast?.forecast_high || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 pr-8 border-r border-white/5">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Mean Est.
                </span>
                <span className="text-lg font-black text-white/90">
                  ₹
                  {(forecast?.forecast_mean || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 pr-8 border-r border-white/5 last:border-0 last:pr-0">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Target Low
                </span>
                <span className="text-lg font-black text-danger">
                  ₹
                  {(forecast?.forecast_low || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 pr-8 border-r border-white/5">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                  Confidence
                </span>
                <span className="text-lg font-black text-accent">
                  {forecast.confidence_pct}%
                </span>
              </div>
            </div>

            {/* Dedicated Forecast Visualization below the stats */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em]">
                  Volatility Projection Chart
                </h4>
              </div>
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                  <ComposedChart data={forecastChartData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "#ffffff10", strokeWidth: 1 }}
                    />

                    {/* Forecast Bands */}
                    <Area
                      type="monotone"
                      dataKey="forecast_range_upper"
                      stroke="none"
                      fill="#10b981"
                      fillOpacity={0.12}
                      isAnimationActive={true}
                      connectNulls={true}
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast_range_lower"
                      stroke="none"
                      fill="#f43f5e"
                      fillOpacity={0.12}
                      isAnimationActive={true}
                      connectNulls={true}
                    />

                    {/* Anchor line (2 days ago) */}
                    {forecast?.anchor_date && (
                      <ReferenceLine
                        x={forecast.anchor_date}
                        stroke="#36342eff"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          position: "insideTopLeft",
                          fill: "#b08a27ff",
                          fontSize: 9,
                          fontWeight: "bold",
                        }}
                      />
                    )}

                    {/* Today Marker - Definitive Transition */}
                    {forecastBaseline.length > 0 && (
                      <ReferenceLine
                        x={forecastBaseline[forecastBaseline.length - 1].date}
                        stroke="#d0d0d0ff"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          position: "insideTopRight",
                          fill: "#d0d0d0ff",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      />
                    )}

                    {/* Historical Segment Label */}
                    <ReferenceLine
                      x={oneMonthData[0]?.date}
                      stroke="none"
                      label={{
                        value: "1M History",
                        position: "insideTopLeft",
                        fill: "#ffffff20",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    />

                    {/* Price Line */}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      dot={false}
                    />

                    {/* Mean Projection - Future Only */}
                    <Line
                      type="monotone"
                      dataKey="forecast_future_only"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        <YearlyRangeBar data={data} />
        <AIIntelligencePanel data={data} />
        <TechnicalIndicators data={data} />
        <FundamentalsSection quarterlyFundamentals={quarterlyFundamentals} data={data} />
      </div>

      <WatchlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        symbol={data?.symbol || ticker || ""}
      />

      <AlertModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        symbol={data?.symbol || ticker || ""}
      />
    </div>
  );
}
