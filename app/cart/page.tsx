'use client';

import { useCart } from '@/lib/cart-context';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, Tag, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Fallback defaults — used until the DB response arrives
const DEFAULT_SHIPPING_COST = 5;
const DEFAULT_FREE_THRESHOLD = 500;

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingCost, setShippingCost] = useState(DEFAULT_SHIPPING_COST);
  const [freeThreshold, setFreeThreshold] = useState(DEFAULT_FREE_THRESHOLD);
  const router = useRouter();

  // Load shipping settings from DB (falls back to defaults on error)
  useEffect(() => {
    fetch('/api/settings/versandkosten')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.versandkosten === 'number')       setShippingCost(d.versandkosten);
        if (typeof d.versandkostenlos_ab === 'number') setFreeThreshold(d.versandkostenlos_ab);
      })
      .catch(() => {/* keep defaults */});
  }, []);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            artikel_id: item.artikel_id,
            variant_id: item.variant_id,
            titel: item.titel,
            preis_brutto: item.rabattpreis ?? item.preis_brutto,
            menge: item.menge,
            bild_url: item.bild_url,
          })),
        }),
      });

      const json = await res.json();

      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error || 'Fehler beim Checkout');
        setCheckingOut(false);
      }
    } catch {
      toast.error('Verbindungsfehler');
      setCheckingOut(false);
    }
  };

  const versandkosten = total >= freeThreshold ? 0 : shippingCost;
  const gesamtMitVersand = total + versandkosten;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-blue-400" />
        </div>
        <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">Ihr Warenkorb ist leer</h1>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          Entdecken Sie unsere Klimaanlagen und Kältetechnik-Produkte.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
        >
          Zum Shop
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32 lg:pb-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Warenkorb</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
          </p>
        </div>
        <button
          onClick={() => { clearCart(); toast.success('Warenkorb geleert'); }}
          className="text-sm text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 group"
        >
          <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          Leeren
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Cart Items ── */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const displayPrice = item.rabattpreis ?? item.preis_brutto;
            const cartKey = `${item.artikel_id}|${item.variant_id ?? ''}`;
            const productHref = item.slug ? `/shop/${item.slug}` : `/shop/${item.artikel_id}`;

            return (
              /* Card: clicking anywhere except buttons navigates to the product page */
              <div
                key={cartKey}
                onClick={() => router.push(productHref)}
                className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm
                           hover:shadow-xl hover:scale-[1.015] hover:border-blue-100
                           transition-all duration-200 cursor-pointer p-4 sm:p-5 flex gap-4"
              >
                {/* Invisible anchor for right-click "open in new tab" */}
                <Link
                  href={productHref}
                  className="absolute inset-0 rounded-2xl z-0"
                  aria-label={`${item.titel} ansehen`}
                  tabIndex={-1}
                />

                {/* Image */}
                <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                  {item.bild_url ? (
                    <Image src={item.bild_url} alt={item.titel} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-slate-200" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug truncate pr-2
                                     group-hover:text-blue-600 transition-colors">
                        {item.titel}
                      </h3>

                      {/* Artikelnummer */}
                      {item.artikelnummer && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.artikelnummer}
                        </p>
                      )}

                      {/* Variant badge */}
                      {item.variant_id && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md border border-blue-100">
                          {item.variant_id}
                        </span>
                      )}

                      {/* Installation badge */}
                      {item.mit_installation && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-md border border-emerald-100">
                          + Mit Installation
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.artikel_id, item.variant_id); }}
                      className="relative z-10 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Artikel entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-3 sm:mt-4">
                    {/* Quantity controls — stopPropagation so clicks don't navigate */}
                    <div
                      className="relative z-10 flex items-center gap-1 bg-slate-50 rounded-xl p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => updateQuantity(item.artikel_id, item.menge - 1, item.variant_id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-30"
                        disabled={item.menge <= 1}
                        aria-label="Menge verringern"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold text-slate-900 select-none">
                        {item.menge}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.artikel_id, item.menge + 1, item.variant_id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition-all"
                        aria-label="Menge erhöhen"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="relative z-10 text-right">
                      <p className="text-[11px] text-slate-400 mb-0.5">
                        {displayPrice.toFixed(2)} € / Stück
                      </p>
                      <div className="flex flex-col items-end gap-0.5">
                        {item.rabattpreis && (
                          <p className="text-xs text-slate-300 line-through">
                            {(item.preis_brutto * item.menge).toFixed(2)} €
                          </p>
                        )}
                        <p className="text-base sm:text-lg font-bold text-slate-900 font-outfit">
                          {(displayPrice * item.menge).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Order Summary ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24">
            <h2 className="font-outfit font-bold text-slate-900 text-lg mb-5">Zusammenfassung</h2>

            {/* Item list mini */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
              {items.map((item) => {
                const price = item.rabattpreis ?? item.preis_brutto;
                return (
                  <div key={`${item.artikel_id}|${item.variant_id ?? ''}`} className="flex justify-between text-xs text-slate-600">
                    <span className="truncate flex-1 mr-2">
                      {item.titel}
                      {item.menge > 1 && <span className="text-slate-400"> ×{item.menge}</span>}
                    </span>
                    <span className="font-medium text-slate-800 flex-shrink-0">
                      {(price * item.menge).toFixed(2)} €
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Zwischensumme</span>
                <span className="font-medium text-slate-900">{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Versandkosten</span>
                <span className={`font-medium ${versandkosten === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {versandkosten === 0 ? 'Kostenlos' : `${shippingCost.toFixed(2)} €`}
                </span>
              </div>
              {versandkosten > 0 && (
                <p className="text-[11px] text-slate-400">
                  Kostenloser Versand ab {freeThreshold.toFixed(0)} € Bestellwert
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 mt-4 pt-4">
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-base">Gesamt</span>
                <span className="font-bold text-slate-900 text-xl font-outfit">
                  {gesamtMitVersand.toFixed(2)} €
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">inkl. MwSt.</p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full mt-5 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 text-sm"
            >
              {checkingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Zur Kasse
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <Link
              href="/shop"
              className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors mt-4"
            >
              <ArrowRight className="w-3 h-3 rotate-180" />
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1">
            <p className="text-[11px] text-slate-500">Gesamtbetrag</p>
            <p className="font-bold text-slate-900 text-base font-outfit">{gesamtMitVersand.toFixed(2)} €</p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20"
          >
            {checkingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Zur Kasse <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


