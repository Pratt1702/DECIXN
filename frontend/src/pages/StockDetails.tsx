import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis, getPortfolio } from "../services/api";
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  Activity,
  BarChart2,
  CandlestickChart,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import ReactApexChart from "react-apexcharts";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import {
  TechnicalIndicators,
  YearlyRangeBar,
} from "../components/dashboard/TechnicalIndicators";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import gsap from "gsap";

const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "All"];
const CANDLE_COUNT = 100; // Tweak this to change chart density

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 shadow-2xl text-xs font-medium flex items-center gap-2">
        <span className="text-[#f3f4f6] font-bold">
          ₹
          {Number(data.price).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[#9ca3af]">{data.date || "Today"}</span>
      </div>
    );
  }
  return null;
};

export function StockDetails() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(
    localStorage.getItem("preferred_period") || "1D",
  );
  const [chartType, setChartType] = useState<"line" | "candle">("line");
  const [holding, setHolding] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
            .split('.')[0] // Strip .NS, .BO, etc reliably
            .replace(/\s+/g, "");

          const match = port.portfolio_analysis.find((h: any) => {
            if (!h.symbol) return false;
            
            const hSymClean = h.symbol
              .toLowerCase()
              .trim()
              .split('.')[0]
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
      setLoading(true);
      setData(null);
      try {
        const res = await getTickerAnalysis(ticker);
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
          pivots: res.data.pivots,
          moving_averages: res.data.moving_averages,
          indicators: res.data.indicators,
          benchmark_comparison: res.data.benchmark_comparison,
        });
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
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 mt-4 bg-border-main hover:bg-[#3f3f46] rounded-full text-sm font-medium transition-all text-text-bold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const currentChart = data?.charts?.[period] || [];
  const currentPrice = data?.price || 0;

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
    <div ref={containerRef} className="space-y-10 max-w-4xl mx-auto pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-bold transition-all w-fit group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
        Back to Dashboard
      </button>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end gap-3 md:gap-4 mb-1">
          {!data && loading ? (
            <div className="h-12 w-64 bg-white/5 animate-pulse rounded-2xl" />
          ) : (
            <div className="animate-value flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-text-bold drop-shadow-sm truncate">
                {data?.companyName ||
                  data?.symbol?.replace(".NS", "").replace(".BO", "") ||
                  ticker}
              </h1>
              <span className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-base font-bold font-mono self-end shrink-0 tracking-wider mb-1">
                {data?.symbol?.replace(".NS", "").replace(".BO", "") || ticker}
              </span>
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
                className="block text-4xl font-black tracking-tight text-text-bold"
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

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 px-1">
            {["P/E", "RSI", "MACD", "Beta"].map((label) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm border-r border-white/10 pr-8 last:border-0 last:pr-0"
              >
                <span className="text-text-muted font-bold text-[11px] uppercase tracking-widest">
                  {label}
                </span>
                {data ? (
                  <span className="animate-value font-black text-[#f3f4f6]">
                    {label === "P/E" ? (
                      data?.fundamentals?.pe_ratio ? (
                        <AnimatedNumber
                          value={data.fundamentals.pe_ratio}
                          decimals={2}
                        />
                      ) : (
                        "N/A"
                      )
                    ) : label === "RSI" ? (
                      data?.indicators?.rsi_14 ? (
                        <AnimatedNumber
                          value={data.indicators.rsi_14}
                          decimals={2}
                        />
                      ) : (
                        "-"
                      )
                    ) : label === "MACD" ? (
                      data?.indicators?.macd?.MACD_Line ? (
                        <AnimatedNumber
                          value={data.indicators.macd.MACD_Line}
                          decimals={2}
                        />
                      ) : (
                        "-"
                      )
                    ) : data?.fundamentals?.beta ? (
                      <AnimatedNumber
                        value={data.fundamentals.beta}
                        decimals={2}
                      />
                    ) : (
                      "-"
                    )}
                  </span>
                ) : (
                  <div className="h-4 w-12 bg-white/5 animate-pulse rounded" />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

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
        <div className="h-72 sm:h-80 w-full relative mb-6 min-h-[288px]">
          {!data && loading ? (
            <div className="h-full w-full bg-white/5 animate-pulse rounded-[2.5rem] border border-white/5 flex items-center justify-center">
              <span className="text-sm text-text-muted font-medium tracking-widest animate-pulse">
                SYNTHESIZING CHART...
              </span>
            </div>
          ) : (
            <div className="animate-value h-full w-full min-h-[288px]">
              {chartType === "line" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentChart}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "#2e303a",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      isAnimationActive={false}
                    />
                    {currentChart.length > 0 && (
                      <ReferenceLine
                        y={currentChart[0].price}
                        stroke="#4b5563"
                        strokeDasharray="3 3"
                      />
                    )}
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
                  </LineChart>
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
                              stroke: { color: '#ffffff20', width: 1, dashArray: 4 },
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
              <span className="group-hover:text-text-bold transition-colors">Terminal</span>
              <CandlestickChart className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {holding && currentPrice > 0 && (
        <div
          className="bg-bg-surface border border-border-main rounded-xl px-6 py-5 mt-4 mb-4 flex flex-row items-center justify-between cursor-pointer hover:border-[#333] transition-all group"
          onClick={() => navigate("/holdings")}
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
        <YearlyRangeBar data={data} />
        <AIIntelligencePanel data={data} />
        <TechnicalIndicators data={data} />
      </div>
    </div>
  );
}
