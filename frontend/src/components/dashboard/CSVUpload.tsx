import React, { useState } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CSVUploadProps {
  onDataParsed: (data: any[]) => void;
}

export function CSVUpload({ onDataParsed }: CSVUploadProps) {
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
            getVal(/Instrument|Instrumer|Symbol|Ticker|Stock/i) || "Unknown"
          )
            .toString()
            .trim()
            .toUpperCase();

          const quantity = parseSafeNum(getVal(/Qty|Quantity|Shares/i));
          const avgCost = parseSafeNum(
            getVal(/Avg.*cost|Average.*Cost|Price|Buy/i)
          );

          let totalValue = parseSafeNum(
            getVal(/Cur.*val|Market.*Value|Current.*Value|Invested/i)
          );
          const ltp = parseSafeNum(getVal(/LTP|Last.*Price|CMP/i));

          const kiteCurVal = parseSafeNum(row["Cur. val"]);
          if (kiteCurVal > 0) totalValue = kiteCurVal;
          else if (totalValue === 0 && ltp > 0) totalValue = ltp * quantity;

          const pnlValue = getVal(/P&L|PnL|Profit/i);
          const pnl =
            pnlValue !== null
              ? parseSafeNum(pnlValue)
              : totalValue - quantity * avgCost;
          const pnlPct =
            quantity * avgCost !== 0 ? (pnl / (quantity * avgCost)) * 100 : 0;

          return {
            symbol: symbolStr,
            holding_context: {
              quantity,
              avg_cost: avgCost,
              current_value: totalValue,
              pnl_pct: pnlPct,
              current_pnl: pnl,
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
        onDataParsed(mappedData);
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
