'use client';
import { useState, useEffect, Suspense } from 'react';
import { Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
function ContactForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const thema = searchParams.get('thema');
  const produkt = searchParams.get('produkt');
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    firma: '',
    strasse: '',
    plz: '',
    ort: '',
    interesse: thema === 'angebot' ? 'Angebot für Produkt' : 'Allgemeine Anfrage',
    produktName: produkt || '',
    raeume: '',
    flaeche: '',
    standort: '',
    nachricht: '',
  });
  const isAngebot = form.interesse === 'Angebot für Produkt' || form.interesse === 'Neues Klimagerät (Kauf/Installation)';
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname || !form.nachname || !form.email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Beim Senden ist ein Fehler aufgetreten.');
        return;
      }
      setSent(true);
      toast.success('Nachricht erfolgreich gesendet!');
    } catch {
      toast.error('Netzwerkfehler — bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };
  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">Vielen Dank!</h1>
        <p className="text-slate-600 mb-8">
          Ihre Anfrage wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.
        </p>
        <button
          onClick={() => { setSent(false); setForm({ ...form, nachricht: '' }); }}
          className="text-blue-600 font-medium hover:underline"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-4">
          Kontakt & Anfrage
        </h1>
        <p className="text-lg text-slate-600">
          Schreiben Sie uns Ihr Anliegen. Wir beraten Sie gerne.
        </p>
      </div>
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Interesse */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Interesse an *</label>
            <select value={form.interesse} onChange={(e) => updateField('interesse', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
              <option>Allgemeine Anfrage</option>
              <option>Angebot für Produkt</option>
              <option>Neues Klimagerät (Kauf/Installation)</option>
              <option>Wartung</option>
              <option>Reparatur</option>
              <option>Beratung</option>
            </select>
          </div>
          {/* Angebot specific fields */}
          {isAngebot && (
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-6">
              <h3 className="text-lg font-bold text-blue-900 font-outfit">Räumliche Gegebenheiten</h3>
              {form.produktName && (
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1.5">Ausgewähltes Produkt</label>
                  <input type="text" readOnly value={form.produktName} className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-blue-100/50 text-blue-900 focus:outline-none cursor-not-allowed" />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Wie viele Räume möchten Sie kühlen / heizen?</label>
                  <select value={form.raeume} onChange={(e) => updateField('raeume', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">— Bitte wählen —</option>
                    <option>1 Raum</option>
                    <option>2 Räume</option>
                    <option>3 Räume</option>
                    <option>4 Räume oder mehr</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Zu kühlende Fläche (m²) insgesamt</label>
                  <input type="number" value={form.flaeche} onChange={(e) => updateField('flaeche', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="z.B. 45" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Standort der Anlage(n)</label>
                <select value={form.standort} onChange={(e) => updateField('standort', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                  <option value="">— Bitte wählen —</option>
                  <option>Dachgeschoss</option>
                  <option>Erdgeschoss</option>
                  <option>Dach- und Erdgeschoss</option>
                  <option>Etagenwohnung / Anderes</option>
                </select>
              </div>
            </div>
          )}
          {/* Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vorname *</label>
              <input type="text" value={form.vorname} onChange={(e) => updateField('vorname', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Max" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachname *</label>
              <input type="text" value={form.nachname} onChange={(e) => updateField('nachname', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Mustermann" required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail Adresse *</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="max@beispiel.de" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefonnummer</label>
              <input type="tel" value={form.telefon} onChange={(e) => updateField('telefon', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="+49 123 456789" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachricht / Zusätzliche Infos</label>
            <textarea value={form.nachricht} onChange={(e) => updateField('nachricht', e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" placeholder="Ihre Nachricht an uns..."></textarea>
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 text-lg mt-4">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Anfrage senden</>}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}>
        <ContactForm />
      </Suspense>
    </div>
  );
}
