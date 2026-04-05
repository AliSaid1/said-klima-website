import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

import { COMPANY_NAME } from '@/lib/branding';

export const metadata: Metadata = {
  title: COMPANY_NAME,
  description: 'Ihr Experte für Kälte- und Klimatechnik. Shop und Service-Buchung.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="de" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50" suppressHydrationWarning>
        <CartProvider>
          {children}
        </CartProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
