export default function Chip({ kind = "ghost", children, ...rest }) {
  return (
    <span className={`chip ${kind}`} {...rest}>
      {children}
    </span>
  );
}
