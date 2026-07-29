import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  className?: string;
}

/** A card-shaped skeleton placeholder for list loading states. */
export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-3",
        className
      )}
      aria-hidden="true"
    >
      {/* Avatar + title row */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {/* Divider row */}
      <div className="border-t border-border pt-3 flex gap-6">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-3 w-10" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

/** A grid of card skeletons for page-level loading states. */
export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
