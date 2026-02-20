import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
