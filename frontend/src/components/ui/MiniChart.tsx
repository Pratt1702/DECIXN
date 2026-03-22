import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface MiniChartProps {
  data: { price: number }[];
  color?: string;
}

export function MiniChart({ data, color = "#10b981" }: MiniChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-16 w-full mt-2 opacity-80 hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
