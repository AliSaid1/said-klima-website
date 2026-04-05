import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import Services from '@/components/home/Services';
// HowItWorks has been archived and removed from the live homepage
import Products from '@/components/home/Products';


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
