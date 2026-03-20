import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import { TechnicalIndicators } from "../components/dashboard/TechnicalIndicators";

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'];

// Custom Tooltip Component for Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212]/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 shadow-2xl text-xs font-medium flex items-center gap-2">
        <span className="text-[#f3f4f6] font-bold">₹{Number(data.price).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        <span className="text-white/20">|</span>
        <span className="text-[#9ca3af]">{data.date || 'Today'}</span>
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
  const [period, setPeriod] = useState('1Y');

  // We only fetch ONCE when the component mounts or ticker changes
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
          indicators: res.data.indicators
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

  // Skeletons are now rendered inline below for better perceived performance.

  if (data?.error) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center space-y-5 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center border border-danger/20">
            <AlertTriangle className="w-10 h-10 text-danger" />
        </div>
        <div>
            <h2 className="text-3xl font-bold text-text-bold mb-2">Stock Not Found</h2>
            <p className="text-text-muted max-w-sm mx-auto">We couldn't retrieve intelligence for '<span className="text-[#f3f4f6] font-medium">{ticker}</span>'. The ticker might be invalid, recently delisted, or not supported.</p>
        </div>
        <button 
            onClick={() => navigate(-1)} 
            className="px-6 py-2.5 mt-4 bg-border-main hover:bg-[#3f3f46] rounded-full text-sm font-medium transition-colors text-text-bold flex items-center gap-2"
        >
            <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  // Active chart based on user click
  const currentChart = data?.charts?.[period] || [];
  const currentPrice = data?.price || 0;
  
  let priceChange = 0;
  let priceChangePct = 0;
  
  if (currentChart && currentChart.length > 0) {
    const firstPrice = currentChart[0].price;
    // Make it dynamic - compare current price to the start of the period
    priceChange = currentPrice - firstPrice;
    priceChangePct = (priceChange / firstPrice) * 100;
  }

  const isPos = priceChange >= 0;
  const strokeColor = isPos ? "#10b981" : "#f43f5e"; // success or danger

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-10 max-w-4xl mx-auto pb-12"
    >
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-bold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Nudges
      </button>

      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end gap-3 md:gap-4 mb-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading font-black tracking-tight text-text-bold drop-shadow-sm truncate max-w-full">
               {data?.companyName || data?.symbol?.replace('.NS', '').replace('.BO', '') || ticker?.replace('.NS', '').replace('.BO', '')}
            </h1>
            <span className="bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full text-sm md:text-base font-bold font-mono self-end shrink-0 tracking-wider mb-1">
               {data?.symbol?.replace('.NS', '').replace('.BO', '') || ticker?.replace('.NS', '').replace('.BO', '')}
            </span>
        </div>
        
        <div className="mt-2">
          {loading && !data ? (
            <div className="space-y-4 py-2">
              <div className="h-10 w-32 bg-border-main/40 animate-pulse rounded-md"></div>
              <div className="h-5 w-48 bg-border-main/40 animate-pulse rounded-md"></div>
            </div>
          ) : (
            <>
              <p className="text-4xl font-bold tracking-tight text-text-bold">
                ₹{currentPrice.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
              <div className={`flex items-center gap-1.5 font-medium mt-1 text-sm ${isPos ? 'text-success' : 'text-danger'}`}>
                <span>{isPos ? '+' : ''}{priceChange.toFixed(2)} ({isPos ? '+' : ''}{priceChangePct.toFixed(2)}%)</span>
                <span className="text-text-muted ml-1">{period}</span>
              </div>
              
              {/* Core Fundamentals Badge Row */}
              {data?.fundamentals && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 px-1">
                  <div className="flex items-center gap-1.5 text-sm">
                     <span className="text-text-muted font-medium">P/E:</span>
                     <span className="font-bold font-mono tracking-wide text-accent">{data.fundamentals.pe_ratio?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                     <span className="text-text-muted font-medium">RSI:</span>
                     <span className={`font-bold font-mono tracking-wide ${data.indicators?.rsi_14 > 70 ? 'text-danger' : data.indicators?.rsi_14 < 30 ? 'text-success' : 'text-white'}`}>{data.indicators?.rsi_14?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                     <span className="text-text-muted font-medium">MACD:</span>
                     <span className={`font-bold font-mono tracking-wide ${data.indicators?.macd?.MACD_Line > 0 ? 'text-success' : 'text-danger'}`}>{data.indicators?.macd?.MACD_Line > 0 ? '+' : ''}{data.indicators?.macd?.MACD_Line?.toFixed(2) || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                     <span className="text-text-muted font-medium">Beta:</span>
                     <span className="font-bold font-mono tracking-wide text-white">{data.fundamentals.beta?.toFixed(2) || '-'}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {/* Interactive Chart Area */}
      <div className="border-b border-border-main pb-4 mt-8">
          <div className="h-72 sm:h-80 w-full relative">
            {loading && !data ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#121212]/40 backdrop-blur-xl animate-pulse rounded-2xl border border-white/5">
                 <Loader2 className="w-8 h-8 animate-spin text-text-muted/40 mb-3" />
                 <span className="text-sm text-text-muted">Loading chart data...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentChart}>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ stroke: '#2e303a', strokeWidth: 1, strokeDasharray: "4 4" }} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={strokeColor} 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, fill: strokeColor, stroke: '#121212', strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Ranges Selection */}
          <div className="flex items-center justify-center sm:justify-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
            {PERIODS.map(p => {
              const isActive = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'border border-[#4b5563] text-text-bold' 
                      : 'border border-transparent text-text-muted hover:text-text-bold'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
      </div>

      <div className="pt-2">
          {loading && !data ? (
             <div className="space-y-6 mt-4">
                 <div className="h-44 w-full bg-border-main/30 animate-pulse rounded-xl border border-border-main/20"></div>
                 <div className="h-72 w-full bg-border-main/30 animate-pulse rounded-xl border border-border-main/20"></div>
             </div>
          ) : (
             <>
                 <AIIntelligencePanel data={data} />
                 <TechnicalIndicators data={data} />
             </>
          )}
      </div>
    </motion.div>
  );
}
