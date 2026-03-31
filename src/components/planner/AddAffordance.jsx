import { Plus } from "lucide-react";

export function AddAffordance({ onAdd }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center w-full py-2 transition-opacity duration-150"
      style={{ color: "var(--pa-primary)", opacity: 0.4 }}
      aria-label="Legg til okt"
      onMouseEnter={(event) => {
        event.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = "0.4";
      }}
      onClick={() => onAdd?.()}
    >
      <Plus size={16} />
    </button>
  );
}
