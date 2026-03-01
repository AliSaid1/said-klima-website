import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <SearchX className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-outfit font-bold text-slate-900 mb-2">Seite nicht gefunden</h2>
        <p className="text-slate-500 text-sm mb-6">
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}

