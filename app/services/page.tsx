import Link from 'next/link';
import { Wrench, Settings, PenTool, ArrowRight } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6">
          Unsere Dienstleistungen
        </h1>
        <p className="text-lg text-slate-600">
          Wir bieten umfassende Lösungen für Ihre Kälte- und Klimatechnik. Von der Erstberatung über die fachgerechte Installation bis hin zur regelmäßigen Wartung.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {/* Installation */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4">Installation</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Fachgerechte Montage Ihrer neuen Klimaanlage durch unsere zertifizierten Techniker. Wir garantieren eine saubere und schnelle Installation nach höchsten Qualitätsstandards.
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Vor-Ort-Beratung</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Fachgerechte Montage</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Inbetriebnahme & Einweisung</li>
          </ul>
          <Link href="/contact" className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors mt-auto">
            Termin vereinbaren <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Wartung */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">Bestseller</div>
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Settings className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4">Wartung</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Regelmäßige Wartung verlängert die Lebensdauer Ihrer Anlage, sichert die Energieeffizienz und sorgt für hygienisch reine Luft.
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Filterreinigung/-wechsel</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Dichtheitsprüfung</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Funktionskontrolle</li>
          </ul>
          <Link href="/contact" className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors mt-auto shadow-md shadow-blue-600/20">
            Wartung buchen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Reparatur */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <PenTool className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold font-outfit text-slate-900 mb-4">Reparatur</h3>
          <p className="text-slate-600 mb-8 flex-grow">
            Ihre Anlage kühlt nicht mehr richtig oder macht ungewöhnliche Geräusche? Unser Notdienst ist schnell zur Stelle und behebt das Problem.
          </p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Schnelle Fehlerdiagnose</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Original-Ersatzteile</li>
            <li className="flex items-center gap-2 text-sm text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Transparente Kosten</li>
          </ul>
          <Link href="/contact" className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-50 text-blue-600 font-medium rounded-xl hover:bg-blue-100 transition-colors mt-auto">
            Notdienst rufen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-center text-white">
        <h2 className="text-3xl font-bold font-outfit mb-4">Sie sind sich nicht sicher, welchen Service Sie benötigen?</h2>
        <p className="text-slate-300 mb-8 max-w-2xl mx-auto">Kontaktieren Sie uns für eine unverbindliche Beratung. Wir helfen Ihnen gerne weiter und finden die passende Lösung für Ihr Anliegen.</p>
        <Link href="/contact" className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-100 transition-colors">
          Jetzt Kontakt aufnehmen
        </Link>
      </div>
    </div>
  );
}
