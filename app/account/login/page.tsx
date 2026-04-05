'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const authError = searchParams.get('error');

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Bitte E-Mail und Passwort eingeben');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message?.includes('Email not confirmed')) {
        toast.error('Bitte bestätigen Sie zuerst Ihre E-Mail Adresse. Prüfen Sie Ihren Posteingang.');
      } else {
        toast.error('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.');
      }
      setLoading(false);
      return;
    }

    toast.success('Erfolgreich angemeldet!');
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-outfit font-bold text-slate-900">Willkommen zurück</h1>
          <p className="text-slate-500 mt-2">Melden Sie sich in Ihrem Konto an</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          {/* Info banner: coming from registration */}
          {prefillEmail && (
            <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">E-Mail bestätigt?</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Bitte bestätigen Sie zuerst Ihre E-Mail Adresse über den Link in Ihrem Posteingang,
                  bevor Sie sich anmelden.
                </p>
              </div>
            </div>
          )}

          {/* Auth error banner */}
          {authError && (
            <div className="mb-5 bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm text-red-700">
                Authentifizierung fehlgeschlagen. Bitte versuchen Sie es erneut.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail Adresse</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="max@beispiel.de"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/account/passwort-vergessen"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Passwort vergessen?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Noch kein Konto?{' '}
              <Link href="/account/register" className="text-blue-600 font-medium hover:underline">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

