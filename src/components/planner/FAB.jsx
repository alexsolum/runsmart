import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useScrollDirection } from "../../hooks/useScrollDirection";

export function FAB({ onClick }) {
  const scrollDir = useScrollDirection(20);
  const visible = scrollDir === "up";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className="fixed bottom-24 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
          style={{
            background: "rgba(0, 51, 113, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#fff",
          }}
          aria-label="Ny okt"
        >
          <Plus size={24} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
