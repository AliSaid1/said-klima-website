/**
 * Public service overview page — /services.
 * Server component describing dienstleistung (service) offerings for installation, Wartung (maintenance), and repair.
 * Data sources are static service copy and icon components; no API or Supabase queries are made.
 * Key interactions are links into /contact with preselected thema query parameters for inquiry routing.
 */

import Link from 'next/link';
import { Wrench, Settings, PenTool, ArrowRight } from 'lucide-react';

/**
 * Renders the service cards and consultation call-to-action for regional climate technology work.
 * @returns A static service listing with deep links to the contact form.
 */
export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6">
          Unsere Dienstleistungen
        </h1>
        <p className="text-lg text-slate-600 mb-4">
          Wir bieten umfassende Lösungen für Ihre Kälte- und Klimatechnik. Von der Erstberatung über die fachgerechte Installation bis hin zur regelmäßigen Wartung.
        </p>
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          Verfügbar in Osnabrück und im Umkreis von 70 km
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {/* Installation */}
        <Link href="/contact?thema=Neues%20Klimagerät%20(Kauf%2FInstallation)" className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 focus-within:scale-110 group-hover:scale-110 transition-transform duration-300">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">Installation</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Fachgerechte Montage Ihrer neuen Klimaanlage durch unsere zertifizierten Techniker. Wir garantieren eine saubere und schnelle Installation nach höchsten Qualitätsstandards.
          </p>
          <ul className="space-y-3 mt-auto">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Vor-Ort-Beratung</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Fachgerechte Montage</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Inbetriebnahme & Einweisung</li>
          </ul>
        </Link>

        {/* Wartung */}
        <Link href="/contact?thema=Wartung" className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">Bestseller</div>
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Settings className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">Wartung</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Regelmäßige Wartung verlängert die Lebensdauer Ihrer Anlage, sichert die Energieeffizienz und sorgt für hygienisch reine Luft.
          </p>
          <ul className="space-y-3 mt-auto">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Filterreinigung/-wechsel</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Dichtheitsprüfung</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Funktionskontrolle</li>
          </ul>
        </Link>

        {/* Reparatur */}
        <Link href="/contact?thema=Reparatur" className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <PenTool className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">Reparatur</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Ihre Anlage kühlt nicht mehr richtig oder macht ungewöhnliche Geräusche? Unser Notdienst ist schnell zur Stelle und behebt das Problem.
          </p>
          <ul className="space-y-3 mt-auto">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Schnelle Fehlerdiagnose</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Original-Ersatzteile</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Transparente Kosten</li>
          </ul>
        </Link>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white">
        <h2 className="text-3xl font-bold font-outfit mb-4">Welchen Service benötigen Sie? Wir helfen Ihnen weiter.</h2>
        <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Unsere Experten beraten Sie kostenlos und finden die passende Lösung.</p>
        <Link href="/contact?thema=Beratung" className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-100 transition-transform hover:scale-105">
          Jetzt Beratung anfragen
        </Link>
      </div>
    </div>
  );
}
