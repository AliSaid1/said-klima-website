'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, MessageSquare } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import { toast } from 'sonner';

interface Bestellposition {
  id: string;
  typ: string;
  titel: string;
  artikelnummer: string | null;
  menge: number;
  preis_brutto: number;
  steuersatz: number;
}

interface Notiz {
  text: string;
  erstellt_am: string;
  autor: string;
}

interface BestellungDetail {
  id: string;
  bestellnummer: string;
  status: string;
  zwischensumme_brutto: number;
  steuer_summe: number;
  versand_brutto: number;
  gesamt_brutto: number;
  rechnungsadresse_json: Record<string, string>;
  lieferadresse_json: Record<string, string> | null;
  notizen: Notiz[];
  bestellt_am: string;
  erstellt_am: string;
  benutzer: { vorname: string; nachname: string; email: string; telefonnummer: string | null } | null;
  bestellpositionen: Bestellposition[];
}

const statusOptions = ['offen', 'bezahlt', 'versandt', 'abgeschlossen', 'storniert', 'erstattet'];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<BestellungDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

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
      toast.success('Status aktualisiert');
    } else {
      toast.error('Fehler beim Aktualisieren');
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
      toast.success('Notiz hinzugefügt');
    } else {
      toast.error('Fehler');
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

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/orders" className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-outfit font-bold text-slate-900">Bestellung #{order.bestellnummer}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date(order.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-outfit font-bold text-slate-900">Positionen</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {order.bestellpositionen?.map((pos) => (
                <div key={pos.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{pos.titel}</p>
                    {pos.artikelnummer && <p className="text-xs text-slate-500">{pos.artikelnummer}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{Number(pos.preis_brutto).toFixed(2)} €</p>
                    <p className="text-xs text-slate-500">× {pos.menge}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Zwischensumme</span>
                <span className="text-slate-900">{Number(order.zwischensumme_brutto).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">MwSt.</span>
                <span className="text-slate-900">{Number(order.steuer_summe).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Versand</span>
                <span className="text-slate-900">{Number(order.versand_brutto).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-900">Gesamt</span>
                <span className="text-slate-900">{Number(order.gesamt_brutto).toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="font-outfit font-bold text-slate-900">Interne Notizen</h2>
            </div>
            {order.notizen && order.notizen.length > 0 ? (
              <div className="space-y-3 mb-4">
                {order.notizen.map((note, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-sm text-slate-900">{note.text}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {note.autor} · {new Date(note.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4">Noch keine Notizen</p>
            )}
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Notiz hinzufügen..."
                rows={2}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 self-end"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Senden'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-outfit font-bold text-slate-900 mb-4">Status ändern</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white mb-3"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={handleSaveStatus}
              disabled={newStatus === order.status || saving}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Status speichern
            </button>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-outfit font-bold text-slate-900 mb-4">Kunde</h3>
            {order.benutzer ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-900">{order.benutzer.vorname} {order.benutzer.nachname}</p>
                <p className="text-slate-600">{order.benutzer.email}</p>
                {order.benutzer.telefonnummer && <p className="text-slate-600">{order.benutzer.telefonnummer}</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Kein Benutzer zugeordnet</p>
            )}
          </div>

          {/* Shipping Address */}
          {order.lieferadresse_json && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-outfit font-bold text-slate-900 mb-4">Lieferadresse</h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p>{order.lieferadresse_json.strasse}</p>
                <p>{order.lieferadresse_json.plz} {order.lieferadresse_json.ort}</p>
                <p>{order.lieferadresse_json.land}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

