'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Save, Loader2, MessageSquare, Mail, MapPin, CreditCard,
  Package, User, FileText, Trash2, ExternalLink, Phone,
  Clock, Plus, ChevronDown,
} from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';

interface Bestellposition {
  id: string;
  typ: string;
  titel: string;
  artikelnummer: string | null;
  variante_name: string | null;
  menge: number;
  preis_brutto: number;
  einzelpreis_netto: number | null;
  steuersatz: number;
}

interface Notiz {
  text: string;
  erstellt_am: string;
  autor: string;
}

interface AddressJson {
  name?: string;
  strasse?: string;
  zusatz?: string;
  plz?: string;
  ort?: string;
  land?: string;
  email?: string;
  phone?: string;
  bundesland?: string;
}

interface BestellungDetail {
  id: string;
  bestellnummer: string;
  status: string;
  zwischensumme_brutto: number;
  steuer_summe: number;
  versand_brutto: number;
  gesamt_brutto: number;
  rechnungsadresse_json: AddressJson | null;
  lieferadresse_json: AddressJson | null;
  notizen: Notiz[];
  bestellt_am: string;
  erstellt_am: string;
  gast_email: string | null;
  zahlungsmethode: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  benutzer: { vorname: string; nachname: string; email: string; telefonnummer: string | null } | null;
  bestellpositionen: Bestellposition[];
}

const statusOptions = ['offen', 'warten_auf_zahlung', 'bezahlt', 'versandt', 'abgeschlossen', 'storniert', 'fehlgeschlagen', 'erstattet'];

const paymentLabels: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex',
  paypal: 'PayPal', klarna: 'Klarna', link: 'Stripe Link',
  sepa_debit: 'SEPA-Lastschrift', sofort: 'Sofort', giropay: 'giropay',
  apple_pay: 'Apple Pay', google_pay: 'Google Pay', card: 'Kreditkarte',
  'banküberweisung': 'Banküberweisung', customer_balance: 'Banküberweisung',
  revolut_pay: 'Revolut Pay', amazon_pay: 'Amazon Pay',
};

