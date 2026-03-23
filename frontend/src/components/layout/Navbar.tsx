import { Search, Bell, Loader2, LogOut, User } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { searchStocks } from "../../services/api";
import { motion } from "framer-motion";
import logo from "../../assets/logo.png";
import { useSupabaseAuth } from "../../contexts/AuthContext";
import { useNotificationStore } from "../../store/useNotificationStore";
import { formatDistanceToNow } from "date-fns";

export function Navbar() {
  const { user, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, fetchNotifications, subscribeToNotifications, markAsRead } = useNotificationStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isStocks = location.pathname.startsWith("/stocks");
  const isMF = location.pathname.startsWith("/mutual-funds");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      const unsubscribe = subscribeToNotifications(user.id);
      return () => unsubscribe();
    }
  }, [user, fetchNotifications, subscribeToNotifications]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!search.trim()) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchStocks(search);
        if (res.success) {
          setSuggestions(res.results.slice(0, 6));
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const cleanSearch = search.trim().toUpperCase().replace(".NS", "").replace(".BO", "");
      navigate(`/stocks/details/${cleanSearch}`);
      setShowDropdown(false);
    }
  };

  const handleSelect = (symbol: string) => {
    setSearch("");
    setShowDropdown(false);
    const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "");
    navigate(`/stocks/details/${cleanSymbol}`);
  };

  return (
    <nav className="sticky top-0 z-50 h-[72px] border-b border-white/10 bg-[#0a0a0a] px-6 transition-all duration-300">
      <div className="flex items-center justify-between w-full h-full max-w-7xl mx-auto">
        
        {/* Left: Logo + Asset Switcher */}
        <div className="flex items-center gap-10">
          <div
            className="flex cursor-pointer items-center gap-3 group"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="Logo" className="h-9 w-auto object-contain group-hover:scale-105 transition-transform" />
            <span className="text-xl font-heading font-black italic tracking-tighter text-text-bold">DECIXN</span>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              to="/stocks/holdings"
              className={`text-base font-black tracking-tight transition-colors cursor-pointer ${isStocks ? "text-white" : "text-text-muted hover:text-white"}`}
            >
              Stocks
            </Link>
            <Link 
              to="/mutual-funds/holdings"
              className={`text-base font-black tracking-tight transition-colors cursor-pointer ${isMF ? "text-white" : "text-text-muted hover:text-white"}`}
            >
              Mutual Funds
            </Link>
          </div>
        </div>

        {/* Middle: Search bar */}
        <div className="flex-1 max-w-xl px-8 relative" ref={dropdownRef}>
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              placeholder={isMF ? "Search Mutual Funds..." : "Search stocks, indices..."}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-text-bold placeholder-text-muted outline-none focus:bg-white/10 transition-all font-medium cursor-text"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent animate-spin" />}

            {showDropdown && search.trim() && (
              <div className="absolute top-12 left-0 w-full bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelect(s.symbol)}
                      className="flex justify-between items-center px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 group/item"
                    >
                      <span className="font-semibold text-text-bold text-sm group-hover/item:text-accent transition-colors cursor-pointer">{s.name}</span>
                      <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded cursor-pointer">{s.symbol.replace(".NS", "")}</span>
                    </div>
                  ))
                ) : !isSearching && (
                  <div className="px-4 py-4 text-sm text-text-muted text-center italic font-bold">No results found</div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-5">
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${isNotifOpen ? "bg-accent/10 border-accent/20 text-accent" : "bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10"}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0a0a] shadow-lg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 mt-3 w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
              >
                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <span className="text-xs font-black text-text-bold uppercase tracking-widest">Recent Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto scrollbar-none">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          setIsNotifOpen(false);
                          if (n.metadata?.symbol) navigate(`/stocks/details/${n.metadata.symbol}`);
                        }}
                        className={`px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer relative ${!n.is_read ? "bg-accent/[0.02]" : ""}`}
                      >
                        {!n.is_read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-accent rounded-r-full" />}
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-xs font-bold leading-snug ${!n.is_read ? "text-text-bold" : "text-text-muted"}`}>
                            {n.title}
                          </p>
                          <span className="text-[9px] font-black text-text-muted uppercase shrink-0">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true }).replace("about ", "")}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-1 truncate">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <p className="text-xs text-text-muted font-bold">No notifications yet</p>
                    </div>
                  )}
                </div>

                <Link 
                  to="/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="w-full py-3.5 text-[10px] font-black text-accent uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] transition-all border-t border-white/5 text-center block cursor-pointer"
                >
                  See All
                </Link>
              </motion.div>
            )}
          </div>
          
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
            >
              <User size={18} className="text-text-muted" />
            </button>

            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 mt-3 w-56 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
              >
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Account</p>
                  <p className="text-xs text-text-bold mt-0.5 truncate font-bold">{user?.email}</p>
                </div>
                <button
                  onClick={() => { signOut(); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}
