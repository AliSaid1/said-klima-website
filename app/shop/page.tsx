'use client';

/**
 * Public shop listing page — /shop.
 * Client component because it fetches product data, manages filter state, and derives visible product cards in the browser.
 * Data source is /api/shop/products, which returns artikel (product), kategorie (category), brand, stock, variant, and image data.
 * Key interactions include text search, category and brand filters, price range filtering, filter reset, and navigation to product detail pages.
 */

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Filter, Package, Loader2 } from 'lucide-react';

/**
 * Product projection consumed by the shop listing.
 * artikel means product, kategorien means categories, and lagerbestaende represents stock records returned by the API.
 */
interface ShopProduct {
  id: string;
  artikelnummer: string;
  titel: string;
  slug: string;
  beschreibung: string | null;
  preis_brutto: number;
  rabattpreis: number | null;
  ist_ab_preis?: boolean;
  // varianten is JSONB [{name, preis_aufschlag}] stored on the artikel row (migration 010)
  varianten?: Array<{
    name: string;
    preis_aufschlag: number;
  }>;
  marken: { id: string; name: string } | null;
  kategorien: { id: string; name: string; slug: string } | null;
  lagerbestaende: { bestand: number } | { bestand: number }[] | null;
  artikel_bilder: Array<{
    id: string;
    alt_text: string | null;
    url: string;
  }>;
}

/**
 * Normalizes Supabase stock joins that may arrive as a single object, an array, or null.
 * @param l Stock relation payload for an artikel (product).
 * @returns The available stock quantity, or 0 when no stock record is present.
 */
function getBestand(l: ShopProduct['lagerbestaende']): number {
  if (!l) return 0;
  if (Array.isArray(l)) return l[0]?.bestand ?? 0;
  return l.bestand ?? 0;
}

/**
 * Renders the filterable product catalog for climate equipment.
 * @returns A shop grid with loading, empty, and filtered product states.
 */
export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategorie, setSelectedKategorie] = useState('Alle');
  const [selectedMarke, setSelectedMarke] = useState('Alle');
  const [priceRange, setPriceRange] = useState(5000);

  useEffect(() => {
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const kategorien = useMemo(() => {
    const set = new Set(products.map((p) => p.kategorien?.name).filter(Boolean));
    return ['Alle', ...Array.from(set)] as string[];
  }, [products]);

  const marken = useMemo(() => {
    const set = new Set(products.map((p) => p.marken?.name).filter(Boolean));
    return ['Alle', ...Array.from(set)] as string[];
  }, [products]);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 5000;
    return Math.ceil(Math.max(...products.map((p) => Number(p.preis_brutto))) / 100) * 100;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.beschreibung || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesKategorie = selectedKategorie === 'Alle' || product.kategorien?.name === selectedKategorie;
      const matchesMarke = selectedMarke === 'Alle' || product.marken?.name === selectedMarke;
      const matchesPrice = Number(product.preis_brutto) <= priceRange;
      return matchesSearch && matchesKategorie && matchesMarke && matchesPrice;
    });
  }, [products, searchQuery, selectedKategorie, selectedMarke, priceRange]);

/**
 * Computes the lowest displayed gross price for a product card.
 * @param product The artikel (product) including optional discount and variant surcharges.
 * @returns The price shown in the listing card.
 */
  const getDisplayPrice = (product: ShopProduct) => {
    const base = product.rabattpreis && Number(product.rabattpreis) < Number(product.preis_brutto)
      ? Number(product.rabattpreis)
      : Number(product.preis_brutto);

    // varianten JSONB: [{name, preis_aufschlag}] — lowest total = base + min(preis_aufschlag)
    if (product.varianten && product.varianten.length > 0) {
      const minSurcharge = Math.min(...product.varianten.map((v) => Number(v.preis_aufschlag) || 0));
      const lowestVariantPrice = Number(product.preis_brutto) + minSurcharge;
      return Math.min(base, lowestVariantPrice);
    }
    return base;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">SHOP</span>
      </div>
      <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-12">
        Alle Klimageräte
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filter
            </h3>

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Suche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Kategorie */}
              {kategorien.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Kategorie</label>
                  <select
                    value={selectedKategorie}
                    onChange={(e) => setSelectedKategorie(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {kategorien.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Marke */}
              {marken.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Marke</label>
                  <select
                    value={selectedMarke}
                    onChange={(e) => setSelectedMarke(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {marken.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Maximaler Preis: {priceRange.toLocaleString('de-DE')} €
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  step="50"
                  value={priceRange}
                  onChange={(e) => setPriceRange(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedKategorie('Alle');
                  setSelectedMarke('Alle');
                  setPriceRange(maxPrice);
                }}
                className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-grow">
          {!loading && (
            <div className="mb-6 flex justify-between items-center">
              <p className="text-slate-600">{filteredProducts.length} Produkte gefunden</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const mainImage = product.artikel_bilder?.[0];
                const bestand = getBestand(product.lagerbestaende);

                return (
                  <Link
                    href={`/shop/${product.slug || product.id}`}
                    key={product.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group flex flex-col"
                  >
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      {mainImage?.url ? (
                        <Image
                          src={mainImage.url}
                          alt={mainImage.alt_text || product.titel}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                      {product.rabattpreis && Number(product.rabattpreis) < Number(product.preis_brutto) && (
                        <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          -{Math.round(100 - (Number(product.rabattpreis) / Number(product.preis_brutto)) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        {product.kategorien && (
                          <div className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                            {product.kategorien.name}
                          </div>
                        )}
                        {product.marken && (
                          <div className="text-xs font-medium text-slate-500">
                            {product.marken.name}
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit group-hover:text-blue-600 transition-colors">
                        {product.titel}
                      </h3>
                      {product.beschreibung && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                          {product.beschreibung}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <div>
                          <span className="text-lg font-bold text-slate-900">
                            {product.ist_ab_preis && <span className="text-sm font-normal text-slate-500 mr-1">Ab</span>}
                            {getDisplayPrice(product).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </span>
                          {!product.varianten?.length && product.rabattpreis && Number(product.rabattpreis) < Number(product.preis_brutto) && (
                              <span className="text-sm text-slate-400 line-through ml-2">
                                {Number(product.preis_brutto).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                              </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {bestand <= 0 ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Ausverkauft</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg text-slate-500">Keine Produkte gefunden, die Ihren Kriterien entsprechen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
