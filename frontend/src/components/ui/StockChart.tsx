import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from "recharts";
import ReactApexChart from "react-apexcharts";
import { Activity, BarChart2, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface StockChartProps {
  ticker: string;
}

const PERIODS = ["1D", "1M", "1Y"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 shadow-2xl text-[10px] font-bold flex items-center gap-2">
        <span className="text-[#f3f4f6]">
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

export function StockChart({ ticker }: StockChartProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("1M");
  const [chartType, setChartType] = useState<"line" | "candle">("line");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/analyze/${ticker}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch stock data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center animate-pulse mb-4">
        <div className="flex flex-col items-center gap-3">
          <Clock className="w-5 h-5 text-white/20 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Synthesizing {ticker}...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const history = data.charts?.[period] || data.chart_data || [];
  const chartData = history.slice(-70); 
  const isPositive = data.price >= (history[0]?.price || data.price);
  const strokeColor = isPositive ? "#10b981" : "#f43f5e";

  return (
    <div className="w-full bg-[#121212]/40 border border-white/5 rounded-2xl p-4 mb-4 group hover:border-white/10 transition-all overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <div>
            <h4 className="text-[14px] font-black text-white leading-tight mb-0.5">{ticker}</h4>
            <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">
              ₹{data.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                {PERIODS.map(p => (
                    <button 
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${period === p ? 'bg-white/10 text-white shadow-sm' : 'text-white/30 hover:text-white/60'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                <button 
                    onClick={() => setChartType("line")}
                    className={`p-1.5 rounded-md transition-all ${chartType === "line" ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                    <Activity className="w-3.5 h-3.5" />
                </button>
                <button 
                    onClick={() => setChartType("candle")}
                    className={`p-1.5 rounded-md transition-all ${chartType === "candle" ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                    <BarChart2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
      </div>

      <div className="h-48 w-full relative mb-4">
        {chartType === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <YAxis domain={["dataMin", "dataMax"]} hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ffffff10", strokeWidth: 1 }} isAnimationActive={false} />
                    <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={strokeColor} 
                        strokeWidth={2.5} 
                        dot={false}
                        activeDot={{ r: 4, fill: strokeColor, stroke: "#121212", strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        ) : (
            <ReactApexChart 
                options={{
                    chart: {
                      type: "candlestick",
                      background: "transparent",
                      toolbar: { show: false },
                      animations: { enabled: false },
                      sparkline: { enabled: false },
                    },
                    stroke: { show: true, width: 1 },
                    plotOptions: {
                      candlestick: {
                        colors: { upward: "#10b981", downward: "#f43f5e" },
                        wick: { useFillColor: true },
                      },
                    },
                    xaxis: {
                      type: "category",
                      labels: { show: false },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      tooltip: { enabled: false },
                    },
                    yaxis: {
                      labels: { show: false },
                      tooltip: { enabled: true },
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      min: (min: any) => min * 0.99,
                      max: (max: any) => max * 1.01,
                    },
                    grid: { show: false, padding: { left: -10, right: -10 } },
                    tooltip: {
                      theme: "dark",
                      custom: ({ dataPointIndex, w }: any) => {
                        const o = w.globals.seriesCandleO[0][dataPointIndex];
                        const h = w.globals.seriesCandleH[0][dataPointIndex];
                        const l = w.globals.seriesCandleL[0][dataPointIndex];
                        const c = w.globals.seriesCandleC[0][dataPointIndex];
                        const date = w.globals.categoryLabels[dataPointIndex];
                        return `
                          <div class="px-3 py-2 bg-[#121212] border border-white/10 rounded-xl shadow-2xl text-[10px] font-bold">
                            <div class="mb-1 text-white/30 uppercase tracking-widest text-[8px]">${date}</div>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span class="text-white/40">O <span class="text-white">${o.toFixed(2)}</span></span>
                                <span class="text-white/40">H <span class="text-white">${h.toFixed(2)}</span></span>
                                <span class="text-white/40">L <span class="text-white">${l.toFixed(2)}</span></span>
                                <span class="text-white/40">C <span class="text-white text-green-500">${c.toFixed(2)}</span></span>
                            </div>
                          </div>
                        `;
                      }
                    }
                }}
                series={[{
                    name: "Price",
                    data: chartData.map((d: any) => ({
                      x: d.date,
                      y: [d.open || d.price, d.high || d.price, d.low || d.price, d.price]
                    }))
                }]}
                type="candlestick"
                height="100%"
            />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex gap-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Decision</span>
                <span className={`text-[12px] font-black ${data.decision === 'BUY' ? 'text-green-500' : data.decision === 'SELL' ? 'text-red-500' : 'text-accent'}`}>{data.decision || 'HOLD'}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Confidence</span>
                <span className="text-[12px] font-black text-white">{data.confidence_score || '75'}%</span>
            </div>
        </div>
        <button 
            onClick={() => {
              const cleanTicker = ticker.replace(".NS", "").replace(".BO", "");
              window.open(`/stocks/details/${cleanTicker}`, '_blank');
            }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black text-white/70 uppercase tracking-widest transition-all active:scale-95"
        >
            Analysis
        </button>
      </div>
    </div>
  );
}
