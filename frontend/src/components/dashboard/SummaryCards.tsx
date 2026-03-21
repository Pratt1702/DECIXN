import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react";
import { AnimatedNumber } from "../ui/AnimatedNumber";

interface SummaryProps {
  invested: number;
  current: number;
  pnl: number;
  workingCapitalPct?: number;
  trappedCapitalPct?: number;
}

export function SummaryCards({
  invested,
  current,
  pnl,
  workingCapitalPct,
  trappedCapitalPct,
}: SummaryProps) {
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const isPositive = pnl >= 0;

  const cards = [
    {
      label: "Current Value",
      value: current,
      prefix: "₹",
      suffix: "",
      decimals: 0,
      showPlusSign: false,
      color: "text-text-bold",
      icon: PieChart,
      delay: 0.1,
    },
    {
      label: "Invested Value",
      value: invested,
      prefix: "₹",
      suffix: "",
      decimals: 0,
      showPlusSign: false,
      color: "text-text-bold",
      icon: Wallet,
      delay: 0.15,
    },
    {
      label: "Total Returns",
      value: pnl,
      prefix: "₹",
      suffix: "",
      decimals: 0,
      showPlusSign: true,
      color: isPositive ? "text-success" : "text-danger",
      icon: isPositive ? TrendingUp : TrendingDown,
      delay: 0.2,
    },
    {
      label: "Overall Returns",
      value: pnlPct,
      prefix: "",
      suffix: "%",
      decimals: 2,
      showPlusSign: true,
      color: isPositive ? "text-success" : "text-danger",
      icon: isPositive ? TrendingUp : TrendingDown,
      delay: 0.25,
    },
  ];

  return (
    <div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: card.delay, duration: 0.3, ease: "easeOut" }}
              className="bg-bg-surface border border-border-main rounded-xl p-5 hover:border-[#333] transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] group-hover:text-text-bold transition-colors">
                  {card.label}
                </span>
                <Icon
                  size={14}
                  className="text-text-muted transition-colors group-hover:text-text-bold"
                />
              </div>
              <AnimatedNumber
                value={card.value}
                prefix={card.prefix}
                suffix={card.suffix}
                decimals={card.decimals}
                showPlusSign={card.showPlusSign}
                className={`block text-2xl font-black leading-none tracking-tight ${card.color}`}
              />
            </motion.div>
          );
        })}
      </div>
      {workingCapitalPct !== undefined && trappedCapitalPct !== undefined && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex items-center gap-6 mt-4 text-xs font-black bg-bg-surface border border-border-main p-4 rounded-xl justify-left tracking-widest uppercase"
        >
          <span className="text-text-muted">Capital Efficiency:</span>
          <span className="text-success">{workingCapitalPct}% Working</span>
          <span className="text-text-muted/30">|</span>
          <span className="text-danger">{trappedCapitalPct}% Trapped</span>
        </motion.div>
      )}
    </div>
  );
}
