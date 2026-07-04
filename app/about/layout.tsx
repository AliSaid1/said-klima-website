/**
 * Shared layout for the about route segment — /about.
 * Server component that wraps children with the public header, footer, top offset, and slate page background.
 * Data sources are shared layout components only; no API or Supabase access occurs here.
 * Key interactions are inherited from the header navigation and footer links.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides public chrome around the about page content.
 * @param children Nested about segment content.
 * @returns A full-height page frame with header, main region, and footer.
 */
export default function AboutLayout({ children }: { children: React.ReactNode }) {
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
