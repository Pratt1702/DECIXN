import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  ChevronDown,
  ArrowUp,
  Plus,
  Zap,
  Activity,
  PanelLeft,
  PenLine,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import _logo from "../assets/logo.png";
import { useAuthStore } from "../store/useAuthStore";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { MiniChart } from "../components/ui/MiniChart";
import { StockChart } from "../components/ui/StockChart";
import { PortfolioSummary } from "../components/ui/PortfolioSummary";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: string;
  metadata?: any;
  ui_hints?: any;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useAuthStore();
  const { data: portfolioData } = usePortfolioStore();
  const { items: watchlistItems } = useWatchlistStore();
  const [userName, setUserName] = useState<string | null>(
    localStorage.getItem("user_chat_name"),
  );
  const [showIntro, setShowIntro] = useState(
    !localStorage.getItem("user_chat_name"),
  );
  const [tempName, setTempName] = useState("");
  const [remainingMessages, setRemainingMessages] = useState<number | null>(
    null,
  );
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const fetchStatus = async () => {
      const id = user?.id || userName || "anonymous";
      try {
        const res = await fetch(`http://localhost:8000/chat/status/${id}`);
        const data = await res.json();
        if (data.remaining_messages !== undefined) {
          setRemainingMessages(data.remaining_messages);
        }
      } catch (e) {
        console.error("Failed to fetch chat status:", e);
      }
    };
    fetchStatus();
  }, [user, userName]);

  const handleQuickStart = (text: string) => {
    setInput(text);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      localStorage.setItem("user_chat_name", tempName.trim());
      setUserName(tempName.trim());
      setShowIntro(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const savedInput = input;
    setInput("");
    setIsTyping(true);

    try {
      // Build portfolio context
      let portfolioContext = "";
      if (portfolioData?.portfolio_summary) {
        const s = portfolioData.portfolio_summary;
        portfolioContext += `[PORTFOLIO SUMMARY] Health: ${s.health}, Total Value: ₹${s.total_value_live}, P&L: ₹${s.total_pnl} (${s.win_rate} win rate).\n`;

        if (
          portfolioData.portfolio_analysis &&
          portfolioData.portfolio_analysis.length > 0
        ) {
          portfolioContext += `[HOLDINGS LIST]\n`;
          portfolioData.portfolio_analysis.slice(0, 15).forEach((h: any) => {
            portfolioContext += `- ${h.symbol}: ${h.holding_context.quantity} shares @ avg ₹${h.holding_context.avg_cost}\n`;
          });
        }
      } else {
        portfolioContext = "No portfolio data uploaded.";
      }

      if (watchlistItems.length > 0) {
        portfolioContext += ` Watchlist: ${watchlistItems
          .slice(0, 10)
          .map((i) => i.symbol)
          .join(", ")}.`;
      }

      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      console.log("FOXY REQUEST:", {
        message: savedInput,
        history: history,
        context: portfolioContext,
      });

      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: savedInput,
          history: history,
          portfolio_context: portfolioContext,
          user_id: user?.id || userName || "anonymous",
        }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Robust JSON extraction from stream buffer
        let startIndex = buffer.indexOf("{");
        while (startIndex !== -1) {
          let braceCount = 0;
          let endIndex = -1;
          for (let i = startIndex; i < buffer.length; i++) {
            if (buffer[i] === "{") braceCount++;
            else if (buffer[i] === "}") braceCount--;

            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }

          if (endIndex !== -1) {
            const jsonStr = buffer.substring(startIndex, endIndex + 1);
            try {
              const data = JSON.parse(jsonStr);
              console.log("STREAM CHUNK:", data);

              if (data.status) {
                setCurrentStatus(data.status);
              } else {
                // Final assistant message
                if (data.metadata?.remaining_messages !== undefined) {
                  setRemainingMessages(data.metadata.remaining_messages);
                }

                const assistantMsg: Message = {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: data.narrative || "I couldn't generate a response.",
                  timestamp: Date.now(),
                  type: data.type,
                  metadata: data.metadata,
                  ui_hints: data.ui_hints,
                };

                setMessages((prev) => [...prev, assistantMsg]);
                setCurrentStatus(null);
                setIsTyping(false);
              }
            } catch (e) {
              console.error("Error parsing stream chunk:", e, jsonStr);
            }
            buffer = buffer.substring(endIndex + 1);
            startIndex = buffer.indexOf("{");
          } else {
            break; // Wait for more data to complete JSON object
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting to my brain right now. Please make sure the backend is running.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const history = [
    {
      label: "Last 7 days",
      items: ["Portfolio Strategy", "Market Sentiment Check"],
    },
    { label: "Jan 2026", items: ["Q1 Projections", "Nifty 50 Analysis"] },
    { label: "2025", items: ["FY25 Planning", "Sector Rotation Study"] },
  ];

  const quickStarts = [
    {
      icon: <Zap className="w-3 h-3" />,
      title: "Analyze my portfolio",
      desc: "Get a deep dive into your risks",
    },
    {
      icon: <Activity className="w-3 h-3" />,
      title: "Market trends",
      desc: "What's moving the index today?",
    },
    {
      icon: <Search className="w-3 h-3" />,
      title: "Specific stock check",
      desc: "Analyze technical signals for any ticker",
    },
    {
      icon: <Sparkles className="w-3 h-3" />,
      title: "Optimise Tax",
      desc: "Find tax-efficient exit opportunities",
    },
  ];

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full bg-[#0a0a0a] text-sm font-medium text-text-muted overflow-hidden relative">
      {/* ── INTRODUCTION MODAL ── */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-[#111] border border-white/10 p-8 rounded-[32px] shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                I'm Foxy v1
              </h2>
              <p className="text-text-muted mb-8 leading-relaxed">
                Your high-fidelity financial co-pilot. I'm here to analyze,
                simulate, and scale your capital. <br />
                <br />
                <span className="text-white">How can I call you?</span>
              </p>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-accent/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!tempName.trim()}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  Start Analyzing
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <motion.aside
        animate={{
          width: isSidebarOpen ? 260 : 0,
          opacity: isSidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="bg-[#0c0c0c] border-r border-white/5 flex flex-col h-full overflow-hidden shrink-0"
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center">
            {/* <img src={logo} alt="Decixn" className="h-10 w-auto" /> */}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
          >
            <PanelLeft className="w-4 h-4 text-text-muted group-hover:text-white" />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => setMessages([])}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <PenLine className="w-3 h-3 text-text-muted group-hover:text-white transition-colors" />
              <span className="font-bold text-[14px]">New chat</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 mt-2 space-y-6 scrollbar-hide">
          {history.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-3">
                {section.label}
              </p>
              <div className="space-y-0">
                {section.items.map((item) => (
                  <button
                    key={item}
                    className="w-full text-left px-3 py-2 rounded-lg text-[14px] hover:bg-white/[0.03] transition-all text-text-muted hover:text-white truncate cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/10 flex items-center justify-center font-black text-xs text-accent">
              {(userName || "U")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate  tracking-tight">
                {userName || "User"}
              </p>
              <div className="flex items-center gap-1.5 opacity-40">
                <p className="text-[10px] font-medium truncate">
                  {user?.email || "investor@intelligence.com"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── MAIN CHAT VIEW ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="h-14 px-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <PanelLeft className="w-4 h-4 text-text-muted group-hover:text-white" />
              </button>
            )}

            {remainingMessages !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  {remainingMessages} {remainingMessages === 1 ? "msg" : "msgs"}{" "}
                  left
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <span className="text-white font-semibold text-[14px] tracking-tight">
              Foxy v1
            </span>
            <ChevronDown className="w-3 h-3 text-text-muted group-hover:translate-y-0.5 transition-transform" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col items-center relative">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl px-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-12"
              >
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-7 h-7 text-accent" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                    How can I help you, {userName || "Investor"}?
                  </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                  {quickStarts.map((item, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: "rgba(255,255,255,0.04)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleQuickStart(item.title)}
                      className="p-5 rounded-[24px] border border-white/5 bg-white/[0.02] text-left transition-all cursor-pointer"
                    >
                      <p className="text-white font-black text-sm mb-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-text-muted leading-tight">
                        {item.desc}
                      </p>
                    </motion.button>
                  ))}
                </div>

                <div className="max-w-2xl mx-auto w-full relative pt-4">
                  <div className="flex items-center bg-[#121212] border border-white/10 rounded-[30px] p-2.5 pr-3 shadow-2xl focus-within:border-white/20 transition-all">
                    <textarea
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        (e.preventDefault(), handleSend())
                      }
                      placeholder="Message Foxy..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-white text-[14px] font-medium pl-6 py-4 resize-none outline-none placeholder:text-text-muted/30"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        input.trim()
                          ? "bg-white text-black shadow-xl"
                          : "bg-white/5 text-white/10"
                      }`}
                    >
                      <ArrowUp className="w-5 h-5 font-black" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col min-h-0">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 space-y-12 py-12 w-full max-w-3xl mx-auto scroll-smooth scrollbar-hide"
              >
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col w-full ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`text-[15px] leading-relaxed font-medium px-3 py-2 rounded-[24px] max-w-[85%] relative group ${
                        msg.role === "user"
                          ? "bg-[#181818] text-white border border-white/10 shadow-xl"
                          : "text-text-bold"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <div className="markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ node, ...props }) => (
                                <p className="mb-3 last:mb-0" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="list-disc ml-4 mb-3 space-y-1"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="list-decimal ml-4 mb-3 space-y-1"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="leading-relaxed" {...props} />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong
                                  className="text-white font-bold"
                                  {...props}
                                />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1
                                  className="text-lg font-bold mb-2 text-white"
                                  {...props}
                                />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2
                                  className="text-md font-bold mb-2 text-white border-b border-white/5 pb-1"
                                  {...props}
                                />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote
                                  className="border-l-2 border-accent/30 pl-3 italic my-2 text-white/70"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>

                          {msg.metadata && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                              {/* Actionable Insight Badge */}
                              {msg.metadata.actionable_insight && (
                                <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-xl px-3 py-2 text-[12px] text-accent font-bold">
                                  <Zap className="w-3.5 h-3.5" />
                                  {msg.metadata.actionable_insight}
                                </div>
                              )}

                              {/* Portfolio Analysis Summary Card */}
                              {msg.type === "portfolio_analysis" &&
                                msg.metadata.portfolio_summary && (
                                  <PortfolioSummary
                                    summary={msg.metadata.portfolio_summary}
                                    holdings={
                                      msg.metadata.portfolio_holdings || []
                                    }
                                  />
                                )}

                              {/* Interactive Stock Charts (Max 3) */}
                              {msg.type !== "portfolio_analysis" &&
                                msg.metadata.charts &&
                                msg.metadata.charts.length > 0 && (
                                  <div className="flex flex-col gap-4">
                                    {msg.metadata.charts
                                      .slice(0, 3)
                                      .map((ticker: string) => (
                                        <StockChart
                                          key={ticker}
                                          ticker={ticker}
                                        />
                                      ))}
                                  </div>
                                )}

                              {/* Action Ticker Shortcuts */}
                              {msg.metadata.tickers &&
                                msg.metadata.tickers.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {msg.metadata.tickers.map((t: string) => (
                                      <button
                                        key={t}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 text-white font-bold text-[11px] transition-all cursor-pointer"
                                        onClick={() =>
                                          window.open(`/stock/${t}`, "_blank")
                                        }
                                      >
                                        View {t}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1.5 ml-[2px] px-3 py-1.5 mt-[-2px] rounded-lg hover:text-[11px] text-text-muted transition-all active:scale-95 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4 group-hover:text-white" />
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex flex-col gap-3 max-w-[85%]">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              delay: i * 0.2,
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-accent/50"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 animate-pulse">
                        {currentStatus || "Thinking..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-10 pt-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
                <div className="max-w-2xl mx-auto relative">
                  <div className="flex items-center bg-[#161616] border border-white/5 rounded-[30px] p-2 pr-3 shadow-2xl transition-all focus-within:border-white/20">
                    <button className="p-3 text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                    <textarea
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        (e.preventDefault(), handleSend())
                      }
                      placeholder={
                        remainingMessages === 0
                          ? "You've reached your limit. Come back later!"
                          : "Message Foxy..."
                      }
                      disabled={remainingMessages === 0}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-white text-[14px] font-medium px-2 py-3 resize-none outline-none placeholder:text-text-muted/30 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        input.trim()
                          ? "bg-white text-black shadow-lg shadow-white/5"
                          : "bg-white/5 text-white/10"
                      }`}
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
