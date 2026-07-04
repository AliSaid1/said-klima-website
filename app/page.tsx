/**
 * Public homepage route — /.
 * Server component that composes the marketing landing page from shared header, hero, services, product teaser, and footer sections.
 * Data sources are delegated to the imported home components; this file performs no direct API or Supabase access.
 * Key interactions route visitors toward service contact flows and shop product discovery through the rendered child sections.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Services from '@/components/home/Services';
// HowItWorks has been archived and removed from the live homepage
import Products from '@/components/home/Products';


/**
 * Renders the public landing page shell for the climate technology website.
 * @returns The homepage section stack with global navigation and footer chrome.
 */
export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Services />
      {/* HowItWorks was intentionally archived and is not shown on the site anymore. */}
      <Products />
      <Footer />
    </main>
  );
}
