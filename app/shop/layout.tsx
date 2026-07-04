/**
 * Shared layout for shop routes — /shop and nested product pages.
 * Server component that wraps shop content with public header and footer chrome.
 * Data sources are shared layout components only; product data is fetched by nested pages.
 * Key interactions are nested catalog, product detail, and cart navigation flows.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides the public frame for shop listing, detail, and success pages.
 * @param children Nested shop route content.
 * @returns A full-height page layout with header, main content, and footer.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Header />
      <main className="flex-grow bg-slate-50">
        {children}
      </main>
      <Footer />
    </div>
  );
}
