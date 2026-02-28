export default function PageContainer({ children, id }) {
  return (
    <div className="w-full" id={id}>
      <div
        className="
          mx-auto
          max-w-7xl
          px-4
          sm:px-6
          lg:px-8
          py-6
          space-y-6
        "
      >
        {children}
      </div>
    </div>
  );
}
