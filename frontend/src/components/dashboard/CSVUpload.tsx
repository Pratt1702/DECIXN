import React, { useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, AlertCircle, Loader2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CSVUploadProps {
  onDataParsed: (data: any[]) => void;
  isManual?: boolean;
}

export function CSVUpload({ onDataParsed, isManual }: CSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

        const mappedData = (results.data as any[]).map((row: any) => {
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
            getVal(/Instrument|Instrumer|Symbol|Ticker|Stock|Scheme.*Name/i) || "Unknown"
          )
            .toString()
            .trim();

          const quantity = parseSafeNum(getVal(/Qty|Quantity|Shares|Quantity.*Available|Units|Holding/i));
          const avgCost = parseSafeNum(
            getVal(/Avg.*cost|Average.*Cost|Price|Buy/i)
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
              isin: isin
            },
          };
        }).filter(
          (h) => h.symbol !== "Unknown" && h.holding_context.quantity > 0
        );

        if (mappedData.length === 0) {
          const firstRow = results.data[0] as any;
          if (firstRow) console.log("Detected headers:", Object.keys(firstRow));
          setError("No valid holdings found.");
          return;
        }

        setSuccess(true);
          const mappedDataWithIds = mappedData.map(h => ({
            ...h,
            id: crypto.randomUUID()
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

  return (
    <div className="flex items-center gap-4">
      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 select-none">
        {isManual ? (
          <>
            <span className="text-text-muted font-black opacity-80 uppercase">Portfolio Uploaded</span>
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

      <label className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all text-sm font-medium text-white/70 hover:text-white select-none">
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
        <input
          type="file"
          className="hidden"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>

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
    </div>
  );
}
