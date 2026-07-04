/**
 * Admin — orders loading skeleton, /admin/orders.
 *
 * Suspense loading component for bestellungen (order) routes. Renders the
 * shared admin skeleton while order list or detail data resolves.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default orders skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
