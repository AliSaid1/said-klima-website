import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden bg-slate-900 min-h-[90vh] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=2832&auto=format&fit=crop"
          alt="Modernes Wohnzimmer mit Klimaanlage"
          fill
          className="object-cover object-center opacity-40"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-outfit font-bold text-white tracking-tight leading-[1.1] mb-6">
            Aufatmen – <br />
            <span className="text-blue-400">Wir kümmern uns darum</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed max-w-xl">
            Wir bedienen Privathaushalte und kleine Unternehmen mit Klimaanlagen-Reparaturen, Installationen und Wartung am selben Tag. Vertrauenswürdiger lokaler Service. Garantierte Ergebnisse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="#book"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-600/25"
            >
              Service buchen
            </Link>
            <Link 
              href="#estimate"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all"
            >
              Angebot einholen
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border (Snowy/Frosty vibe) */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg viewBox="0 0 1440 120" className="w-full h-auto text-slate-50 fill-current" preserveAspectRatio="none">
          <path d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,80C672,64,768,64,864,74.7C960,85,1056,107,1152,106.7C1248,107,1344,85,1392,74.7L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
        </svg>
      </div>
    </section>
  );
}
