/**
 * Shared layout for booking routes — /booking.
 * Server component that wraps buchung (booking) content with public header, footer, and top spacing.
 * Data sources are shared layout components only; booking data and interactions belong to nested booking pages.
 * Key interactions are provided by the nested booking flow and surrounding navigation.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides public chrome for booking route content without touching the booking page implementation.
 * @param children Nested booking segment content.
 * @returns Header, main content region, and footer around the booking flow.
 */
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

