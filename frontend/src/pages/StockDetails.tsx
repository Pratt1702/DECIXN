import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis, getPortfolio } from "../services/api";
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

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  Filler,
} from "chart.js";
import { Line as ChartJSLine } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import { Lock, Info as InfoIcon } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  TimeScale,
  Filler,
  annotationPlugin
);
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


export function PriceForecastChart({ ticker, historicalData, forecastData, autoRefreshInterval = 60000 }: any) {
  const [forecast, setForecast] = useState<any>(forecastData);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    const fetchForecast = async () => {
      try {
        const res = await getTickerAnalysis(ticker.replace(".NS", "").replace(".BO", ""));
        if (res?.data?.price_forecast) {
          setForecast(res.data.price_forecast);
        }
      } catch (e) {
        console.error("Failed to fetch forecast:", e);
      }
    };
    if (autoRefreshInterval) {
      interval = setInterval(fetchForecast, autoRefreshInterval);
    }
    return () => clearInterval(interval);
  }, [ticker, autoRefreshInterval]);

  useEffect(() => {
    if (forecastData) {
      setForecast(forecastData);
    }
  }, [forecastData]);

  if (!forecast || !historicalData || historicalData.length === 0) {
    return (
      <div className="w-full bg-bg-surface border border-border-main rounded-xl p-6 flex flex-col shadow-sm items-center justify-center min-h-[300px]">
        <h3 className="flex items-center gap-2 text-[14px] font-black uppercase text-text-bold mb-6">
          SHARE PRICE FORECAST <InfoIcon className="w-4 h-4 text-text-muted" />
        </h3>
        <div className="text-text-muted text-sm font-bold uppercase tracking-widest">
          Insufficient data for forecast
        </div>
      </div>
    );
  }

  const { current_price, forecast_high, forecast_mean, forecast_low, horizon_days, bias } = forecast;
  const biasColor = bias === 'Bullish' ? '#1d9e75' : bias === 'Bearish' ? '#e24b4a' : '#9ca3af';

  const today = new Date();
  const history = [...historicalData]
    .filter((d: any) => d.date)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-90);

  const historyPoints = history.map((d: any) => ({
    x: new Date(d.date).getTime(),
    y: d.price || d.close || current_price
  }));

  const lastHistoryPoint = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : { x: today.getTime(), y: current_price };
  if (lastHistoryPoint.x < today.getTime()) {
      historyPoints.push({ x: today.getTime(), y: current_price });
  }

  const targetDays = 7;
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + targetDays);
  const targetTime = targetDate.getTime();
  
  const scale = targetDays / (horizon_days || 5);
  const targetHigh = current_price + (forecast_high - current_price) * scale;
  const targetMean = current_price + (forecast_mean - current_price) * scale;
  const targetLow = current_price + (forecast_low - current_price) * scale;

  const datasetHigh = {
    label: 'HIGH',
    data: [
      { x: today.getTime(), y: current_price },
      { x: targetTime, y: targetHigh }
    ],
    borderColor: '#1d9e75',
    borderWidth: 2,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false,
    order: 1
  };

  const datasetMeanFill = {
    label: 'MEAN_FILL',
    data: [
      { x: today.getTime(), y: current_price },
      { x: targetTime, y: targetMean }
    ],
    borderColor: 'transparent',
    borderWidth: 0,
    pointRadius: 0,
    fill: 0,
    backgroundColor: 'rgba(29,158,117,0.15)',
    order: 5
  };

  const datasetMean = {
    label: 'MEAN',
    data: [
      { x: today.getTime(), y: current_price },
      { x: targetTime, y: targetMean }
    ],
    borderColor: biasColor,
    borderWidth: 2,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false,
    order: 2
  };

  const datasetLowFill = {
    label: 'LOW_FILL',
    data: [
      { x: today.getTime(), y: current_price },
      { x: targetTime, y: targetLow }
    ],
    borderColor: 'transparent',
    borderWidth: 0,
    pointRadius: 0,
    fill: 2,
    backgroundColor: 'rgba(226,75,74,0.15)',
    order: 6
  };

  const datasetLow = {
    label: 'LOW',
    data: [
      { x: today.getTime(), y: current_price },
      { x: targetTime, y: targetLow }
    ],
    borderColor: '#e24b4a',
    borderWidth: 2,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false,
    order: 3
  };

  const isPositive = historyPoints.length >= 2 ? historyPoints[historyPoints.length - 1].y >= historyPoints[0].y : true;
  const historyColor = isPositive ? '#10b981' : '#f43f5e';

  const datasetHistory = {
    label: 'Historical',
    data: historyPoints,
    borderColor: historyColor,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 0, // Handled by custom plugin
    tension: 0.1,
    fill: false,
    order: 4
  };

  const capYOffset = current_price * 0.25;
  const maxView = current_price + capYOffset;
  const minView = current_price - capYOffset;

  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: (chart: any) => {
      if (chart.tooltip?._active && chart.tooltip._active.length) {
        const ctx = chart.ctx;
        const yAxis = chart.scales.y;
        const xAxis = chart.scales.x;
        
        // Take the first active point to draw the crosshair lines
        const primaryPoint = chart.tooltip._active[0];
        const x = primaryPoint.element.x;
        const y = primaryPoint.element.y;
        
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x, yAxis.top);
        ctx.lineTo(x, yAxis.bottom);
        ctx.moveTo(xAxis.left, y);
        ctx.lineTo(xAxis.right, y);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        ctx.font = 'bold 11px sans-serif';
        ctx.textBaseline = 'middle';

        const drawnY = new Set();

        // Plot point dots and individual tooltips for all active datasets
        chart.tooltip._active.forEach((activePoint: any) => {
          const dsIndex = activePoint.datasetIndex;
          if (dsIndex === 1 || dsIndex === 3) return; // Skip fill datasets

          const px = activePoint.element.x;
          const py = activePoint.element.y;
          
          let color = historyColor;
          if (dsIndex === 0) color = '#1d9e75';
          else if (dsIndex === 2) color = biasColor;
          else if (dsIndex === 4) color = '#e24b4a';

          // Draw the dot
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();

          // Ensure we don't draw duplicate labels at intersection points
          const val = activePoint.element?.$context?.parsed?.y || chart.data.datasets[dsIndex].data[activePoint.index].y;
          if (val === undefined || drawnY.has(val)) return;
          drawnY.add(val);

          const text = `₹${val.toFixed(2)}`;
          const metrics = ctx.measureText(text);
          const tw = metrics.width;
          const th = 22;
          const padX = 8;
          
          let rectX = px + 12;
          // If label goes off chart to the right, flip it to the left side
          if (rectX + tw + padX * 2 > chart.width) {
            rectX = px - 12 - (tw + padX * 2);
          }

          // Draw Tooltip Box
          ctx.fillStyle = '#121212';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(rectX, py - th/2, tw + padX*2, th, 4);
          } else {
            ctx.rect(rectX, py - th/2, tw + padX*2, th);
          }
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.setLineDash([]);
          ctx.stroke();

          // Draw Text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, rectX + padX, py + 1);
        });
        
        ctx.restore();
      }
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: 'easeOutQuart' as const
    },
    layout: {
      padding: { right: 20, top: 40, bottom: 0, left: 10 }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'month' as const },
        grid: { display: false },
        border: { display: false },
        ticks: { display: false }
      },
      y: {
        position: 'right' as const,
        display: false,
        min: minView,
        max: maxView
      }
    },    
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      annotation: {
        annotations: {
          vLine: {
            type: 'line' as const,
            xMin: today.getTime(),
            xMax: today.getTime(),
            borderColor: '#374151',
            borderWidth: 1,
            borderDash: [5, 5],
          },
          labelHigh: {
            type: 'label' as const,
            xValue: targetTime,
            yValue: targetHigh,
            content: `₹${targetHigh.toFixed(2)}`,
            color: '#1d9e75',
            position: 'start' as const,
            xAdjust: 5,
            yAdjust: -10,
            font: { size: 9, weight: 'bold' }
          },
          labelMean: {
            type: 'label' as const,
            xValue: targetTime,
            yValue: targetMean,
            content: `₹${targetMean.toFixed(2)}`,
            color: biasColor,
            position: 'start' as const,
            xAdjust: 5,
            yAdjust: 0,
            font: { size: 9, weight: 'bold' }
          },
          labelLow: {
            type: 'label' as const,
            xValue: targetTime,
            yValue: targetLow,
            content: `₹${targetLow.toFixed(2)}`,
            color: '#e24b4a',
            position: 'start' as const,
            xAdjust: 5,
            yAdjust: 10,
            font: { size: 9, weight: 'bold' }
          }
        }
      }
    }
  };

  return (
    <div className="w-full bg-bg-surface border border-border-main rounded-xl p-6 flex flex-col shadow-sm -mt-2 mb-2">
      <div className="flex flex-col items-center mb-6">
        <h3 className="flex items-center gap-2 text-[14px] font-black uppercase text-text-bold">
          SHARE PRICE FORECAST <InfoIcon className="w-4 h-4 text-text-muted cursor-pointer" title="Based on ATR + HV projection" />
        </h3>
        <div className="text-[#f3f4f6] text-sm font-bold mt-2">
          Expected 1W Range:
          <span className="text-danger ml-2">₹{targetLow.toFixed(2)}</span>
          <span className="mx-2 text-text-muted">-</span>
          <span className="text-success">₹{targetHigh.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="h-64 w-full relative">
        <ChartJSLine 
          ref={chartRef}
          data={{ datasets: [datasetHigh, datasetMeanFill, datasetMean, datasetLowFill, datasetLow, datasetHistory] }}
          options={options as any}
          plugins={[crosshairPlugin]}
        />
      </div>
      <div className="text-center mt-3 text-[10px] text-text-muted font-bold uppercase tracking-widest">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

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
      
      const cleanTicker = ticker.toUpperCase().replace(".NS", "").replace(".BO", "");
      
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
          pivots: res.data.pivots,
          moving_averages: res.data.moving_averages,
          indicators: res.data.indicators,
          benchmark_comparison: res.data.benchmark_comparison,
          price_forecast: res.data.price_forecast,
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
        changePercent: priceChangePct
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
                <Bookmark className={`w-5 h-5 ${isSymbolInAnyWatchlist(ticker || "") ? "fill-accent" : ""}`} />
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
        <PriceForecastChart ticker={ticker} historicalData={data?.charts?.["1Y"] || []} forecastData={data?.price_forecast} autoRefreshInterval={60000} />
        <YearlyRangeBar data={data} />
        <AIIntelligencePanel data={data} />
        <TechnicalIndicators data={data} />
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
