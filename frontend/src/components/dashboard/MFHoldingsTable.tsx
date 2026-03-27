import { ArrowUpRight, ArrowDownRight, Edit2, Trash2, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MFHoldingsTableProps {
  holdings: any[];
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: "asc" | "desc";
  onEdit?: (holding: any) => void;
  onDelete?: (id: string) => void;
}

export function MFHoldingsTable({ holdings, onSort, sortField, sortOrder, onEdit, onDelete }: MFHoldingsTableProps) {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden shadow-xl shadow-black/10 transition-all hover:border-white/5">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.03] bg-white/[0.02]">
            {[
              { label: "Scheme Name", field: "scheme_name" },
              { label: "Units", field: "quantity" },
              { label: "Avg NAV", field: "avg_cost" },
              { label: "Current NAV", field: "current_price" },
              { label: "Value", field: "current_value" },
              { label: "Returns", field: "pnl_pct" },
              { label: "", field: "actions" },
            ].map((col) => (
              <th
                key={col.label}
                className={`px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.15em] cursor-pointer hover:text-text-bold transition-colors whitespace-nowrap border-r border-white/5 last:border-r-0 ${
                    col.field === "actions" ? "text-center w-[1%]" : "text-left"
                }`}
                onClick={() => col.field !== "actions" && onSort(col.field)}
              >
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <span className="truncate">{col.label}</span>
                  {sortField === col.field && (
                    <span className="text-accent shrink-0 text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h: any, i: number) => {
            const ctx = h.holding_context;
            const isin = h.isin || ctx.isin || h.scheme_code;
            const isPos = ctx.current_pnl >= 0;
            const itemKey = h.id || isin || i.toString();
            return (
              <tr
                key={i}
                className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group"
                onClick={() => navigate(`/mutual-funds/details/${isin}`)}
              >
                <td className="px-6 py-5 border-r border-white/[0.03]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black text-text-bold tracking-tight group-hover:text-white transition-colors">
                      {h.scheme_name || h.symbol}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-left font-bold text-text-muted text-sm tabular-nums border-r border-white/[0.03]">
                  {ctx.quantity.toFixed(3)}
                </td>
                <td className="px-6 py-5 text-left font-black text-text-muted text-sm tabular-nums border-r border-white/[0.03]">
                  ₹{ctx.avg_cost?.toFixed(2)}
                </td>
                <td className="px-6 py-5 text-left font-black text-white text-sm tabular-nums border-r border-white/[0.03]">
                  ₹{ctx.current_price?.toFixed(2)}
                </td>
                <td className="px-6 py-5 text-left border-r border-white/[0.03]">
                  <div className="font-black text-text-bold text-sm tabular-nums">₹{ctx.current_value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </td>
                <td className="px-6 py-5 text-left font-black tabular-nums border-r border-white/[0.03]">
                  <div className={`flex items-center justify-start gap-1 text-sm ${isPos ? 'text-success' : 'text-danger'}`}>
                    {isPos ? <ArrowUpRight size={14} className="stroke-[3]" /> : <ArrowDownRight size={14} className="stroke-[3]" />}
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
                           initial={{ opacity: 0, scale: 0.95, y: i >= holdings.length - 2 ? 5 : -5 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95, y: i >= holdings.length - 2 ? 5 : -5 }}
                           onClick={(e) => e.stopPropagation()}
                           className={`absolute right-6 ${i >= holdings.length - 2 ? 'bottom-10' : 'top-10'} w-32 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-[70] overflow-hidden py-1`}
                         >
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEdit?.(h); setActiveMenu(null); }}
                              className="w-full px-4 py-2 text-left text-xs font-bold text-text-muted hover:text-accent hover:bg-white/5 flex items-center gap-2 transition-colors uppercase tracking-widest"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDelete?.(h.id); setActiveMenu(null); }}
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
