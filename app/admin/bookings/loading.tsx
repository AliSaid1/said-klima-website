/**
 * Admin — bookings loading skeleton, /admin/bookings.
 *
 * Suspense loading component for buchungen (booking) routes. Renders an
 * expanded admin page skeleton while booking data loads under the admin guard.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the bookings skeleton with additional rows for calendar/list data.
 */
export default function Loading() {
  return <AdminPageSkeleton rows={8} />;
}