function countryLabel(code: string | undefined) {
  const map: Record<string, string> = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' };
  return map[code?.toUpperCase() ?? ''] || code || '';
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<BestellungDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showStripeIds, setShowStripeIds] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.data) {
          setOrder(json.data);
          setNewStatus(json.data.status);
        }
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  const handleSaveStatus = async () => {
    if (!newStatus || newStatus === order?.status) return;
    setSaving(true);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const json = await res.json();
      setOrder((prev) => prev ? { ...prev, status: json.data.status } : prev);
      toast.success('Status aktualisiert — E-Mail an Kunden gesendet');
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || 'Fehler beim Aktualisieren');
    }
    setSaving(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notiz: { text: newNote.trim() } }),
    });
    if (res.ok) {
      const json = await res.json();
      setOrder((prev) => prev ? { ...prev, notizen: json.data.notizen || [] } : prev);
      setNewNote('');
      setShowNoteInput(false);
      toast.success('Notiz gespeichert');
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || 'Fehler');
    }
    setSaving(false);
  };

  const handleDeleteNote = async (index: number) => {
    if (!order) return;
    const updatedNotes = order.notizen.filter((_, i) => i !== index);
    setSaving(true);
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notizen_override: updatedNotes }),
    });
    if (res.ok) {
      setOrder((prev) => prev ? { ...prev, notizen: updatedNotes } : prev);
      toast.success('Notiz gelöscht');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Bestellung nicht gefunden</p>
        <Link href="/admin/orders" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Zurück</Link>
      </div>
    );
  }

  const customerName = order.benutzer
    ? `${order.benutzer.vorname} ${order.benutzer.nachname}`
    : order.rechnungsadresse_json?.name || 'Gast';
  const customerEmail = order.benutzer?.email || order.gast_email || order.rechnungsadresse_json?.email || null;
  const customerPhone = order.benutzer?.telefonnummer || order.rechnungsadresse_json?.phone || null;
  const paymentLabel = paymentLabels[order.zahlungsmethode?.toLowerCase() ?? ''] || order.zahlungsmethode || '—';

  const renderAddress = (addr: AddressJson | null) => {
    if (!addr || (!addr.strasse && !addr.name)) return <p className="text-xs text-slate-400 italic">Nicht verfügbar</p>;
    return (
      <div className="text-xs text-slate-600 space-y-0.5">
        {addr.name && <p className="font-medium text-slate-900">{addr.name}</p>}
        {addr.strasse && <p>{addr.strasse}</p>}
        {addr.zusatz && <p>{addr.zusatz}</p>}
        {(addr.plz || addr.ort) && <p>{addr.plz} {addr.ort}</p>}
        {addr.land && <p className="text-slate-400">{countryLabel(addr.land)}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-6xl">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-outfit font-bold text-slate-900">#{order.bestellnummer}</h1>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(order.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>·</span>
              <span className="font-medium text-slate-700">{Number(order.gesamt_brutto).toFixed(2)} €</span>
              <span>·</span>
              <span className="capitalize">{paymentLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customerEmail && (
            <a
              href={`mailto:${customerEmail}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              E-Mail
            </a>
          )}
          {order.stripe_payment_intent_id && (
            <a
              href={`https://dashboard.stripe.com/test/payments/${order.stripe_payment_intent_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Stripe
            </a>
          )}
        </div>
      </div>

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── LEFT: Items + Addresses + Notes ─────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Positionen</h2>
              <span className="text-xs text-slate-400">({order.bestellpositionen?.length || 0})</span>
            </div>
            <div className="divide-y divide-slate-50">
              {order.bestellpositionen?.map((pos) => (
                <div key={pos.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{pos.titel}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {pos.variante_name && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                          {pos.variante_name}
                        </span>
                      )}
                      {pos.artikelnummer && (
                        <span className="text-[10px] text-slate-400 font-mono">Art.Nr: {pos.artikelnummer}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">{(Number(pos.preis_brutto) * pos.menge).toFixed(2)} €</p>
                    <p className="text-[10px] text-slate-400">{pos.menge} × {Number(pos.preis_brutto).toFixed(2)} €</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Zwischensumme</span>
                <span>{Number(order.zwischensumme_brutto).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Versand</span>
                <span>{Number(order.versand_brutto) === 0 ? 'Kostenlos' : `${Number(order.versand_brutto).toFixed(2)} €`}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <div>
                  Gesamt
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">inkl. 19% MwSt.</span>
                </div>
                <span>{Number(order.gesamt_brutto).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Addresses side by side */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lieferadresse</h3>
              </div>
              {renderAddress(order.lieferadresse_json)}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Rechnungsadresse</h3>
              </div>
              {renderAddress(order.rechnungsadresse_json)}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Interne Notizen</h3>
                {order.notizen?.length > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">{order.notizen.length}</span>
                )}
              </div>
              {!showNoteInput && (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Hinzufügen
                </button>
              )}
            </div>

            {showNoteInput && (
              <div className="mb-3 border border-blue-200 rounded-lg p-2.5 bg-blue-50/30">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Interne Notiz schreiben…"
                  rows={2}
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => { setShowNoteInput(false); setNewNote(''); }}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Speichern'}
                  </button>
                </div>
              </div>
            )}

            {order.notizen && order.notizen.length > 0 ? (
              <div className="space-y-2">
                {order.notizen.map((note, i) => (
                  <div key={i} className="group flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{note.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {note.autor} · {new Date(note.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all rounded"
                      title="Notiz löschen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : !showNoteInput ? (
              <p className="text-xs text-slate-400 italic">Keine Notizen vorhanden</p>
            ) : null}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ───────────────────────────────── */}
        <div className="space-y-5">

          {/* Status Change */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Status ändern</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-2.5"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={handleSaveStatus}
              disabled={newStatus === order.status || saving}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Speichern</>}
            </button>
            <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1">
              <Mail className="w-3 h-3" />
              Kunde wird per E-Mail benachrichtigt
            </p>
          </div>

          {/* Customer + Payment combined */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {/* Customer */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kunde</h3>
                {!order.benutzer && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Gast</span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900">{customerName}</p>
              {customerEmail && (
                <a href={`mailto:${customerEmail}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" />
                  {customerEmail}
                </a>
              )}
              {customerPhone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {customerPhone}
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Zahlung</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Methode</span>
                  <span className="font-semibold text-slate-900">{paymentLabel}</span>
                </div>
                {order.bestellt_am && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bezahlt am</span>
                    <span className="text-slate-700">{new Date(order.bestellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {(order.stripe_payment_intent_id || order.stripe_session_id) && (
                  <>
                    <button
                      onClick={() => setShowStripeIds(v => !v)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-1"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${showStripeIds ? 'rotate-180' : ''}`} />
                      Stripe Details
                    </button>
                    {showStripeIds && (
                      <div className="space-y-1 pt-1 text-[10px]">
                        {order.stripe_payment_intent_id && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Payment ID</span>
                            <span className="font-mono text-slate-500 truncate max-w-[140px]" title={order.stripe_payment_intent_id}>{order.stripe_payment_intent_id}</span>
                          </div>
                        )}
                        {order.stripe_session_id && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Session</span>
                            <span className="font-mono text-slate-500 truncate max-w-[140px]" title={order.stripe_session_id}>{order.stripe_session_id}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

