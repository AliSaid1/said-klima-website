import { createClient } from '@/lib/supabase/server';
import { Package, ShoppingBag, CalendarDays, Euro } from 'lucide-react';
import StatsCard from '@/components/admin/StatsCard';
import StatusBadge from '@/components/admin/StatusBadge';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [
    { count: artikelCount },
    { count: offeneBestellungen },
    { count: anstehendeBuchungen },
    { data: letzteBestellungen },
    { data: naechsteBuchungen },
  ] = await Promise.all([
    supabase.from('artikel').select('*', { count: 'exact', head: true }).eq('aktiv', true),
    supabase.from('bestellungen').select('*', { count: 'exact', head: true }).eq('status', 'offen'),
    supabase.from('buchungen').select('*', { count: 'exact', head: true }).in('status', ['ausstehend', 'bestaetigt']),
    supabase.from('bestellungen').select('id, bestellnummer, status, gesamt_brutto, erstellt_am, benutzer_id').order('erstellt_am', { ascending: false }).limit(5),
    supabase.from('buchungen').select('id, dienstleistung_id, geplant_von, geplant_bis, status, hinweise, dienstleistungen(name)').gte('geplant_von', new Date().toISOString()).order('geplant_von', { ascending: true }).limit(5),
  ]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Willkommen im Admin-Bereich</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatsCard
          label="Aktive Produkte"
          value={artikelCount ?? 0}
          icon={<Package className="w-5 h-5" />}
          subtitle="im Shop"
        />
        <StatsCard
          label="Offene Bestellungen"
          value={offeneBestellungen ?? 0}
          icon={<ShoppingBag className="w-5 h-5" />}
          subtitle="zu bearbeiten"
        />
        <StatsCard
          label="Anstehende Termine"
          value={anstehendeBuchungen ?? 0}
          icon={<CalendarDays className="w-5 h-5" />}
          subtitle="geplant"
        />
        <StatsCard
          label="Umsatz (Monat)"
          value="—"
          icon={<Euro className="w-5 h-5" />}
          subtitle="wird berechnet"
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Letzte Bestellungen */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-outfit font-bold text-slate-900">Letzte Bestellungen</h2>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline font-medium">
              Alle ansehen
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {letzteBestellungen && letzteBestellungen.length > 0 ? (
              letzteBestellungen.map((bestellung) => (
                <Link
                  key={bestellung.id}
                  href={`/admin/orders/${bestellung.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      #{bestellung.bestellnummer}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(bestellung.erstellt_am).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={bestellung.status} />
                    <span className="font-bold text-sm text-slate-900">
                      {Number(bestellung.gesamt_brutto).toFixed(2)} €
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                Noch keine Bestellungen vorhanden
              </div>
            )}
          </div>
        </div>

        {/* Nächste Termine */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-lg font-outfit font-bold text-slate-900">Nächste Termine</h2>
            <Link href="/admin/bookings" className="text-sm text-blue-600 hover:underline font-medium">
              Alle ansehen
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {naechsteBuchungen && naechsteBuchungen.length > 0 ? (
              naechsteBuchungen.map((buchung) => {
                const von = new Date(buchung.geplant_von);
                return (
                  <div
                    key={buchung.id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {von.toLocaleDateString('de-DE', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {von.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {(buchung as Record<string, unknown>).dienstleistungen
                          ? ((buchung as Record<string, unknown>).dienstleistungen as Record<string, string>).name
                          : 'Dienstleistung'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {von.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(buchung.geplant_bis).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                      </p>
                    </div>
                    <StatusBadge status={buchung.status} />
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                Keine anstehenden Termine
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Package className="w-4 h-4" />
          Neues Produkt
        </Link>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Bestellungen
        </Link>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Terminkalender
        </Link>
      </div>
    </div>
  );
}

