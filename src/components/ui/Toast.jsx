import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  type = "default",
  action,
  duration = 5000,
  onClose,
  visible,
}) {
  useEffect(() => {
    if (visible && duration !== Infinity) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className={cn(
            "fixed bottom-6 left-1/2 z-[100] flex min-w-[320px] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl p-4 shadow-2xl backdrop-blur-xl",
            type === "destructive"
              ? "bg-red-600/90 text-white"
              : "bg-slate-900/90 text-white"
          )}
        >
          <div className="flex-1 text-sm font-medium">{message}</div>
          
          <div className="flex items-center gap-2">
            {action && (
              <button
                type="button"
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-white/30"
              >
                {action.label}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 transition-colors hover:bg-white/10"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
