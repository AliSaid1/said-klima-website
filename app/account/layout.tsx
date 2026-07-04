/**
 * Shared layout for account routes — /account/*.
 * Server component wrapping benutzer (user) account pages with public header, footer, top offset, and slate background.
 * Data sources are shared layout components only; authentication data is handled by nested client pages or account pages.
 * Key interactions include nested login, registration, password reset, and account management flows.
 */

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Provides public chrome around account route content.
 * @param children Nested account segment content.
 * @returns A full-height account page frame with header, main area, and footer.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Header />
      <main className="flex-grow bg-slate-50">
        {children}
      </main>
      <Footer />
    </div>
  );
}
