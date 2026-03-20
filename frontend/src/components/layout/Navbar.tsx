import { Search, Bell, Settings, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { searchStocks } from "../../services/api";
import { motion } from "framer-motion";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
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
          setSuggestions(res.results.slice(0, 6)); // Top 6
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
      const cleanSearch = search.trim().toUpperCase().replace('.NS', '').replace('.BO', '');
      navigate(`/stock/${cleanSearch}`);
      setShowDropdown(false);
    }
  };

  const handleSelect = (symbol: string) => {
    setSearch("");
    setShowDropdown(false);
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    navigate(`/stock/${cleanSymbol}`);
  };

  return (
    <nav className="sticky top-0 z-50 flex h-[72px] items-center justify-between border-b border-white/10 bg-[#0a0a0a]/60 px-6 backdrop-blur-xl transition-all duration-300">
      <div className="flex items-center justify-between w-full h-full max-w-7xl mx-auto">
        
        {/* Left Section: Logo + Title + Navigation Links */}
        <div className="flex items-center h-full">
          {/* Logo */}
          <div 
            className="flex cursor-pointer items-center gap-3 group mr-10" 
            onClick={() => navigate("/")}
          >
            {/* <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent group-hover:scale-105 group-active:scale-95 transition-all duration-300">
              <span className="font-heading font-bold text-black text-lg">E</span>
            </div> */}
            <span className="text-xl font-heading font-bold tracking-wider text-text-bold group-hover:text-white transition-colors">ETMarkets</span>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex h-full space-x-2">
            <button 
              onClick={() => navigate("/holdings")} 
              className={`relative h-full flex items-center px-4 text-[15px] font-semibold tracking-wide transition-colors ${location.pathname.includes("holdings") ? "text-[#f3f4f6]" : "text-[#9ca3af] hover:text-[#d1d5db]"}`}
            >
              Holdings
              {location.pathname.includes("holdings") && (
                <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-4 right-4 h-[3px] bg-white rounded-t-md" />
              )}
            </button>
            <button 
              onClick={() => navigate("/nudges")} 
              className={`relative h-full flex items-center px-4 text-[15px] font-semibold tracking-wide transition-colors ${location.pathname.includes("nudges") ? "text-[#f3f4f6]" : "text-[#9ca3af] hover:text-[#d1d5db]"}`}
            >
              Nudges
              {location.pathname.includes("nudges") && (
                <motion.div layoutId="nav-indicator" className="absolute bottom-0 left-4 right-4 h-[3px] bg-white rounded-t-md" />
              )}
            </button>
          </div>
        </div>

        {/* Middle Section: Centered Search */}
        <div className="flex-1 flex justify-center px-8" ref={dropdownRef}>
          <form onSubmit={handleSearch} className="relative flex w-full max-w-2xl items-center group">
            <Search className="absolute left-3 h-4 w-4 text-text-muted group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => { if (search.trim()) setShowDropdown(true); }}
              placeholder="Search stocks..."
              className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-text-bold placeholder-text-muted outline-none focus:ring-2 focus:ring-accent focus:border-transparent focus:bg-white/10 transition-all duration-300 font-sans"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 h-4 w-4 text-accent animate-spin" />
            )}
            
            {showDropdown && search.trim() && (
              <div className="absolute top-12 left-0 w-full bg-[#121212]/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {suggestions.length > 0 ? (
                  <div className="flex flex-col">
                    {suggestions.map((s, i) => (
                      <div 
                        key={i} 
                        onClick={() => handleSelect(s.symbol)}
                        className="flex justify-between items-center px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                      >
                         <span className="font-semibold text-text-bold truncate mr-4 text-sm">{s.name}</span>
                         <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded shrink-0">{s.symbol.replace('.NS', '').replace('.BO','')}</span>
                      </div>
                    ))}
                  </div>
                ) : !isSearching ? (
                  <div className="px-4 py-4 text-sm text-text-muted text-center">No results found for "{search}"</div>
                ) : null}
              </div>
            )}
          </form>
        </div>

        {/* Right Section: Icons */}
        <div className="flex items-center justify-end gap-5 text-text-muted shrink-0">
          <button className="hover:text-accent hover:scale-110 active:scale-95 transition-all duration-300">
             <Bell className="h-5 w-5" />
          </button>
          <button className="hover:text-accent hover:scale-110 active:scale-95 transition-all duration-300">
             <Settings className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 overflow-hidden rounded-xl bg-bg-surface border border-white/10 cursor-pointer hover:border-accent transition-all duration-300 active:scale-95">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>

      </div>
    </nav>
  );
}
