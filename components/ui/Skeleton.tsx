/**
 * UI skeleton module for loading placeholders.
 * Provides reusable pulse placeholders for primitive blocks, table rows,
 * admin statistic cards, and product cards.
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  /** Additional Tailwind classes merged onto the base skeleton block. */
  className?: string;
}

/**
 * Renders a generic rectangular loading placeholder.
 *
 * @param props - Component props.
 * @param props.className - Optional classes controlling size, shape, or spacing.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-slate-200 animate-pulse rounded-xl', className)} />
  );
}

/** Skeleton for a table row */
/**
 * Renders a table-row loading placeholder with configurable column count.
 *
 * @param props - Component props.
 * @param props.cols - Number of placeholder table cells to render.
 */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for a stat card */
/**
 * Renders a loading placeholder matching the admin statistics-card layout.
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/** Skeleton for a product card */
/**
 * Renders a loading placeholder matching the public shop product-card layout.
 */
export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
