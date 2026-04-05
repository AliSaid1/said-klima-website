import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
