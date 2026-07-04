'use client';

/**
 * Checkout success page — /shop/success.
 * Client component because it reads the Stripe session id from search params, clears cart state, verifies the order, and can download a PDF.
 * Data source is /api/checkout/verify, with optional PDF download from /api/orders/[id]/pdf.
 * Key interactions include displaying bestellung (order) status, payment-pending guidance, PDF download, shop navigation, and account navigation.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight, Loader2, Mail, Truck, Download, Clock } from 'lucide-react';
import { Suspense } from 'react';
import { useCart } from '@/lib/cart-context';

/**
 * Order verification payload displayed after checkout.
 * bestellung means order; items are the purchased artikel (product) lines returned by the verification API.
 */
interface OrderInfo {
  bestellnummer: string | null;
  bestellung_id?: string;
  customer_email: string | null;
  customer_name: string | null;
  amount_total: number;
  shipping_total?: number;
  currency: string;
  payment_pending?: boolean;
  items?: {
    id: string;
    artikel_id: string;
    titel: string;
    menge: number;
    preis_brutto: number;
    variante_name?: string;
  }[];
}

/**
 * Loads and renders verified checkout details for a completed or pending order.
 * @returns Success, payment-pending, loading, or order lookup failure UI.
 */
function ShopSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearCart } = useCart();
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    clearCart();
    fetch(`/api/checkout/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setOrder(data as OrderInfo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-inter text-slate-900">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Success Header ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] p-8 md:p-10 text-center border border-slate-100">
          {order?.payment_pending ? (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100/50">
                <Clock className="w-9 h-9 text-amber-500" />
              </div>
              <h1 className="text-2xl md:text-3xl font-outfit font-bold text-slate-900 mb-3 tracking-tight">
                Vielen Dank für Ihre Bestellung!
              </h1>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                Bitte überweisen Sie den Betrag an die angegebene Bankverbindung.
                Sobald Ihre Zahlung eingegangen ist, erhalten Sie eine Bestätigung per E-Mail.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium border border-amber-100">
                <Clock className="w-4 h-4" />
                Banküberweisung — Zahlung ausstehend (1–5 Werktage)
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100/50">
                <CheckCircle className="w-9 h-9 text-emerald-500" />
              </div>
              <h1 className="text-2xl md:text-3xl font-outfit font-bold text-slate-900 mb-3 tracking-tight">
                Vielen Dank für Ihre Bestellung!
              </h1>
              <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                Ihre Zahlung war erfolgreich. Eine Bestätigung mit PDF wurde an Ihre E-Mail gesendet.
              </p>
            </>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500">Bestelldetails werden geladen…</p>
          </div>
        ) : order ? (
          <>
            {/* ── Order Meta Bar ───────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-lg p-5 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Bestellnummer</p>
                  <p className="text-lg font-mono font-bold">{order.bestellnummer}</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                  {order.payment_pending ? (
                    <>
                      <Clock className="w-4 h-4 text-amber-300" />
                      <span className="text-sm font-medium">Zahlung ausstehend</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 text-blue-200" />
                      <span className="text-sm font-medium">Wird vorbereitet</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-200 flex-shrink-0" />
                <span className="truncate max-w-[200px]" title={order.customer_email || ''}>{order.customer_email}</span>
              </div>
            </div>

            {/* ── Items Card ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="font-outfit font-bold text-slate-900">Ihre Bestellung</h2>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{item.titel}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.menge}× {item.preis_brutto.toFixed(2)} €
                        {item.variante_name && <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{item.variante_name}</span>}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900 text-sm whitespace-nowrap ml-4">
                      {(item.preis_brutto * item.menge).toFixed(2)} €
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Totals ────────────────────────────────────── */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Zwischensumme</span>
                  <span>{((order.amount_total ?? 0) - (order.shipping_total ?? 0)).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Versand</span>
                  <span>{order.shipping_total === 0 ? 'Kostenlos' : `${(order.shipping_total ?? 0).toFixed(2)} €`}</span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-lg text-slate-900">Gesamtbetrag</span>
                    <span className="text-xs text-slate-400 ml-2">inkl. 19% MwSt.</span>
                  </div>
                  <span className="font-bold text-lg text-slate-900">
                    {order.amount_total.toLocaleString('de-DE', { style: 'currency', currency: order.currency.toUpperCase() })}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Hint: PDF has full details ──────────────────── */}
            <p className="text-center text-xs text-slate-400">
              {order.payment_pending
                ? 'Nach Zahlungseingang erhalten Sie eine Bestätigung mit PDF per E-Mail.'
                : 'Alle Details (Adressen, Zahlungsinformationen, Positionen) finden Sie in der PDF-Bestellbestätigung.'}
            </p>
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-slate-600">Es gab ein Problem beim Laden der Bestelldetails. Bitte prüfen Sie Ihre E-Mail.</p>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-12">
          {order?.bestellung_id && sessionId && !order?.payment_pending && (
            <button
              onClick={async () => {
                if (pdfLoading) return;
                setPdfLoading(true);
                try {
                  const res = await fetch(`/api/orders/${order.bestellung_id}/pdf?session_id=${sessionId}`);
                  if (!res.ok) throw new Error('fail');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Bestellbestaetigung_${order.bestellnummer || 'Bestellung'}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  alert('PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.');
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-7 py-3 bg-emerald-600 text-white font-medium rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? 'Wird erstellt…' : 'PDF herunterladen'}
            </button>
          )}
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-7 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-sm"
          >
            <Package className="w-4 h-4" />
            Weiter einkaufen
          </Link>
          <Link
            href="/account"
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-7 py-3 text-slate-600 font-medium rounded-full hover:bg-slate-100 transition-colors text-sm"
          >
            Zum Konto
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps checkout success content in Suspense for search parameter access.
 * @returns The checkout success route with a loading fallback.
 */
export default function ShopSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Laden...</div>}>
      <ShopSuccessContent />
    </Suspense>
  );
}

