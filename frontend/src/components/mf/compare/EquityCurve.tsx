import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface EquityCurveProps {
  data: any[];
  funds: any[];
}

export function EquityCurve({ data, funds }: EquityCurveProps) {
  if (!data || data.length === 0) return null;

  const colors = ['#50ffa7', '#818cf8', '#fbbf24', '#f472b6', '#38bdf8'];

  return (
    <div className="bg-bg-surface border border-border-main rounded-xl p-6 space-y-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Growth Intelligence</h3>
          <h2 className="text-xl font-black text-text-bold tracking-tighter">Equity Curve</h2>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Base Investment</p>
          <p className="text-sm font-black text-text-bold">₹10,000</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {funds.map((_, i) => (
                <linearGradient key={i} id={`colorFund${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i]} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={colors[i]} stopOpacity={0}/>
                </linearGradient>
              ))}
              <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.05}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="date" 
              hide={true}
            />
            <YAxis 
              hide={true}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#121212', 
                border: '1px solid #222', 
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700'
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              itemStyle={{ padding: '2px 0' }}
              formatter={(value: any) => [`₹${Math.round(value).toLocaleString()}`, '']}
            />
            {funds.map((f, i) => (
              <Area
                key={i}
                type="monotone"
                dataKey={`fund_${i}`}
                name={f.scheme_name.split('-')[0]}
                stroke={colors[i]}
                fillOpacity={1}
                fill={`url(#colorFund${i})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
            <Area
              type="monotone"
              dataKey="benchmark"
              name="NIFTY 50"
              stroke="#ffffff"
              fillOpacity={1}
              fill="url(#colorBench)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.3}
            />
            <Legend 
               verticalAlign="top" 
               align="right"
               wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
