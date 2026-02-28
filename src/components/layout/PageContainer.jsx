export default function PageContainer({ children, id }) {
  return (
    <div className="w-full" id={id}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-8 space-y-8">
        {children}
      </div>
    </div>
  );
}
