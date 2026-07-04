'use client';

/**
 * Admin — route error boundary, /admin.
 *
 * Client component used by the App Router as the admin error boundary. It
 * surfaces unexpected route errors inside the admin auth context and offers a
 * reset action to retry rendering the failed segment.
 */
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Renders a recoverable admin error state with the error message and reset
 * callback supplied by Next.js.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-outfit font-bold text-slate-900 mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-slate-500 text-sm mb-6">
          {error.message || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
