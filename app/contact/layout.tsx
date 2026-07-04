/**
 * Shared layout for the contact route segment — /contact.
 * Server component that wraps contact content with public header and footer chrome.
 * Data sources are shared layout components only; submitted form data is handled by the page and API route.
 * Key interactions are inherited navigation plus the nested contact form.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides the public page frame for contact and inquiry content.
 * @param children Nested contact segment content.
 * @returns A full-height layout with header, slate main area, and footer.
 */
export default function ContactLayout({ children }: { children: React.ReactNode }) {
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
