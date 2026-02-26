export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-secondary rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 space-y-3">
            <div className="h-4 w-3/4 bg-secondary rounded-lg" />
            <div className="h-3 w-1/2 bg-secondary rounded-lg" />
            <div className="h-3 w-2/3 bg-secondary rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
