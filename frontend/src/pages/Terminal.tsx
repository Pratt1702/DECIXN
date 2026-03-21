import { useParams } from "react-router-dom";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

export function Terminal() {
  const { ticker } = useParams<{ ticker: string }>();

  // Strip .NS or .BO for TradingView
  const cleanTicker = (ticker || "").replace(".NS", "").replace(".BO", "");

  return (
    <div className="flex flex-col h-screen w-full bg-[#131722] overflow-hidden">
      <div className="flex-1 w-full h-full relative">
        <AdvancedRealTimeChart
          symbol={`BSE:${cleanTicker}`}
          theme="dark"
          autosize
          hide_side_toolbar={false}
          enable_publishing={false}
          allow_symbol_change={true}
          save_image={false}
          studies={[
            "Volume@tv-basicstudies",
            "MACD@tv-basicstudies",
            "RSI@tv-basicstudies"
          ]}
        />
      </div>
    </div>
  );
}
