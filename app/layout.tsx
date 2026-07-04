/**
 * Root application layout for all App Router routes.
 * Server component that configures German document metadata, Google font variables, the cart provider, and toast notifications.
 * Data sources are static branding constants and client-side cart state provided by CartProvider.
 * Key interactions are global cart mutations and toast feedback made available to nested route segments.
 */

import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

import { COMPANY_NAME } from '@/lib/branding';

/**
 * Default SEO metadata shared by the application unless overridden by nested routes.
 */
export const metadata: Metadata = {
  title: COMPANY_NAME,
  description: 'Ihr Experte für Kälte- und Klimatechnik. Shop und Service-Buchung.',
};

/**
 * Wraps every route with document-level font classes, cart state, and notification infrastructure.
 * @param children App Router segment content rendered inside the global providers.
 * @returns The German-language HTML document scaffold for the application.
 */
export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="de" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50" suppressHydrationWarning>
        <CartProvider>
          {children}
        </CartProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
