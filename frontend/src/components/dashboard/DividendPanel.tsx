import { Calendar, CircleDollarSign } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";

interface HistoricalDividend {
  date: string;
  amount: number;
}

interface DividendData {
  ex_dividend_date: string | null;
  forward_dividend: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  historical_dividends: HistoricalDividend[];
}

export function DividendPanel({ data }: { data: DividendData | null }) {
  const loading = !data;
  const history = data?.historical_dividends || [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-black text-text-bold mb-3 flex items-center gap-2">
        Corporate Actions
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yield Card */}
        <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all p-5 rounded-xl">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-black mb-2 flex items-center gap-1.5">
            <CircleDollarSign className="w-3 h-3" /> Dividend Yield
          </p>
          <p className="text-2xl font-bold text-text-bold">
            {loading ? (
              <span className="animate-pulse text-white/10">---</span>
            ) : (
              <AnimatedNumber value={(data.dividend_yield || 0) * 100} suffix="%" decimals={2} />
            )}
          </p>
        </div>

        {/* Ex-Date Card */}
        <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all p-5 rounded-xl">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-black mb-2 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> Ex-Dividend Date
          </p>
          <p className="text-xl font-bold text-text-bold">
            {loading ? (
              <span className="animate-pulse text-white/10">---</span>
            ) : (
              data.ex_dividend_date || "N/A"
            )}
          </p>
        </div>

        {/* Forward Amount Card */}
        <div className="bg-bg-surface border border-border-main hover:border-[#333] transition-all p-5 rounded-xl">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] font-black mb-2 flex items-center gap-1.5">
            <CircleDollarSign className="w-3 h-3" /> Forward Dividend
          </p>
          <p className="text-2xl font-bold text-text-bold">
            {loading ? (
              <span className="animate-pulse text-white/10">---</span>
            ) : (
              <AnimatedNumber value={data.forward_dividend || 0} prefix="₹" decimals={2} />
            )}
          </p>
        </div>
      </div>

      {/* Historical Dividends Table */}
      <div className="bg-bg-surface border border-border-main rounded-xl overflow-hidden mt-6">
        <h3 className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-muted border-b border-border-main bg-white/[0.02]">
          Dividend History
        </h3>
        <div className="max-h-[300px] overflow-y-auto scrollbar-none">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border-main">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 animate-pulse bg-white/5 h-12" />
                    <td className="px-6 py-4 animate-pulse bg-white/5 h-12" />
                  </tr>
                ))
              ) : history.length > 0 ? (
                history.map((div, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-text-muted">
                      {div.date}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-text-bold">
                      ₹{div.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-text-muted italic">
                    No recent dividend history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
