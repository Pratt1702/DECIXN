import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Brain, 
  Settings, 
  Newspaper, 
  PieChart, 
  ChevronRight, 
  Workflow,
  Zap,
  Globe,
  CheckCircle2,
  Bookmark
} from 'lucide-react';

const AgentWorkflow: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0c0f] text-[#e8eaf0] font-mono p-8 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#4f8ef7 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      <div className="absolute inset-0 opacity-5"
           style={{ background: 'linear-gradient(rgba(167, 139, 250, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(167, 139, 250, 0.1) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      
      {/* Header */}
      <div className="relative z-10 max-w-6xl mx-auto mb-16 border-b border-white/10 pb-8 flex justify-between items-end">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] tracking-widest uppercase mb-4">
            <Workflow size={12} /> Agentic Intelligence
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase">Foxy v1 Reasoning Flow</h1>
          <p className="text-sm text-[#8e96a8]">Stateful Directed Acyclic Graph (DAG) for Institutional Market Research</p>
        </div>
        <div className="text-right text-[10px] text-[#8e96a8] leading-relaxed">
          <div>ENGINE: <span className="text-blue-400">GEMINI 2.5 FLASH</span></div>
          <div>ORCHESTRATOR: <span className="text-emerald-400">LANGGRAPH</span></div>
          <div>STATE-SYNC: <span className="text-purple-400">REDUX + SUPABASE</span></div>
        </div>
      </div>

      {/* Flow Container */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center gap-6">
        
        {/* Step 1: User Input */}
        <Node 
          title="User Input" 
          icon={<MessageSquare className="text-blue-400" />} 
          subtitle="Natural Language Query"
          content={`"Analyze $RELIANCE for next week's accumulation strategy"`}
          accent="blue"
        />

        <Arrow />

        {/* Step 2: Gemini Router */}
        <Node 
          title="Gemini 2.5 Flash" 
          icon={<Brain className="text-purple-400" />} 
          subtitle="Intent Router & Context Wrapper"
          content={
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                <CheckCircle2 size={10} /> Extracting Tickers: ["RELIANCE"]
              </div>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                <CheckCircle2 size={10} /> Domain Check: Financial Intelligence
              </div>
            </div>
          }
          accent="purple"
        />

        <Arrow />

        {/* Step 3: Dispatcher */}
        <div className="relative w-full flex flex-col items-center">
          <Node 
            title="Tool Dispatcher" 
            icon={<Settings className="text-[#8e96a8]" />} 
            subtitle="Parallel Execution Handler"
            accent="gray"
            className="w-[280px]"
          />
          
          {/* Branching Lines */}
          <svg className="absolute top-[100%] left-0 w-full h-12 pointer-events-none" preserveAspectRatio="none">
            <path d="M50% 0 C50% 30 10% 30 10% 60" stroke="rgba(255,255,255,0.1)" fill="none" style={{ d: 'path("M 550 0 C 550 30 100 30 100 48")' }} />
            <path d="M 550 0 C 550 30 280 30 280 48" stroke="rgba(255,255,255,0.1)" fill="none" />
            <path d="M 550 0 C 550 30 460 30 460 48" stroke="rgba(255,255,255,0.1)" fill="none" />
            <path d="M 550 0 C 550 30 640 30 640 48" stroke="rgba(255,255,255,0.1)" fill="none" />
            <path d="M 550 0 C 550 30 820 30 820 48" stroke="rgba(255,255,255,0.1)" fill="none" />
            <path d="M 550 0 C 550 30 1000 30 1000 48" stroke="rgba(255,255,255,0.1)" fill="none" />
          </svg>
        </div>

        {/* Step 4: Parallel Tools */}
        <div className="grid grid-cols-6 gap-3 w-full mt-2">
          <ToolNode 
            name="fetch_news" 
            icon={<Newspaper size={14} />} 
            output="ET Markets Catalysts · Sentiment: 0.82"
          />
          <ToolNode 
            name="get_holdings" 
            icon={<PieChart size={14} />} 
            output="RELIANCE · Qty: 50 · Avg: 2450"
          />
          <ToolNode 
            name="fetch_watchlist" 
            icon={<Bookmark size={14} />} 
            output="Target Tickers · Price Alerts"
          />
          <ToolNode 
             name="analyze_portfolio" 
             icon={<Settings size={14} />} 
             output="Beta: 1.12 · Diversity: High"
          />
          <ToolNode 
            name="market_overview" 
            icon={<Globe size={14} />} 
            output="Nifty50 Bullish · Sector: Energy"
          />
          
          {/* Special Deep Dive Tool: analyze_ticker */}
          <div className="relative group h-fit">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 to-blue-500/30 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-[#111318] border border-emerald-500/30 rounded-xl p-3 h-full flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Workflow className="text-emerald-400" size={13} />
                <span className="text-[10px] font-bold uppercase tracking-tight">analyze_ticker</span>
              </div>
              <div className="space-y-2 mt-0.5">
                <SubStep name="Detect" desc="RSI/MACD/BB/VWAP" />
                <SubStep name="Enrich" desc="ATR Range + Skew" />
                <SubStep name="Verdict" desc="Statistical Projection" />
              </div>
            </div>
          </div>
        </div>

        {/* Converging Lines */}
        <div className="relative w-full h-12 pointer-events-none mt-1">
          <svg className="w-full h-full" preserveAspectRatio="none">
             <path d="M 100 0 C 100 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
             <path d="M 280 0 C 280 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
             <path d="M 460 0 C 460 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
             <path d="M 640 0 C 640 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
             <path d="M 820 0 C 820 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
             <path d="M 1000 0 C 1000 18 550 18 550 48" stroke="rgba(255,255,255,0.1)" fill="none" />
          </svg>
        </div>

        {/* Step 5: Synthesis */}
        <Node 
          title="Final Synthesis" 
          icon={<Zap className="text-amber-400" />} 
          subtitle="Multi-Factor Heuristic Engine"
          content={
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                <div className="text-[8px] text-[#8e96a8]">PREDICTED RANGE</div>
                <div className="text-[11px] text-amber-400">2,650 — 2,820</div>
              </div>
              <div className="bg-black/20 p-2 rounded border border-white/5 space-y-1">
                <div className="text-[8px] text-[#8e96a8]">CONVICTION</div>
                <div className="text-[11px] text-emerald-400">HIGH (92%)</div>
              </div>
            </div>
          }
          accent="amber"
          className="w-[450px]"
        />

        <Arrow />

        {/* Step 6: Final Output */}
        <div className="w-full max-w-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6 relative">
          <div className="absolute top-4 right-4 text-emerald-400 animate-pulse">
            <div className="flex items-center gap-1 text-[9px] font-bold">● STREAMING</div>
          </div>
          <div className="text-[13px] text-white/90 leading-relaxed font-mono mb-4 italic">
            "Based on the ATR projection of ₹82 (3.1%) and the bullish divergence in RSI (62), I recommend accumulation in the ₹2680-2720 zone. 
            Your existing exposure is low (2% weighting), suggesting a safe expansion. Sector tailwinds favor a breakout..."
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-400">ACCUMULATE</span>
            <span className="px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-[9px] text-blue-400">TARGET: 2,850</span>
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="max-w-6xl mx-auto mt-32 pt-8 border-t border-white/5 flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity">
        <div className="text-[9px] tracking-widest">DECIXN CORE INTELLIGENCE · HACKATHON BUILD 2026</div>
        <div className="text-[9px]">DESIGNED BY PRATHIK R KRISHNAN · MANISHA V · KARTHIKEYAN S</div>
      </div>
    </div>
  );
};

/* --- SHARED COMPONENTS --- */

const Node = ({ title, icon, subtitle, content, accent, className = "" }: any) => {
  const accentColors: any = {
    blue: "border-blue-500/30 before:bg-blue-500",
    purple: "border-purple-500/30 before:bg-purple-500",
    emerald: "border-emerald-500/30 before:bg-emerald-500",
    amber: "border-amber-500/30 before:bg-amber-500",
    gray: "border-white/10 before:bg-[#8e96a8]",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      className={`relative bg-[#111318] border rounded-2xl p-5 ${accentColors[accent]} before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:rounded-t-2xl before:opacity-60 overflow-hidden shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-bold text-white tracking-widest uppercase">{title}</h3>
          <p className="text-[9px] text-[#8e96a8] mt-0.5">{subtitle}</p>
        </div>
      </div>
      {content && (
        <div className="pt-3 border-t border-white/5 text-[11px] text-[#8e96a8] leading-normal">
          {content}
        </div>
      )}
    </motion.div>
  );
};

const ToolNode = ({ name, icon, output }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="bg-[#111318] border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-xl"
  >
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-white/5 rounded border border-white/5 text-purple-400">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-white/90 truncate">{name}</span>
    </div>
    <div className="text-[8px] text-[#8e96a8] leading-relaxed">
      {output}
    </div>
  </motion.div>
);

const SubStep = ({ name, desc }: any) => (
  <div className="flex flex-col gap-0.5 pl-3 border-l-2 border-emerald-500/20">
    <div className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase">{name}</div>
    <div className="text-[8px] text-[#8e96a8]">{desc}</div>
  </div>
);

const Arrow = () => (
  <div className="flex flex-col items-center">
    <div className="w-px h-8 bg-gradient-to-b from-white/10 to-white/20"></div>
    <ChevronRight size={12} className="rotate-90 -mt-2.5 text-white/20" />
  </div>
);

export default AgentWorkflow;
