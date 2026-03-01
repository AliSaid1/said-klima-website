'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, Download, List } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import Papa from 'papaparse';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { de };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface BuchungEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  dienstleistung: string;
  kunde: string;
  raw: Record<string, unknown>;
}

const statusColorMap: Record<string, string> = {
  ausstehend: '#EAB308',
  bestaetigt: '#2563EB',
  abgeschlossen: '#16A34A',
  abgesagt: '#DC2626',
  nicht_erschienen: '#94A3B8',
};

export default function BookingsPage() {
  const [events, setEvents] = useState<BuchungEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<BuchungEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/bookings')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        const mapped = (json.data || []).map((b: Record<string, unknown>) => {
          const dl = b.dienstleistungen as Record<string, string> | null;
          const benutzer = b.benutzer as Record<string, string> | null;
          return {
            id: b.id as string,
            title: dl?.name || 'Termin',
            start: new Date(b.geplant_von as string),
            end: new Date(b.geplant_bis as string),
            status: b.status as string,
            dienstleistung: dl?.name || '—',
            kunde: benutzer ? `${benutzer.vorname} ${benutzer.nachname}` : '—',
            raw: b,
          };
        });
        setEvents(mapped);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const filteredEvents = useMemo(() => {
    if (!statusFilter) return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  const eventStyleGetter = (event: BuchungEvent) => ({
    style: {
      backgroundColor: statusColorMap[event.status] || '#94A3B8',
      borderRadius: '6px',
      color: 'white',
      border: 'none',
      fontSize: '12px',
      padding: '2px 6px',
    },
  });

  const exportCSV = () => {
    const csvData = filteredEvents.map((e) => ({
      Datum: format(e.start, 'dd.MM.yyyy'),
      Von: format(e.start, 'HH:mm'),
      Bis: format(e.end, 'HH:mm'),
      Dienstleistung: e.dienstleistung,
      Kunde: e.kunde,
      Status: e.status,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `termine-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportiert');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Termine</h1>
          <p className="text-slate-500 mt-1">{events.length} Termine insgesamt</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Alle Status</option>
            <option value="ausstehend">Ausstehend</option>
            <option value="bestaetigt">Bestätigt</option>
            <option value="abgeschlossen">Abgeschlossen</option>
            <option value="abgesagt">Abgesagt</option>
          </select>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 text-sm ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button onClick={exportCSV} className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : view === 'calendar' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            view={calendarView}
            onView={(v) => setCalendarView(v)}
            date={date}
            onNavigate={(d) => setDate(d)}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => setSelectedEvent(event)}
            style={{ height: 600 }}
            messages={{
              today: 'Heute',
              previous: 'Zurück',
              next: 'Weiter',
              month: 'Monat',
              week: 'Woche',
              day: 'Tag',
              agenda: 'Agenda',
              noEventsInRange: 'Keine Termine in diesem Zeitraum',
            }}
            culture="de"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Datum</th>
                <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Zeit</th>
                <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Dienstleistung</th>
                <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Kunde</th>
                <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedEvent(event)}>
                  <td className="px-6 py-4 text-sm text-slate-900">{format(event.start, 'dd.MM.yyyy')}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{event.dienstleistung}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{event.kunde}</td>
                  <td className="px-6 py-4"><StatusBadge status={event.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-outfit font-bold text-slate-900 text-lg">{selectedEvent.dienstleistung}</h3>
              <StatusBadge status={selectedEvent.status} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Datum</span>
                <span className="text-slate-900 font-medium">{format(selectedEvent.start, 'dd.MM.yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Zeit</span>
                <span className="text-slate-900 font-medium">{format(selectedEvent.start, 'HH:mm')} – {format(selectedEvent.end, 'HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kunde</span>
                <span className="text-slate-900 font-medium">{selectedEvent.kunde}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full mt-6 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

