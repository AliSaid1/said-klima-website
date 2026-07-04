'use client';

/**
 * Admin — orders list, /admin/orders.
 *
 * Client component. Fetches paginated bestellungen (orders) from /api/orders,
 * supports CSV export via Papa Parse, and deletes open orders through
 * /api/orders/[id]. Offers search, status filtering, pagination, export, and
 * open-order deletion inside the admin auth context.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, Download, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface Bestellung {
  id: string;
  bestellnummer: string;
  status: string;
  gesamt_brutto: number;
  erstellt_am: string;
  gast_email: string | null;
  rechnungsadresse_json: { name?: string; email?: string; phone?: string } | null;
  benutzer: { vorname: string; nachname: string; email: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Renders the order table with filters, CSV export, pagination, and safe
 * deletion controls for orders that are still open.
 */
export default function OrdersListPage() {
  const [orders, setOrders] = useState<Bestellung[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: '20',
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    });

    try {
      const res = await fetch(`/api/orders?${params}`);
      const json = await res.json();
      if (res.ok) {
        setOrders(json.data || []);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders();
    return () => controller.abort();
  }, [fetchOrders]);

  const exportCSV = () => {
    if (orders.length === 0) return;

    const csvData = orders.map((o) => ({
      Bestellnummer: o.bestellnummer,
      Kunde: o.benutzer ? `${o.benutzer.vorname} ${o.benutzer.nachname}` : (o.rechnungsadresse_json?.name || 'Gast'),
      Email: o.benutzer?.email || o.gast_email || '—',
      Status: o.status,
      Gesamt: Number(o.gesamt_brutto).toFixed(2),
      Datum: new Date(o.erstellt_am).toLocaleDateString('de-DE'),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bestellungen-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportiert');
  };

  const handleDeleteOrder = async (orderId: string, bestellnummer: string) => {
    if (!confirm(`Offene Bestellung #${bestellnummer} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success(`Bestellung #${bestellnummer} gelöscht`);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Fehler beim Löschen');
      }
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Bestellungen</h1>
          <p className="text-slate-500 mt-1">{pagination.total} Bestellungen insgesamt</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={orders.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          CSV Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Bestellnummer suchen..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
        >
          <option value="">Alle Status</option>
          <option value="offen">Offen</option>
          <option value="warten_auf_zahlung">Warten auf Zahlung</option>
          <option value="bezahlt">Bezahlt</option>
          <option value="versandt">Versandt</option>
          <option value="abgeschlossen">Abgeschlossen</option>
          <option value="storniert">Storniert</option>
          <option value="fehlgeschlagen">Fehlgeschlagen</option>
          <option value="erstattet">Erstattet</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Keine Bestellungen gefunden</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Bestellung</th>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Kunde</th>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Datum</th>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Gesamt</th>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-blue-600 hover:underline text-sm">
                          #{order.bestellnummer}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {order.benutzer ? (
                          <>
                            {order.benutzer.vorname} {order.benutzer.nachname}
                            <p className="text-xs text-slate-500">{order.benutzer.email}</p>
                          </>
                        ) : (
                          <>
                            {order.rechnungsadresse_json?.name || 'Gast'}
                            <p className="text-xs text-slate-500">{order.gast_email || order.rechnungsadresse_json?.email || '—'}</p>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(order.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-medium text-sm text-slate-900">
                        {Number(order.gesamt_brutto).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4">
                        {order.status === 'offen' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id, order.bestellnummer); }}
                            title="Offene Bestellung löschen"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Seite {pagination.page} von {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
