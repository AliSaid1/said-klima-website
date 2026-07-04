'use client';

/**
 * Admin — content list, /admin/content.
 *
 * Client component. Fetches rechtstext (legal/CMS page) records from
 * /api/content and displays publication status plus update dates. Offers
 * read/navigation into individual CMS editors inside the admin auth context.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';

interface Rechtstext {
  id: string;
  slug: string;
  titel: string;
  veröffentlicht: boolean;
  aktualisiert_am: string;
}

/**
 * Renders the CMS page index with links to per-slug content editors.
 */
export default function ContentListPage() {
  const [pages, setPages] = useState<Rechtstext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/content')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        setPages(json.data || []);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Seiteninhalte</h1>
        <p className="text-slate-500 mt-1">Bearbeiten Sie die Inhalte Ihrer Website-Seiten</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Keine Seiten vorhanden</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/admin/content/${page.slug}`}
                className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{page.titel}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">/{page.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={page.veröffentlicht ? 'published' : 'draft'} />
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {new Date(page.aktualisiert_am).toLocaleDateString('de-DE')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
