import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, ArrowDownRight, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HoldingsTable({ holdings }: { holdings: any[] }) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [sortField, setSortField] = useState('current_value');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const navigate = useNavigate();

  useEffect(() => {
    if (tableRef.current && holdings.length > 0) {
      const rows = tableRef.current.children;
      gsap.fromTo(rows, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [holdings, sortField, sortOrder]);

  const sortedHoldings = [...holdings].sort((a, b) => {
    let valA = a.holding_context[sortField];
    let valB = b.holding_context[sortField];
    if (valA === undefined) valA = 0;
    if (valB === undefined) valB = 0;
    
    if (sortOrder === 'desc') return valA < valB ? 1 : -1;
    return valA > valB ? 1 : -1;
  });

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-2xl border border-white/5 bg-[#121212]/40 backdrop-blur-xl shadow-lg hover:border-accent/20 transition-all duration-500">
      <table className="w-full text-left text-sm text-text-bold">
        <thead className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-text-muted font-heading">
          <tr>
            <th className="px-6 py-4">Company</th>
            <th className="px-6 py-4 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort('quantity')}>Qty <ArrowUpDown className="inline h-3 w-3 ml-1"/></th>
            <th className="px-6 py-4 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort('avg_cost')}>Avg Cost <ArrowUpDown className="inline h-3 w-3 ml-1"/></th>
            <th className="px-6 py-4 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort('current_value')}>Current Val <ArrowUpDown className="inline h-3 w-3 ml-1"/></th>
            <th className="px-6 py-4 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort('pnl_pct')}>Returns % <ArrowUpDown className="inline h-3 w-3 ml-1"/></th>
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
                className="hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4 font-medium">{h.symbol}</td>
                <td className="px-6 py-4">{ctx.quantity}</td>
                <td className="px-6 py-4">₹{ctx.avg_cost.toLocaleString('en-IN')}</td>
                <td className="px-6 py-4 font-medium">₹{ctx.current_value.toLocaleString('en-IN')}</td>
                <td className={`px-6 py-4 flex items-center gap-1.5 font-medium ${isPos ? 'text-success' : 'text-danger'}`}>
                  {isPos ? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownRight className="h-4 w-4"/>}
                  {Math.abs(ctx.pnl_pct).toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
