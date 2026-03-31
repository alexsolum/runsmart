import { Trophy } from "lucide-react";

export function RaceCard({ entry }) {
  return (
    <div
      className="rounded-lg px-2 py-3 text-center flex flex-col items-center gap-1"
      style={{ background: "var(--pa-type-race)", color: "#fff" }}
    >
      <span role="img" aria-label="Race">
        <Trophy size={20} />
      </span>
      <div
        className="truncate w-full"
        style={{
          fontSize: "var(--pa-text-label-md)",
          fontFamily: "var(--pa-font-body)",
          fontWeight: 700,
        }}
      >
        {entry?.description || "Lop / Arrangement"}
      </div>
    </div>
  );
}

