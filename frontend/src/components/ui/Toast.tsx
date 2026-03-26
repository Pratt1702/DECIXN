import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  message: string;
  type?: string;
}

let toastCallback: ((toast: Toast) => void) | null = null;

export const showToast = (title: string, message: string, type = "info") => {
  if (toastCallback) {
    toastCallback({
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
    });
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastCallback = (newToast: Toast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };
    return () => {
      toastCallback = null;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="pointer-events-auto w-80 bg-[#121212]/90 backdrop-blur-xl border border-accent/20 rounded-2xl p-4 shadow-2xl flex gap-4 ring-1 ring-accent/10"
          >
            <div className="p-2 h-fit rounded-lg bg-accent/10 text-accent border border-accent/20">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-text-bold uppercase tracking-wider mb-1 truncate">
                {toast.title}
              </h4>
              <p className="text-[11px] text-text-muted leading-snug font-medium line-clamp-2 italic">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors text-white/20 hover:text-white/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
