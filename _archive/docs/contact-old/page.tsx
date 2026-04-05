'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    firma: '',
    strasse: '',
    plz: '',
    ort: '',
    interesse: 'Allgemeine Anfrage',
    nachricht: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname || !form.nachname || !form.email || !form.nachricht) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    setLoading(true);
    // Simulate sending (replace with actual API call later)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSent(true);
    toast.success('Nachricht erfolgreich gesendet!');
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">Vielen Dank!</h1>
          <p className="text-slate-600 mb-8">
            Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.
          </p>
          <button
            onClick={() => { setSent(false); setForm({ vorname: '', nachname: '', email: '', telefon: '', firma: '', strasse: '', plz: '', ort: '', interesse: 'Allgemeine Anfrage', nachricht: '' }); }}
            className="text-blue-600 font-medium hover:underline"
          >
            Weitere Nachricht senden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6">
          Kontaktieren Sie uns
        </h1>
        <p className="text-lg text-slate-600">
          Haben Sie Fragen zu unseren Produkten oder Dienstleistungen? Wir sind für Sie da. Füllen Sie das Kontaktformular aus oder rufen Sie uns direkt an.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Kontaktformular */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Kontaktformular</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vorname *</label>
                <input type="text" value={form.vorname} onChange={(e) => updateField('vorname', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Max" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachname *</label>
                <input type="text" value={form.nachname} onChange={(e) => updateField('nachname', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Mustermann" required />
              </div>
            </div>

            {/* Firma (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Firmenname <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={form.firma} onChange={(e) => updateField('firma', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Firma GmbH" />
            </div>

            {/* Kontakt */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail Adresse *</label>
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="max@beispiel.de" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefonnummer</label>
                <input type="tel" value={form.telefon} onChange={(e) => updateField('telefon', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="+49 123 456789" />
              </div>
            </div>

            {/* Adresse */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 mt-2">Adresse</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Straße & Hausnummer *</label>
                  <input type="text" value={form.strasse} onChange={(e) => updateField('strasse', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Musterstraße 123" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">PLZ *</label>
                    <input type="text" value={form.plz} onChange={(e) => updateField('plz', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="10115" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ort *</label>
                    <input type="text" value={form.ort} onChange={(e) => updateField('ort', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Berlin" required />
                  </div>
                </div>
              </div>
            </div>

            {/* Interesse */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Interesse an</label>
              <select value={form.interesse} onChange={(e) => updateField('interesse', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white">
                <option>Allgemeine Anfrage</option>
                <option>Neues Klimagerät (Kauf/Installation)</option>
                <option>Wartung</option>
                <option>Reparatur</option>
                <option>Beratung</option>
              </select>
            </div>

            {/* Nachricht */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachricht *</label>
              <textarea value={form.nachricht} onChange={(e) => updateField('nachricht', e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" placeholder="Wie können wir Ihnen helfen?" required></textarea>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Nachricht senden</>}
            </button>
          </form>
        </div>

        {/* Kontaktdaten */}
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

          {/* Karte */}
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
