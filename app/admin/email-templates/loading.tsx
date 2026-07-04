/**
 * Admin — email templates loading skeleton, /admin/email-templates.
 *
 * Suspense loading component for email_vorlagen (email templates). Renders a
 * compact admin skeleton while template data loads behind the admin guard.
 */
import AdminPageSkeleton from '@/components/admin/AdminPageSkeleton';

/**
 * Displays the email template skeleton with rows sized for the template list.
 */
export default function Loading() {
  return <AdminPageSkeleton rows={4} />;
}
