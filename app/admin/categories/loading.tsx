/**
 * Admin — categories loading skeleton, /admin/categories.
 *
 * Suspense loading component for kategorie (category) administration. Renders
 * the shared admin skeleton while category data loads under the admin guard.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default category skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
