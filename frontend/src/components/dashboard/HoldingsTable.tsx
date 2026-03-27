import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface HoldingsTableProps {
  holdings: any[];
  onEdit?: (holding: any) => void;
  onDelete?: (holdingId: string) => void;
  isManual?: boolean;
}

export function HoldingsTable({ holdings, onEdit, onDelete }: HoldingsTableProps) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [sortField, setSortField] = useState(() => localStorage.getItem("holdings_table_sort_field") || "current_value");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => (localStorage.getItem("holdings_table_sort_order") as "asc" | "desc") || "desc");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("holdings_table_sort_field", sortField);
    localStorage.setItem("holdings_table_sort_order", sortOrder);
  }, [sortField, sortOrder]);

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
    { label: "", field: "actions" },
  ];

  return (
    <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden hover:border-[#333] transition-all duration-200">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-white/[0.03] border-b border-white/5">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`px-6 py-4 text-[10px] text-text-muted font-black uppercase tracking-[0.15em] cursor-pointer hover:text-text-bold transition-colors group whitespace-nowrap ${col.field === 'actions' ? 'w-[1%] whitespace-nowrap' : ''}`}
                onClick={() => col.field !== 'actions' && handleSort(col.field)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {sortField === col.field && (
                    <span className="text-text-muted font-black">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tableRef} className="divide-y divide-white/5">
          {sortedHoldings.map((h, i) => {
            const ctx = h.holding_context;
            const isPos = ctx.current_pnl >= 0;
            const itemKey = h.id || h.symbol || i.toString();
            return (
              <tr
                key={i}
                onClick={() => {
                  const cleanTicker = h.symbol.replace(".NS", "").replace(".BO", "");
                  navigate(`/stocks/details/${cleanTicker}`);
                }}
                className="hover:bg-white/[0.04] transition-all cursor-pointer group"
              >
                <td className="px-6 py-4 font-black text-text-bold tracking-tight">
                  {h.symbol.replace(".NS", "").replace(".BO", "")}
                </td>
                <td className="px-6 py-4 text-text-muted font-bold tabular-nums">{ctx.quantity}</td>
                <td className="px-6 py-4 text-text-muted font-bold tabular-nums">₹{ctx.avg_cost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-text-bold font-black tabular-nums">₹{ctx.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={`px-6 py-4 font-black tabular-nums transition-colors ${isPos ? "text-success" : "text-danger"}`}>
                  <div className="flex items-center gap-1.5">
                    {isPos ? <ArrowUpRight className="h-4 w-4 stroke-[3]" /> : <ArrowDownRight className="h-4 w-4 stroke-[3]" />}
                    {isPos ? '+' : ''}{ctx.pnl_pct.toFixed(2)}%
                  </div>
                </td>
                <td className="px-6 py-4 w-[1%] whitespace-nowrap relative">
                   <div className="flex justify-start">
                     <button 
                       onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === itemKey ? null : itemKey); }}
                       className="p-1.5 rounded-md hover:bg-white/10 text-text-muted hover:text-text-bold transition-all cursor-pointer"
                     >
                       <MoreVertical size={16} />
                     </button>
                   </div>

                   <AnimatePresence>
                     {activeMenu === itemKey && (
                       <>
                         <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                         <motion.div
                           initial={{ opacity: 0, scale: 0.95, y: i >= sortedHoldings.length - 2 ? 5 : -5 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: i >= sortedHoldings.length - 2 ? 5 : -5 }}
                           onClick={(e) => e.stopPropagation()}
                           className={`absolute right-6 ${i >= sortedHoldings.length - 2 ? 'bottom-10' : 'top-10'} w-32 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-[70] overflow-hidden py-1`}
                         >
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEdit?.(h); setActiveMenu(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-text-muted hover:text-accent hover:bg-white/5 flex items-center gap-2 transition-colors uppercase tracking-widest"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDelete?.(h.id || h.symbol); setActiveMenu(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-text-muted hover:text-danger hover:bg-white/5 flex items-center gap-2 transition-colors uppercase tracking-widest"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                         </motion.div>
                       </>
                     )}
                   </AnimatePresence>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
