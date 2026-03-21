import { useState, useEffect } from "react";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { useAuthStore } from "../store/useAuthStore";
import { getBatchQuotes } from "../services/api";
import { Loader2, Plus, Edit2, Bookmark, ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";

export function Watchlist() {
  const { watchlists, items, loading: storeLoading, fetchWatchlists } = useWatchlistStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);

  useEffect(() => {
    if (user) fetchWatchlists(user.id);
  }, [user, fetchWatchlists]);

  useEffect(() => {
    if (watchlists.length > 0 && !activeTab) {
      setActiveTab(watchlists[0].id);
    } else if (watchlists.length === 0) {
      setActiveTab(null);
    }
  }, [watchlists, activeTab]);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!activeTab) {
        setWatchlistData([]);
        return;
      }
      
      const symbols = items
        .filter(i => i.watchlist_id === activeTab)
        .map(i => i.symbol);

      if (symbols.length === 0) {
        setWatchlistData([]);
        return;
      }

      setQuotesLoading(true);
      try {
        const res = await getBatchQuotes(symbols);
        if (res.success) {
          setWatchlistData(res.results);
        }
      } catch (err) {
        console.error("Failed to fetch batch quotes", err);
      } finally {
        setQuotesLoading(false);
      }
    };

    fetchQuotes();
  }, [activeTab, items]);

  const filteredData = watchlistData.filter(d => 
    d.companyName.toLowerCase().includes(search.toLowerCase()) || 
    d.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto pb-20 pt-6 px-4 space-y-6"
    >
      {/* HEADER */}
      <header className="flex flex-col gap-1 mb-6">
        <h1 className="text-3xl font-black text-text-bold tracking-tighter">
          Watchlist
        </h1>
        <p className="text-text-muted text-sm font-medium">
          Track and analyze your favorite stocks in curated lists.
        </p>
      </header>

      {storeLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : watchlists.length === 0 ? (
        <div className="bg-bg-surface border border-border-main rounded-xl p-10 text-center flex flex-col items-center gap-4">
          <Bookmark className="w-10 h-10 text-text-muted opacity-50" />
          <div>
            <h2 className="text-xl font-bold text-text-bold">No watchlists yet</h2>
            <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">Create your first watchlist to start monitoring stocks. You can add stocks directly from any Stock Details page.</p>
          </div>
          <button 
            onClick={() => navigate("/explore")}
            className="mt-4 px-6 py-2.5 bg-accent text-[#0a0a0a] rounded-lg font-bold text-sm hover:bg-accent/90 transition-all flex items-center gap-2"
          >
            Explore Stocks <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden flex flex-col min-h-[500px]">
          {/* TABS */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-white/5 px-4 pt-4 pb-0 bg-white/[0.02]">
            {watchlists.map(w => {
              const isActive = activeTab === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setActiveTab(w.id)}
                  className={`px-5 py-3 text-sm font-bold border-b-[3px] transition-all whitespace-nowrap ${isActive ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-bold hover:border-white/10"}`}
                >
                  {w.name}
                </button>
              );
            })}
          </div>

          {/* TOOLBAR */}
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5">
            <div className="relative w-full sm:max-w-xs group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="Search your watchlist"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-border-main rounded-lg pl-9 pr-4 py-2 text-sm text-text-bold focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => navigate("/explore")}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-text-bold transition-all"
              >
                <Plus className="w-4 h-4 text-text-muted" /> Add stocks
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-text-bold transition-all">
                <Edit2 className="w-4 h-4 text-text-muted" /> Edit
              </button>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left min-w-[800px] border-collapse relative">
              <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-1/4">Company</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-[15%]">Trend</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right">Mkt price</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right">1D change</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right">1D vol</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-[15%] text-right">52W perf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {quotesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-6 h-6 text-text-muted animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((d, i) => {
                    const isPos = d.change >= 0;
                    const changeColor = isPos ? "text-success" : "text-danger";
                    
                    // Simple progress bar calculation for 52W range
                    let rangeProgress = 50;
                    if (d.fifty_two_week_high > d.fifty_two_week_low) {
                      rangeProgress = ((d.price - d.fifty_two_week_low) / (d.fifty_two_week_high - d.fifty_two_week_low)) * 100;
                    }

                    return (
                      <motion.tr 
                        key={d.symbol}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => navigate(`/stock/${d.symbol}`)}
                        className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center opacity-70">
                               <span className="text-[10px] font-bold text-text-muted">{d.symbol.slice(0, 2)}</span>
                            </div>
                            <div>
                               <p className="text-sm font-black text-text-bold truncate max-w-[180px]">{d.companyName}</p>
                               <p className="text-[10px] text-text-muted font-bold mt-0.5">{d.symbol.replace('.NS', '').replace('.BO', '')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                            {/* Simple visual indicator mimicking a sparkline trend */}
                           <div className="w-24 h-6 flex items-center">
                              <svg viewBox="0 0 100 24" className="w-full h-full preserveAspectRatio-none">
                                <path 
                                   d={isPos ? "M0,24 L20,16 L40,20 L60,8 L80,12 L100,2" : "M0,2 L20,10 L40,6 L60,18 L80,14 L100,22"} 
                                   fill="none" 
                                   stroke={isPos ? "#10b981" : "#e13451"} 
                                   strokeWidth="1.5"
                                   strokeLinejoin="round"
                                   strokeLinecap="round"
                                   className="opacity-60 group-hover:opacity-100 transition-opacity"
                                />
                                <path 
                                   d={isPos ? "M0,24 L20,16 L40,20 L60,8 L80,12 L100,2 L100,24 Z" : "M0,2 L20,10 L40,6 L60,18 L80,14 L100,22 L100,24 Z"} 
                                   fill={isPos ? "url(#gradPos)" : "url(#gradNeg)"} 
                                   className="opacity-10 group-hover:opacity-20 transition-opacity"
                                />
                                <defs>
                                  <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="transparent" />
                                  </linearGradient>
                                  <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#e13451" />
                                    <stop offset="100%" stopColor="transparent" />
                                  </linearGradient>
                                </defs>
                              </svg>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <AnimatedNumber value={d.price} prefix="₹" decimals={2} className="text-sm font-bold text-text-bold" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[13px] font-bold ${changeColor}`}>
                            {isPos ? "+" : ""}
                            <AnimatedNumber value={d.change} decimals={2} className="inline" /> (
                            <AnimatedNumber value={d.changePercent} decimals={2} className="inline" />%)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-text-bold">
                            {d.volume.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-text-muted mt-1">
                            <span>L</span>
                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 bottom-0 bg-white/30 rounded-full" style={{ left: '0%', width: `${Math.max(5, rangeProgress)}%`}} />
                              <div className="w-1 h-2 bg-text-bold absolute top-1/2 -translate-y-1/2 rounded" style={{ left: `${Math.max(2, Math.min(98, rangeProgress))}%`}} />
                            </div>
                            <span>H</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-sm text-text-muted font-medium">No stocks matched your search.</p>
                    </td>
                  </tr>
                )}
                
                {!quotesLoading && watchlistData.length === 0 && search === "" && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-sm text-text-muted font-medium">Your watchlist is empty.</p>
                      <button 
                        onClick={() => navigate("/explore")}
                        className="mt-3 px-4 py-1.5 text-xs font-bold text-accent border border-accent/20 bg-accent/5 rounded-lg hover:bg-accent/10 transition-colors"
                      >
                         Browse Stocks
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
