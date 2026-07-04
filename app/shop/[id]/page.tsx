'use client';

/**
 * Public product detail page — /shop/[id].
 * Client component because it unwraps dynamic params, fetches product details, manages gallery and variant state, and writes to cart context.
 * Data source is /api/shop/products/[id], returning artikel (product), variants, kategorie (category), stock, images, and technical data HTML.
 * Key interactions include gallery selection, variant selection, quantity changes, add-to-cart, and offer inquiry routing for “Ab”-price products.
 */

import { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Package, Loader2, ShoppingCart, Mail, Wrench } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { toast } from 'sonner';

/**
 * Detailed product payload used by the product detail view.
 * artikel means product; technische_daten_rte contains trusted rich text rendered as technical data HTML.
 */
interface ProductDetail {
  id: string;
  artikelnummer?: string | null;
  titel: string;
  slug: string;
  beschreibung: string | null;
  preis_brutto: number;
  rabattpreis: number | null;
  'installation_option_verfügbar': boolean;
  ist_ab_preis?: boolean;
  // Mapped by the API from artikel_technische_daten[0].inhalt
  technische_daten_rte?: string | null;
  // varianten is JSONB [{name, preis_aufschlag}] — surcharge on top of preis_brutto (migration 010)
  varianten?: Array<{
    name: string;
    preis_aufschlag: number;
  }>;
  marken: { id: string; name: string } | null;
  kategorien: { id: string; name: string; slug: string } | null;
  lagerbestaende: { bestand: number } | { bestand: number }[] | null;
  artikel_bilder: Array<{ id: string; alt_text: string | null; url: string }>;
  artikel_technische_daten: Array<{ id: string; inhalt: string | null; anzeige_reihenfolge: number }>;
}

/**
 * Normalizes stock data returned from the lagerbestaende relation.
 * @param l Stock relation payload for the selected product.
 * @returns The available quantity, or 0 when no stock is present.
 */
function getBestand(l: ProductDetail['lagerbestaende']): number {
  if (!l) return 0;
  if (Array.isArray(l)) return l[0]?.bestand ?? 0;
  return l.bestand ?? 0;
}

/**
 * Renders one product detail page from a dynamic route parameter.
 * @param params Promise containing the product id or slug from the /shop/[id] segment.
 * @returns Loading, not-found, or interactive product detail UI.
 */
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [menge, setMenge] = useState(1);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/shop/products/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((json) => {
        if (json?.data) {
          setProduct(json.data);
        }
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Produkt nicht gefunden</h1>
        <p className="text-slate-500 mb-6">Das gesuchte Produkt existiert nicht oder ist nicht mehr verfügbar.</p>
        <Link href="/shop" className="text-blue-600 font-medium hover:underline">← Zurück zum Shop</Link>
      </div>
    );
  }

  const hasVariants = (product.varianten?.length ?? 0) > 0;
  const selectedVariant = hasVariants ? product.varianten![selectedVariantIndex] : null;

  // Reset quantity when variant selection changes
/**
 * Selects a product variant and resets quantity to one to avoid stale cart amounts.
 * @param index Index of the selected variant in the product variant array.
 */
  const handleVariantSelect = (index: number) => {
    setSelectedVariantIndex(index);
    setMenge(1);
  };

  // Price: base product price + variant surcharge (preis_aufschlag)
  const baseProductPrice = product.rabattpreis && Number(product.rabattpreis) < Number(product.preis_brutto)
    ? Number(product.rabattpreis)
    : Number(product.preis_brutto);
  const displayPrice = selectedVariant
    ? Number(product.preis_brutto) + Number(selectedVariant.preis_aufschlag)
    : baseProductPrice;
  const hasDiscount = !selectedVariant && product.rabattpreis !== null && Number(product.rabattpreis) < Number(product.preis_brutto);
  const basePrice = Number(product.preis_brutto);

  // Stock always comes from lagerbestaende (variants share the same stock pool)
  const bestand = getBestand(product.lagerbestaende);

  const images = product.artikel_bilder || [];

