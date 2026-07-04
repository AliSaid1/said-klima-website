/**
 * Homepage hero module for the public landing page.
 * Presents the primary climate-control value proposition and entry points to
 * the shop and service inquiry flows.
 */

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, CalendarDays } from 'lucide-react';

/**
 * Renders the public homepage hero as a server component.
 *
 * Uses a priority background image, readable gradient overlay, headline copy,
 * and two prominent calls to action: product discovery and service Anfrage
 * (inquiry).
 */
export default function Hero() {
  return (
    <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden bg-slate-900 min-h-[90vh] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/HeroPhoto_LG.jpg"
          alt="Modernes Wohnzimmer mit Klimaanlage"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Lighter gradient overlay so the photo shows through more clearly while keeping text readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-slate-900/20 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-outfit font-bold text-white tracking-tight leading-[1.1] mb-6">
            Alles für Ihre Klimaanlage -<br />
            <span className="text-blue-400">Produkte. Service. Komfort.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed max-w-xl">
            Entdecken Sie hochwertige Klimageräte und Zubehör – kombiniert mit professioneller Installation, Wartung und Reparatur aus einer Hand.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/shop"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg hover:shadow-blue-600/25"
            >
              <ShoppingBag className="w-5 h-5" />
              Produkte entdecken
            </Link>
            <Link 
              href="/contact?thema=Beratung"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-full text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all"
            >
              <CalendarDays className="w-5 h-5" />
              Service anfragen
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg viewBox="0 0 1440 120" className="w-full h-auto text-slate-50 fill-current" preserveAspectRatio="none">
          <path d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,80C672,64,768,64,864,74.7C960,85,1056,107,1152,106.7C1248,107,1344,85,1392,74.7L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
        </svg>
      </div>
    </section>
  );
}
