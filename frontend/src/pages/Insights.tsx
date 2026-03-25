import { useEffect, useState, useMemo, useRef } from "react";
import { getPortfolio, analyzeCustomPortfolio } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  ChevronDown,
  ListFilter,
  Crosshair,
  BarChart3,
  Activity,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { usePortfolioStore } from "../store/usePortfolioStore";

const SESSION_KEY = "uploaded_holdings";

const MOCK_DATA = {
  portfolio_summary: {
    health: "Weak",
    risk_level: "High",
    total_invested: 230071,
    total_value_live: 204832,
    total_pnl: -25239,
    win_rate: "20%",
    insight:
      "Majority of holdings are currently sitting at a loss but showing recovery signs. Keep an eye on Tata Steel support levels.",
  },
  recommended_actions: [
    "Cut losses in deeply bearish stocks like Tata Steel to preserve capital if gap down occurs.",
    "Let your winners run. High confidence in Karnataka Bank breakout.",
  ],
  portfolio_analysis: [
    {
      symbol: "Karnataka Bank",
      holding_context: {
        quantity: 100,
        avg_cost: 170.71,
        current_value: 23132,
        pnl_pct: 35.5,
        current_pnl: 6061,
      },
      data: {
        portfolio_decision: "RIDE TREND",
        risk_tag: "LOW",
        urgency_score: "LOW",
        reasons: [
          "Confirmed breakout above resistance",
          "Volume profile is strongly bullish",
        ],
      },
    },
    {
      symbol: "Tata Steel",
      holding_context: {
        quantity: 100,
        avg_cost: 250,
        current_value: 15000,
        pnl_pct: -40.0,
        current_pnl: -10000,
      },
      data: {
        portfolio_decision: "REDUCE / EXIT",
        risk_tag: "HIGH",
        urgency_score: "HIGH",
        reasons: [
          "Deep bearish structure",
          "MACD is accelerating to the downside",
        ],
      },
    },
  ],
};

// Helper: pick a bullet icon color based on the reason text content
function getBulletColor(reason: string): string {
  const r = reason.toLowerCase();
  if (
    r.includes("bearish") ||
    r.includes("downtrend") ||
    r.includes("sell") ||
    r.includes("loss") ||
    r.includes("underperform") ||
    r.includes("capital preservation")
  )
    return "bg-danger";
  if (
    r.includes("warning") ||
    r.includes("risk") ||
    r.includes("caution") ||
    r.includes("overextended") ||
    r.includes("volatil")
  )
    return "bg-amber-500";
  if (
    r.includes("bullish") ||
    r.includes("breakout") ||
    r.includes("uptrend") ||
    r.includes("opportunity") ||
    r.includes("recovery")
  )
    return "bg-success";
  return "bg-info";
}

// Severity order: danger(0) → amber(1) → success(2) → info(3)
function getBulletPriority(reason: string): number {
  const color = getBulletColor(reason);
  if (color === "bg-danger") return 0;
  if (color === "bg-amber-500") return 1;
  if (color === "bg-success") return 2;
  return 3;
}

function sortReasonsBySeverity(reasons: string[]): string[] {
  return [...reasons].sort(
    (a, b) => getBulletPriority(a) - getBulletPriority(b),
  );
}

