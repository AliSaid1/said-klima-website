'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Bitte geben Sie Ihre E-Mail Adresse ein');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/passwort-neu`,
    });

    if (error) {
      toast.error('Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900 mb-3">E-Mail gesendet!</h1>
          <p className="text-slate-500 mb-2">
            Wir haben eine E-Mail an <strong className="text-slate-700">{email}</strong> gesendet.
          </p>
          <p className="text-slate-500 mb-8 text-sm">
            Bitte überprüfen Sie Ihren Posteingang und klicken Sie auf den Link, um Ihr Passwort zurückzusetzen. Prüfen Sie auch Ihren Spam-Ordner.
          </p>
          <Link
            href="/account/login"
            className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl leading-none">S</span>
          </div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900">Passwort vergessen?</h1>
          <p className="text-slate-500 mt-2">Kein Problem! Geben Sie Ihre E-Mail Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail Adresse</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="max@beispiel.de"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link senden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

