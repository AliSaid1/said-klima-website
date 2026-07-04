/**
 * Shared loading skeleton for admin data pages.
 * Used by every admin route's loading.tsx.
 */
/**
 * Server component module for reusable admin loading placeholders.
 * Provides a table-oriented skeleton while admin routes fetch protected data.
 */
/**
 * Renders the standardized admin page loading state with placeholder title,
 * action bar, table header, and configurable placeholder rows.
 *
 * @param props - Component props.
 * @param props.rows - Number of table body placeholder rows to render.
 */
export default function AdminPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 animate-pulse">
      {/* Page title */}
      <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-10 w-64 bg-slate-200 rounded-full" />
        <div className="h-10 w-32 bg-slate-200 rounded-full" />
      </div>

      {/* Table header */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex gap-4 px-6 py-4 border-b border-slate-100">
          {[40, 20, 20, 20].map((w, i) => (
            <div key={i} className={`h-4 bg-slate-200 rounded`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-4 border-b border-slate-50 last:border-0">
            {[40, 20, 20, 20].map((w, j) => (
              <div key={j} className={`h-4 bg-slate-100 rounded`} style={{ width: `${w}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
