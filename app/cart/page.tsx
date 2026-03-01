'use client';

import { useCart } from '@/lib/cart-context';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

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
            titel: item.titel,
            preis_brutto: item.rabattpreis ?? item.preis_brutto,
            menge: item.menge,
            bild_url: item.bild_url,
          })),
        }),
      });

      const json = await res.json();

      if (res.ok && json.url) {
        // Redirect to Stripe Checkout
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

  // Shipping cost (free above 500€)
  const versandkosten = total >= 500 ? 0 : 29.90;
  const gesamtMitVersand = total + versandkosten;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-outfit font-bold text-slate-900 mb-3">Ihr Warenkorb ist leer</h1>
        <p className="text-slate-500 mb-8">Entdecken Sie unsere Produkte und fügen Sie Artikel hinzu.</p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          Zum Shop
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Warenkorb</h1>
          <p className="text-slate-500 mt-1">{itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}</p>
        </div>
        <button
          onClick={() => { clearCart(); toast.success('Warenkorb geleert'); }}
          className="text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Warenkorb leeren
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const displayPrice = item.rabattpreis ?? item.preis_brutto;
            return (
              <div key={item.artikel_id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 flex gap-4 sm:gap-6">
                {/* Image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {item.bild_url ? (
                    <Image src={item.bild_url} alt={item.titel} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm sm:text-base">{item.titel}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.artikelnummer}</p>
                      {item.mit_installation && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                          + Installation
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.artikel_id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-4">
                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.artikel_id, item.menge - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium text-slate-900">{item.menge}</span>
                      <button
                        onClick={() => updateQuantity(item.artikel_id, item.menge + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {item.rabattpreis && (
                        <p className="text-xs text-slate-400 line-through">{(item.preis_brutto * item.menge).toFixed(2)} €</p>
                      )}
                      <p className="text-base font-bold text-slate-900">{(displayPrice * item.menge).toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
            <h2 className="font-outfit font-bold text-slate-900 text-lg mb-5">Zusammenfassung</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Zwischensumme</span>
                <span className="font-medium text-slate-900">{total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Versandkosten</span>
                <span className="font-medium text-slate-900">
                  {versandkosten === 0 ? (
                    <span className="text-green-600">Kostenlos</span>
                  ) : (
                    `${versandkosten.toFixed(2)} €`
                  )}
                </span>
              </div>
              {versandkosten > 0 && (
                <p className="text-xs text-slate-500">
                  Kostenloser Versand ab 500,00 €
                </p>
              )}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-900">Gesamt</span>
                  <span className="font-bold text-slate-900 text-lg">{gesamtMitVersand.toFixed(2)} €</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">inkl. MwSt.</p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full mt-6 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Zur Kasse
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <Link
              href="/shop"
              className="block text-center text-sm text-blue-600 hover:underline mt-4"
            >
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

