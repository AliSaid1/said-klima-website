'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Eye, EyeOff, Loader2, User, Phone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    passwort: '',
    passwortBestaetigung: '',
    firma: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vorname || !form.nachname || !form.email || !form.passwort) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (form.passwort.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (form.passwort !== form.passwortBestaetigung) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.passwort,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          vorname: form.vorname,
          nachname: form.nachname,
          telefon: form.telefon,
          firma: form.firma || null,
        },
      },
    });

    if (error) {
      toast.error(error.message || 'Registrierung fehlgeschlagen');
      setLoading(false);
      return;
    }

    // Show success screen with email confirmation instructions
    setSuccess(true);
    setLoading(false);
  };

  // ─── Success Screen: Email Confirmation ───
  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900 mb-3">
            Fast geschafft!
          </h1>
          <p className="text-slate-600 mb-2">
            Wir haben eine Bestätigungs-E-Mail an
          </p>
          <p className="text-lg font-bold text-slate-900 mb-4">
            {form.email}
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Bitte öffnen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink,
            um Ihr Konto zu aktivieren. Prüfen Sie auch Ihren Spam-Ordner.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">Keine E-Mail erhalten?</p>
                <p className="text-sm text-blue-700 mt-1">
                  Warten Sie einige Minuten und prüfen Sie Ihren Spam-Ordner.
                  Falls nötig, registrieren Sie sich erneut.
                </p>
              </div>
            </div>
          </div>

          <Link
            href={`/account/login?email=${encodeURIComponent(form.email)}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-outfit font-bold text-slate-900">Konto erstellen</h1>
          <p className="text-slate-500 mt-2">Registrieren Sie sich für ein kostenloses Kundenkonto</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vorname *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.vorname}
                    onChange={(e) => updateField('vorname', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Max"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nachname *</label>
                <input
                  type="text"
                  value={form.nachname}
                  onChange={(e) => updateField('nachname', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Mustermann"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail Adresse *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="max@beispiel.de"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefonnummer</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={form.telefon}
                  onChange={(e) => updateField('telefon', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="+49 123 456789"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Firmenname <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.firma}
                onChange={(e) => updateField('firma', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Firma GmbH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Passwort *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.passwort}
                  onChange={(e) => updateField('passwort', e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Mind. 6 Zeichen"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Passwort bestätigen *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={form.passwortBestaetigung}
                  onChange={(e) => updateField('passwortBestaetigung', e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konto erstellen'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Bereits ein Konto?{' '}
              <Link href="/account/login" className="text-blue-600 font-medium hover:underline">
                Anmelden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

