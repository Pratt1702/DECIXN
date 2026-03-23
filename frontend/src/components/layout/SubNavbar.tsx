import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const STOCK_LINKS = [
  { label: "Explore", path: "/stocks/explore" },
  { label: "Holdings", path: "/stocks/holdings" },
  { label: "Insights", path: "/stocks/insights" },
  { label: "Watchlist", path: "/stocks/watchlist" },
  { label: "Alerts", path: "/stocks/alerts" },
];

const MF_LINKS = [
  { label: "Explore", path: "/mutual-funds/explore" },
  { label: "Investments", path: "/mutual-funds/holdings" },
  { label: "Watchlist", path: "/mutual-funds/watchlist" },
];

export function SubNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isStocks = location.pathname.startsWith("/stocks");
  const isMF = location.pathname.startsWith("/mutual-funds");

  const links = isStocks ? STOCK_LINKS : isMF ? MF_LINKS : [];

  if (links.length === 0) return null;

  return (
    <div className="w-full border-b border-white/5 bg-[#0a0a0a]/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-8">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`relative h-full flex items-center text-sm font-bold tracking-tight transition-colors ${
                isActive ? "text-white" : "text-text-muted hover:text-text-bold"
              }`}
            >
              {link.label}
              {isActive && (
                <motion.div
                  layoutId="subnav-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
