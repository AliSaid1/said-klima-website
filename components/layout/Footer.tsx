import Link from 'next/link';
import {LOGO_SRC, COMPANY_NAME, LOGO_SRC_SILVER} from '@/lib/branding';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            {/* Larger logo - kept inside same footer height but more prominent */}
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="relative w-76 h-46 sm:w-66 sm:h-40 flex items-center">
                <Image src={LOGO_SRC_SILVER} alt={COMPANY_NAME} fill className="object-contain object-left" />
              </div>
            </Link>
            {/* Description removed per request to keep footer cleaner while logo is prominent */}
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Dienstleistungen</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="hover:text-white transition-colors">Diagnose & Reparatur</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Installation & Austausch</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Saisonale Wartung</Link></li>
              <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Unternehmen</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">Über uns</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Kontakt</Link></li>
              <li><Link href="/account" className="hover:text-white transition-colors">Kundenkonto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Rechtliches</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
              <li><Link href="/legal/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link></li>
              <li><Link href="/legal/agb" className="hover:text-white transition-colors">AGB</Link></li>
              <li><Link href="/legal/widerruf" className="hover:text-white transition-colors">Widerrufsbelehrung</Link></li>
              <li><Link href="/legal/versand-zahlung" className="hover:text-white transition-colors">Versand & Zahlung</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4">
            {/* Social links are intentionally hidden until ready to be shown
            <a href="#" className="hover:text-white transition-colors">Facebook</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            */}
          </div>
        </div>
      </div>
    </footer>
  );
}

