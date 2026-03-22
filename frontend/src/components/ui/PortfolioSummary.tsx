import ReactApexChart from "react-apexcharts";
import { PieChart, TrendingUp, DollarSign, Target, Activity } from "lucide-react";

interface PortfolioSummaryProps {
  summary: any;
  holdings: any[];
}

export function PortfolioSummary({ summary, holdings }: PortfolioSummaryProps) {
  if (!summary || !holdings) return null;

  // Group into Top 4 + "Others" for cleaner UI
  const sorted = [...holdings].sort((a, b) => b.holding_context.portfolio_weight_pct - a.holding_context.portfolio_weight_pct);
  const top4 = sorted.slice(0, 4);
  const rawOthersWeight = sorted.slice(4).reduce((acc, h) => acc + h.holding_context.portfolio_weight_pct, 0);
  
  const displayHoldings = [...top4];
  if (rawOthersWeight > 0.01) {
    displayHoldings.push({
      symbol: "Others",
      holding_context: { portfolio_weight_pct: parseFloat(rawOthersWeight.toFixed(2)) }
    });
  }

  const chartSeries = displayHoldings.map((h: any) => h.holding_context.portfolio_weight_pct);
  const chartLabels = displayHoldings.map((h: any) => h.symbol);

  const options: any = {
    chart: { type: 'donut', background: 'transparent' },
    labels: chartLabels,
    // Using design system colors: Accent (Mint), Indigo (Info), Blue (Secondary), Emerald (Success), Red (Danger)
    colors: ['#50ffa7', '#818cf8', '#38bdf8', '#10b981', '#e13451'],
    stroke: { show: false },
    legend: { show: false },
    dataLabels: { enabled: false },
    tooltip: { 
        theme: 'dark',
        y: { formatter: (val: number) => `${val.toFixed(2)}%` }
    },
    plotOptions: {
        pie: {
            donut: {
                size: '75%',
                labels: {
                    show: true,
                    name: { show: true, fontSize: '10px', color: '#666', fontWeight: 'bold' },
                    value: { 
                        show: true, 
                        fontSize: '16px', 
                        color: '#fff', 
                        fontWeight: 'black',
                        formatter: (val: any) => {
                            const num = typeof val === 'string' ? parseFloat(val) : val;
                            return `${num.toFixed(1)}%`;
                        }
                    },
                    total: { 
                        show: true, 
                        label: 'TOTAL', 
                        color: '#444', 
                        fontSize: '9px', 
                        fontWeight: 'black',
                        formatter: (w: any) => {
                            const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                            return `${total.toFixed(0)}%`;
                        }
                    }
                }
            }
        }
    }
  };

  return (
    <div className="w-full bg-[#121212]/50 border border-white/5 rounded-[2rem] p-6 mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/10 shadow-lg shadow-accent/5">
            <PieChart className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h4 className="text-[16px] font-black text-white leading-tight">Portfolio Analysis</h4>
            <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    summary.health === 'Strong' ? 'bg-[#10b981]/10 text-[#10b981]' : 
                    summary.health === 'Fair' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#e13451]/10 text-[#e13451]'
                }`}>
                    {summary.health} HEALTH
                </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Live Value</span>
              </div>
              <p className="text-lg font-black text-white leading-tight">₹{summary.total_value_live.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all hover:bg-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                  {summary.total_pnl >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-500/50" /> : <Activity className="w-3.5 h-3.5 text-red-500/50" />}
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">P&L Profit</span>
              </div>
              <p className={`text-lg font-black leading-tight ${summary.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.total_pnl >= 0 ? '+' : ''}₹{summary.total_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
          </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 pt-4">
          <div className="w-48 h-48 relative shrink-0">
              <ReactApexChart options={options} series={chartSeries} type="donut" height="100%" />
          </div>
          <div className="flex-1 w-full space-y-4">
              <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-white/20" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Weighting Metrics</span>
              </div>
              {displayHoldings.map((h: any, i: number) => (
                  <div key={h.symbol} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: options.colors[i] }} />
                          <span className="text-[13px] font-black text-white group-hover:text-accent transition-colors">{h.symbol}</span>
                      </div>
                      <div className="flex items-center gap-4">
                           <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-accent/50 rounded-full" style={{ width: `${h.holding_context.portfolio_weight_pct}%`, backgroundColor: options.colors[i] }} />
                           </div>
                           <span className="text-[11px] font-black text-white/40 w-10 text-right">{h.holding_context.portfolio_weight_pct}%</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex gap-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Win Rate</span>
                    <span className="text-[13px] font-black text-white">{summary.win_rate}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Efficiency</span>
                    <span className="text-[13px] font-black text-green-500/80">{summary.working_capital_pct}%</span>
                </div>
            </div>
            <button 
                onClick={() => window.open('/insights', '_self')}
                className="px-6 py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-2xl text-[10px] font-black text-accent uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-accent/5"
            >
                Deep Report
            </button>
      </div>
    </div>
  );
}
