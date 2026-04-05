 'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LOGO_SRC, COMPANY_NAME } from '@/lib/branding';
import { createClient } from '@/lib/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Mindestens 6 Zeichen'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        setError('E-Mail oder Passwort ist falsch.');
        setLoading(false);
        return;
      }

      // Full-page navigation so middleware and the admin layout both start
      // fresh with the newly-set session cookie. Using router.push() +
      // router.refresh() can conflict and leave the loading spinner stuck.
      window.location.assign('/admin');
    } catch (err) {
      console.error('[admin login] unexpected error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-72 h-36 mx-auto mb-6">
            <Image src={LOGO_SRC} alt={COMPANY_NAME} fill className="object-contain" priority />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Melden Sie sich an, um fortzufahren</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                E-Mail Adresse
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="admin@said-klima.de"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} {COMPANY_NAME}
        </p>
      </div>
    </div>
  );
}

