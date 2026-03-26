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
  ExternalLink,
  Trash2,
  MoreVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import _logo from "../assets/logo.png";
import { useAuthStore } from "../store/useAuthStore";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useMFPortfolioStore } from "../store/useMFPortfolioStore";
// import { MiniChart } from "../components/ui/MiniChart";
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

function TypewriterText({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        // Boost speed: 3 chars per tick for medium messages, 5 for long ones
        const step = text.length > 500 ? 5 : 3;
        setDisplayText(text.substring(0, index + step));
        setIndex((prev) => prev + step);
      }, 10);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, onComplete]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useAuthStore();
  const { data: portfolioData } = usePortfolioStore();
  const { data: mfPortfolioData } = useMFPortfolioStore();
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

  const [completedMessages, setCompletedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<
    { id: string; title: string; created_at: string }[]
  >([]);
  const [menuOpenSessionId, setMenuOpenSessionId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Find the most recent assistant message container and scroll to its START
      const assistantMsgs =
        scrollRef.current.querySelectorAll(".assistant-msg");
      if (assistantMsgs.length > 0 && isTyping) {
        assistantMsgs[assistantMsgs.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else if (!isTyping) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, isTyping]);

  const fetchSessions = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:8000/chat/sessions/${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  };

  const loadSession = async (sid: string) => {
    if (!user?.id) return;
    try {
      setSessionId(sid);
      const res = await fetch(
        `http://localhost:8000/chat/history/${user.id}?session_id=${sid}`,
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        const historyMsgs: Message[] = data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata,
          timestamp: new Date(m.created_at).getTime(),
        }));
        setMessages(historyMsgs);
        setCompletedMessages(new Set(historyMsgs.map((m) => m.id)));
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setCompletedMessages(new Set());
  };

  const deleteSession = async (sid: string) => {
    setDeleteConfirmSessionId(sid);
    setMenuOpenSessionId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmSessionId) return;
    const sid = deleteConfirmSessionId;
    
    try {
      const res = await fetch(`http://localhost:8000/chat/sessions/${sid}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sid));
        if (sessionId === sid) {
          handleNewChat();
        }
      }
    } catch (e) {
      console.error("Failed to delete session:", e);
    } finally {
      setDeleteConfirmSessionId(null);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      const id = user?.id || userName || "anonymous";

      // 1. Fetch Chat Status
      try {
        const res = await fetch(`http://localhost:8000/chat/status/${id}`);
        const data = await res.json();
        if (data.remaining_messages !== undefined) {
          setRemainingMessages(data.remaining_messages);
        }
      } catch (e) {
        console.error("Failed to fetch chat status:", e);
      }

      // 2. Fetch Sessions for Sidebar
      fetchSessions();

      // 3. Load latest history by default if no sessions yet?
      // Or just keep it empty for new chat
    };
    initChat();
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

    let currentSid = sessionId;
    if (!currentSid) {
      currentSid = crypto.randomUUID();
      setSessionId(currentSid);
    }

    try {
      let portfolioContext = "";

      // Collect and categorize all holdings
      const allStockHoldings = portfolioData?.portfolio_analysis || [];
      const allMFHoldings = mfPortfolioData?.portfolio_analysis || [];

      // Categorize
      const equities: any[] = [];
      const funds: any[] = [];

      allStockHoldings.forEach((h: any) => {
        if (h.data?.quote_type === 'MUTUALFUND' || h.symbol?.toLowerCase().includes('fund') || h.symbol?.toLowerCase().includes('plan')) {
          funds.push(h);
        } else {
          equities.push(h);
        }
      });

      allMFHoldings.forEach((h: any) => {
        // MF store holdings are always funds
        funds.push(h);
      });

      // Format Stocks Section
      if (equities.length > 0) {
        portfolioContext += "[STOCK PORTFOLIO]\nHoldings:\n";
        equities.forEach((h) => {
          const qty = h.holding_context?.quantity || 0;
          const avg = h.holding_context?.avg_cost || 0;
          portfolioContext += `- ${h.symbol}: ${qty} shares @ avg ₹${avg}\n`;
        });
      }

      // Format Funds Section
      if (funds.length > 0) {
        portfolioContext += "\n[MUTUAL FUND PORTFOLIO]\nFunds:\n";
        funds.forEach((h) => {
          const qty = h.holding_context?.quantity || 0;
          const avg = h.holding_context?.avg_cost || 0;
          const name = h.scheme_name || h.symbol;
          portfolioContext += `- ${name}: ${qty} units @ avg ₹${avg}\n`;
        });
      }

      if (!portfolioContext) {
        portfolioContext = "No portfolio data uploaded.";
      }

      console.log("DEBUG [Chat]: Final Portfolio Context:\n", portfolioContext);

      const historyData = messages.slice(-6).map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));

      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: savedInput,
          history: historyData,
          portfolio_context: portfolioContext,
          user_id: user?.id || userName || "anonymous",
          session_id: currentSid,
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
                // Refresh sessions list to show the new chat title if it's new
                fetchSessions();
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
        className="bg-[#0c0c0c] border-r border-white/5 flex flex-col h-full shrink-0 relative z-[50]"
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
            onClick={handleNewChat}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <PenLine className="w-3 h-3 text-text-muted group-hover:text-white transition-colors" />
              <span className="font-bold text-[14px]">New chat</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 mt-2 space-y-6 scrollbar-hide">
          {sessions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-3">
                Recent Chats
              </p>
              <div className="space-y-0 text-white font-bold">
                {sessions.map((session) => (
                  <div key={session.id} className="group relative">
                    <button
                      onClick={() => loadSession(session.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[14px] transition-all truncate pr-10 cursor-pointer ${
                        sessionId === session.id ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5'
                      }`}
                    >
                      {session.title}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ top: rect.top, left: rect.right + 8 });
                        setMenuOpenSessionId(menuOpenSessionId === session.id ? null : session.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/10 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Context Menu */}
                    <AnimatePresence>
                      {menuOpenSessionId === session.id && menuPosition && (
                        <>
                          <div 
                            className="fixed inset-0 z-[110]" 
                            onClick={() => setMenuOpenSessionId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: 10 }}
                            style={{ top: menuPosition.top, left: menuPosition.left }}
                            className="fixed z-[120] min-w-[120px] bg-[#1a1a1a] border border-white/10 rounded-xl p-1 shadow-2xl overflow-hidden"
                          >
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-danger hover:bg-danger/10 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete Chat
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                          {msg.role === "assistant" &&
                          !completedMessages.has(msg.id) ? (
                            <TypewriterText
                              text={msg.content}
                              onComplete={() =>
                                setCompletedMessages((prev) =>
                                  new Set(prev).add(msg.id),
                                )
                              }
                            />
                          ) : (
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
                          )}

                          {msg.metadata && completedMessages.has(msg.id) && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                              {/* Actionable Insight Badge */}
                              {msg.metadata.actionable_insight && (
                                <div
                                  className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-[12px] font-bold ${
                                    msg.metadata.sentiment === "Bearish" ||
                                    msg.metadata.actionable_insight
                                      .toLowerCase()
                                      .includes("sell") ||
                                    msg.metadata.actionable_insight
                                      .toLowerCase()
                                      .includes("exit")
                                      ? "bg-[#e13451]/10 border-[#e13451]/20 text-[#e13451]"
                                      : msg.metadata.sentiment === "Bullish" ||
                                          msg.metadata.actionable_insight
                                            .toLowerCase()
                                            .includes("buy") ||
                                          msg.metadata.actionable_insight
                                            .toLowerCase()
                                            .includes("hold")
                                        ? "bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]"
                                        : msg.metadata.actionable_insight
                                              .toLowerCase()
                                              .includes("caution") ||
                                            msg.metadata.actionable_insight
                                              .toLowerCase()
                                              .includes("risk") ||
                                            msg.metadata.actionable_insight
                                              .toLowerCase()
                                              .includes("warning")
                                          ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400"
                                          : "bg-white/5 border-white/10 text-white/40" // Neutral
                                  }`}
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <ReactMarkdown
                                    components={{
                                      p: ({ node, ...props }) => (
                                        <span {...props} />
                                      ),
                                    }}
                                  >
                                    {msg.metadata.actionable_insight}
                                  </ReactMarkdown>
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
                                        onClick={() => {
                                          const cleanT = t.replace(".NS", "").replace(".BO", "");
                                          window.open(`/stocks/details/${cleanT}`, "_blank");
                                        }}
                                      >
                                        View {t}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              
                              {/* News Sources Citations */}
                              {msg.metadata.sources && msg.metadata.sources.length > 0 && (
                                <div className="flex flex-col gap-2 pt-2">
                                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Sources</p>
                                  <div className="flex flex-wrap gap-2">
                                    {msg.metadata.sources.map((source: any, idx: number) => (
                                      <a
                                        key={idx}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 text-white/70 hover:text-white font-bold text-[11px] transition-all cursor-pointer group/source"
                                      >
                                        <span className="truncate max-w-[150px]">{source.title}</span>
                                        <ExternalLink className="w-3 h-3 opacity-40 group-hover/source:opacity-100 transition-opacity" />
                                      </a>
                                    ))}
                                  </div>
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

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmSessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-sm w-full bg-[#161616] border border-white/10 p-8 rounded-[32px] shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#e13451]/10 border border-[#e13451]/20 flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-[#e13451]" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mb-2">
                Delete Chat?
              </h2>
              <p className="text-text-muted mb-8 text-sm leading-relaxed">
                This will permanently delete this conversation and its history. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmSessionId(null)}
                  className="flex-1 bg-white/5 text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-[#e13451] text-white font-black py-4 rounded-2xl hover:bg-[#c92a44] transition-colors shadow-lg shadow-danger/20 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
