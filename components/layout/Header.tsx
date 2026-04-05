'use client';

import { useState, useEffect } from 'react';
import { LOGO_SRC, COMPANY_NAME } from '@/lib/branding';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, Menu, X, User, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/lib/cart-context';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const [userName, setUserName] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [companyPhone, setCompanyPhone] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);

    // Load dynamic phone number from company settings
    fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => { if (json.data?.telefon) setCompanyPhone(json.data.telefon); })
      .catch(() => {});

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const vorname = user.user_metadata?.vorname;
        setUserName(vorname || user.email?.split('@')[0] || 'Konto');
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const vorname = session.user.user_metadata?.vorname;
        setUserName(vorname || session.user.email?.split('@')[0] || 'Konto');
      } else {
        setUserName(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center flex-shrink-0">
                <div className="relative w-40 h-16 sm:w-48 sm:h-20 md:w-56 flex items-center">
                  <Image src={LOGO_SRC} alt={COMPANY_NAME} fill className="object-contain object-left" priority />
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/services" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              Dienstleistungen
            </Link>
            <Link href="/shop" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              Shop
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-6">
            {companyPhone && (
              <a href={`tel:${companyPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                <Phone className="w-4 h-4" />
                <span>{companyPhone}</span>
              </a>
            )}

            <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
              <Link href={userName ? '/account' : '/account/login'} className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium">
                <User className="w-5 h-5" />
                <span className="hidden lg:inline">{userName || 'Anmelden'}</span>
              </Link>
              <Link href="/cart" className="text-slate-600 hover:text-blue-600 transition-colors relative">
                <ShoppingCart className="w-5 h-5" />
                {isClient && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>

            <Link 
              href="/contact"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
            >
              Kontakt
            </Link>
          </div>

          {/* Mobile menu button & Icons */}
          <div className="flex md:hidden items-center gap-3">
            <Link href={userName ? '/account' : '/account/login'} className="text-slate-600 hover:text-blue-600 transition-colors p-1">
              <User className="w-5 h-5" />
            </Link>
            <Link href="/cart" className="text-slate-600 hover:text-blue-600 transition-colors relative p-1">
              <ShoppingCart className="w-5 h-5" />
              {isClient && itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            <button
              className="text-slate-600 hover:text-slate-900 focus:outline-none p-1 ml-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              <Link href="/services" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-slate-900 hover:bg-slate-50 rounded-lg">
                Dienstleistungen
              </Link>
              <Link href="/shop" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 text-base font-medium text-slate-900 hover:bg-slate-50 rounded-lg">
                Shop
              </Link>
              {companyPhone && (
                <div className="pt-4 border-t border-slate-100">
                  <a href={`tel:${companyPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 px-3 py-2 text-base font-medium text-blue-600 hover:bg-slate-50 rounded-lg">
                    <Phone className="w-5 h-5" />
                    {companyPhone}
                  </a>
                </div>
              )}
              <div className="px-3 pt-2">
                <Link 
                  href="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full px-5 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Kontakt
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

