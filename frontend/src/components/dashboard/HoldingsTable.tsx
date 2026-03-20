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
    <div className="overflow-x-auto rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-2xl hover:border-white/10 transition-all duration-700">
      <table className="w-full text-left text-sm text-text-bold border-collapse">
        <thead className="border-b border-white/5 bg-white/[0.03] text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold font-heading">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className="px-6 py-6 cursor-pointer hover:text-white transition-colors group whitespace-nowrap"
                onClick={() => handleSort(col.field)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  <ArrowUpDown className={`h-3 w-3 transition-colors ${sortField === col.field ? "text-white/80" : "text-white/10 group-hover:text-white/30"}`} />
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
                className="hover:bg-white/[0.04] transition-all group cursor-pointer"
              >
                <td className="px-6 py-5 font-bold text-white tracking-tight">{h.symbol}</td>
                <td className="px-6 py-5 text-white/70 font-medium tabular-nums">{ctx.quantity}</td>
                <td className="px-6 py-5 text-white/70 font-medium tabular-nums tracking-tighter">₹{ctx.avg_cost.toLocaleString("en-IN")}</td>
                <td className="px-6 py-5 text-white font-bold tabular-nums tracking-tighter">₹{ctx.current_value.toLocaleString("en-IN")}</td>
                <td className={`px-6 py-5 font-black tabular-nums ${isPos ? "text-success" : "text-danger"}`}>
                  <div className="flex items-center gap-1.5">
                    {isPos ? <ArrowUpRight className="h-4 w-4 stroke-[3]" /> : <ArrowDownRight className="h-4 w-4 stroke-[3]" />}
                    {Math.abs(ctx.pnl_pct).toFixed(2)}%
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
