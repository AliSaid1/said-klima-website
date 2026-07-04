/**
 * Shared layout for the services route segment — /services.
 * Server component that wraps service pages with public header and footer chrome.
 * Data sources are shared layout components only; no API or Supabase access occurs here.
 * Key interactions are provided by navigation links in the surrounding chrome.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides the public page frame for service-related content.
 * @param children Nested services segment content.
 * @returns A full-height flex layout with header, main content area, and footer.
 */
export default function ServicesLayout({ children }: { children: React.ReactNode }) {
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
