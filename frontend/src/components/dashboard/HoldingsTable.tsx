import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HoldingsTable({ holdings }: { holdings: any[] }) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [sortField, setSortField] = useState(() => localStorage.getItem("holdings_table_sort_field") || "current_value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => (localStorage.getItem("holdings_table_sort_order") as "asc" | "desc") || "desc");
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("holdings_table_sort_field", sortField);
    localStorage.setItem("holdings_table_sort_order", sortOrder);
  }, [sortField, sortOrder]);

  useEffect(() => {
    if (tableRef.current && holdings.length > 0) {
      const rows = tableRef.current.children;
      gsap.fromTo(rows, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" });
    }
  }, [holdings, sortField, sortOrder]);

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortField === "symbol") {
      return sortOrder === "asc"
        ? (a.symbol as string).localeCompare(b.symbol)
        : (b.symbol as string).localeCompare(a.symbol);
    }
    const valA = a.holding_context[sortField] ?? 0;
    const valB = b.holding_context[sortField] ?? 0;
    return sortOrder === "desc" ? (valA < valB ? 1 : -1) : valA > valB ? 1 : -1;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder(field === "symbol" ? "asc" : "desc"); }
  };

  const COLUMNS = [
    { label: "Asset Name", field: "symbol" },
    { label: "Qty", field: "quantity" },
    { label: "Avg Cost", field: "avg_cost" },
    { label: "Current Val", field: "current_value" },
    { label: "Returns %", field: "pnl_pct" },
  ];

  return (
    <div className="bg-bg-surface border border-border-main rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-white/[0.02] border-b border-white/5">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className="px-8 py-5 text-[10px] text-text-muted font-black uppercase tracking-[0.2em] cursor-pointer hover:text-accent transition-colors group whitespace-nowrap"
                onClick={() => handleSort(col.field)}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {sortField === col.field && (
                    <span className="text-accent animate-pulse-subtle">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tableRef} className="divide-y divide-white/[0.03]">
          {sortedHoldings.map((h, i) => {
            const ctx = h.holding_context;
            const isPos = (ctx.current_pnl ?? 0) >= 0;
            const isMF = h.symbol.length >= 12 && h.symbol.slice(0, 2).match(/[A-Z]/i);
            const decision = h.data?.portfolio_decision || (isPos ? "HOLD" : "WATCH");

            return (
              <tr
                key={i}
                onClick={() => {
                  const cleanTicker = h.symbol.replace(".NS", "").replace(".BO", "");
                  if (isMF) {
                    navigate(`/mutual-funds/details/${cleanTicker}`);
                  } else {
                    navigate(`/stocks/details/${cleanTicker}`);
                  }
                }}
                className="hover:bg-white/[0.04] transition-all cursor-pointer group/row"
              >
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-text-bold text-base tracking-tighter group-hover/row:text-accent transition-colors line-clamp-1 max-w-[280px]" title={h.data?.companyName || h.symbol}>
                        {h.data?.companyName || h.symbol.replace(".NS", "").replace(".BO", "")}
                      </span>
                      {isMF ? (
                        <span className="text-[9px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20 uppercase tracking-widest">MF</span>
                      ) : (
                        <span className="text-[9px] font-black bg-white/5 text-text-muted px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">Stock</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        decision.includes('SELL') ? 'bg-danger/10 text-danger' : 
                        decision.includes('BUY') || decision.includes('RIDE') ? 'bg-success/10 text-success' : 
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {decision}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-text-muted font-bold tabular-nums text-sm">
                   {ctx.quantity.toLocaleString()}
                </td>
                <td className="px-8 py-6 text-text-muted font-bold tabular-nums text-sm">
                  ₹{ctx.avg_cost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-8 py-6">
                   <div className="flex flex-col">
                      <span className="text-text-bold font-black tabular-nums text-sm">
                        ₹{ctx.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] font-bold tabular-nums ${isPos ? 'text-success/70' : 'text-danger/70'}`}>
                        {isPos ? '+' : ''}₹{ctx.current_pnl?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                   </div>
                </td>
                <td className={`px-8 py-6 font-black tabular-nums text-sm ${isPos ? "text-success" : "text-danger"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${isPos ? 'bg-success/10' : 'bg-danger/10'}`}>
                      {isPos ? <ArrowUpRight className="h-4 w-4 stroke-[3]" /> : <ArrowDownRight className="h-4 w-4 stroke-[3]" />}
                    </div>
                    {isPos ? '+' : ''}{ctx.pnl_pct?.toFixed(2)}%
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
