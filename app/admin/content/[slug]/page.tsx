'use client';

/**
 * Admin — content editor, /admin/content/[slug].
 *
 * Client component. Loads a rechtstext (legal/CMS page) and its versions from
 * /api/content/[slug], saves edits with PUT, and lets admins restore historical
 * versions locally before saving. Operates inside the admin auth context.
 */
import { useState, useEffect, use } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });
import { ArrowLeft, Save, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Version {
  id: string;
  content_html: string;
  version_nummer: number;
  erstellt_am: string;
}

/**
 * Renders the rich-text CMS editor for one content slug, including title,
 * published state, save action, and version restore panel.
 */
export default function ContentEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titel, setTitel] = useState('');
  const [published, setPublished] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const [editorValue, setEditorValue] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`/api/content/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.data) {
          setTitel(json.data.titel);
          // Accept either the database column name (veröffentlicht) or the
          // more portable 'published' property if present. Use safe any cast
          // to avoid non-ASCII property warnings.
          // API normalizes and returns a portable 'published' boolean
          setPublished(json.data.published ?? false);
          if (json.data.content_html) {
            setEditorValue(json.data.content_html);
          }
        }
        setVersions(json.versions || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);

    const res = await fetch(`/api/content/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel,
        content_html: editorValue,
        // Send a portable ASCII key; the server will map this to the
        // database column named 'veröffentlicht'.
        published: published,
      }),
    });

    if (res.ok) {
      toast.success('Seite gespeichert');
      // Refresh versions
      const refreshed = await fetch(`/api/content/${slug}`).then((r) => r.json());
      setVersions(refreshed.versions || []);
    } else {
      // Try to extract server error message for clearer debugging
      let msg = 'Fehler beim Speichern';
      try {
        const err = await res.json();
        if (err?.error) msg = err.error;
        else if (err?.message) msg = err.message;
      } catch {}
      toast.error(msg);
      console.error('Save failed', res.status, await res.text());
    }
    setSaving(false);
  };

  const restoreVersion = (version: Version) => {
    if (!confirm(`Version ${version.version_nummer} wiederherstellen? Aktuelle Änderungen gehen verloren.`)) return;
    setEditorValue(version.content_html);
    toast.info(`Version ${version.version_nummer} geladen — noch nicht gespeichert`);
    setShowVersions(false);
  };

  // link/image helpers removed — use the editor toolbar or paste instead

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/content" className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="text-2xl font-outfit font-bold text-slate-900 bg-transparent focus:outline-none border-b-2 border-transparent focus:border-blue-600"
            />
            <p className="text-slate-500 text-sm mt-0.5 font-mono">/{slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <span className="text-slate-700">Veröffentlicht</span>
          </label>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Versionen"
          >
            <Clock className="w-5 h-5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Editor */}
        <div className="flex-1">
          <div className="flex-1">
            {/* Shared Rich Text Editor component */}
            <RichTextEditor value={editorValue} onChange={(html) => setEditorValue(html)} minHeight="500px" />
          </div>
        </div>

        {/* Versions Panel */}
        {showVersions && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <h3 className="font-outfit font-bold text-slate-900 mb-4">Versionen</h3>
              {versions.length === 0 ? (
                <p className="text-sm text-slate-500">Keine früheren Versionen</p>
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Version {v.version_nummer}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(v.erstellt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => restoreVersion(v)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Laden
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
