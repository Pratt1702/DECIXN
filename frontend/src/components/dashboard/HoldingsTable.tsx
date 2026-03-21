import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HoldingsTable({ holdings }: { holdings: any[] }) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [sortField, setSortField] = useState("current_value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  useEffect(() => {
    if (tableRef.current && holdings.length > 0) {
      const rows = tableRef.current.children;
      gsap.fromTo(rows, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger: 0.04, ease: "power1.out" });
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
    { label: "Company", field: "symbol" },
    { label: "Qty", field: "quantity" },
    { label: "Avg Cost", field: "avg_cost" },
    { label: "Current Val", field: "current_value" },
    { label: "Returns %", field: "pnl_pct" },
  ];

  return (
    <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden hover:border-[#333] transition-all duration-200">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-white/[0.03] border-b border-white/5">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className="px-6 py-4 text-[10px] text-text-muted font-black uppercase tracking-[0.15em] cursor-pointer hover:text-text-bold transition-colors group whitespace-nowrap"
                onClick={() => handleSort(col.field)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === col.field ? "text-text-muted" : "text-white/10 group-hover:text-white/30"}`} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tableRef} className="divide-y divide-white/5">
          {sortedHoldings.map((h, i) => {
            const ctx = h.holding_context;
            const isPos = ctx.current_pnl >= 0;
            return (
              <tr
                key={i}
                onClick={() => navigate(`/stock/${h.symbol}`)}
                className="hover:bg-white/[0.04] transition-all cursor-pointer group"
              >
                <td className="px-6 py-4 font-black text-text-bold tracking-tight">{h.symbol}</td>
                <td className="px-6 py-4 text-text-muted font-bold tabular-nums">{ctx.quantity}</td>
                <td className="px-6 py-4 text-text-muted font-bold tabular-nums">₹{ctx.avg_cost.toLocaleString("en-IN")}</td>
                <td className="px-6 py-4 text-text-bold font-black tabular-nums">₹{ctx.current_value.toLocaleString("en-IN")}</td>
                <td className={`px-6 py-4 font-black tabular-nums ${isPos ? "text-success" : "text-danger"}`}>
                  <div className="flex items-center gap-1.5">
                    {isPos ? <ArrowUpRight className="h-4 w-4 stroke-[3]" /> : <ArrowDownRight className="h-4 w-4 stroke-[3]" />}
                    {isPos ? '+' : ''}{ctx.pnl_pct.toFixed(2)}%
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