/**
 * Adds the selected product or variant to the cart context with the current quantity.
 * @returns Nothing when product data is unavailable; otherwise updates cart state and shows feedback.
 */
  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      artikel_id: product.id,
      // variant_id stores the variant name — used as the unique key per variant in the cart
      variant_id: selectedVariant?.name,
      // slug is used by the cart page to navigate back to this product
      slug: product.slug,
      titel: selectedVariant ? `${product.titel} – ${selectedVariant.name}` : product.titel,
      // Use the real artikelnummer from the DB, not a synthetic "ART-<uuid>"
      artikelnummer: product.artikelnummer || '',
      preis_brutto: displayPrice,
      rabattpreis: null,
      menge,
      bild_url: images[0]?.url || '',
      mit_installation: false,
      dienstleistung_id: null,
    });
    toast.success(
      menge > 1
        ? `${menge}× ${product.titel} wurde zum Warenkorb hinzugefügt`
        : `${product.titel} wurde zum Warenkorb hinzugefügt`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zum Shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative h-[400px] sm:h-[500px] bg-slate-100 rounded-3xl overflow-hidden">
            {images[selectedImage]?.url ? (
              <Image
                src={images[selectedImage].url}
                alt={images[selectedImage].alt_text || product.titel}
                fill
                className="object-cover"
                priority
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-slate-300" />
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                -{Math.round(100 - (Number(product.rabattpreis) / Number(product.preis_brutto)) * 100)}%
              </span>
            )}
          </div>
          {/* Thumbnail row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    i === selectedImage ? 'border-blue-600' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  {img.url ? (
                    <Image src={img.url} alt={img.alt_text || ''} fill className="object-cover" sizes="80px" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            {product.marken && (
              <span className="text-sm font-bold tracking-wider text-blue-600 uppercase">{product.marken.name}</span>
            )}
            {product.kategorien && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span className="text-sm font-medium text-slate-500">{product.kategorien.name}</span>
              </>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-4">
            {product.titel}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-slate-900">
              {product.ist_ab_preis && <span className="text-xl font-normal text-slate-500 mr-2">Ab</span>}
              {displayPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </span>
            {hasDiscount && (
              <span className="text-lg text-slate-400 line-through">
                {basePrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
              </span>
            )}
            {bestand <= 0 ? (
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-800">
                Ausverkauft
              </span>
            ) : null}
            {product['installation_option_verfügbar'] && (
              <span className="text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2 bg-slate-100 text-slate-700">
                <Wrench className="w-4 h-4" />
                Mit Installation
              </span>
            )}
          </div>

          {product.beschreibung && (
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {product.beschreibung}
            </p>
          )}

          {/* Varianten Auswahl */}
          {hasVariants && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-900 mb-3">Variante / Größe wählen</label>
              <div className="flex flex-wrap gap-3">
                {product.varianten!.map((v, i) => {
                  const variantPrice = Number(product.preis_brutto) + Number(v.preis_aufschlag);
                  return (
                    <button
                      key={i}
                    onClick={() => handleVariantSelect(i)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        selectedVariantIndex === i
                          ? 'border-blue-600 text-blue-700 bg-blue-50'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="block mb-1">{v.name}</span>
                      <span className="block text-xs font-normal opacity-80">
                        {variantPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menge / Quantity selector — only when product is in stock */}
          {!product.ist_ab_preis && bestand > 0 && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Menge
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMenge((m) => Math.max(1, m - 1))}
                    disabled={menge <= 1}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
                    aria-label="Menge verringern"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-base font-semibold text-slate-900 select-none">
                    {menge}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenge((m) => Math.min(bestand, m + 1))}
                    disabled={menge >= bestand}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium"
                    aria-label="Menge erhöhen"
                  >
                    +
                  </button>
                </div>
                {/* Show total price when more than 1 selected */}
                {menge > 1 && (
                  <span className="text-sm text-slate-500">
                    Gesamt:{' '}
                    <span className="font-semibold text-slate-900">
                      {(displayPrice * menge).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Add to Cart / Anfrage */}
          <div className="flex gap-3 mb-8">
            {product.ist_ab_preis ? (
              <Link
                href={`/contact?thema=angebot&produkt=${encodeURIComponent(product.titel)}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors text-lg"
              >
                <Mail className="w-5 h-5" />
                Angebot anfragen
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={bestand <= 0}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {bestand > 0 ? 'In den Warenkorb' : 'Ausverkauft'}
              </button>
            )}
          </div>

          {!product.ist_ab_preis && <p className="text-xs text-slate-400">Inkl. MwSt. zzgl. Versandkosten</p>}
          {/* installation label moved up next to price */}
        </div>
      </div>

      {/* Technical Data */}
      {product.technische_daten_rte && (
        <div className="border-t border-slate-200 pt-12">
          <h3 className="text-2xl font-bold font-outfit mb-6">Technische Daten</h3>
          <div
            className="prose prose-slate max-w-none prose-table:w-full prose-table:border prose-table:border-slate-200 prose-td:border prose-td:border-slate-200 prose-th:border prose-th:border-slate-200"
            dangerouslySetInnerHTML={{ __html: product.technische_daten_rte }}
          />
        </div>
      )}
    </div>
  );
}
