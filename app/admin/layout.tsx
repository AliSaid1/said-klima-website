"use client";

/**
 * Admin — shared dashboard layout, /admin/*.
 *
 * Client component. Uses Supabase auth and the benutzer (user) role table to
 * guard admin routes, redirects non-admins, and wraps child routes with the
 * shared admin chrome: sidebar, topbar, main scroll container, and toast host.
 * The /admin/login route receives a minimal unauthenticated shell.
 */
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { Toaster } from 'sonner';

/**
 * Provides the protected admin frame and performs the client-side admin role
 * check before rendering protected route content.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't run the admin auth check on the login page itself
    if (pathname === '/admin/login') return;

    const supabase = createClient();
    supabase.auth.getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          router.push('/admin/login');
          return;
        }

        // Check admin role
        const { data: benutzer } = await supabase
          .from('benutzer')
          .select('rolle')
          .eq('id', user.id)
          .single();

        if (benutzer?.rolle !== 'admin') {
          router.push('/');
          return;
        }

        setUserEmail(user.email ?? undefined);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[admin layout] auth check failed:', err);
        setAuthError('Authentifizierung fehlgeschlagen. Bitte neu anmelden.');
        setLoading(false);
      });
  }, [router, pathname]);

  // If we are on the admin login page, render a minimal layout so the
  // Login page isn't wrapped by the full admin UI and we don't show the
  // loading spinner when not authenticated.
  if (pathname === '/admin/login') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-medium">{authError}</p>
        <a href="/admin/login" className="text-blue-600 underline text-sm">Zurück zur Anmeldung</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminTopbar
          onMenuClick={() => setSidebarOpen(true)}
          userEmail={userEmail}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
