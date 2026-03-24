import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTickerAnalysis } from "../services/api";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Info, TrendingUp, TrendingDown, Clock, ShieldCheck, Target } from "lucide-react";

export function MFDetails() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMFData = async () => {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getTickerAnalysis(symbol);
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || "Failed to fetch Mutual Fund data");
        }
      } catch (e: any) {
        setError(e.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMFData();
  }, [symbol]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="relative">
        <Loader2 size={48} className="text-accent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-1.5 w-1.5 bg-accent rounded-full animate-ping" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xl font-black text-text-bold tracking-tight">Syncing Live NAV...</p>
        <p className="text-text-muted text-sm font-medium mt-1">Fetching Morningstar data for {symbol}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 px-6">
      <div className="bg-danger/10 border border-danger/20 rounded-3xl p-10 text-center">
        <div className="h-16 w-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Info size={32} className="text-danger" />
        </div>
        <h2 className="text-2xl font-black text-text-bold mb-4">Analysis Failed</h2>
        <p className="text-text-muted font-medium mb-8 leading-relaxed">{error}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-danger text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Retry Analysis</button>
          <button onClick={() => navigate(-1)} className="w-full py-4 bg-white/5 text-text-muted rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">Go Back</button>
        </div>
      </div>
    </div>
  );

  const stats = data ? [
    { label: "Current NAV", value: `₹${data.price.toFixed(2)}`, icon: <Target className="text-accent" /> },
    { label: "Trend", value: data.trend, icon: data.trend === 'Bullish' ? <TrendingUp className="text-success" /> : <TrendingDown className="text-danger" /> },
    { label: "Risk Level", value: data.risk_level, icon: <ShieldCheck className="text-warning" /> },
    { label: "Last Verified", value: new Date().toLocaleDateString(), icon: <Clock className="text-text-muted" /> }
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-10 pb-20"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-5">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 p-3 rounded-2xl bg-white/5 border border-white/10 text-text-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">Mutual Fund</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{symbol}</span>
            </div>
            <h1 className="text-4xl font-black text-text-bold tracking-tighter leading-none">
              {data?.companyName}
            </h1>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-bg-surface border border-border-main p-6 rounded-3xl group hover:border-accent/40 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/5 rounded-xl group-hover:bg-accent/10 transition-colors">
                {s.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{s.label}</span>
            </div>
            <div className="text-2xl font-black text-text-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-bg-surface border border-border-main rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-text-bold tracking-tight">Market Intelligence</h2>
                <div className="text-[10px] font-black text-accent bg-accent/10 px-3 py-1 rounded-full uppercase tracking-widest border border-accent/20">Live Sync</div>
             </div>
             
             <div className="bg-black/40 rounded-3xl p-8 border border-white/5 overflow-auto max-h-[500px] scrollbar-thin">
                <pre className="text-xs font-mono text-success/90 leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-accent/5 border border-accent/10 rounded-[2rem] p-8">
            <h3 className="text-lg font-black text-text-bold mb-4 tracking-tight">AI Reasoning</h3>
            <div className="space-y-4">
              {data?.reasons?.map((r: string, i: number) => (
                <div key={i} className="flex gap-3 text-sm text-text-muted font-medium leading-relaxed">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full mt-2 shrink-0" />
                  <p>{r}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-surface border border-border-main rounded-[2rem] p-8">
             <h3 className="text-lg font-black text-text-bold mb-4 tracking-tight">Scheme Data</h3>
             <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Sector</span>
                  <span className="text-xs font-bold text-text-bold">{data?.fundamentals?.sector}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Industry</span>
                  <span className="text-xs font-bold text-text-bold">{data?.fundamentals?.industry}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Quote Type</span>
                  <span className="text-xs font-bold text-text-bold">{data?.fundamentals?.quote_type}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
