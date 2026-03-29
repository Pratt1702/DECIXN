import { Info } from "lucide-react";

/**
 * Shared Info Tooltip component for consistent micro-help throughout the dashboard.
 * Uses native CSS peer-hover behavior with Tailwind classes for high performance.
 */
export const InfoTooltip = ({
  content,
  align = "center",
}: {
  content: string;
  align?: "center" | "left" | "right";
}) => (
  <div className="group relative flex items-center">
    <Info className="w-5 h-5 text-text-muted cursor-help hover:text-info transition-colors" />
    <div
      className={`pointer-events-none absolute bottom-full mb-3 w-72 rounded-lg border border-[#333] bg-[#1a1a1a] p-3.5 text-[13px] leading-relaxed font-normal text-[#d1d5db] opacity-0 shadow-2xl transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-50 ${
        align === "left" ? "-left-0" : align === "right" ? "-right-0" : "left-1/2 -translate-x-1/2"
      }`}
    >
      {content}
      <div
        className={`absolute -bottom-1.5 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[#333] ${
          align === "left" ? "left-4" : align === "right" ? "right-4" : "left-1/2 -translate-x-1/2"
        }`}
      ></div>
    </div>
  </div>
);
