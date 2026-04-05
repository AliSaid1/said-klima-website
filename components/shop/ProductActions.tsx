'use client';

import { useState } from 'react';
import { ShoppingCart, Shield, Wrench } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { toast } from 'sonner';

interface ProductActionsProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

export default function ProductActions({ product }: ProductActionsProps) {
  const [mitInstallation, setMitInstallation] = useState(false);
  const { addItem } = useCart();

  const installationPreis = 499;
  const gesamtPreis = mitInstallation ? product.price + installationPreis : product.price;

  const handleAddToCart = () => {
    addItem({
      artikel_id: product.id,
      titel: product.name,
      artikelnummer: `ART-${product.id}`,
      preis_brutto: product.price,
      rabattpreis: null,
      bild_url: product.image,
      mit_installation: mitInstallation,
      dienstleistung_id: null,
    });
    toast.success(`${product.name} wurde zum Warenkorb hinzugefügt`);
  };

  return (
    <>
      {/* Service Selection */}
      <div className="mb-8 space-y-3">
        <h3 className="font-bold text-slate-900 mb-2">Service-Optionen</h3>
        <label
          className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-colors ${
            mitInstallation
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="service"
            checked={mitInstallation}
            onChange={() => setMitInstallation(true)}
            className="mt-1 w-4 h-4 text-blue-600"
          />
          <div>
            <p className="font-bold text-slate-900">Mit Installation (+ {installationPreis} €)</p>
            <p className="text-sm text-slate-600">Fachgerechte Montage durch unsere zertifizierten Techniker.</p>
          </div>
        </label>
        <label
          className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-colors ${
            !mitInstallation
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="radio"
            name="service"
            checked={!mitInstallation}
            onChange={() => setMitInstallation(false)}
            className="mt-1 w-4 h-4 text-blue-600"
          />
          <div>
            <p className="font-bold text-slate-900">Ohne Installation</p>
            <p className="text-sm text-slate-600">Nur Lieferung des Geräts.</p>
          </div>
        </label>
      </div>

      {/* Price */}
      <div className="mb-6 flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{gesamtPreis.toLocaleString('de-DE')} €</span>
        {mitInstallation && (
          <span className="text-sm text-slate-500">inkl. Installation</span>
        )}
      </div>

      <button
        onClick={handleAddToCart}
        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
      >
        <ShoppingCart className="w-6 h-6" />
        In den Warenkorb
      </button>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
        <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Sichere Zahlung</span>
        <span className="flex items-center gap-2"><Wrench className="w-4 h-4" /> Profi-Service</span>
      </div>
    </>
  );
}

