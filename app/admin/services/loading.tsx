/**
 * Admin — services loading skeleton, /admin/services.
 *
 * Suspense loading component for dienstleistung (service) administration.
 * Renders the shared admin skeleton while service data loads under the guard.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default services skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
