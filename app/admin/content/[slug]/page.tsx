'use client';

import { useState, useEffect, use } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Bold, Italic, Heading2, Heading3, List, ListOrdered, LinkIcon, ImageIcon, Undo, Redo, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Version {
  id: string;
  content_html: string;
  version_nummer: number;
  erstellt_am: string;
}

export default function ContentEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titel, setTitel] = useState('');
  const [published, setPublished] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersions, setShowVersions] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      Placeholder.configure({ placeholder: 'Seiteninhalt hier eingeben...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[400px] p-6 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    let mounted = true;
    fetch(`/api/content/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.data) {
          setTitel(json.data.titel);
          setPublished(json.data['veröffentlicht']);
          if (editor && json.data.content_html) {
            editor.commands.setContent(json.data.content_html);
          }
        }
        setVersions(json.versions || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [slug, editor]);

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);

    const res = await fetch(`/api/content/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel,
        content_html: editor.getHTML(),
        'veröffentlicht': published,
      }),
    });

    if (res.ok) {
      toast.success('Seite gespeichert');
      // Refresh versions
      const refreshed = await fetch(`/api/content/${slug}`).then((r) => r.json());
      setVersions(refreshed.versions || []);
    } else {
      toast.error('Fehler beim Speichern');
    }
    setSaving(false);
  };

  const restoreVersion = (version: Version) => {
    if (!editor) return;
    if (!confirm(`Version ${version.version_nummer} wiederherstellen? Aktuelle Änderungen gehen verloren.`)) return;
    editor.commands.setContent(version.content_html);
    toast.info(`Version ${version.version_nummer} geladen — noch nicht gespeichert`);
    setShowVersions(false);
  };

  const addLink = () => {
    if (!editor) return;
    const url = prompt('URL eingeben:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    if (!editor) return;
    const url = prompt('Bild-URL eingeben:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Toolbar */}
            {editor && (
              <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <Bold className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <Heading2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <Heading3 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <List className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>
                  <ListOrdered className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={addLink} className="p-1.5 rounded text-slate-500 hover:bg-slate-200">
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button type="button" onClick={addImage} className="p-1.5 rounded text-slate-500 hover:bg-slate-200">
                  <ImageIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1" />
                <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded text-slate-500 hover:bg-slate-200">
                  <Undo className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded text-slate-500 hover:bg-slate-200">
                  <Redo className="w-4 h-4" />
                </button>
              </div>
            )}
            <EditorContent editor={editor} />
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

