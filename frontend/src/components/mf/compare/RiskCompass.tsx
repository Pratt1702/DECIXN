import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

interface RiskCompassProps {
  funds: any[];
}

export function RiskCompass({ funds }: RiskCompassProps) {
  const data = funds.map((f) => ({
    name: f.scheme_name.split('-')[0],
    x: f.metrics.volatility,
    y: f.metrics.alpha,
    z: 100,
    score: f.advisor_score
  }));

  return (
    <div className="bg-bg-surface border border-border-main rounded-[2rem] p-8 space-y-6 shadow-2xl">
      <div className="space-y-1">
        <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Efficiency Frontier</h3>
        <h2 className="text-xl font-black text-text-bold uppercase italic tracking-tighter">Risk-Return Compass</h2>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Volatility" 
              unit="%" 
              stroke="#ffffff40" 
              fontSize={10}
              label={{ value: 'Volatility (Risk)', position: 'insideBottom', offset: -10, fill: '#666', fontSize: 9, fontWeight: 900 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Alpha" 
              unit="%" 
              stroke="#ffffff40" 
              fontSize={10}
              label={{ value: 'Alpha (Return)', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 9, fontWeight: 900 }}
            />
            <ZAxis type="number" dataKey="z" range={[100, 100]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                backgroundColor: '#121212', 
                border: '1px solid #222', 
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '900'
              }}
            />
            <Scatter name="Funds" data={data}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.y > 0 ? '#50ffa7' : '#e13451'} />
              ))}
              <LabelList dataKey="name" position="top" fill="#ffffff" style={{ fontSize: '9px', fontWeight: '900' }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-white/5">
         <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">
            Top-Left quadrant represents optimal efficiency (High Alpha, Low Volatility).
         </p>
      </div>
    </div>
  );
}
