/**
 * Shared layout for legal routes — /legal/*.
 * Server component wrapping rechtstext (legal/CMS page) children with public header, footer, white background, and prose typography.
 * Data sources are shared layout components only; individual legal pages fetch their Supabase CMS rows.
 * Key interactions are read-only legal content viewing and navigation through header/footer links.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides consistent chrome and typography for legal/CMS pages.
 * @param children Nested legal route content such as agb, datenschutz, impressum, widerruf, or versand-zahlung.
 * @returns A constrained prose layout framed by the public header and footer.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Header />
      <main className="flex-grow bg-white py-12 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-slate prose-blue">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
