/**
 * Admin — settings loading skeleton, /admin/settings.
 *
 * Suspense loading component for einstellungen (settings). Renders a compact
 * admin skeleton while company settings and shipping data resolve.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the settings skeleton with rows sized for configuration sections.
 */
export default function Loading() {
  return <AdminPageSkeleton rows={3} />;
}
