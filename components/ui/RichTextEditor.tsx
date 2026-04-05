'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';

import {
  Bold, Italic, Underline as UnderlineIcon,
  Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Code, Quote,
  Undo, Redo,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  minHeight?: string;
}

export default function RichTextEditor({ value = '', onChange, minHeight = '400px' }: Props) {
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit covers bold, italic, lists, blockquote, code-block, history, etc.
      // Heading is disabled here and added explicitly below to avoid duplicate node.
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      TextStyle,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      Placeholder.configure({ placeholder: 'Inhalt hier eingeben...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: {
      attributes: {
        // .rte-content is targeted by the <style> block — no Tailwind prose dependency
        class: 'rte-content',
        style: `min-height:${minHeight}; max-height:80vh; overflow-y:auto; padding:1.5rem; outline:none; box-shadow:none;`,
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  // Sync content from parent only when the external value actually changes
  useEffect(() => {
    if (!editor) return;
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Image paste → upload to /api/upload and insert into editor
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const form = new FormData();
          form.append('file', file);
          form.append('bucket', 'product-images');
          try {
            const res = await fetch('/api/upload', { method: 'POST', body: form });
            const json = await res.json();
            if (res.ok && json.data?.url) {
              editor.chain().focus().setImage({ src: json.data.url }).run();
            } else {
              toast.error('Bild-Upload fehlgeschlagen: ' + (json.error ?? 'unbekannter Fehler'));
            }
          } catch {
            toast.error('Bild-Upload fehlgeschlagen');
          }
        }
      }
    };

    dom.addEventListener('paste', handlePaste as unknown as EventListener);
    return () => dom.removeEventListener('paste', handlePaste as unknown as EventListener);
  }, [editor]);

  const cmd = (fn: (ed: typeof editor) => void) => {
    if (!editor) return;
    fn(editor);
    editor.view?.focus();
  };

  // Helpers to find the closest table element from the current document selection
  const getClosestTableFromSelection = (): HTMLTableElement | null => {
    try {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return null;
      let node: Node | null = sel.anchorNode as Node;
      if (node.nodeType === 3) node = node.parentElement;
      return (node as HTMLElement)?.closest ? (node as HTMLElement).closest('table') as HTMLTableElement : null;
    } catch (e) {
      return null;
    }
  };

  const setTableColumnWidth = (colIndex: number, pct: number) => {
    const table = getClosestTableFromSelection();
    if (!table) { toast.error('Keine Tabelle ausgewählt'); return; }
    const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
    rows.forEach((row) => {
      const cells = Array.from(row.children).filter((n) => ['TD','TH'].includes(n.nodeName)) as HTMLElement[];
      const cell = cells[colIndex];
      if (cell) cell.style.width = `${pct}%`;
    });
  };

  const btn = (active?: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/*
        Root cause fix: Tailwind v4 prose styles use :where() selectors that do NOT
        penetrate the ProseMirror contenteditable div. We bypass this entirely by
        writing explicit scoped CSS for .rte-content (the class on the editor div).
      */}
      <style>{`
        .rte-content { display: block; }
        .rte-content h1 { font-size:1.875rem; font-weight:700; line-height:1.25; color:#0f172a; margin:1rem 0 .5rem; }
        .rte-content h2 { font-size:1.5rem;   font-weight:700; line-height:1.3;  color:#0f172a; margin:1rem 0 .5rem; }
        .rte-content h3 { font-size:1.25rem;  font-weight:600; line-height:1.4;  color:#1e293b; margin:.75rem 0 .5rem; }
        .rte-content p  { line-height:1.65; color:#334155; margin:.25rem 0; }
        .rte-content ul { list-style-type:disc;    padding-left:1.5rem; margin:.5rem 0; color:#334155; }
        .rte-content ol { list-style-type:decimal; padding-left:1.5rem; margin:.5rem 0; color:#334155; }
        .rte-content li { margin:.2rem 0; }
        .rte-content strong { font-weight:700; }
        .rte-content em    { font-style:italic; }
        .rte-content u     { text-decoration:underline; }
        .rte-content a     { color:#2563eb; text-decoration:underline; }
        .rte-content blockquote { border-left:4px solid #cbd5e1; padding-left:1rem; color:#64748b; font-style:italic; margin:.5rem 0; }
        .rte-content pre  { background:#f1f5f9; padding:1rem; border-radius:.5rem; font-size:.875rem; overflow-x:auto; margin:.5rem 0; }
        .rte-content code { background:#f1f5f9; padding:.125rem .3rem; border-radius:.25rem; font-size:.875rem; }
        .rte-content img  { max-width:100%; height:auto; border-radius:.5rem; margin:.5rem 0; }
        .rte-content table { width:100%; border-collapse:collapse; margin:.5rem 0; }
        .rte-content th   { background:#f8fafc; font-weight:600; border:1px solid #e2e8f0; padding:.5rem .75rem; text-align:left; }
        .rte-content td   { border:1px solid #e2e8f0; padding:.5rem .75rem; }
        .rte-content .is-editor-empty::before { content:attr(data-placeholder); color:#94a3b8; pointer-events:none; float:left; height:0; }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50">
        <button type="button" className={btn(editor?.isActive('bold'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleBold().run())}>
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className={btn(editor?.isActive('italic'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleItalic().run())}>
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" className={btn(editor?.isActive('underline'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleUnderline().run())}>
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" className={btn(editor?.isActive('heading', { level: 2 }))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleHeading({ level: 2 }).run())}>
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" className={btn(editor?.isActive('heading', { level: 3 }))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleHeading({ level: 3 }).run())}>
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" className={btn(editor?.isActive('bulletList'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleBulletList().run())}>
          <List className="w-4 h-4" />
        </button>
        <button type="button" className={btn(editor?.isActive('orderedList'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleOrderedList().run())}>
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" className={btn(editor?.isActive('blockquote'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleBlockquote().run())}>
          <Quote className="w-4 h-4" />
        </button>
        <button type="button" className={btn(editor?.isActive('codeBlock'))}
          onClick={() => cmd((ed) => ed?.chain().focus().toggleCodeBlock().run())}>
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" className={btn(editor?.isActive('link'))}
          onClick={() => {
            const url = prompt('URL eingeben:');
            if (url) cmd((ed) => ed?.chain().focus().setLink({ href: url }).run());
          }}>
          <LinkIcon className="w-4 h-4" />
        </button>
        {/* Image upload: dynamic file picker so click reliably opens dialog */}
        <button type="button" data-rte-image-button="true" className={btn()}
          onClick={() => {
            // Create a dynamic file input. Tests like Playwright need the input to be
            // present and technically visible (not display:none) to reliably call
            // setInputFiles. We make it 1x1px, fully transparent and positioned so it
            // doesn't affect layout or user experience.
                    const input = document.createElement('input');
                    input.type = 'file';
                    // Allow images and PDFs from the editor
                    input.accept = 'image/*,application/pdf';
                    input.setAttribute('data-rte-file-input', 'true');
            // Make the element present and considered visible by automation tools
            // while remaining invisible to users.
            input.style.position = 'fixed';
            input.style.left = '0';
            input.style.top = '0';
            input.style.width = '1px';
            input.style.height = '1px';
            input.style.opacity = '0';
            input.style.pointerEvents = 'auto';
            input.style.zIndex = '9999';
            document.body.appendChild(input);
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      try { document.body.removeChild(input); } catch {}
                      if (!file) return;

                      const form = new FormData();
                      form.append('file', file);
                      // Route PDFs to the documents bucket; images keep using product-images
                      const bucket = file.type === 'application/pdf' ? 'documents' : 'product-images';
                      form.append('bucket', bucket);

                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: form });
                        const json = await res.json();
                        if (res.ok && json.data?.url) {
                          const url = json.data.url as string;
                          if (file.type === 'application/pdf') {
                            // Insert a link to the uploaded PDF in the editor
                            try {
                              cmd((ed) => ed?.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${file.name}</a>`).run());
                            } catch (e) {
                              // Fallback: set link using setLink if available
                              try {
                                cmd((ed) => ed?.chain().focus().setLink({ href: url }).run());
                              } catch (e2) {
                                console.error('Could not insert PDF link into editor', e2);
                              }
                            }
                          } else {
                            // Image — keep original behavior
                            cmd((ed) => ed?.chain().focus().setImage({ src: url }).run());
                          }
                        } else {
                          toast.error('Upload fehlgeschlagen: ' + (json.error ?? 'unbekannter Fehler'));
                        }
                      } catch (e) {
                        console.error('upload error', e);
                        toast.error('Upload fehlgeschlagen');
                      }
                    };
            input.click();
          }}>
          <ImageIcon className="w-4 h-4" />
        </button>
        <button type="button" className={btn()}
          onClick={() => {
            const rows = parseInt(prompt('Anzahl Zeilen', '2') || '2', 10) || 2;
            const cols = parseInt(prompt('Anzahl Spalten', '2') || '2', 10) || 2;
            cmd((ed) => ed?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run());
          }}>
          <TableIcon className="w-4 h-4" />
        </button>
        {/* Table manipulation buttons */}
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().addColumnBefore ? ed.chain().focus().addColumnBefore().run() : null))} title="Spalte links einfügen">
          <span className="sr-only">Add column before</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Column width control */}
        <button type="button" className={btn()} title="Spaltenbreite setzen"
          onClick={() => {
            const idx = parseInt(prompt('Spaltenindex (beginnend bei 0)') || '0', 10);
            if (isNaN(idx)) return;
            const p = parseInt(prompt('Breite in Prozent für diese Spalte (z. B. 20)') || '20', 10);
            if (isNaN(p)) return;
            setTableColumnWidth(idx, p);
          }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().addColumnAfter ? ed.chain().focus().addColumnAfter().run() : null))} title="Spalte rechts einfügen">
          <span className="sr-only">Add column after</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(90 12 12)"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().addRowBefore ? ed.chain().focus().addRowBefore().run() : null))} title="Zeile oben einfügen">
          <span className="sr-only">Add row before</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().addRowAfter ? ed.chain().focus().addRowAfter().run() : null))} title="Zeile unten einfügen">
          <span className="sr-only">Add row after</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().deleteColumn ? ed.chain().focus().deleteColumn().run() : null))} title="Spalte löschen">
          <span className="sr-only">Delete column</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().deleteRow ? ed.chain().focus().deleteRow().run() : null))} title="Zeile löschen">
          <span className="sr-only">Delete row</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -6)"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().deleteTable ? ed.chain().focus().deleteTable().run() : null))} title="Tabelle löschen">
          <span className="sr-only">Delete table</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -12)"/></svg>
        </button>
        <button type="button" className={btn()} onClick={() => cmd((ed) => (ed?.chain().focus().toggleHeaderRow ? ed.chain().focus().toggleHeaderRow().run() : null))} title="Kopfleiste umschalten">
          <span className="sr-only">Toggle header row</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(1,0.5)"/></svg>
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button type="button" className={btn()}
          onClick={() => cmd((ed) => ed?.chain().focus().undo().run())}>
          <Undo className="w-4 h-4" />
        </button>
        <button type="button" className={btn()}
          onClick={() => cmd((ed) => ed?.chain().focus().redo().run())}>
          <Redo className="w-4 h-4" />
        </button>
      </div>

      <EditorContent editor={editor} spellCheck />
    </div>
  );
}

