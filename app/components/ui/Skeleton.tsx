// =============================================================================
// VANTA OS — Skeleton Screens (Section 46)
// Pixel-perfect shimmer placeholders that match the real content layout.
// Prevents layout shift + blank white flashes.
// =============================================================================

import { cn } from "~/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("vanta-skeleton h-4 w-full rounded", className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="vanta-card p-5 space-y-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="vanta-card p-5 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Recent activity */}
      <div className="vanta-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTaskList() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="vanta-card p-5 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <SkeletonText lines={2} />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
