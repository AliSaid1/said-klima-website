import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6">
          Kontaktieren Sie uns
        </h1>
        <p className="text-lg text-slate-600">
          Haben Sie Fragen zu unseren Produkten oder Dienstleistungen? Wir sind für Sie da. Füllen Sie das Formular aus oder rufen Sie uns direkt an.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Schreiben Sie uns</h2>
          <form className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">Vorname</label>
                <input type="text" id="firstName" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Max" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">Nachname</label>
                <input type="text" id="lastName" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Mustermann" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">E-Mail Adresse</label>
              <input type="email" id="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="max@beispiel.de" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">Telefonnummer</label>
              <input type="tel" id="phone" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="+49 123 456789" />
            </div>
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-2">Interesse an</label>
              <select id="service" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white">
                <option>Allgemeine Anfrage</option>
                <option>Neues Klimagerät (Kauf/Installation)</option>
                <option>Wartung</option>
                <option>Reparatur</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">Nachricht</label>
              <textarea id="message" rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" placeholder="Wie können wir Ihnen helfen?"></textarea>
            </div>
            <button type="button" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">
              Nachricht senden
            </button>
          </form>
        </div>

        {/* Contact Info & Map */}
        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold font-outfit mb-6">Kontaktdaten</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Adresse</h3>
                  <p className="text-slate-300">Musterstraße 123<br />10115 Berlin<br />Deutschland</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Telefon</h3>
                  <p className="text-slate-300">0800 123 4567<br />(Kostenfrei aus dem dt. Festnetz)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">E-Mail</h3>
                  <p className="text-slate-300">info@said-klima.de</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Öffnungszeiten</h3>
                  <p className="text-slate-300">Mo - Fr: 08:00 - 18:00 Uhr<br />Sa: 09:00 - 14:00 Uhr</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="h-64 bg-slate-200 rounded-3xl overflow-hidden relative border border-slate-200">
            <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500">
              <MapPin className="w-8 h-8 mb-2" />
              <span className="font-medium">Kartenansicht (Google Maps Platzhalter)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
