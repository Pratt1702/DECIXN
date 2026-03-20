import { useEffect, useState, useMemo, useRef } from "react";
import { getPortfolio, analyzeCustomPortfolio } from "../services/api";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  BellRing,
  ArrowRight,
  Search,
  ChevronDown,
  ListFilter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        portfolio_decision: "CUT LOSSES",
        risk_tag: "HIGH",
        urgency_score: "HIGH",
        reasons: ["Bearish crossover on MACD", "Trading below 50 DMA"],
      },
    },
  ],
};

export function Insights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("critical"); // 'critical', 'holding', 'name', 'profit'
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { value: "critical-desc", label: "Priority (High-Low)" },
    { value: "critical-asc", label: "Priority (Low-High)" },
    { value: "holding-desc", label: "Holding Value (High)" },
    { value: "holding-asc", label: "Holding Value (Low)" },
    { value: "profit-desc", label: "P&L (Highest)" },
    { value: "profit-asc", label: "P&L (Lowest)" },
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

  useEffect(() => {
    async function fetchHoldings() {
      try {
        const sessionData = sessionStorage.getItem(SESSION_KEY);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          const res = await analyzeCustomPortfolio(parsed);
          setData(res);
        } else {
          const res = await getPortfolio();
          setData(res);
        }
      } catch (err) {
        console.error("Failed to fetch, using mock data for demo", err);
        setData(MOCK_DATA);
      } finally {
        setLoading(false);
      }
    }
    fetchHoldings();
  }, []);

  const urgencyMap: any = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  const filteredAndSortedInsights = useMemo(() => {
    if (!data?.portfolio_analysis) return [];

    return data.portfolio_analysis
      .filter((item: any) => {
        const dec = item.data?.portfolio_decision || "WATCH";
        const isActionable =
          dec.includes("CUT") ||
          dec.includes("RIDE") ||
          dec.includes("AVERAGE") ||
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
        let comparison = 0;
        if (sortField === "critical") {
          const valA = urgencyMap[a.data?.urgency_score || "LOW"];
          const valB = urgencyMap[b.data?.urgency_score || "LOW"];
          comparison = valA - valB;
        } else if (sortField === "holding") {
          comparison =
            (a.holding_context?.current_value || 0) -
            (b.holding_context?.current_value || 0);
        } else if (sortField === "profit") {
          comparison =
            (a.holding_context?.current_pnl || 0) -
            (b.holding_context?.current_pnl || 0);
        } else if (sortField === "name") {
          comparison = a.symbol.localeCompare(b.symbol);
        }

        return sortOrder === "desc" ? -comparison : comparison;
      });
  }, [data, searchQuery, sortField, sortOrder]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-info" />
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
            <h2 className="text-3xl font-black text-text-bold flex items-center gap-3 tracking-tighter">
              Actionable Insights
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20">
                <BellRing className="w-4 h-4 text-amber-500" />
              </span>
            </h2>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
                <input
                  type="text"
                  placeholder="Search symbols or company names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-text-bold focus:outline-none focus:border-accent/40 w-full transition-all placeholder:text-text-muted/30"
                />
              </div>

              <div className="relative group md:w-[280px]" ref={dropdownRef}>
                <div
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className={`flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-text-bold cursor-pointer hover:bg-white/[0.06] transition-all relative z-10 ${isSortOpen ? "border-accent/40 bg-white/[0.06]" : ""}`}
                >
                  <ListFilter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <span className="font-semibold truncate pr-2">
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
                      className="absolute top-full left-0 right-0 mt-2 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] backdrop-blur-3xl"
                    >
                      <div className="p-1.5 flex flex-col gap-0.5">
                        {sortOptions.map((opt) => (
                          <div
                            key={opt.value}
                            onClick={() => {
                              const [field, order] = opt.value.split("-");
                              setSortField(field);
                              setSortOrder(order as any);
                              setIsSortOpen(false);
                            }}
                            className={`px-4 py-3 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-between group/opt ${
                              `${sortField}-${sortOrder}` === opt.value
                                ? "text-accent font-bold"
                                : "text-text-muted hover:bg-white/[0.05] hover:text-text-bold"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {`${sortField}-${sortOrder}` === opt.value && (
                              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
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
                const isRed = dec.includes("CUT") || dec.includes("REDUCE");
                const badgeClr = isRed
                  ? "bg-danger/10 text-danger border-danger/20"
                  : "bg-success/10 text-success border-success/20";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={item.symbol}
                    className="bg-bg-surface border border-border-main p-6 rounded-xl shadow-sm hover:border-[#4b5563] transition-colors cursor-pointer group"
                    onClick={() => navigate(`/stock/${item.symbol}`)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-text-bold">
                            {item.symbol.replace(".NS", "")}
                          </h3>
                          {item.data?.urgency_score === "HIGH" && (
                            <span className="flex h-2 w-2 rounded-full bg-danger animate-pulse" />
                          )}
                          <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-text-muted mt-1">
                          Holding Value:{" "}
                          <span className="font-medium text-[#f3f4f6]">
                            ₹
                            {item.holding_context?.current_value.toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1.5 rounded text-[10px] md:text-xs font-bold border tracking-wider uppercase ${badgeClr}`}
                        >
                          {dec}
                        </span>
                        {/* <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                            {item.data?.urgency_score} URGENCY
                          </span>
                        </div> */}
                      </div>
                    </div>
                    <div className="border-t border-border-main border-dashed pt-4">
                      <div className="flex flex-col gap-4">
                        <ul className="space-y-3 flex-1">
                          {item.data?.reasons?.map((r: string, idx: number) => (
                            <li
                              key={idx}
                              className="flex gap-3 text-sm text-text-muted"
                            >
                              <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                              {r}
                            </li>
                          ))}
                        </ul>
                        
                        {item.data?.portfolio_action && (
                          <div className="mt-2 bg-white/[0.03] border border-white/5 rounded-lg p-3 group-hover:bg-white/[0.05] transition-colors">
                             <div className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1.5">Strategic Action</div>
                             <p className="text-sm text-text-bold leading-snug">{item.data.portfolio_action}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <Search className="w-10 h-10 text-text-muted mx-auto mb-4 opacity-20" />
                <p className="text-text-muted font-medium">
                  No insights found matching your criteria.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <AIIntelligencePanel
            data={{
              confidence_score:
                data?.portfolio_summary?.risk_level === "Low"
                  ? 80
                  : data?.portfolio_summary?.risk_level === "High"
                    ? 20
                    : 50,
              decision: `${data?.portfolio_summary?.health} Portfolio Status`,
              action: data?.portfolio_summary?.insight,
              reasons: data?.recommended_actions || [],
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
