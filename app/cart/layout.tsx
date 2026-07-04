/**
 * Shared layout for the cart route segment — /cart.
 * Server component that wraps the cart with public header, footer, and top spacing.
 * Data sources are shared layout components only; cart data is provided inside the client page.
 * Key interactions are the nested cart actions and surrounding navigation.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides public chrome for the shopping cart page.
 * @param children Nested cart content.
 * @returns Header, main content region, and footer around the cart segment.
 */
export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

