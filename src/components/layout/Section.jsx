export default function Section({ title, children, actions }) {
  return (
    <section className="space-y-4">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
