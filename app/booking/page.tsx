'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, User, CheckCircle, ArrowRight, ArrowLeft, Loader2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Dienstleistung {
  id: string;
  code: string;
  name: string;
  beschreibung: string | null;
  basispreis_brutto: number;
  dauer_minuten: number;
}

interface TimeSlot {
  start: string;
  end: string;
  techniker_id: string;
  techniker_name: string;
}

const steps = [
  { label: 'Dienstleistung', icon: Wrench },
  { label: 'Datum', icon: CalendarDays },
  { label: 'Uhrzeit', icon: Clock },
  { label: 'Kontakt', icon: User },
  { label: 'Bestätigung', icon: CheckCircle },
];

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Dienstleistung[]>([]);
  const [selectedService, setSelectedService] = useState<Dienstleistung | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState({ vorname: '', nachname: '', email: '', telefon: '', hinweise: '' });

  // Fetch services on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/services')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        const active = (json.data || []).filter((s: Dienstleistung) => s.basispreis_brutto >= 0);
        setServices(active);
      });
    return () => { mounted = false; };
  }, []);

  // Fetch available slots when date changes
  const fetchSlots = useCallback(async (date: string, serviceId: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSelectedSlot(null);

    try {
      const params = new URLSearchParams({ date, dienstleistung_id: serviceId });
      const res = await fetch(`/api/availability?${params}`);
      const json = await res.json();
      setAvailableSlots(json.data || []);
      if (json.blocked) {
        toast.info('Dieser Tag ist nicht verfügbar');
      }
    } catch {
      toast.error('Fehler beim Laden der Zeitfenster');
    }
    setLoadingSlots(false);
  }, []);

  // Fetch available slots when date changes
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (date && selectedService) {
      fetchSlots(date, selectedService.id);
    }
  };

  // Get min date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Max date (3 months ahead)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!contact.vorname || !contact.nachname || !contact.email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSubmitting(true);

    const geplantVon = `${selectedDate}T${selectedSlot.start}:00`;
    const geplantBis = `${selectedDate}T${selectedSlot.end}:00`;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dienstleistung_id: selectedService.id,
          techniker_id: selectedSlot.techniker_id,
          geplant_von: geplantVon,
          geplant_bis: geplantBis,
          hinweise: contact.hinweise || null,
          // Contact info stored as hinweise until user account is created
          kontakt: {
            vorname: contact.vorname,
            nachname: contact.nachname,
            email: contact.email,
            telefon: contact.telefon,
          },
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setStep(4);
      } else {
        const json = await res.json();
        toast.error(json.error || 'Fehler bei der Buchung');
      }
    } catch {
      toast.error('Verbindungsfehler');
    }
    setSubmitting(false);
  };

  const canGoNext = () => {
    switch (step) {
      case 0: return !!selectedService;
      case 1: return !!selectedDate;
      case 2: return !!selectedSlot;
      case 3: return !!(contact.vorname && contact.nachname && contact.email);
      default: return false;
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">Termin erfolgreich gebucht!</h1>
        <p className="text-slate-600 mb-2">Vielen Dank, {contact.vorname}!</p>
        <p className="text-slate-500 mb-8">
          Ihr Termin für <strong>{selectedService?.name}</strong> am{' '}
          <strong>{new Date(selectedDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>{' '}
          um <strong>{selectedSlot?.start} Uhr</strong> wurde bestätigt.
          Sie erhalten in Kürze eine Bestätigungs-E-Mail.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          Zurück zur Startseite
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-bold tracking-wider uppercase text-blue-600 mb-2">Terminbuchung</p>
        <h1 className="text-3xl sm:text-4xl font-outfit font-bold text-slate-900">Service-Termin buchen</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">Wählen Sie eine Dienstleistung und einen passenden Termin</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {steps.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isDone ? 'bg-green-100 text-green-700' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {isDone ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 ${i < step ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
        {/* Step 0: Select Service */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-outfit font-bold text-slate-900 mb-5">Dienstleistung wählen</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    selectedService?.id === s.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium text-slate-900">{s.name}</p>
                  {s.beschreibung && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.beschreibung}</p>}
                  <div className="flex items-center gap-3 mt-3 text-sm">
                    <span className="font-bold text-blue-600">ab {Number(s.basispreis_brutto).toFixed(2)} €</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{s.dauer_minuten} Min.</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select Date */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-outfit font-bold text-slate-900 mb-5">Datum wählen</h2>
            <p className="text-sm text-slate-500 mb-4">Wählen Sie einen verfügbaren Tag für Ihren Termin.</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={minDateStr}
              max={maxDateStr}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        )}

        {/* Step 2: Select Time */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-outfit font-bold text-slate-900 mb-2">Uhrzeit wählen</h2>
            <p className="text-sm text-slate-500 mb-5">
              Verfügbare Zeitfenster am {new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            {loadingSlots ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Lade verfügbare Zeiten…</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Keine Zeitfenster verfügbar</p>
                <p className="text-sm text-slate-400 mt-1">Bitte wählen Sie ein anderes Datum.</p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 text-sm text-blue-600 hover:underline font-medium"
                >
                  ← Datum ändern
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableSlots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-3 rounded-xl border-2 text-center transition-all ${
                      selectedSlot?.start === slot.start && selectedSlot?.techniker_id === slot.techniker_id
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-slate-900">{slot.start} – {slot.end}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-outfit font-bold text-slate-900 mb-5">Ihre Kontaktdaten</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vorname *</label>
                <input
                  value={contact.vorname}
                  onChange={(e) => setContact({ ...contact, vorname: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Max"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachname *</label>
                <input
                  value={contact.nachname}
                  onChange={(e) => setContact({ ...contact, nachname: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail *</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="max@beispiel.de"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
                <input
                  type="tel"
                  value={contact.telefon}
                  onChange={(e) => setContact({ ...contact, telefon: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="0123 456 789"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Hinweise (optional)</label>
                <textarea
                  value={contact.hinweise}
                  onChange={(e) => setContact({ ...contact, hinweise: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  placeholder="z.B. Gerätetyp, Stockwerk, besondere Anfahrt…"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {!submitted && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Termin buchen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Card */}
      {(step > 0) && (
        <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-3">Ihre Auswahl</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {selectedService && (
              <div>
                <span className="text-slate-500">Dienstleistung:</span>{' '}
                <span className="font-medium text-slate-900">{selectedService.name}</span>
              </div>
            )}
            {selectedDate && (
              <div>
                <span className="text-slate-500">Datum:</span>{' '}
                <span className="font-medium text-slate-900">
                  {new Date(selectedDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            )}
            {selectedSlot && (
              <div>
                <span className="text-slate-500">Uhrzeit:</span>{' '}
                <span className="font-medium text-slate-900">{selectedSlot.start} – {selectedSlot.end}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

