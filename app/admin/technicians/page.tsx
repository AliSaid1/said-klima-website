'use client';

/**
 * Admin — technicians management, /admin/technicians.
 *
 * Client component. Fetches techniker (technician) records from
 * /api/technicians and creates, updates, or deletes technicians with POST, PUT,
 * and DELETE requests. Offers technician CRUD for scheduling and service
 * assignment workflows inside the admin auth context.
 */
import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Save, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Techniker {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  email: string | null;
  aktiv: boolean;
}

/**
 * Renders the technician administration list with inline creation, modal edit,
 * active-state toggling, and deletion controls.
 */
export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Techniker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTech, setNewTech] = useState({ vorname: '', nachname: '', telefon: '', email: '', aktiv: true });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ vorname: '', nachname: '', telefon: '', email: '', aktiv: true });
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/technicians');
      const json = await res.json();
      setTechnicians(json.data || []);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  const handleCreate = async () => {
    setSaving(true);
    const res = await fetch('/api/technicians', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTech) });
    if (res.ok) { toast.success('Techniker erstellt'); setShowNew(false); setNewTech({ vorname: '', nachname: '', telefon: '', email: '', aktiv: true }); refetch(); }
    else { const json = await res.json(); toast.error(json.error || 'Fehler'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    const res = await fetch('/api/technicians', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...editData }) });
    if (res.ok) { toast.success('Gespeichert'); setEditId(null); refetch(); }
    else { const json = await res.json(); toast.error(json.error || 'Fehler'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Techniker wirklich löschen?')) return;
    const res = await fetch(`/api/technicians?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Techniker gelöscht'); setEditId(null); refetch(); }
    else { const json = await res.json(); toast.error(json.error || 'Fehler beim Löschen'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Techniker</h1>
          <p className="text-slate-500 mt-1">{technicians.length} Techniker</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Neuer Techniker
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">Neuer Techniker</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={newTech.vorname} onChange={(e) => setNewTech({ ...newTech, vorname: e.target.value })} placeholder="Vorname" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input value={newTech.nachname} onChange={(e) => setNewTech({ ...newTech, nachname: e.target.value })} placeholder="Nachname" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input value={newTech.email} onChange={(e) => setNewTech({ ...newTech, email: e.target.value })} placeholder="E-Mail" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input value={newTech.telefon} onChange={(e) => setNewTech({ ...newTech, telefon: e.target.value })} placeholder="Telefon" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Erstellen'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : technicians.length === 0 ? (
          <div className="p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Keine Techniker</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {technicians.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {t.vorname[0]}{t.nachname[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{t.vorname} {t.nachname}</p>
                    <p className="text-xs text-slate-500">{t.email || '—'} · {t.telefon || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${t.aktiv ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                    {t.aktiv ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <button onClick={() => { setEditId(t.id); setEditData({ vorname: t.vorname, nachname: t.nachname, telefon: t.telefon || '', email: t.email || '', aktiv: t.aktiv }); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal — backdrop click only on the outer div, inner div stops propagation */}
      {editId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-outfit font-bold text-slate-900 text-lg">Techniker bearbeiten</h3>
              <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={editData.vorname} onChange={(e) => setEditData({ ...editData, vorname: e.target.value })} placeholder="Vorname" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input value={editData.nachname} onChange={(e) => setEditData({ ...editData, nachname: e.target.value })} placeholder="Nachname" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} placeholder="E-Mail" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input value={editData.telefon} onChange={(e) => setEditData({ ...editData, telefon: e.target.value })} placeholder="Telefon" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={editData.aktiv} onChange={(e) => setEditData({ ...editData, aktiv: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">Aktiv</span></label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
              </button>
              <button onClick={() => handleDelete(editId)} className="py-2.5 px-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 inline-flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
              <button onClick={() => setEditId(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