export function Insights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"urgency" | "pnl" | "name">(
    "urgency",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { value: "urgency-desc", label: "Priority (High-Low)" },
    { value: "urgency-asc", label: "Priority (Low-High)" },
    { value: "pnl-asc", label: "P&L (Worst First)" },
    { value: "pnl-desc", label: "P&L (Best First)" },
    { value: "name-asc", label: "Name (A-Z)" },
    { value: "name-desc", label: "Name (Z-A)" },
  ];

  const currentSortLabel = sortOptions.find(
    (opt) => opt.value === `${sortField}-${sortOrder}`,
  )?.label;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigate = useNavigate();
  const {
    setData: setStoreData,
    shouldRefresh,
    data: cachedData,
  } = usePortfolioStore();
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const location = useLocation();

  useEffect(() => {
    let interval: any = null;
    let isMounted = true;

    async function fetchHoldings() {
      try {
        const stockData = sessionStorage.getItem('uploaded_holdings');
        const mfData = sessionStorage.getItem('mf_uploaded_holdings');
        
        let parsed: any[] = [];
        if (stockData && stockData !== "undefined") parsed = [...parsed, ...JSON.parse(stockData)];
        if (mfData && mfData !== "undefined") parsed = [...parsed, ...JSON.parse(mfData)];

        const sessionData = JSON.stringify(parsed);
        let currentHash = "";
        
        if (parsed.length > 0) {
          currentHash = sessionData.length.toString() + (parsed[0]?.symbol || "");
        }

        const isExpired = sessionData 
          ? shouldRefresh(currentHash)
          : shouldRefresh();
        
        const isAnalyzing = location.state?.analyze;
        const hasCache = cachedData && !isExpired;

        // Setup Animation Synchronization
        let animatedCurrent = 0;
        let animationTarget = 0;
        let animationCompleteResolve: () => void;
        const animationPromise = new Promise<void>((resolve) => {
          animationCompleteResolve = resolve;
        });

        const startAnimation = (total: number, isFast: boolean = false) => {
          animationTarget = total;
          if (total === 0) {
            animationCompleteResolve();
            return;
          }
          
          const step = isFast ? Math.ceil(total / 10) : 5;
          const speed = isFast ? 150 : 1000;

          interval = setInterval(() => {
            animatedCurrent += step;
            setProgress({
              current: Math.min(animatedCurrent, animationTarget),
              total: animationTarget,
            });
            if (animatedCurrent >= animationTarget) {
              clearInterval(interval);
              animationCompleteResolve();
            }
          }, speed);
        };

        // UI DECISION LOGIC:
        // 1. If we have valid cache AND user DID NOT press 'Analyze' (Navbar click) -> Immediate view
        if (hasCache && !isAnalyzing) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        // 2. If we have local cache BUT user pressed 'Analyze' -> Show Fast satisfying UX loading
        if (hasCache && isAnalyzing) {
          setLoading(true);
          const totalAssets = cachedData.portfolio_analysis?.length || 10;
          startAnimation(totalAssets, true);
          await animationPromise;
          
          if (isMounted) {
            setData(cachedData);
            setLoading(false);
          }
          return;
        }

        // 3. Fallback: No cache or cache expired -> Show full analysis loading + fetch
        setLoading(true);
        if (parsed.length > 0) {
          startAnimation(parsed.length, false);
          const dataPromise = analyzeCustomPortfolio(parsed);
          const [res] = await Promise.all([dataPromise, animationPromise]);
          if (isMounted) {
            setData(res);
            setStoreData(res, currentHash);
          }
        }
 else {
          // Standard fetch (index case or fallback)
          const res = await getPortfolio();
          if (isMounted) {
            setData(res);
            setStoreData(res);
          }
        }
      } catch (err) {
        console.error("Failed to fetch, using mock data for demo", err);
        if (isMounted) setData(MOCK_DATA);
      } finally {
        if (isMounted) setLoading(false);
        if (interval) clearInterval(interval);
      }
    }

    fetchHoldings();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [shouldRefresh, cachedData, setStoreData, location.state]);

  const urgencyMap: any = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  const filteredAndSortedInsights = useMemo(() => {
    if (!data?.portfolio_analysis) return [];

    return data.portfolio_analysis
      .filter((item: any) => {
        const dec = item.data?.portfolio_decision || "WATCH";

        // Always show if it's a strategic action
        const isActionable =
          item.data?.priority === "HIGH" ||
          item.data?.priority === "MEDIUM" ||
          dec.includes("SELL") ||
          dec.includes("REDUCE") ||
          dec.includes("EXIT") ||
          dec.includes("AVERAGE") ||
          dec.includes("RIDE") ||
          dec.includes("HOLD") ||
          dec.includes("BOOK");

        if (!isActionable) return false;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            item.symbol.toLowerCase().includes(query) ||
            (item.data?.companyName || "").toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        let cmp = 0;

        if (sortField === "urgency") {
          cmp =
            (urgencyMap[a.data?.priority] || 0) -
            (urgencyMap[b.data?.priority] || 0);
        } else if (sortField === "pnl") {
          cmp =
            (a.holding_context?.pnl_pct || 0) -
            (b.holding_context?.pnl_pct || 0);
        } else if (sortField === "name") {
          cmp = a.symbol.localeCompare(b.symbol);
        }

        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [data, searchQuery, sortField, sortOrder]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" />
          <Loader2
            className="w-12 h-12 animate-spin text-accent absolute top-0 left-0"
            style={{ animationDuration: "3s" }}
          />
        </div>
        <div className="text-center space-y-2">
          <p className="text-text-bold text-lg font-black tracking-tighter uppercase italic">
            Heavy Analysis In Progress
          </p>
          <p className="text-text-muted text-sm font-medium tracking-wide">
            {progress.total > 0
              ? `Processing Batch: ${Math.floor(progress.current)} of ${progress.total} assets analyzed...`
              : "Fetching latest market signals & trend data..."}
          </p>
          {progress.total > 0 && (
            <div className="w-64 h-1.5 bg-white/5 rounded-full mx-auto mt-6 overflow-hidden border border-white/5">
              <div
                className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)] transition-all duration-700 ease-out"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto pb-20 pt-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="space-y-8">
            <h2 className="text-3xl font-black text-text-bold tracking-tighter">
              Actionable Insights
            </h2>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
                <input
                  type="text"
                  placeholder="Search symbols or company names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-bg-surface border border-border-main rounded-xl pl-12 pr-4 py-3 text-sm text-text-bold focus:outline-none focus:border-accent/40 w-full transition-all placeholder:text-text-muted/30 font-medium"
                />
              </div>

              <div className="relative group md:w-[280px]" ref={dropdownRef}>
                <div
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className={`flex items-center justify-between bg-bg-surface border border-border-main rounded-xl pl-12 pr-4 py-3.5 text-sm text-text-bold cursor-pointer hover:bg-white/[0.04] transition-all relative z-10 font-bold ${isSortOpen ? "border-accent/40 bg-white/[0.04]" : ""}`}
                >
                  <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <span className="truncate pr-2">
                    Sort: {currentSortLabel}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isSortOpen ? "rotate-180" : ""}`}
                  />
                </div>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-main rounded-xl shadow-2xl overflow-hidden z-[100]"
                    >
                      <div className="p-1.5 flex flex-col gap-0.5">
                        {sortOptions.map((opt) => (
                          <div
                            key={opt.value}
                            onClick={() => {
                              const [field, order] = opt.value.split("-");
                              setSortField(field as any);
                              setSortOrder(order as any);
                              setIsSortOpen(false);
                            }}
                            className={`px-4 py-3 rounded-lg text-sm transition-all cursor-pointer font-bold ${
                              `${sortField}-${sortOrder}` === opt.value
                                ? "text-accent"
                                : "text-text-muted hover:bg-white/[0.05] hover:text-text-bold"
                            }`}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="space-y-4 mt-8">
            {filteredAndSortedInsights.length > 0 ? (
              filteredAndSortedInsights.map((item: any) => {
                const dec = item.data?.portfolio_decision || "WATCH";
                const isBearish =
                  dec.includes("CUT") ||
                  dec.includes("REDUCE") ||
                  dec.includes("EXIT") ||
                  dec.includes("SELL");
                const isBullish =
                  dec.includes("RIDE") ||
                  dec.includes("AVERAGE") ||
                  dec.includes("BUY") ||
                  dec.includes("BOOK");
                const accentBorder = isBearish
                  ? "border-l-danger"
                  : isBullish
                    ? "border-l-success"
                    : "border-l-amber-500";
                const chipClr = isBearish
                  ? "bg-danger/10 text-danger border-danger/20"
                  : isBullish
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    key={item.symbol}
                    className={`bg-bg-surface border border-border-main border-l-[3px] ${accentBorder} rounded-xl hover:border-[#333] transition-all duration-200 cursor-pointer group relative`}
                    onClick={() => {
                      const cleanTicker = item.symbol.replace(".NS", "").replace(".BO", "");
                      navigate(`/stocks/details/${cleanTicker}`);
                    }}
                  >
                    {/* ── HEADER ── */}
                    <div className="px-6 pt-5 pb-4 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xl font-black text-text-bold tracking-tight">
                            {item.symbol.replace(".NS", "")}
                          </h3>
                          {item.data?.portfolio_tag &&
                            item.data.portfolio_tag !== "NEUTRAL" && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.data.portfolio_tag.includes("TOP") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
                              >
                                {item.data.portfolio_tag}
                              </span>
                            )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 font-medium">
                          {item.data?.companyName ||
                            item.symbol.replace(".NS", "")}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-black border tracking-wider uppercase ${chipClr}`}
                      >
                        {item.data?.severity &&
                        item.data.severity !== "MODERATE"
                          ? `${item.data.severity} `
                          : ""}
                        {dec}
                      </span>
                    </div>

                    {/* ── STAT GRID ── */}
                    <div className="px-6 pb-4">
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          {
                            label: "Avg Cost",
                            val: item.holding_context?.avg_cost || 0,
                            prefix: "₹",
                            suffix: "",
                            dec: 2,
                          },
                          {
                            label: "LTP",
                            val: item.data?.price || 0,
                            prefix: "₹",
                            suffix: "",
                            dec: 2,
                          },
                          {
                            label: "Return",
                            val: item.holding_context?.pnl_pct || 0,
                            prefix: "",
                            suffix: "%",
                            dec: 2,
                            showPlus: true,
                            color:
                              (item.holding_context?.pnl_pct ?? 0) >= 0
                                ? "text-success"
                                : "text-danger",
                          },
                          {
                            label: "Holding",
                            val: item.holding_context?.current_value || 0,
                            prefix: "₹",
                            suffix: "",
                            dec: 2,
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="bg-white/[0.03] rounded-lg px-3 py-2"
                          >
                            <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold mb-0.5">
                              {stat.label}
                            </p>
                            <AnimatedNumber
                              value={stat.val}
                              prefix={stat.prefix}
                              suffix={stat.suffix}
                              decimals={stat.dec}
                              showPlusSign={stat.showPlus}
                              className={`text-sm font-black ${stat.color || "text-text-bold"}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── RECOMMENDATION ── */}
                    {item.data?.portfolio_action && (
                      <div className="px-6 pb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Crosshair size={12} className="text-text-muted" />
                          <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
                            Recommendation
                          </span>
                        </div>
                        <p className="text-[13px] text-[#d1d5db] leading-relaxed pl-[18px] font-medium">
                          {item.data.portfolio_action}
                        </p>
                        {item.data.watch_condition && (
                          <p className="text-[12px] text-text-muted mt-1.5 pl-[18px] flex items-center gap-1.5 font-medium">
                            <Activity
                              size={11}
                              className="text-amber-500 shrink-0"
                            />
                            <span>Trigger: {item.data.watch_condition}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* ── MARKET CONTEXT ── */}
                    {((item.data?.pattern &&
                      item.data.pattern !== "None" &&
                      item.data.pattern !== "None Detected") ||
                      item.data?.reasons?.length > 0) && (
                      <div className="px-6 pb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <BarChart3 size={12} className="text-text-muted" />
                          <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
                            Market Context
                          </span>
                        </div>
                        <ul className="space-y-1.5 pl-[18px]">
                          {item.data?.pattern &&
                            item.data.pattern !== "None" &&
                            item.data.pattern !== "None Detected" && (
                              <li className="flex items-start gap-2 text-[13px]">
                                <div
                                  className={`mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full ${item.data.pattern.includes("Breakout") || item.data.pattern.includes("Reversal") ? "bg-success" : "bg-danger"}`}
                                />
                                <span>
                                  <span className="text-text-muted font-bold">
                                    Pattern:{" "}
                                  </span>
                                  <span
                                    className={`font-black ${item.data.pattern.includes("Breakout") || item.data.pattern.includes("Reversal") ? "text-success" : "text-danger"}`}
                                  >
                                    {item.data.pattern}
                                  </span>
                                </span>
                              </li>
                            )}
                          {sortReasonsBySeverity(item.data?.reasons || []).map(
                            (r: string, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-[13px] text-text-muted font-medium"
                              >
                                <div
                                  className={`mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full ${getBulletColor(r)}`}
                                />
                                {r}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {/* ── FOOTER ── */}
                    <div className="px-6 py-3 border-t border-white/[0.04] flex items-center gap-3 text-[10px] text-text-muted tracking-wide font-bold">
                      <span>
                        Priority:{" "}
                        <span
                          className={`font-black ${item.data?.priority === "HIGH" ? "text-amber-500" : item.data?.priority === "MEDIUM" ? "text-text-muted" : "text-[#6b7280]"}`}
                        >
                          {item.data?.priority || "LOW"}
                        </span>
                      </span>
                      <span className="text-white/10">·</span>
                      <span>
                        Risk:{" "}
                        <span
                          className={`font-black ${item.data?.risk_level === "HIGH" ? "text-danger" : item.data?.risk_level === "MEDIUM" ? "text-amber-500" : "text-success"}`}
                        >
                          {item.data?.risk_level || "LOW"}
                        </span>
                      </span>
                      {item.data?.trade_type && (
                        <>
                          <span className="text-white/10">·</span>
                          <span>{item.data.trade_type}</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <Search className="w-10 h-10 text-text-muted mx-auto mb-4 opacity-20" />
                <p className="text-text-muted font-bold">
                  No insights found matching your criteria.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── PORTFOLIO SUMMARY SIDEBAR ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <h2 className="text-2xl font-black text-text-bold tracking-tighter">
              Portfolio Summary
            </h2>

            {/* Live Stats */}
            <div className="bg-bg-surface border border-border-main rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted font-bold uppercase tracking-widest">
                  Health
                </span>
                <span
                  className={`text-sm font-black ${data?.portfolio_summary?.health === "Strong" ? "text-success" : data?.portfolio_summary?.health === "Weak" ? "text-danger" : "text-amber-500"}`}
                >
                  {data?.portfolio_summary?.health || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted font-bold uppercase tracking-widest">
                  Risk Level
                </span>
                <span
                  className={`text-sm font-black ${data?.portfolio_summary?.risk_level === "High" ? "text-danger" : data?.portfolio_summary?.risk_level === "Medium" ? "text-amber-500" : "text-success"}`}
                >
                  {data?.portfolio_summary?.risk_level || "N/A"}
                </span>
              </div>
              <div className="border-t border-white/5 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted font-bold">
                    Total Invested
                  </span>
                  <AnimatedNumber
                    value={data?.portfolio_summary?.total_invested || 0}
                    prefix="₹"
                    className="text-sm font-black text-text-bold"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted font-bold">
                    Current Value
                  </span>
                  <AnimatedNumber
                    value={data?.portfolio_summary?.total_value_live || 0}
                    prefix="₹"
                    className="text-sm font-black text-text-bold"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted font-bold">
                    Total P&L
                  </span>
                  <AnimatedNumber
                    value={data?.portfolio_summary?.total_pnl || 0}
                    prefix="₹"
                    showPlusSign
                    className={`text-sm font-black ${(data?.portfolio_summary?.total_pnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted font-bold">
                    Win Rate
                  </span>
                  <AnimatedNumber
                    value={parseFloat(data?.portfolio_summary?.win_rate || "0")}
                    suffix="%"
                    className="text-sm font-black text-text-bold"
                  />
                </div>
              </div>
            </div>

            {/* AI Insight */}
            {data?.portfolio_summary?.insight && (
              <div className="bg-bg-surface border border-border-main rounded-xl p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <BarChart3 size={13} className="text-info" />
                  <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
                    AI Assessment
                  </span>
                </div>
                <p className="text-[13px] text-text-muted font-medium leading-relaxed">
                  {data.portfolio_summary.insight}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {data?.recommended_actions &&
              data.recommended_actions.length > 0 && (
                <div className="bg-bg-surface border border-border-main rounded-xl p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Crosshair size={13} className="text-accent" />
                    <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em]">
                      Recommended Actions
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.recommended_actions.map(
                      (action: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-text-muted font-medium"
                        >
                          <div className="mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full bg-accent/60" />
                          {action}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
