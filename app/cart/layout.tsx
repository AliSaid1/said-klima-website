import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">{children}</main>
      <Footer />
    </>
  );
}

