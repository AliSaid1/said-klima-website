/**
 * Admin — technicians loading skeleton, /admin/technicians.
 *
 * Suspense loading component for techniker (technician) administration. Renders
 * the shared admin skeleton while technician records are fetched.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default technician skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
