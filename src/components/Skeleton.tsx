/**
 * src/components/Skeleton.tsx
 *
 * Animated placeholder shape, replacing plain "Loading…" text across
 * the app. Uses the same shimmer keyframe pattern as the toast
 * animation — defined once in tailwind.config.js, referenced by name
 * here rather than an inline arbitrary keyframe.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-[var(--surface-2)] via-[var(--border)] to-[var(--surface-2)] bg-[length:400%_100%] animate-shimmer rounded-md ${className}`}
    />
  );
}

/** A row of skeletons matching the shape of a typical list item
 * (icon/thumbnail + two lines of text) — used by screens whose loading
 * state is a list (Products, Tables, Store Management). */
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="w-9 h-9 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}
