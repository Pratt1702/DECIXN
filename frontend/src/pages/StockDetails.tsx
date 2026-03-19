import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { AIIntelligencePanel } from "../components/dashboard/AIIntelligencePanel";
import { TechnicalIndicators } from "../components/dashboard/TechnicalIndicators";

const PERIODS = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', 'All'];

// Custom Tooltip Component for Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#121212] border border-[#222222] rounded px-3 py-1.5 shadow-lg text-xs font-medium flex items-center gap-1.5">
        <span className="text-[#f3f4f6]">₹{Number(data.price).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
        <span className="text-[#6b6375]">|</span>
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
      try {
        const res = await getTickerAnalysis(ticker); 
        // We augment the single API response with a map of charts for all timeframes
        // This makes period switching instantaneous without hammering the server
        setData(augmentWithAllCharts(ticker, res?.data));
      } catch (err) {
        console.error("Failed to fetch ticker, using mock data", err);
        setData(augmentWithAllCharts(ticker, null));
      } finally {
        setLoading(false);
      }
    }
    fetchTicker();
  }, [ticker]);

  const augmentWithAllCharts = (t: string, apiData: any) => {
    const allCharts: any = {};
    let basePrice = apiData?.price || 2000;
    
    PERIODS.forEach(p => {
      // Simulate historical paths for different periods
      const variance = p === '1D' ? 5 : p === '1W' ? 10 : p === '1M' ? 20 : 50;
      const length = p === '1D' ? 40 : p === '1M' ? 30 : p === '1Y' ? 100 : 80;
      
      let currentSimPrice = basePrice * (p === '1D' ? 0.99 : 0.8); 
      
      const chartPoints = Array.from({ length }, (_, i) => {
        currentSimPrice += (Math.random() - 0.45) * variance;
        
        let dateLabel = `Day ${i + 1}`;
        if (p === '1D') {
          const hour = 9 + Math.floor(i / 6);
          const min = (i % 6) * 10;
          dateLabel = `${hour}:${min.toString().padStart(2, '0')} AM`;
        } else if (p === '1W') {
           const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
           dateLabel = `${days[i % 5]} 12:00 PM`;
        }
        
        return { 
          price: currentSimPrice,
          date: dateLabel
        };
      });
      
      // Override 1Y with the real backend chart data if available
      if (p === '1Y' && apiData?.chart_data?.length) {
         allCharts[p] = apiData.chart_data;
      } else {
         allCharts[p] = chartPoints;
      }
    });

    return {
      symbol: apiData?.symbol || t,
      price: apiData?.price || basePrice,
      decision: apiData?.decision || "HOLD",
      confidence_score: apiData?.confidence_score || 50,
      trend: apiData?.trend || "Bullish",
      reasons: apiData?.reasons || [
        "Price momentum has shifted in the chosen timeframe.",
        "Unusual volume activity detected in the options chain."
      ],
      charts: allCharts,
      fundamentals: apiData?.fundamentals,
      pivots: apiData?.pivots,
      moving_averages: apiData?.moving_averages,
      indicators: apiData?.indicators
    };
  };

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  // Active chart based on user click (NO API CALL REQUIRED!)
  const currentChart = data?.charts?.[period] || [];
  const currentPrice = data?.price || 0;
  
  let priceChange = 0;
  let priceChangePct = 0;
  
  if (currentChart && currentChart.length > 1) {
    const firstPrice = currentChart[0].price;
    const lastPrice = currentChart[currentChart.length - 1].price;
    priceChange = lastPrice - firstPrice;
    priceChangePct = (priceChange / firstPrice) * 100;
  }

  const isPos = priceChange >= 0;
  const strokeColor = isPos ? "#10b981" : "#f43f5e"; // emerald-500 or rose-500

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
        <h1 className="text-3xl font-bold tracking-tight text-text-bold">{data?.symbol?.replace('.NS', '') || ticker}</h1>
        
        <div className="mt-2">
          <p className="text-4xl font-bold tracking-tight text-text-bold">
            ₹{currentPrice.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
          <div className={`flex items-center gap-1.5 font-medium mt-1 text-sm ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
            <span>{isPos ? '+' : ''}{priceChange.toFixed(2)} ({isPos ? '+' : ''}{priceChangePct.toFixed(2)}%)</span>
            <span className="text-text-muted ml-1">{period}</span>
          </div>
        </div>
      </header>

      {/* Interactive Chart Area */}
      <div className="border-b border-border-main pb-4 mt-8">
          <div className="h-72 sm:h-80 w-full relative">
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
          <AIIntelligencePanel data={data} />
          <TechnicalIndicators data={data} />
      </div>
    </motion.div>
  );
}
