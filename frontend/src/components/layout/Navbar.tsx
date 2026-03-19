import { Search, Bell, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/stock/${search.trim().toUpperCase()}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border-main bg-bg-main/90 px-6 backdrop-blur-md">
      <div className="flex items-center gap-8 mx-auto w-full max-w-5xl">
        <div 
          className="flex cursor-pointer items-center gap-2" 
          onClick={() => navigate("/")}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#aa3bff] to-[#c084fc]">
            <span className="font-bold text-white">E</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-text-bold">ETMarkets</span>
        </div>

        {/* Separated Nudges and Holdings navigation */}
        <div className="hidden ml-8 space-x-6 md:flex">
          <button 
            onClick={() => navigate("/holdings")} 
            className={`text-sm tracking-wide transition-colors font-medium ${location.pathname.includes("holdings") ? "text-text-bold" : "text-text-muted hover:text-text-bold"}`}
          >
            Holdings
          </button>
          <button 
            onClick={() => navigate("/nudges")} 
            className={`text-sm tracking-wide transition-colors font-medium ${location.pathname.includes("nudges") ? "text-text-bold" : "text-text-muted hover:text-text-bold"}`}
          >
            Nudges
          </button>
        </div>

        <div className="flex-1" />

        <form onSubmit={handleSearch} className="relative flex w-full max-w-xs items-center mr-6">
          <Search className="absolute left-3 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stocks..."
            className="h-9 w-full rounded-md border border-border-main bg-bg-surface pl-9 pr-4 text-sm text-text-bold placeholder-text-muted outline-none focus:border-[#c084fc] transition-colors"
          />
        </form>

        <div className="flex items-center gap-4 text-text-muted">
          <button className="hover:text-text-bold transition-colors"><Bell className="h-5 w-5" /></button>
          <button className="hover:text-text-bold transition-colors"><Settings className="h-5 w-5" /></button>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-bg-surface border border-border-main">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="User" />
          </div>
        </div>
      </div>
    </nav>
  );
}
