/**
 * Admin — products loading skeleton, /admin/products.
 *
 * Suspense loading component for artikel (product) routes. Renders the shared
 * admin skeleton while product list, create, or editor data resolves.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default product skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
