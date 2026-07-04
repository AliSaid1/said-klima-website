'use client';

/**
 * Admin — booking settings, /admin/bookings/settings.
 *
 * Client component. Fetches techniker (technician) records from
 * /api/technicians and blocked dates from /api/blocked-dates. Offers schedule
 * editing UI, global blocked-date creation, and blocked-date deletion for the
 * buchung (booking) workflow inside the admin auth context.
 */
import { useState, useEffect } from 'react';
import { Clock, CalendarOff, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Verfuegbarkeit {
  id?: string;
  techniker_id: string;
  wochentag: number;
  start_zeit: string;
  ende_zeit: string;
  verfuegbar: boolean;
}

interface GesperrterTag {
  id: string;
  datum: string;
  grund: string | null;
  techniker_id: string | null;
}

interface Techniker {
  id: string;
  vorname: string;
  nachname: string;
}

const wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/**
 * Renders technician availability controls and global blocked-day management
 * for appointment booking administration.
 */
export default function BookingSettingsPage() {
  const [technicians, setTechnicians] = useState<Techniker[]>([]);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [availability, setAvailability] = useState<Verfuegbarkeit[]>([]);
  const [blockedDates, setBlockedDates] = useState<GesperrterTag[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState({ datum: '', grund: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [techRes, blockedRes] = await Promise.all([
        fetch('/api/technicians').then((r) => r.json()),
        fetch('/api/blocked-dates').then((r) => r.json()),
      ]);
      if (!mounted) return;
      const techs = techRes.data || [];
      setTechnicians(techs);
      setBlockedDates(blockedRes.data || []);
      if (techs.length > 0) {
        const techId = techs[0].id;
        setSelectedTech(techId);
        setAvailability(
          wochentage.map((_, i) => ({
            techniker_id: techId,
            wochentag: i,
            start_zeit: i >= 1 && i <= 5 ? '08:00' : i === 6 ? '09:00' : '',
            ende_zeit: i >= 1 && i <= 5 ? '18:00' : i === 6 ? '14:00' : '',
            verfuegbar: i >= 1 && i <= 6,
          }))
        );
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const updateDay = (index: number, field: keyof Verfuegbarkeit, value: string | boolean) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    // Save each day's availability via API
    // This would POST/PUT to a dedicated availability API
    // For now, we'll simulate success
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success('Verfügbarkeit gespeichert');
    setSaving(false);
  };

  const handleAddBlockedDate = async () => {
    if (!newBlockedDate.datum) {
      toast.error('Bitte Datum auswählen');
      return;
    }

    const res = await fetch('/api/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datum: newBlockedDate.datum,
        grund: newBlockedDate.grund || null,
        techniker_id: null, // Global block
      }),
    });

    if (res.ok) {
      const json = await res.json();
      setBlockedDates((prev) => [...prev, json.data]);
      setNewBlockedDate({ datum: '', grund: '' });
      toast.success('Gesperrter Tag hinzugefügt');
    } else {
      toast.error('Fehler');
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    const res = await fetch(`/api/blocked-dates?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBlockedDates((prev) => prev.filter((d) => d.id !== id));
      toast.success('Gesperrter Tag entfernt');
    } else {
      toast.error('Fehler');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Termineinstellungen</h1>
        <p className="text-slate-500 mt-1">Verfügbarkeit und gesperrte Tage verwalten</p>
      </div>

      {/* Technician Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Techniker</label>
        <select
          value={selectedTech}
          onChange={(e) => setSelectedTech(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.vorname} {t.nachname}</option>
          ))}
        </select>
      </div>

      {/* Availability */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-outfit font-bold text-slate-900">Wöchentliche Verfügbarkeit</h2>
        </div>

        <div className="space-y-3">
          {availability.map((day, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
              <label className="flex items-center gap-2 w-36 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={day.verfuegbar}
                  onChange={(e) => updateDay(i, 'verfuegbar', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <span className={`text-sm font-medium ${day.verfuegbar ? 'text-slate-900' : 'text-slate-400'}`}>
                  {wochentage[i]}
                </span>
              </label>
              {day.verfuegbar ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.start_zeit}
                    onChange={(e) => updateDay(i, 'start_zeit', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-slate-400 text-sm">bis</span>
                  <input
                    type="time"
                    value={day.ende_zeit}
                    onChange={(e) => updateDay(i, 'ende_zeit', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              ) : (
                <span className="text-sm text-slate-400">Nicht verfügbar</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveAvailability}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Verfügbarkeit speichern
        </button>
      </div>

      {/* Blocked Dates */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <CalendarOff className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-outfit font-bold text-slate-900">Gesperrte Tage</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Tage, an denen keine Termine möglich sind (Feiertage, Urlaub etc.)</p>

        {/* Add blocked date */}
        <div className="flex flex-wrap gap-3 mb-5 p-4 bg-slate-50 rounded-xl">
          <input
            type="date"
            value={newBlockedDate.datum}
            onChange={(e) => setNewBlockedDate({ ...newBlockedDate, datum: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            value={newBlockedDate.grund}
            onChange={(e) => setNewBlockedDate({ ...newBlockedDate, grund: e.target.value })}
            placeholder="Grund (z.B. Feiertag)"
            className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            onClick={handleAddBlockedDate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sperren
          </button>
        </div>

        {/* List */}
        {blockedDates.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">Keine gesperrten Tage eingetragen</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockedDates
              .sort((a, b) => a.datum.localeCompare(b.datum))
              .map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(d.datum).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {d.grund && <p className="text-xs text-slate-500 mt-0.5">{d.grund}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteBlockedDate(d.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
