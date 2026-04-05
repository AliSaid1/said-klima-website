'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, Loader2, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVorlage {
  id: string;
  typ: string;
  betreff: string;
  inhalt_html: string;
  variablen: string[] | null;
  aktualisiert_am: string;
}

const typLabels: Record<string, string> = {
  buchung_bestaetigung: 'Buchung: Bestätigung',
  buchung_erinnerung: 'Buchung: Erinnerung',
  buchung_absage: 'Buchung: Absage',
  bestellung_eingegangen: 'Bestellung: Eingegangen (Banküberweisung)',
  bestellung_bestaetigung: 'Bestellung: Bestätigung',
  bestellung_status: 'Bestellung: Status-Update',
  bestellung_admin_benachrichtigung: 'Bestellung: Admin-Benachrichtigung',
  zahlung_fehlgeschlagen: 'Bestellung: Zahlung fehlgeschlagen',
  kontakt_anfrage_intern: 'Kontakt: Interne Benachrichtigung',
  kontakt_anfrage_bestaetigung: 'Kontakt: Kundenbestätigung',
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailVorlage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailVorlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/email-templates')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        setTemplates(json.data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    const res = await fetch('/api/email-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        betreff: editing.betreff,
        inhalt_html: editing.inhalt_html,
      }),
    });

    if (res.ok) {
      toast.success('Vorlage gespeichert');
      setTemplates((prev) => prev.map((t) => t.id === editing.id ? editing : t));
    } else {
      toast.error('Fehler beim Speichern');
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">E-Mail Vorlagen</h1>
        <p className="text-slate-500 mt-1">Bearbeiten Sie die automatisch versendeten E-Mail-Vorlagen</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Template List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setEditing({ ...t }); setPreviewMode(false); }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors ${
                      editing?.id === t.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{typLabels[t.typ] || t.typ}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{t.betreff}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            {editing ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-outfit font-bold text-slate-900">{typLabels[editing.typ] || editing.typ}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className={`p-2 rounded-lg transition-colors ${previewMode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      {previewMode ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Speichern
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Betreff</label>
                    <input
                      value={editing.betreff}
                      onChange={(e) => setEditing({ ...editing, betreff: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Available Variables */}
                  {editing.variablen && editing.variablen.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verfügbare Platzhalter</p>
                      <div className="flex flex-wrap gap-1.5">
                        {editing.variablen.map((v) => (
                          <span key={v} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono text-blue-600">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {previewMode ? 'Vorschau' : 'HTML-Inhalt'}
                    </label>
                    {previewMode ? (
                      <div
                        className="border border-slate-200 rounded-xl p-4 min-h-[300px] prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: editing.inhalt_html }}
                      />
                    ) : (
                      <textarea
                        value={editing.inhalt_html}
                        onChange={(e) => setEditing({ ...editing, inhalt_html: e.target.value })}
                        rows={16}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-mono resize-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Wählen Sie eine Vorlage zum Bearbeiten</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

