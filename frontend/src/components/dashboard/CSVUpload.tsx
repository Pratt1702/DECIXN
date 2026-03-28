import React, { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  X,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CSVUploadProps {
  onDataParsed: (data: any[]) => void;
  isManual?: boolean;
  acceptType?: "stocks" | "mf";
}

export function CSVUpload({
  onDataParsed,
  isManual,
  acceptType,
}: CSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("Please select a .csv file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        setIsUploading(false);
        if (results.errors.length > 0) {
          setError("Error parsing CSV. Check file format.");
          console.error(results.errors);
          return;
        }

        const mappedData = (results.data as any[])
          .map((row: any) => {
            const keys = Object.keys(row);

            const getVal = (regex: RegExp) => {
              const key = keys.find((k) => regex.test(k));
              return key ? row[key] : null;
            };

            const parseSafeNum = (val: any) => {
              if (val === null || val === undefined || val === "") return 0;
              if (typeof val === "number") return val;
              if (typeof val === "string") {
                const cleaned = val.replace(/[^0-9.-]/g, "").trim();
                return parseFloat(cleaned) || 0;
              }
              return 0;
            };

            const symbolStr = (
              getVal(
                /Instrument|Instrumer|Symbol|Ticker|Stock|Scheme.*Name/i,
              ) || "Unknown"
            )
              .toString()
              .trim();

            const quantity = parseSafeNum(
              getVal(/Qty|Quantity|Shares|Quantity.*Available|Units|Holding/i),
            );
            const avgCost = parseSafeNum(
              getVal(/Avg.*cost|Average.*Cost|Price|Buy/i),
            );

            const isin = getVal(/ISIN/i)?.toString().trim() || null;

            return {
              id: crypto.randomUUID(),
              symbol: symbolStr,
              scheme_name: symbolStr,
              isin: isin,
              holding_context: {
                quantity,
                avg_cost: avgCost,
                current_value: 0,
                pnl_pct: 0,
                current_pnl: 0,
                isin: isin,
              },
            };
          })
          .filter(
            (h) => h.symbol !== "Unknown" && h.holding_context.quantity > 0,
          );

        const validatedData = mappedData.filter((h) => {
          if (acceptType === "mf") {
            const isShortTicker = /^[A-Z]{1,6}$/.test(h.symbol);
            if (isShortTicker && !h.isin) return false;
          }
          if (acceptType === "stocks") {
            if (!h.symbol || h.symbol.length > 15) return false;
          }
          return true;
        });

        if (validatedData.length === 0) {
          setError(
            acceptType === "mf"
              ? "No valid Mutual Funds found."
              : "No valid stocks found.",
          );
          return;
        }

        setSuccess(true);
        const mappedDataWithIds = validatedData.map((h) => ({
          ...h,
          id: crypto.randomUUID(),
        }));
        onDataParsed(mappedDataWithIds);
        setTimeout(() => setSuccess(false), 3000);
      },
      error: (err) => {
        setIsUploading(false);
        setError("Failed to read file.");
        console.error(err);
      },
    });
  };

  const handleChooseFile = () => {
    setShowTipModal(true);
  };

  const proceedToUpload = () => {
    setShowTipModal(false);
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none">
        {isManual ? (
          <>
            <span className="text-text-muted font-black opacity-80 uppercase">
              Portfolio Uploaded
            </span>
            <HelpCircle
              size={13}
              className="cursor-pointer hover:text-accent transition-colors text-text-muted hover:opacity-100 opacity-70"
              onClick={() => window.open("/info/portfolio", "_blank")}
            />
          </>
        ) : (
          <>
            Upload your{" "}
            <a
              href="/info/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 underline decoration-accent/30 underline-offset-4 cursor-pointer"
            >
              portfolio
            </a>
            <HelpCircle
              size={13}
              className="cursor-pointer hover:text-accent transition-colors"
              onClick={() => window.open("/info/portfolio", "_blank")}
            />
          </>
        )}
      </div>

      <button
        onClick={handleChooseFile}
        disabled={isUploading}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all text-sm font-medium text-white/70 hover:text-white select-none whitespace-nowrap"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Choose File
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv"
        onChange={handleFileUpload}
      />

      <AnimatePresence mode="wait">
        {success && (
          <motion.span
            key="ok"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-success font-semibold"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Loaded
          </motion.span>
        )}
        {error && !success && (
          <motion.span
            key="err"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-danger font-semibold"
          >
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Helpful Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setShowTipModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 1.02, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-md bg-bg-surface border border-border-main rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            >
              <div className="px-8 py-4 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-accent" />
                  <span className="text-[11px] text-text-muted font-black uppercase tracking-[0.2em] select-none">
                    Upload Intelligence
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-text-bold tracking-tighter">
                    Quick Start Guide
                  </h3>
                  <button
                    onClick={() => setShowTipModal(false)}
                    className="p-2 rounded-lg text-text-muted hover:text-text-bold hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-5">
                  <p className="text-sm text-text-muted leading-relaxed font-medium">
                    To expedite your evaluation, high-fidelity sample data for{" "}
                    <span className="text-text-bold font-bold">Stocks</span> and{" "}
                    <span className="text-text-bold font-bold">
                      Mutual Funds
                    </span>{" "}
                    is available in the{" "}
                    <code className="bg-white/5 px-2 py-0.5 rounded text-accent font-bold">
                      test_data/
                    </code>{" "}
                    folder within the repository.
                  </p>

                  <div className="bg-white/[0.03] border-l-[4px] border-l-accent rounded-xl p-5 shadow-inner space-y-3">
                    <p className="text-[14px] text-white font-semibold leading-normal">
                      Note: Detailed manual management is also available via the
                      'Add Holding' interface at the bottom.
                    </p>
                    <p className="text-[12px] text-text-muted font-medium">
                      Need a custom file? Click{" "}
                      <a
                        href="/info/portfolio"
                        target="_blank"
                        className="text-accent hover:underline font-bold"
                      >
                        here
                      </a>{" "}
                      to view the general CSV format.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowTipModal(false)}
                    className="flex-1 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-text-bold font-black text-xs uppercase tracking-[0.2em] hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={proceedToUpload}
                    className="flex-1 bg-success text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_8px_24px_-4px_rgba(80,255,167,0.3)] hover:bg-accent/90 transition-all cursor-pointer active:scale-95"
                  >
                    Okay, Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
