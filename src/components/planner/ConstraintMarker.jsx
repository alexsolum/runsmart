import { AlertCircle } from "lucide-react";

export function ConstraintMarker({ reason }) {
  return (
    <div
      className="flex items-center gap-1 mt-1"
      style={{ color: "var(--pa-on-surface-variant)" }}
    >
      <span aria-label="Constraint">
        <AlertCircle size={14} />
      </span>
      {reason ? (
        <span
          style={{
            fontSize: "var(--pa-text-label-sm)",
            fontFamily: "var(--pa-font-body)",
            fontWeight: 400,
          }}
        >
          {reason}
        </span>
      ) : null}
    </div>
  );
}

