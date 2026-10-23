import React from "react";

/**
 * Skeleton – a simple pulse placeholder for loading states.
 * Follows the Nevora design brief: "Use skeleton loaders with the same
 * dimensions as the real content."
 */
export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-line/40 rounded animate-pulse ${className}`}
      {...props}
    />
  );
}

/**
 * SkeletonTable – renders a ghost version of a data table.
 * @param rows – number of skeleton rows (default 3)
 * @param cols – number of columns (default 4)
 */
export function SkeletonTable({
  rows = 3,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="bg-surface border border-line rounded-card overflow-hidden">
      {/* Header */}
      <div className="bg-paper border-b border-line py-3 px-4 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`h-${i}`}
            className="h-3"
            style={{ width: `${60 + i * 20}px` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="py-4 px-4 border-b border-line last:border-b-0 flex items-center gap-8"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={`${r}-${c}`}
              className="h-4"
              style={{ width: `${50 + ((c * 30 + r * 7) % 60)}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonCard – a single card-shaped placeholder.
 */
export function SkeletonCard({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-card p-5 space-y-3 ${className}`}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-3 w-full max-w-[280px]" />
    </div>
  );
}
