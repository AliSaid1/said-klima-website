'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
function storageUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

interface Artikel {
  id: string;
  artikelnummer: string;
  titel: string;
  slug: string;
  preis_brutto: number;
  rabattpreis: number | null;
  aktiv: boolean;
  marken: { id: string; name: string } | null;
  kategorien: { id: string; name: string; slug: string } | null;
  lagerbestaende: { bestand: number; mindestbestand: number } | null;
  artikel_bilder: Array<{
    id: string;
    alt_text: string | null;
    medien_dateien: { speicherpfad: string } | null;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProductListPage() {
  const [products, setProducts] = useState<Artikel[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: '20',
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
    });

    try {
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();

      if (res.ok) {
        setProducts(json.data || []);
        setPagination(json.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts();
    return () => controller.abort();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Produkt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success('Produkt wurde erfolgreich gelöscht');
      fetchProducts();
    } else {
      toast.error(json.error || 'Das Produkt konnte nicht gelöscht werden');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Produkte</h1>
          <p className="text-slate-500 mt-1">{pagination.total} Produkte insgesamt</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Produkt
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Produkt suchen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
        >
          <option value="">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="inaktiv">Inaktiv</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Keine Produkte gefunden</p>
            <Link href="/admin/products/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Erstes Produkt erstellen
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Bild</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Produkt</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Kategorie</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Preis</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Lager</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const firstImage = product.artikel_bilder?.[0];
                    const bestand = product.lagerbestaende?.bestand ?? 0;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden relative">
                            {firstImage?.medien_dateien?.speicherpfad ? (
                              <Image
                                src={storageUrl(firstImage.medien_dateien.speicherpfad)}
                                alt={firstImage.alt_text || product.titel}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-600 text-sm">
                            {product.titel}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">{product.artikelnummer}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {product.kategorien?.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-sm text-slate-900">
                            {Number(product.preis_brutto).toFixed(2)} €
                          </span>
                          {product.rabattpreis && (
                            <span className="block text-xs text-red-600">
                              {Number(product.rabattpreis).toFixed(2)} €
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${bestand <= 0 ? 'text-red-600' : bestand <= 3 ? 'text-yellow-600' : 'text-slate-900'}`}>
                            {bestand}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={product.aktiv ? 'active' : 'inactive'} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Seite {pagination.page} von {pagination.totalPages}
                </p>
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


