import { useState, useEffect } from "react";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { useAuthStore } from "../store/useAuthStore";
import { getBatchQuotes } from "../services/api";
import { Loader2, Plus, Edit2, Bookmark, ArrowRight, Search, X, Trash2, Undo2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { AddStockModal } from "../components/dashboard/AddStockModal";

export function Watchlist() {
  const { watchlists, items, loading: storeLoading, fetchWatchlists } = useWatchlistStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);

  // Sorting
  const [sortKey, setSortKey] = useState<string>("companyName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modals & Inline Creation
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  
  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);
  const [isProcessingDone, setIsProcessingDone] = useState(false);
  const { createWatchlist, renameWatchlist, deleteWatchlist, removeItemsFromWatchlist } = useWatchlistStore();

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

  const activeWatchlist = watchlists.find(w => w.id === activeTab);
  
  const filteredData = watchlistData
    .filter(d => 
      d.companyName.toLowerCase().includes(search.toLowerCase()) || 
      d.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        const comp = valA.localeCompare(valB);
        return sortOrder === "asc" ? comp : -comp;
      }
      
      const numA = Number(valA);
      const numB = Number(valB);
      if (isNaN(numA) || isNaN(numB)) return 0;
      
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleUndo = () => {
    setIsEditing(false);
    setEditName("");
    setPendingRemovals([]);
  };

  const handleDone = async () => {
    if (!activeTab || !activeWatchlist) return;
    setIsProcessingDone(true);
    
    try {
      // Rename if changed
      if (editName.trim() && editName.trim() !== activeWatchlist.name) {
        await renameWatchlist(activeTab, editName.trim());
      }

      // Process batch removals
      if (pendingRemovals.length > 0) {
        await removeItemsFromWatchlist(activeTab, pendingRemovals);
      }

      setIsEditing(false);
      setPendingRemovals([]);
    } finally {
      setIsProcessingDone(false);
    }
  };

  const handleDeleteWatchlist = async () => {
    if (!activeTab) return;
    if (window.confirm("Are you sure you want to delete this watchlist? This action cannot be undone.")) {
      await deleteWatchlist(activeTab);
      setIsEditing(false);
      setPendingRemovals([]);
      
      const remaining = watchlists.filter(w => w.id !== activeTab);
      setActiveTab(remaining.length > 0 ? remaining[0].id : null);
    }
  };

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
        <div className="flex flex-col items-center justify-center py-40 gap-6 w-full">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" />
            <Loader2
              className="w-12 h-12 animate-spin text-accent absolute top-0 left-0"
              style={{ animationDuration: "3s" }}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-text-bold text-lg font-black tracking-tighter uppercase italic">
              Curating Watchlists
            </p>
            <p className="text-text-muted text-sm font-medium tracking-wide">
              Curating User Lists...
            </p>
          </div>
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
                  className={`px-5 py-3 text-sm font-bold border-b-[3px] transition-all whitespace-nowrap cursor-pointer ${isActive ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-bold hover:border-white/10"}`}
                >
                  {w.name}
                </button>
              );
            })}
            
            {/* INLINE NEW WATCHLIST CREATOR */}
            {isCreatingList ? (
              <div className="flex items-center gap-1.5 px-3 py-2 border-b-[3px] border-transparent">
                <input
                  type="text"
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name..."
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-bold text-text-bold focus:outline-none focus:border-accent/50 focus:bg-white/10 w-36 transition-all placeholder:text-[#9ca3af]/50"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newListName.trim() && user) {
                      const newList = await createWatchlist(user.id, newListName.trim());
                      if (newList) setActiveTab(newList.id);
                      setIsCreatingList(false);
                      setNewListName("");
                    }
                    if (e.key === "Escape") {
                      setIsCreatingList(false);
                      setNewListName("");
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    setIsCreatingList(false);
                    setNewListName("");
                  }}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/10 transition-colors border border-transparent rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingList(true)}
                className="px-4 py-3 text-sm font-bold text-text-muted hover:text-text-bold hover:bg-white/5 transition-all flex items-center gap-2 border-b-[3px] border-transparent cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Watchlist
              </button>
            )}
          </div>

          {/* TOOLBAR */}
          {isEditing ? (
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 bg-[#0a0a0a]">
              <div className="flex items-center w-full sm:w-auto">
                <div className="relative flex items-center bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 w-full sm:w-64 group focus-within:border-accent/50 transition-colors">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-transparent text-sm font-bold text-[#f3f4f6] focus:outline-none w-full"
                  />
                  <Edit2 className="w-3.5 h-3.5 text-[#9ca3af] shrink-0 ml-2 group-focus-within:text-accent transition-colors" />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleDeleteWatchlist}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-[#333] hover:border-danger hover:text-danger hover:bg-danger/10 rounded-lg text-sm font-bold text-[#f3f4f6] transition-all whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete watchlist</span><span className="sm:hidden">Delete</span>
                </button>
                <button
                  onClick={handleUndo}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[#333] hover:bg-white/5 rounded-lg text-sm font-bold text-[#f3f4f6] transition-all cursor-pointer active:scale-95"
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </button>
                <button
                  onClick={handleDone}
                  disabled={isProcessingDone}
                  className="px-5 py-2 bg-accent hover:bg-accent/90 text-black rounded-md text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isProcessingDone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Done
                </button>
              </div>
            </div>
          ) : (
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
                  onClick={() => setIsAddStockModalOpen(true)}
                  disabled={!activeTab}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-text-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-text-muted" /> Add stocks
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(true);
                    setEditName(activeWatchlist?.name || "");
                    setPendingRemovals([]);
                  }}
                  disabled={!activeTab}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-text-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-4 h-4 text-text-muted" /> Edit
                </button>
              </div>
            </div>
          )}

          {/* DATA TABLE */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left min-w-[800px] border-collapse relative">
              <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th 
                    className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-1/4 cursor-pointer hover:text-text-bold transition-colors"
                    onClick={() => handleSort("companyName")}
                  >
                    <div className="flex items-center gap-1">
                      Company {sortKey === "companyName" && (
                        <span className="text-text-muted ml-0.5">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-[15%]">Trend</th>
                  <th 
                    className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right cursor-pointer hover:text-text-bold transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Mkt price {sortKey === "price" && (
                        <span className="text-text-muted ml-0.5">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right cursor-pointer hover:text-text-bold transition-colors"
                    onClick={() => handleSort("changePercent")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      1D change {sortKey === "changePercent" && (
                        <span className="text-text-muted ml-0.5">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted text-right cursor-pointer hover:text-text-bold transition-colors"
                    onClick={() => handleSort("volume")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      1D vol {sortKey === "volume" && (
                        <span className="text-text-muted ml-0.5">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-[15%] text-right">52W perf</th>
                  {isEditing && (
                    <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-text-muted w-16 text-center">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {quotesLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                          <Loader2 className="w-8 h-8 animate-spin text-accent opacity-20" />
                          <Loader2
                            className="w-8 h-8 animate-spin text-accent absolute top-0 left-0"
                            style={{ animationDuration: "3s" }}
                          />
                        </div>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest animate-pulse">
                          Syncing Quotes...
                        </p>
                      </div>
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

                    const isRemoved = pendingRemovals.includes(d.symbol);
                    if (isRemoved && !isEditing) return null; // Fallback in case state out of sync

                    return (
                      <motion.tr 
                        key={d.symbol}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: isRemoved ? 0.3 : 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => { 
                          if (!isEditing) {
                            const cleanTicker = d.symbol.replace(".NS", "").replace(".BO", "");
                            navigate(`/stocks/details/${cleanTicker}`); 
                          }
                        }}
                        className={`transition-colors ${isEditing ? 'cursor-default' : 'hover:bg-white/[0.04] cursor-pointer'} group`}
                      >
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-3 transition-opacity ${isRemoved ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center opacity-70">
                               <span className="text-[10px] font-bold text-text-muted">{d.symbol.slice(0, 2)}</span>
                            </div>
                            <div>
                               <p className={`text-sm font-black truncate max-w-[180px] ${isRemoved ? 'text-text-muted line-through' : 'text-text-bold'}`}>{d.companyName}</p>
                               <p className="text-[10px] text-text-muted font-bold mt-0.5">{d.symbol.replace('.NS', '').replace('.BO', '')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                            {/* Real 1D sparkline trend */}
                           <div className={`w-24 h-6 flex items-center transition-opacity ${isRemoved ? 'opacity-30 grayscale' : ''}`}>
                              {d.sparkline && d.sparkline.length > 1 ? (
                                <svg viewBox="0 0 100 24" className="w-full h-full preserveAspectRatio-none">
                                  {(() => {
                                    const allPoints = [...d.sparkline, d.prevClose];
                                    const min = Math.min(...allPoints);
                                    const max = Math.max(...allPoints);
                                    const range = max - min || 1;
                                    const padding = range * 0.15;
                                    const scale = (val: number) => 22 - ((val - min + padding) / (range + 2 * padding)) * 20;
                                    
                                    const points = d.sparkline.map((val: number, idx: number) => {
                                      const x = (idx / (d.sparkline.length - 1)) * 100;
                                      const y = scale(val);
                                      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                                    }).join(' ');

                                    const prevCloseY = scale(d.prevClose);

                                    return (
                                      <>
                                        {/* Reference dashed line for previous close */}
                                        <line 
                                          x1="0" y1={prevCloseY} x2="100" y2={prevCloseY} 
                                          stroke="white" 
                                          strokeWidth="0.5" 
                                          strokeDasharray="2,2" 
                                          className="opacity-20"
                                        />
                                        <path 
                                          d={points} 
                                          fill="none" 
                                          stroke={isPos ? "#10b981" : "#e13451"} 
                                          strokeWidth="2"
                                          strokeLinejoin="round"
                                          strokeLinecap="round"
                                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                        <path 
                                          d={`${points} L100,24 L0,24 Z`} 
                                          fill={isPos ? "url(#gradPos)" : "url(#gradNeg)"} 
                                          className="opacity-10 group-hover:opacity-20 transition-opacity"
                                        />
                                      </>
                                    );
                                  })()}
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
                              ) : (
                                <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest opacity-20">No Data</div>
                              )}
                           </div>
                        </td>
                        <td className={`px-6 py-4 text-right transition-opacity ${isRemoved ? 'opacity-30' : ''}`}>
                          <AnimatedNumber value={d.price} prefix="₹" decimals={2} className="text-sm font-bold text-text-bold" />
                        </td>
                        <td className={`px-6 py-4 text-right transition-opacity ${isRemoved ? 'opacity-30' : ''}`}>
                          <span className={`text-[13px] font-bold ${changeColor}`}>
                            {isPos ? "+" : ""}
                            <AnimatedNumber value={d.change} decimals={2} className="inline" /> (
                            <AnimatedNumber value={d.changePercent} decimals={2} className="inline" />%)
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right transition-opacity ${isRemoved ? 'opacity-30' : ''}`}>
                          <span className="text-sm font-bold text-text-bold">
                            {d.volume.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right transition-opacity ${isRemoved ? 'opacity-30' : ''}`}>
                          <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-text-muted mt-1">
                            <span>L</span>
                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 bottom-0 bg-white/30 rounded-full" style={{ left: '0%', width: `${Math.max(5, rangeProgress)}%`}} />
                              <div className="w-1 h-2 bg-text-bold absolute top-1/2 -translate-y-1/2 rounded" style={{ left: `${Math.max(2, Math.min(98, rangeProgress))}%`}} />
                            </div>
                            <span>H</span>
                          </div>
                        </td>
                        {isEditing && (
                          <td className="px-6 py-4 text-center">
                            <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 if (isRemoved) {
                                   setPendingRemovals(prev => prev.filter(s => s !== d.symbol));
                                 } else {
                                   setPendingRemovals(prev => [...prev, d.symbol]);
                                 }
                               }}
                               className={`p-2 rounded-lg transition-colors border cursor-pointer active:scale-90 ${isRemoved ? 'bg-white/10 border-white/20 text-white' : 'hover:bg-danger/10 border-transparent hover:border-danger/30 text-danger'}`}
                               title={isRemoved ? "Undo remove" : "Remove from watchlist"}
                            >
                               {isRemoved ? <Undo2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </td>
                        )}
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

      {/* MODALS */}
      <AddStockModal 
        isOpen={isAddStockModalOpen} 
        onClose={() => setIsAddStockModalOpen(false)} 
        watchlistId={activeTab} 
      />
    </motion.div>
  );
}
