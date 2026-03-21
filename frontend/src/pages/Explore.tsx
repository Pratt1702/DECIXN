import { useEffect, useState } from "react";
import { getMarketOverview } from "../services/api";
import { useExploreStore } from "../store/useExploreStore";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { useRef } from "react";

const DraggableCarousel = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const checkArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkArrows();
    window.addEventListener("resize", checkArrows);
    return () => window.removeEventListener("resize", checkArrows);
  }, [children]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDown(true);
    setIsDragging(false);
    if (!scrollRef.current) return;
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDown(false);
  };

  const onMouseUp = () => {
    setIsDown(false);
    // setTimeout(() => setIsDragging(false), 50); // Delay clear so clicks don't fire incorrectly
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    if (!scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 10) {
      setIsDragging(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const firstChild = scrollRef.current.children[0] as HTMLElement;
    let cardWidth = 236; // Default to sm+ size (220 + 16 gap)
    if (firstChild) {
      cardWidth = firstChild.offsetWidth + 16;
    }
    const moveAmount = cardWidth * 2;
    const offset = direction === "left" ? -moveAmount : moveAmount;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {/* Left Arrow */}
      {showLeft && (
        <button
          onClick={() => scrollCarousel("left")}
          className="absolute left-0 top-[100px] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-bg-surface/90 border border-white/20 shadow-xl flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white/10 hover:border-white/40 cursor-pointer -ml-4"
        >
          <ChevronLeft className="w-5 h-5 text-text-bold" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={checkArrows}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onClickCapture={(e) => {
          if (isDragging) {
            e.stopPropagation();
          }
        }}
        className={`flex overflow-x-auto gap-4 pb-4 scrollbar-hide select-none ${isDown ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {children}
      </div>

      {/* Fade gradients for scrolling indication */}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-bg-main to-transparent pointer-events-none" />
      )}

      {/* Right Arrow */}
      {showRight && (
        <button
          onClick={() => scrollCarousel("right")}
          className="absolute right-0 top-[100px] -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-bg-surface/90 border border-white/20 shadow-xl flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white/10 hover:border-white/40 cursor-pointer -mr-4"
        >
          <ChevronRight className="w-5 h-5 text-text-bold" />
        </button>
      )}
    </div>
  );
};

export function Explore() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { recentViews } = useExploreStore();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getMarketOverview();
        if (res.success) {
          setData(res);
        }
      } catch (e) {
        console.error("Failed to load market overview", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const renderCard = (item: any, idx: number, isPos: boolean) => {
    return (
      <div
        key={item.symbol}
        onClick={() => navigate(`/stock/${item.symbol}`)}
        className="min-w-[200px] w-[200px] sm:min-w-[220px] sm:w-[220px] bg-[#121212] border border-white/10 rounded-2xl p-4 flex flex-col justify-between cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all duration-300 group shrink-0 shadow-lg relative overflow-hidden"
      >
        {/* Subtle background index number for aesthetics */}
        <div className="absolute -right-2 -top-4 text-[80px] font-black text-white/[0.02] pointer-events-none select-none italic tracking-tighter z-0">
          {idx}
        </div>

        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* <span className="text-white/30 font-black text-lg italic">
              #{idx}
            </span> */}
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
              <span className="text-white/80 font-bold text-sm">
                {item.symbol.substring(0, 1)}
              </span>
            </div>
          </div>
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPos ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}
          >
            {isPos ? "+" : ""}
            {item.changePercent?.toFixed(2)}%
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end relative z-10">
          <h3
            className="text-sm font-bold text-text-bold truncate mb-0.5"
            title={item.companyName || item.symbol}
          >
            {item.companyName || item.symbol}
          </h3>
          <div className="text-xs text-text-muted font-medium mb-3">
            {item.symbol}
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-black text-white leading-tight">
                ₹
                {item.price?.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`text-[11px] font-bold ${isPos ? "text-success" : "text-danger"} mt-0.5`}
              >
                {isPos ? "+" : ""}
                {item.change?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <h2 className="text-text-muted font-bold tracking-widest text-sm animate-pulse">
          LOADING MARKET DATA...
        </h2>
      </div>
    );
  }

  const nifty = data?.indices?.find((i: any) => i.name === "NIFTY");
  const sensex = data?.indices?.find((i: any) => i.name === "SENSEX");

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-16 px-2">
      {/* Top Indices Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[nifty, sensex].map((idx) => {
          if (!idx) return null;
          const isPos = idx.change >= 0;
          return (
            <div
              key={idx.name}
              className="bg-bg-surface border border-border-main rounded-2xl p-4 flex flex-col hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2 text-text-muted">
                <Activity className="w-4 h-4 text-white/40" />
                <span className="text-[11px] font-bold tracking-widest uppercase">
                  {idx.name}
                </span>
              </div>
              <div className="text-2xl font-black text-text-bold mb-1 tracking-tight">
                <AnimatedNumber value={idx.price} prefix="" decimals={2} />
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${isPos ? "text-success" : "text-danger"}`}
              >
                <span>
                  {isPos ? "+" : ""}
                  <AnimatedNumber value={idx.change} decimals={2} />
                </span>
                <span className="opacity-60">|</span>
                <span>
                  {isPos ? "+" : ""}
                  <AnimatedNumber value={idx.changePercent} decimals={2} />%
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Recently Viewed */}
      {recentViews && recentViews.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Recently Viewed
            </h2>
          </div>

          <DraggableCarousel>
            {recentViews.map((item, index) =>
              renderCard(item, index + 1, item.change >= 0),
            )}
          </DraggableCarousel>
        </section>
      )}

      {/* Top Gainers */}
      {data?.top_gainers && data.top_gainers.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center border border-success/20">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Top Gainers
            </h2>
          </div>

          <DraggableCarousel>
            {data.top_gainers.map((item: any, index: number) =>
              renderCard(item, index + 1, item.change >= 0),
            )}
          </DraggableCarousel>
        </section>
      )}

      {/* Top Losers */}
      {data?.top_losers && data.top_losers.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center border border-danger/20">
              <TrendingDown className="w-4 h-4 text-danger" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Top Losers
            </h2>
          </div>

          <DraggableCarousel>
            {data.top_losers.map((item: any, index: number) =>
              renderCard(item, index + 1, item.change >= 0),
            )}
          </DraggableCarousel>
        </section>
      )}
    </div>
  );
}
