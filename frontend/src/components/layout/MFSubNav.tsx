import { Link, useLocation } from "react-router-dom";
import { List, Zap, Scale } from "lucide-react";

export function MFSubNav() {
  const location = useLocation();
  
  const tabs = [
    { name: "Portfolio", path: "/mutual-funds/holdings", icon: List },
    { name: "Insights", path: "/mutual-funds/insights", icon: Zap },
    { name: "Compare", path: "/mutual-funds/compare", icon: Scale },
  ];

  return (
    <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-xl border border-border-main w-fit mb-8">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? "bg-accent text-white shadow-lg shadow-accent/20"
                : "text-text-muted hover:text-text-bold hover:bg-white/5"
            }`}
          >
            <Icon size={14} className={isActive ? "text-white" : "text-text-muted"} />
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
