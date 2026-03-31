export function RestCard() {
  return (
    <div
      className="rounded-lg px-2 py-1.5"
      style={{
        background: "var(--pa-type-rest-container)",
      }}
    >
      <div
        style={{
          fontSize: "var(--pa-text-label-sm)",
          fontFamily: "var(--pa-font-body)",
          fontWeight: 400,
          color: "var(--pa-type-rest)",
        }}
      >
        Hviledag
      </div>
    </div>
  );
}

