import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  Table as TableIcon,
  Info,
  ArrowRight,
  Target
} from "lucide-react";

export function MFPortfolioInfo() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-text-bold pb-20 overflow-x-hidden">
      {/* ── BACKGROUND ACCENTS ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/3 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 pt-20">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-6">
            <ShieldCheck size={12} /> Institutional Ingestion Protocol
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Mutual Fund <br />
            <span className="text-accent italic">Alpha Ingestion</span>
          </h1>
          <p className="text-lg text-text-muted font-medium max-w-2xl mx-auto leading-relaxed">
            Standardizing your mutual fund holdings for deep CAGR and risk analysis. 
            Connect your <strong className="text-white font-black italic">Zerodha Kite</strong> outputs to unlock institutional-grade insights.
          </p>
        </motion.header>

        {/* ── FORMAT SECTION ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-8">
            <TableIcon className="text-accent" size={24} />
            <h2 className="text-3xl font-black tracking-tight uppercase italic flex items-center gap-4">
              Kite Excel Standard
              <div className="h-px flex-1 bg-white/10" />
            </h2>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden p-8 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Target size={120} />
            </div>

            <p className="text-text-muted font-medium mb-10 leading-relaxed text-sm">
              We natively support the <strong className="text-white">Mutual Fund Export</strong> from Zerodha Kite. 
              The system identifies the following core markers to calculate your portfolio DNA:
            </p>

            <div className="overflow-x-auto mb-10 bg-[#0c0c0c] border border-white/5 rounded-[2rem] shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.03] border-b border-white/5">
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    <th className="px-8 py-5 border-r border-white/5">Symbol</th>
                    <th className="px-8 py-5 border-r border-white/5">ISIN</th>
                    <th className="px-8 py-5 border-r border-white/5">Quantity Available</th>
                    <th className="px-8 py-5">Average Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs">
                  {[
                    { sym: "Quant Small Cap", isin: "INF966L01689", qty: "108.99", avg: "275.23" },
                    { sym: "HDFC Flexi Cap", isin: "INF179K01UT0", qty: "9.91", avg: "2168.27" },
                    { sym: "SBI Contra", isin: "INF200K01RA0", qty: "18.82", avg: "424.89" }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-8 py-6 border-r border-white/5 font-black text-text-bold italic">{row.sym}</td>
                      <td className="px-8 py-6 border-r border-white/5 text-accent font-mono font-bold tracking-widest">{row.isin}</td>
                      <td className="px-8 py-6 border-r border-white/5 text-text-muted font-black tabular-nums">{row.qty}</td>
                      <td className="px-8 py-6 text-text-muted font-black tabular-nums">₹{row.avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
                  <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-bold mb-1">Deep Mapping</h4>
                    <p className="text-[11px] text-text-muted font-medium leading-relaxed">
                      ISINs are automatically mapped to historical NAV databases for high-resolution CAGR analysis.
                    </p>
                  </div>
               </div>
               <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-text-muted">
                    <Info size={18} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text-bold mb-1">Local Ingestion</h4>
                    <p className="text-[11px] text-text-muted font-medium leading-relaxed">
                      Data is processed and stored locally on your machine. We do not transmit your NAV history to external servers.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        </motion.section>

        {/* ── CTA SECTION ── */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className="bg-accent/10 border border-accent/20 rounded-[3rem] p-12 text-center relative overflow-hidden group"
        >
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
           <h3 className="text-3xl font-black tracking-tighter italic uppercase text-text-bold mb-4">Ready for Ingestion?</h3>
           <p className="text-text-muted font-medium text-sm max-w-lg mx-auto mb-10 leading-relaxed">
              Ensure your file is named <span className="text-text-bold font-black">kite_mutual_funds.xlsx</span> and placed in your portfolio folder to trigger automatic intelligence mapping.
           </p>
           
           <button 
             onClick={() => window.close()}
             className="px-10 py-4 bg-accent rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:brightness-110 shadow-xl shadow-accent/20 transition-all flex items-center gap-3 mx-auto"
           >
             Return to Portfolio <ArrowRight size={14} />
           </button>
        </motion.div>
      </div>
    </div>
  );
}
