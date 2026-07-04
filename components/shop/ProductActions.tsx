'use client';

/**
 * Client component module for product-detail purchase actions.
 * Handles optional installation selection, total-price display, and cart
 * insertion for a shop artikel (product).
 */

import { useState } from 'react';
import { ShoppingCart, Shield, Wrench } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { toast } from 'sonner';

interface ProductActionsProps {
  /** Product summary required to create a cart item. */
  product: {
    /** Product id used as artikel_id and to derive the display article number. */
    id: string;
    /** Product name shown in the cart toast and cart item title. */
    name: string;
    /** Base gross product price without optional installation. */
    price: number;
    /** Product image URL stored on the cart item. */
    image: string;
  };
}

/**
 * Renders product purchase controls as a client component.
 *
 * Lets the customer choose whether installation is included, recalculates the
 * displayed total price, adds the configured artikel (product) to the cart, and
 * shows toast feedback after insertion.
 *
 * @param props - Component props.
 * @param props.product - Product summary used for pricing and cart insertion.
 */
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
