'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays, Clock, User, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, Wrench, X, ChevronLeft, ChevronRight, Sun, Sunrise, Sunset,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────
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

interface DaySlots {
  date: string;
  slots: TimeSlot[];
  blocked: boolean;
}

const steps = [
  { label: 'Services', icon: Wrench },
  { label: 'Datum', icon: CalendarDays },
  { label: 'Uhrzeit', icon: Clock },
  { label: 'Kontakt', icon: User },
  { label: 'Fertig', icon: CheckCircle },
];

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// ─── Helpers ──────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'long' });
}

function getTimePeriod(time: string): 'morning' | 'midday' | 'afternoon' {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 15) return 'midday';
  return 'afternoon';
}

const periodConfig = {
  morning: { label: 'Vormittag', sublabel: '08:00 – 12:00', icon: Sunrise, color: 'amber' },
  midday: { label: 'Mittag', sublabel: '12:00 – 15:00', icon: Sun, color: 'orange' },
  afternoon: { label: 'Nachmittag', sublabel: '15:00 – 17:00', icon: Sunset, color: 'indigo' },
};

// ─── Mini Calendar Component ──────────────────────────────
function MiniCalendar({
  selectedDates,
  onToggleDate,
  minDate,
  maxDate,
}: {
  selectedDates: string[];
  onToggleDate: (date: string) => void;
  minDate: Date;
  maxDate: Date;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  // getDay() returns 0=Sun, we want 0=Mon
  const firstDayOfWeek = (new Date(viewMonth.year, viewMonth.month, 1).getDay() + 6) % 7;

  const canPrev = new Date(viewMonth.year, viewMonth.month, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const canNext = new Date(viewMonth.year, viewMonth.month, 1) < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  const goMonth = (dir: number) => {
    setViewMonth((v) => {
      let m = v.month + dir;
      let y = v.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => goMonth(-1)}
          disabled={!canPrev}
          className="p-2 rounded-xl hover:bg-slate-100 transition disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h3 className="text-base font-semibold text-slate-900">
          {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
        </h3>
        <button
          onClick={() => goMonth(1)}
          disabled={!canNext}
          className="p-2 rounded-xl hover:bg-slate-100 transition disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateObj = new Date(viewMonth.year, viewMonth.month, day);
          const dateStr = toDateStr(dateObj);
          const isSunday = dateObj.getDay() === 0;
          const isSaturday = dateObj.getDay() === 6;
          const isWeekend = isSunday || isSaturday;
          const isPast = dateObj < new Date(new Date().toDateString());
          const isTooEarly = dateObj <= minDate;
          const isTooLate = dateObj > maxDate;
          const isDisabled = isPast || isTooEarly || isTooLate || isWeekend;
          const isSelected = selectedDates.includes(dateStr);
          const isToday = toDateStr(new Date()) === dateStr;

          return (
            <button
              key={day}
              onClick={() => !isDisabled && onToggleDate(dateStr)}
              disabled={isDisabled}
              className={`
                relative w-full aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                  : isDisabled
                    ? 'text-slate-200 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer'
                }
                ${isToday && !isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
              `}
            >
              {day}
              {isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Booking Page ────────────────────────────────────
export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Dienstleistung[]>([]);
  const [selectedServices, setSelectedServices] = useState<Dienstleistung[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [daySlotsMap, setDaySlotsMap] = useState<Record<string, DaySlots>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<string, TimeSlot>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contact, setContact] = useState({ vorname: '', nachname: '', email: '', telefon: '', hinweise: '' });
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.basispreis_brutto * selectedDates.length, 0);
  }, [selectedServices, selectedDates]);

  // Total duration (minimum 60 min for clean slot display)
  const totalDuration = useMemo(() => {
    return Math.max(60, selectedServices.reduce((sum, s) => sum + s.dauer_minuten, 0));
  }, [selectedServices]);

  // Fetch available slots for ALL selected dates
  const fetchAllSlots = useCallback(async (dates: string[], svcs: Dienstleistung[]) => {
    if (dates.length === 0 || svcs.length === 0) return;

    setLoadingSlots(true);
    setSelectedSlots({});

    // Sum of all selected service durations (minimum 60 min)
    const combinedDuration = Math.max(60, svcs.reduce((sum, s) => sum + s.dauer_minuten, 0));

    const results: Record<string, DaySlots> = {};

    await Promise.all(
      dates.map(async (date) => {
        try {
          const params = new URLSearchParams({
            date,
            total_duration: String(combinedDuration),
          });
          const res = await fetch(`/api/availability?${params}`);
          const json = await res.json();
          results[date] = {
            date,
            slots: json.data || [],
            blocked: !!json.blocked,
          };
        } catch {
          results[date] = { date, slots: [], blocked: false };
        }
      })
    );

    setDaySlotsMap(results);
    setLoadingSlots(false);

    // Auto-expand first date
    if (dates.length > 0) {
      setExpandedDate(dates[0]);
    }
  }, []);

  // Fetch slots when entering step 2
  useEffect(() => {
    if (step === 2 && selectedDates.length > 0 && selectedServices.length > 0) {
      // Step-triggered fetch; fetchAllSlots toggles its own loading state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAllSlots(selectedDates, selectedServices);
    }
  }, [step, selectedDates, selectedServices, fetchAllSlots]);

  // Get min date (tomorrow)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Max date (3 months ahead)
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  }, []);

  // Handle adding/removing services
  const toggleService = (service: Dienstleistung) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      return exists ? prev.filter((s) => s.id !== service.id) : [...prev, service];
    });
  };

  // Handle adding/removing dates
  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const exists = prev.includes(date);
      if (exists) {
        const newDates = prev.filter((d) => d !== date);
        // Clean up slots for removed date
        setSelectedSlots((s) => {
          const copy = { ...s };
          delete copy[date];
          return copy;
        });
        return newDates;
      } else {
        return [...prev, date].sort();
      }
    });
  };

  // Select a slot for a specific date
  const selectSlotForDate = (date: string, slot: TimeSlot) => {
    setSelectedSlots((prev) => ({ ...prev, [date]: slot }));
    // Auto-advance to next date without a slot
    const nextDate = selectedDates.find((d) => d !== date && !selectedSlots[d] && d > date);
    if (nextDate) {
      setTimeout(() => setExpandedDate(nextDate), 300);
    }
  };

  // Group unique time strings by period
  const getUniqueSlotsByPeriod = (slots: TimeSlot[]) => {
    const uniqueTimesMap = new Map<string, TimeSlot[]>();
    for (const slot of slots) {
      const key = slot.start;
      if (!uniqueTimesMap.has(key)) {
        uniqueTimesMap.set(key, []);
      }
      uniqueTimesMap.get(key)!.push(slot);
    }

    const periods: Record<string, { time: string; slot: TimeSlot }[]> = {
      morning: [],
      midday: [],
      afternoon: [],
    };

    for (const [time, techSlots] of uniqueTimesMap) {
      const period = getTimePeriod(time);
      periods[period].push({ time, slot: techSlots[0] });
    }

    return periods;
  };

  // Check if all dates have a slot selected
  const allDatesHaveSlots = selectedDates.length > 0 && selectedDates.every((d) => !!selectedSlots[d]);

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || selectedDates.length === 0 || !allDatesHaveSlots) return;
    if (!contact.vorname || !contact.nachname || !contact.email) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSubmitting(true);

    try {
      const bookingPromises = selectedDates.map(async (date) => {
        const slot = selectedSlots[date];
        const geplantVon = `${date}T${slot.start}:00`;
        const geplantBis = `${date}T${slot.end}:00`;

        return fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dienstleistung_id: selectedServices[0].id,
            dienstleistung_ids: selectedServices.map((s) => s.id),
            techniker_id: slot.techniker_id,
            geplant_von: geplantVon,
            geplant_bis: geplantBis,
            hinweise: contact.hinweise || null,
            kontakt: {
              vorname: contact.vorname,
              nachname: contact.nachname,
              email: contact.email,
              telefon: contact.telefon,
            },
          }),
        });
      });

      const results = await Promise.all(bookingPromises);
      const allOk = results.every((r) => r.ok);

      if (allOk) {
        setSubmitted(true);
        setStep(4);
      } else {
        const failedRes = results.find((r) => !r.ok);
        const json = await failedRes?.json();
        toast.error(json?.error || 'Fehler bei der Buchung');
      }
    } catch {
      toast.error('Verbindungsfehler');
    }
    setSubmitting(false);
  };

  const canGoNext = () => {
    switch (step) {
      case 0: return selectedServices.length > 0;
      case 1: return selectedDates.length > 0;
      case 2: return allDatesHaveSlots;
      case 3: return !!(contact.vorname && contact.nachname && contact.email);
      default: return false;
    }
  };

  // ─── Success Screen ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-30" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">
          {selectedDates.length > 1 ? 'Termine erfolgreich gebucht!' : 'Termin erfolgreich gebucht!'}
        </h1>
        <p className="text-slate-600 mb-6">Vielen Dank, {contact.vorname}! Wir freuen uns auf Sie.</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-left mb-8 space-y-4">
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Services</p>
              <p className="font-medium text-slate-900">{selectedServices.map((s) => s.name).join(', ')}</p>
            </div>
          </div>
          {selectedDates.map((date) => (
            <div key={date} className="flex items-start gap-3">
              <CalendarDays className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Termin</p>
                <p className="font-medium text-slate-900">
                  {formatDateLong(date)}, {selectedSlots[date]?.start} – {selectedSlots[date]?.end} Uhr
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-400 mb-8">Sie erhalten in Kürze eine Bestätigungs-E-Mail.</p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-full hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25"
        >
          Zurück zur Startseite
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // ─── Main Layout ────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs font-bold tracking-wider uppercase text-blue-600 mb-2">Terminbuchung</p>
        <h1 className="text-3xl sm:text-4xl font-outfit font-bold text-slate-900">Service-Termin buchen</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          In wenigen Schritten zum perfekten Termin
        </p>
      </div>

      {/* ── Progress Steps ── */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10">
        {steps.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => isDone && setStep(i)}
                disabled={!isDone}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${isDone
                    ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                    : isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                {isDone ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
              </button>
              {i < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-0.5 rounded transition-colors duration-500 ${i < step ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Step Content (left / main) ── */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 transition-all">
          {/* ═══════ Step 0: Services ═══════ */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-slate-900 mb-1">Dienstleistungen wählen</h2>
              <p className="text-sm text-slate-500 mb-6">Wählen Sie eine oder mehrere Dienstleistungen</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {services.map((s) => {
                  const isSelected = !!selectedServices.find((srv) => srv.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s)}
                      className={`
                        relative text-left p-5 rounded-2xl border-2 transition-all duration-200 group
                        ${isSelected
                          ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md shadow-blue-600/10'
                          : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <p className="font-semibold text-slate-900 pr-8">{s.name}</p>
                      {s.beschreibung && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.beschreibung}</p>
                      )}
                      <div className="flex items-center gap-3 mt-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                          ab {Number(s.basispreis_brutto).toFixed(2)} €
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ca. {s.dauer_minuten} Min.
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════ Step 1: Dates — Interactive Calendar ═══════ */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-slate-900 mb-1">Wunschtermine wählen</h2>
              <p className="text-sm text-slate-500 mb-6">
                Tippen Sie auf die gewünschten Tage. Wochenenden sind nicht verfügbar.
              </p>

              <MiniCalendar
                selectedDates={selectedDates}
                onToggleDate={toggleDate}
                minDate={minDate}
                maxDate={maxDate}
              />

              {/* Selected dates chips */}
              {selectedDates.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-3">
                    Ausgewählt ({selectedDates.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm font-medium text-blue-800"
                      >
                        {formatDateLong(date)}
                        <button
                          onClick={() => toggleDate(date)}
                          className="p-0.5 rounded-full hover:bg-blue-200 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════ Step 2: Time Slots per Date ═══════ */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-slate-900 mb-1">Startzeit wählen</h2>
              <p className="text-sm text-slate-500 mb-4">
                Wählen Sie für {selectedDates.length > 1 ? 'jeden Tag' : 'Ihren Tag'} eine Startzeit — die Dauer wird automatisch berechnet
              </p>

              {/* Duration info banner */}
              <div className="flex items-center gap-3 p-3.5 mb-5 bg-blue-50 border border-blue-200 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-blue-900">
                    Geschätzte Gesamtdauer: {totalDuration >= 60
                      ? `${Math.floor(totalDuration / 60)} Std.${totalDuration % 60 > 0 ? ` ${totalDuration % 60} Min.` : ''}`
                      : `${totalDuration} Min.`
                    }
                  </span>
                  <span className="text-blue-600 ml-1">
                    ({selectedServices.map(s => s.name).join(' + ')})
                  </span>
                </div>
              </div>

              {loadingSlots ? (
                <div className="py-16 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
                  </div>
                  <p className="text-sm text-slate-500">Verfügbare Zeiten werden geladen…</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDates.map((date) => {
                    const dayData = daySlotsMap[date];
                    const slots = dayData?.slots || [];
                    const isBlocked = dayData?.blocked || false;
                    const isExpanded = expandedDate === date;
                    const selectedSlot = selectedSlots[date];
                    const periods = getUniqueSlotsByPeriod(slots);
                    const hasSlots = slots.length > 0 && !isBlocked;

                    return (
                      <div
                        key={date}
                        className={`
                          rounded-2xl border-2 overflow-hidden transition-all duration-300
                          ${selectedSlot
                            ? 'border-green-300 bg-green-50/50'
                            : isExpanded
                              ? 'border-blue-300 bg-white shadow-md'
                              : 'border-slate-200 bg-white'
                          }
                        `}
                      >
                        {/* Date Header — click to expand */}
                        <button
                          onClick={() => setExpandedDate(isExpanded ? null : date)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                              ${selectedSlot
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                              }
                            `}>
                              {new Date(date + 'T12:00:00').getDate()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                {formatDateLong(date)}
                              </p>
                              {selectedSlot ? (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {selectedSlot.start} – {selectedSlot.end} Uhr
                                </p>
                              ) : !hasSlots ? (
                                <p className="text-xs text-red-500 font-medium">Keine Zeitfenster verfügbar</p>
                              ) : (
                                <p className="text-xs text-slate-400">Zeitfenster auswählen</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Expanded Slot Selection */}
                        {isExpanded && hasSlots && (
                          <div className="px-4 pb-5 pt-0 space-y-4 border-t border-slate-100">
                            {(['morning', 'midday', 'afternoon'] as const).map((period) => {
                              const config = periodConfig[period];
                              const PeriodIcon = config.icon;
                              const periodSlots = periods[period];
                              if (periodSlots.length === 0) return null;

                              return (
                                <div key={period} className="pt-3">
                                  <div className="flex items-center gap-2 mb-2.5">
                                    <PeriodIcon className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{config.label}</span>
                                    <span className="text-[10px] text-slate-300 ml-auto">{config.sublabel}</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {periodSlots.map(({ time, slot }) => {
                                      const isChosen = selectedSlot?.start === slot.start && selectedSlot?.techniker_id === slot.techniker_id;
                                      return (
                                        <button
                                          key={time}
                                          onClick={() => selectSlotForDate(date, slot)}
                                          className={`
                                            py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200
                                            ${isChosen
                                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.03]'
                                              : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300'
                                            }
                                          `}
                                        >
                                          <span className="font-semibold">{slot.start}</span>
                                          <span className={isChosen ? 'text-blue-200' : 'text-slate-400'}> – </span>
                                          <span className={isChosen ? 'text-blue-100' : 'text-slate-500'}>{slot.end}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Expanded but no slots */}
                        {isExpanded && !hasSlots && (
                          <div className="px-4 pb-5 pt-2 border-t border-slate-100">
                            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                              <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">
                                  {isBlocked ? 'Dieser Tag ist gesperrt' : 'An diesem Tag sind leider keine Termine frei'}
                                </p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  Bitte entfernen Sie dieses Datum und wählen Sie ein anderes.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Progress indicator */}
                  {selectedDates.length > 1 && (
                    <div className="flex items-center gap-2 pt-2 justify-center">
                      {selectedDates.map((date) => (
                        <div
                          key={date}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            selectedSlots[date] ? 'bg-green-500' : 'bg-slate-200'
                          }`}
                          title={formatDateLong(date)}
                        />
                      ))}
                      <span className="text-xs text-slate-400 ml-2">
                        {Object.keys(selectedSlots).length} / {selectedDates.length} gewählt
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════ Step 3: Contact Info ═══════ */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-slate-900 mb-1">Ihre Kontaktdaten</h2>
              <p className="text-sm text-slate-500 mb-6">Damit wir Sie erreichen können</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vorname *</label>
                  <input
                    value={contact.vorname}
                    onChange={(e) => setContact({ ...contact, vorname: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachname *</label>
                  <input
                    value={contact.nachname}
                    onChange={(e) => setContact({ ...contact, nachname: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    placeholder="Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail *</label>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    placeholder="max@beispiel.de"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
                  <input
                    type="tel"
                    value={contact.telefon}
                    onChange={(e) => setContact({ ...contact, telefon: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    placeholder="0123 456 789"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Hinweise (optional)</label>
                  <textarea
                    value={contact.hinweise}
                    onChange={(e) => setContact({ ...contact, hinweise: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none transition"
                    placeholder="z.B. Gerätetyp, Stockwerk, besondere Anfahrt…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation Buttons ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canGoNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:from-blue-600 disabled:to-blue-600"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Jetzt buchen
              </button>
            )}
          </div>
        </div>

        {/* ── Sidebar Summary Card (right) ── */}
        {step > 0 && (
          <div className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-24 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-4">Ihre Auswahl</p>

              <div className="space-y-4 text-sm">
                {/* Services */}
                {selectedServices.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <Wrench className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Services</p>
                      {selectedServices.map((s) => (
                        <p key={s.id} className="font-medium text-slate-900 text-sm leading-snug">{s.name}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates & Times */}
                {selectedDates.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <CalendarDays className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">
                        {selectedDates.length} Termin{selectedDates.length > 1 ? 'e' : ''}
                      </p>
                      {selectedDates.map((date) => (
                        <div key={date} className="text-sm leading-snug">
                          <span className="font-medium text-slate-900">{formatDateLong(date)}</span>
                          {selectedSlots[date] && (
                            <span className="text-blue-600 ml-1">
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration */}
                {totalDuration > 0 && (
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Dauer pro Termin</p>
                      <p className="font-medium text-slate-900">
                        {totalDuration >= 60
                          ? `${Math.floor(totalDuration / 60)} Std.${totalDuration % 60 > 0 ? ` ${totalDuration % 60} Min.` : ''}`
                          : `${totalDuration} Min.`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Price */}
                {totalPrice > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm">Gesamtpreis</span>
                      <span className="text-lg font-bold text-blue-600">{totalPrice.toFixed(2)} €</span>
                    </div>
                    {selectedDates.length > 1 && (
                      <p className="text-[11px] text-slate-400 mt-1 text-right">
                        {(totalPrice / selectedDates.length).toFixed(2)} € × {selectedDates.length} Tage
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

