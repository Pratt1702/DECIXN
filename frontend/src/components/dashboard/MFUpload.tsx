import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MFUploadProps {
  onDataParsed: (data: any[]) => void;
  isManual?: boolean;
}

export function MFUpload({ onDataParsed, isManual }: MFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parseSafeNum = (val: any) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.-]/g, "").trim();
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const mapRow = (row: any) => {
    const keys = Object.keys(row);
    const getVal = (regex: RegExp) => {
      const key = keys.find((k) => regex.test(k));
      return key ? row[key] : null;
    };

    // Standard Kite MF Columns: Symbol, ISIN, Quantity Available, Average Price
    const isin = (getVal(/ISIN/i) || "").toString().trim().toUpperCase();
    const fundName = (getVal(/Symbol|Fund|Scheme/i) || "Unknown").toString().trim();
    const quantity = parseSafeNum(getVal(/Qty|Quantity|Shares|Available/i));
    const avgCost = parseSafeNum(getVal(/Avg.*cost|Average.*Cost|Price|Buy/i));

    if (!isin && !fundName) return null;

    return {
      symbol: isin || fundName,
      fund_name: fundName,
      asset_type: "MUTUAL_FUND",
      holding_context: {
        quantity,
        avg_cost: avgCost,
        current_value: 0,
        pnl_pct: 0,
        current_pnl: 0,
      },
    };
  };

  const processData = (data: any[]) => {
    const mappedData = data.map(mapRow).filter((h: any) => h && h.symbol && h.holding_context.quantity > 0);
    
    if (mappedData.length === 0) {
      setError("No valid mutual fund holdings found.");
      return;
    }

    setSuccess(true);
    onDataParsed(mappedData);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      if (file.name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            setIsUploading(false);
            if (results.errors.length > 0) {
              setError("Error parsing CSV.");
              return;
            }
            processData(results.data);
          },
        });
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setIsUploading(false);
        processData(jsonData);
      } else {
        setIsUploading(false);
        setError("Unsupported format. Use .csv or .xlsx");
      }
    } catch (err) {
      setIsUploading(false);
      setError("Failed to read file.");
      console.error(err);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-text-muted text-[10px] font-black uppercase tracking-widest flex items-center gap-2 select-none">
        {isManual ? (
          <span className="text-accent">Manual Session Active</span>
        ) : (
          <>
            Upload Portoflio
            <a href="/mutual-funds/info" className="hover:text-white transition-colors">
               <Info size={12} />
            </a>
          </>
        )}
      </div>

      <label className="cursor-pointer flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-bold select-none shadow-sm">
        {isUploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" />
            Choose File
          </>
        )}
        <input
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>

      <AnimatePresence mode="wait">
        {success && (
          <motion.span
            key="ok"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[10px] text-success font-black uppercase"
          >
            <CheckCircle2 className="w-3 h-3" /> Ready
          </motion.span>
        )}
        {error && !success && (
          <motion.span
            key="err"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[10px] text-danger font-black uppercase"
          >
            <AlertCircle className="w-3 h-3" /> {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
