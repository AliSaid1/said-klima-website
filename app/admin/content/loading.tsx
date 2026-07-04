/**
 * Admin — content loading skeleton, /admin/content.
 *
 * Suspense loading component for rechtstext (legal/CMS page) routes. Renders
 * the shared admin skeleton while CMS list or editor data is fetched.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the default content skeleton during route-level loading.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
