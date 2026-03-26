import { useEffect, useState } from "react";
import { getNews } from "../services/api";
import { motion } from "framer-motion";
import { 
  Newspaper, 
  TrendingUp, 
  ExternalLink, 
  Search,
  Target,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function News() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchNews() {
      try {
        const data = await getNews(50);
        setNews(data);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const filteredNews = news.filter(n => {
    if (filter === "all") return true;
    if (filter === "critical") return (n.impact_strength || 0) >= 4;
    if (filter === "positive") return n.sentiment === "positive";
    if (filter === "negative") return n.sentiment === "negative";
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-text-muted font-black tracking-tighter uppercase italic">Syncing Catalyst Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Newspaper className="text-accent" size={24} />
            </div>
            <span className="text-xs font-black text-accent tracking-[0.2em] uppercase">Intelligence Feed</span>
          </div>
          <h1 className="text-5xl font-black text-text-bold tracking-tighter">Catalyst News</h1>
          <p className="text-text-muted mt-2 font-medium">Inference-backed market intelligence from our Catalyst Engine.</p>
        </div>

        <div className="flex p-1 bg-bg-surface border border-border-main rounded-xl gap-1">
          {["all", "critical", "positive", "negative"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                filter === f ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-bold"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNews.map((item, idx) => {
          const impact = item.impact_strength || 1;
          const isCritical = impact >= 4;
          const stocks = item.news_stocks || [];
          const sectors = item.news_sectors || [];

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className={`bg-bg-surface border border-border-main rounded-2xl overflow-hidden hover:border-accent/40 transition-all group flex flex-col ${
                isCritical ? "ring-1 ring-accent/20 border-accent/30" : ""
              }`}
            >
              <div className="p-6 flex-1">
                {/* Meta Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      item.sentiment === "positive" ? "bg-success/10 text-success" : 
                      item.sentiment === "negative" ? "bg-danger/10 text-danger" : "bg-white/10 text-text-muted"
                    }`}>
                      {item.sentiment}
                    </span>
                    <span className="text-[10px] text-text-muted font-bold">
                      {new Date(item.published_at || item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    <Globe size={10} className="text-text-muted" />
                    <span className="text-[10px] text-text-muted font-black uppercase tracking-wider">{item.source || "Economic Times"}</span>
                  </div>
                </div>

                {/* Title */}
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xl font-black text-text-bold leading-tight hover:text-accent transition-colors block mb-3"
                >
                  {item.title}
                </a>

                {/* Impact Inference */}
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/[0.05] mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={12} className="text-accent" />
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Inference Verdict</span>
                  </div>
                  <p className="text-sm text-[#d1d5db] font-medium leading-relaxed">
                    {item.impact_summary}
                  </p>
                </div>

                {/* Tags */}
                {(stocks.length > 0 || sectors.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {stocks.map((s: any) => (
                      <button
                        key={s.symbol}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/stocks/details/${s.symbol}`);
                        }}
                        className="px-2 py-1 bg-accent/5 hover:bg-accent/15 border border-accent/10 rounded text-[10px] font-black text-accent transition-all"
                      >
                        ${s.symbol}
                      </button>
                    ))}
                    {sectors.map((sec: any) => (
                      <span key={sec.sector} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-black text-text-muted">
                        {sec.sector}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.04] flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/5 rounded">
                    <TrendingUp size={12} className={item.sentiment === 'positive' ? 'text-success' : 'text-text-muted'} />
                  </div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                    Impact Strength: <span className={impact >= 4 ? 'text-accent' : 'text-text-bold'}>{impact}/5</span>
                  </span>
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-black text-accent hover:underline uppercase tracking-widest"
                >
                  Source <ExternalLink size={10} />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredNews.length === 0 && (
        <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-3xl mt-12 bg-white/[0.01]">
          <Search className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-black text-text-bold tracking-tighter">No Articles Found</h3>
          <p className="text-text-muted font-medium">Try adjusting your filters or wait for the next ingestion cycle.</p>
        </div>
      )}
    </div>
  );
}
