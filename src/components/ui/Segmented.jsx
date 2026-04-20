export default function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o}
          className={value === o ? "on" : ""}
          onClick={() => onChange(o)}
          type="button"
        >
          {o}
        </button>
      ))}
    </div>
  );
}
