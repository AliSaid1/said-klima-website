'use client';

import { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Kategorie {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children: Kategorie[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Kategorie[]>([]);
  const [flat, setFlat] = useState<Kategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newParent, setNewParent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const json = await res.json();
    setCategories(json.data || []);
    setFlat(json.flat || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetchCategories().then(() => { if (!mounted) return; });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newName || !newSlug) return;
    setSaving(true);

    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, slug: newSlug, parent_id: newParent || null }),
    });

    if (res.ok) {
      toast.success('Kategorie erstellt');
      setShowNew(false);
      setNewName('');
      setNewSlug('');
      setNewParent('');
      fetchCategories();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Fehler');
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editName, slug: editSlug }),
    });

    if (res.ok) {
      toast.success('Kategorie aktualisiert');
      setEditingId(null);
      fetchCategories();
    } else {
      toast.error('Fehler beim Aktualisieren');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kategorie löschen?')) return;

    const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Kategorie gelöscht');
      fetchCategories();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Fehler beim Löschen');
    }
  };

  const renderCategory = (cat: Kategorie, depth = 0) => {
    const isEditing = editingId === cat.id;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
            depth > 0 ? `pl-${4 + depth * 6}` : ''
          }`}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          <FolderTree className="w-4 h-4 text-slate-400 flex-shrink-0" />

          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                className="px-2 py-1 rounded border border-slate-200 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button onClick={() => handleUpdate(cat.id)} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-slate-900 flex-1">{cat.name}</span>
              <span className="text-xs text-slate-400 font-mono">{cat.slug}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditSlug(cat.slug); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
        {cat.children?.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Kategorien</h1>
          <p className="text-slate-500 mt-1">{flat.length} Kategorien</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Kategorie
        </button>
      </div>

      {/* New Category Form */}
      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-3">Neue Kategorie</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(e.target.value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
              }}
              placeholder="Name"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="Slug" className="w-40 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
              <option value="">Keine Überkat.</option>
              {flat.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Erstellen'}
            </button>
          </div>
        </div>
      )}

      {/* Category Tree */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Keine Kategorien vorhanden</p>
          </div>
        ) : (
          categories.map((cat) => renderCategory(cat))
        )}
      </div>
    </div>
  );
}


