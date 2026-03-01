'use client';

import { useState, useEffect } from 'react';
import { Wrench, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Dienstleistung {
  id: string;
  code: string;
  name: string;
  beschreibung: string | null;
  basispreis_brutto: number;
  steuersatz: number;
  dauer_minuten: number;
  aktiv: boolean;
}

const emptyService = { code: '', name: '', beschreibung: '', basispreis_brutto: 0, steuersatz: 19, dauer_minuten: 60, aktiv: true };

export default function ServicesPage() {
  const [services, setServices] = useState<Dienstleistung[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newService, setNewService] = useState(emptyService);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState(emptyService);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/services');
      const json = await res.json();
      setServices(json.data || []);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  const handleCreate = async () => {
    if (!newService.code || !newService.name) {
      toast.error('Code und Name sind Pflichtfelder');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newService) });
    const json = await res.json();
    if (res.ok) { toast.success('Dienstleistung erstellt'); setShowNew(false); setNewService(emptyService); refetch(); }
    else toast.error(json.error || 'Fehler beim Erstellen');
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    const res = await fetch('/api/services', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...editData }) });
    if (res.ok) { toast.success('Gespeichert'); setEditId(null); refetch(); }
    else toast.error('Fehler');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dienstleistung deaktivieren?')) return;
    const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deaktiviert'); refetch(); }
    else toast.error('Fehler');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Dienstleistungen</h1>
          <p className="text-slate-500 mt-1">{services.length} Dienstleistungen</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Neue Dienstleistung
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">Neue Dienstleistung</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <input value={newService.code} onChange={(e) => setNewService({ ...newService, code: e.target.value })} placeholder="Code (z.B. INST-01)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} placeholder="Name" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input type="number" value={newService.basispreis_brutto} onChange={(e) => setNewService({ ...newService, basispreis_brutto: Number(e.target.value) })} placeholder="Preis" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input type="number" value={newService.dauer_minuten} onChange={(e) => setNewService({ ...newService, dauer_minuten: Number(e.target.value) })} placeholder="Dauer (Min.)" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <input value={newService.beschreibung} onChange={(e) => setNewService({ ...newService, beschreibung: e.target.value })} placeholder="Beschreibung" className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Erstellen'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center"><Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Keine Dienstleistungen</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Preis</th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Dauer</th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{s.code}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{Number(s.basispreis_brutto).toFixed(2)} €</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.dauer_minuten} Min.</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.aktiv ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {s.aktiv ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditId(s.id); setEditData({ code: s.code, name: s.name, beschreibung: s.beschreibung || '', basispreis_brutto: Number(s.basispreis_brutto), steuersatz: Number(s.steuersatz), dauer_minuten: s.dauer_minuten, aktiv: s.aktiv }); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-outfit font-bold text-slate-900 text-lg">Bearbeiten</h3>
              <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={editData.code} onChange={(e) => setEditData({ ...editData, code: e.target.value })} placeholder="Code" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input value={editData.beschreibung} onChange={(e) => setEditData({ ...editData, beschreibung: e.target.value })} placeholder="Beschreibung" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input type="number" value={editData.basispreis_brutto} onChange={(e) => setEditData({ ...editData, basispreis_brutto: Number(e.target.value) })} placeholder="Preis" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <input type="number" value={editData.dauer_minuten} onChange={(e) => setEditData({ ...editData, dauer_minuten: Number(e.target.value) })} placeholder="Dauer (Min.)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={editData.aktiv} onChange={(e) => setEditData({ ...editData, aktiv: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm">Aktiv</span></label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleUpdate} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
              </button>
              <button onClick={() => setEditId(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

