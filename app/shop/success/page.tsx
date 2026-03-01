'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

function ShopSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Clear cart on successful payment
    if (sessionId) {
      localStorage.removeItem('said-klima-cart');
    }
  }, [sessionId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-outfit font-bold text-slate-900 mb-3">
          Vielen Dank für Ihre Bestellung!
        </h1>
        <p className="text-slate-600 mb-8">
          Ihre Zahlung war erfolgreich. Sie erhalten in Kürze eine Bestätigungs-E-Mail
          mit allen Details zu Ihrer Bestellung.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Package className="w-5 h-5" />
            Weiter einkaufen
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
          >
            Zur Startseite
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ShopSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center">Laden...</div>}>
      <ShopSuccessContent />
    </Suspense>
  );
}


