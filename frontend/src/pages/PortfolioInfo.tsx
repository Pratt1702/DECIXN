import { motion } from "framer-motion";
import {
  ShieldCheck,
  Database,
  AlertCircle,
  Lock,
  Zap,
  Table as TableIcon,
  BrainCircuit,
} from "lucide-react";

export function PortfolioInfo() {
  return (
    <div className="min-h-screen bg-bg-main text-text-bold font-['Noto_Sans'] pb-20 overflow-x-hidden">
      {/* ── BACKGROUND ACCENTS ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/3 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10 pt-20">
        {/* ── HEADER ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest mb-6">
            <ShieldCheck size={12} /> Privacy First Data Handling
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Your Data Is Yours. <br />
            <span className="text-accent">Period.</span>
          </h1>
          <p className="text-lg text-text-muted font-medium max-w-2xl mx-auto leading-relaxed">
            We've built this intelligence engine with zero compromises on
            privacy. A standard platform account is required for access, but you{" "}
            <strong>NEVER need to connect your Demat accounts</strong>. All your
            data stays stored <strong>locally in your browser.</strong>
          </p>
        </motion.header>

        {/* ── SECURITY CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {[
            {
              icon: <Database className="text-accent" />,
              title: "100% Local Storage",
              description:
                "Your portfolio data is stored only in your browser's LocalStorage and IndexedDB. Nothing is ever uploaded to our servers.",
            },
            {
              icon: <Lock className="text-accent" />,
              title: "End-to-End Secure",
              description:
                "No cloud databases, no tracking, no backend persistence. Your financial footprints disappear when you clear your browser data.",
            },
            {
              icon: <Zap className="text-accent" />,
              title: "Demat-Free Access",
              description:
                "While a standard platform account is required to access our tools, you never need to connect or link your Demat platform accounts (like Zerodha or Groww). Everything works via secure CSV uploads.",
            },
            {
              icon: <BrainCircuit className="text-accent" />,
              title: "AI Analysis Disclosure",
              description:
                "While your data is stored locally, our AI models (including Gemini) will process your symbols and costs to provide insights. This happens in real-time.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/5 border border-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-xl font-black mb-3 italic tracking-tight uppercase">
                {item.title}
              </h3>
              <p className="text-text-muted font-medium leading-relaxed text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── DATA FORMAT SECTION ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-center gap-3 mb-8">
            <TableIcon className="text-accent" size={24} />
            <h2 className="text-3xl font-black tracking-tight uppercase italic">
              Required Format
            </h2>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden p-8">
            <p className="text-text-muted font-medium mb-8 leading-relaxed">
              We provide native support for{" "}
              <strong className="text-white">Zerodha Kite</strong> CSV exports.
              Support for Groww, Upstox, and ICICI Direct is coming soon. For
              any other platform, please format your CSV as follows:
            </p>

            <div className="overflow-x-auto mb-8 bg-bg-surface border border-border-main rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/[0.05] border-b border-white/10">
                  <tr className="text-[14px] font-black uppercase tracking-[0.1em] text-text-bold">
                    <th className="px-6 py-4 border-r border-white/5">
                      Symbol
                      <span className="block mt-1 text-[10px] font-medium opacity-50 tracking-widest lowercase italic">
                        or Instrument, Ticker
                      </span>
                    </th>
                    <th className="px-6 py-4 border-r border-white/5">
                      Quantity
                      <span className="block mt-1 text-[10px] font-medium opacity-50 tracking-widest lowercase italic">
                        or Qty, Shares
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      Avg Cost
                      <span className="block mt-1 text-[10px] font-medium opacity-50 tracking-widest lowercase italic">
                        or Buy Price, Cost
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  <tr>
                    <td className="px-6 py-6 border-r border-white/5 font-black text-text-bold tracking-tight">
                      RELIANCE
                    </td>
                    <td className="px-6 py-6 border-r border-white/5 text-text-muted font-bold tabular-nums">
                      10
                    </td>
                    <td className="px-6 py-6 text-text-muted font-bold tabular-nums">
                      2540.20
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-6 border-r border-white/5 font-black text-text-bold tracking-tight">
                      TATASTEEL
                    </td>
                    <td className="px-6 py-6 border-r border-white/5 text-text-muted font-bold tabular-nums">
                      100
                    </td>
                    <td className="px-6 py-6 text-text-muted font-bold tabular-nums">
                      145.50
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-6 border-r border-white/5 font-black text-text-bold tracking-tight">
                      TMPV
                    </td>
                    <td className="px-6 py-6 border-r border-white/5 text-text-muted font-bold tabular-nums">
                      500
                    </td>
                    <td className="px-6 py-6 text-text-muted font-bold tabular-nums">
                      460.00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3">
              <AlertCircle className="text-accent shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-text-muted font-medium leading-relaxed italic">
                Note: Our parser uses fuzzy matching for headers. As long as
                your column names contain "Symbol", "Qty", or "Cost", they
                should be identified correctly.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── PRIVACY NOTICE ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-accent/10 border border-accent/20 rounded-3xl p-10 relative overflow-hidden text-center"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>

          <h3 className="text-2xl font-black mb-4 tracking-tight uppercase italic relative z-10">
            Secure · Private · Local
          </h3>
          <p className="text-text-muted font-medium max-w-2xl mx-auto italic relative z-10">
            "Your financial data is sensitive. We believe software should help
            you manage it without harvesting it. No trackers, no cookies, no
            cloud syncing."
          </p>

          <button
            onClick={() => window.close()}
            className="mt-8 px-8 py-3 rounded-xl bg-accent text-bg-main font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform hover:shadow-[0_0_30px_-5px_var(--color-accent)] cursor-pointer"
          >
            Got it, take me back
          </button>
        </motion.div>
      </div>
    </div>
  );
}
