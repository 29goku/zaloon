export default function Loading() {
  return (
    <div className="p-4 md:p-8 space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded-lg w-48" />
      <div className="h-4 bg-muted rounded w-72" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}
