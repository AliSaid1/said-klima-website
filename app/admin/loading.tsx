/**
 * Admin — route loading skeleton, /admin.
 *
 * Suspense loading component for the admin dashboard. Renders the shared admin
 * page skeleton while server data resolves under the admin auth layout.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default dashboard skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
