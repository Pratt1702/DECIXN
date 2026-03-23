import { Search, Bell, Loader2, LogOut, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { searchStocks } from "../../services/api";
import { motion } from "framer-motion";
import logo from "../../assets/logo.png";
import { useSupabaseAuth } from "../../contexts/AuthContext";

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <button 
              onClick={() => navigate("/stocks")}
              className={`text-base font-black tracking-tight transition-colors ${isStocks ? "text-white" : "text-text-muted hover:text-white"}`}
            >
              Stocks
            </button>
            <button 
              onClick={() => navigate("/mutual-funds")}
              className={`text-base font-black tracking-tight transition-colors ${isMF ? "text-white" : "text-text-muted hover:text-white"}`}
            >
              Mutual Funds
            </button>
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
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-text-bold placeholder-text-muted outline-none focus:bg-white/10 transition-all font-medium"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent animate-spin" />}

            {showDropdown && search.trim() && (
              <div className="absolute top-12 left-0 w-full bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelect(s.symbol)}
                      className="flex justify-between items-center px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <span className="font-semibold text-text-bold text-sm">{s.name}</span>
                      <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">{s.symbol.replace(".NS", "")}</span>
                    </div>
                  ))
                ) : !isSearching && (
                  <div className="px-4 py-4 text-sm text-text-muted text-center">No results found</div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-5">
          <button className="text-text-muted hover:text-white transition-colors">
            <Bell size={20} />
          </button>
          
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
