'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Search, X, ArrowRight, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: string;
  titel: string;
  beschreibung: string | null;
  preis_brutto: number;
  rabattpreis: number | null;
  kategorien: { id: string; name: string; slug: string } | null;
  marken: { id: string; name: string } | null;
  artikel_bilder: Array<{ id: string; alt_text: string | null; url: string }>;

}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Alle');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((json) => {
        setProducts((json.data || []).slice(0, 8));
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  const types = useMemo(() => {
    const set = new Set(products.map((p) => p.kategorien?.name).filter(Boolean) as string[]);
    return ['Alle', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.titel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        selectedType === 'Alle' || product.kategorien?.name === selectedType;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, selectedType]);

  return (
    <section id="products" className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">SHOP</span>
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-6">
            Unsere Top-Klimageräte
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Entdecken Sie unsere Auswahl an hochwertigen Klimaanlagen für Ihr Zuhause oder Büro.
          </p>
        </div>

        {/* Filters */}
        {!loading && !fetchError && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Produkte konnten nicht geladen werden.</p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !fetchError && (
          filteredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredProducts.map((product) => {
                const mainImage = product.artikel_bilder?.[0];
                const price = Number(product.preis_brutto);
                const salePrice = product.rabattpreis ? Number(product.rabattpreis) : null;
                const displayPrice = salePrice && salePrice < price ? salePrice : price;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group flex flex-col cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative h-48 bg-slate-200 overflow-hidden">
                      {mainImage?.url ? (
                        <Image
                          src={mainImage.url}
                          alt={mainImage.alt_text || product.titel}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, 25vw"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      {product.kategorien && (
                        <div className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2">
                          {product.kategorien.name}
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit group-hover:text-blue-600 transition-colors">
                        {product.titel}
                      </h3>
                      {product.beschreibung && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
                          {product.beschreibung}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <div>
                          <span className="text-lg font-bold text-slate-900">
                            {displayPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </span>
                          {salePrice && salePrice < price && (
                            <span className="text-sm text-slate-400 line-through ml-2">
                              {price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                            </span>
                          )}
                        </div>
                        <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors">
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-lg text-slate-500">Keine Produkte gefunden.</p>
              {searchQuery || selectedType !== 'Alle' ? (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedType('Alle'); }}
                  className="mt-4 text-blue-600 font-medium hover:underline"
                >
                  Filter zurücksetzen
                </button>
              ) : null}
            </div>
          )
        )}

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-500 mb-6 text-lg">Entdecken Sie unser komplettes Sortiment im Online-Shop</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl"
          >
            Alle Produkte ansehen
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative h-64 sm:h-72 bg-slate-100 flex-shrink-0">
                {selectedProduct.artikel_bilder?.[0]?.url ? (
                  <Image
                    src={selectedProduct.artikel_bilder[0].url}
                    alt={selectedProduct.artikel_bilder[0].alt_text || selectedProduct.titel}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                {selectedProduct.kategorien && (
                  <div className="text-sm font-bold tracking-wider text-blue-600 uppercase mb-2">
                    {selectedProduct.kategorien.name}
                  </div>
                )}
                <h3 className="text-3xl font-bold text-slate-900 mb-4 font-outfit">
                  {selectedProduct.titel}
                </h3>
                {selectedProduct.beschreibung && (
                  <p className="text-slate-600 leading-relaxed mb-8">
                    {selectedProduct.beschreibung}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Preis</p>
                    <span className="text-2xl font-bold text-slate-900">
                      {Number(selectedProduct.rabattpreis && Number(selectedProduct.rabattpreis) < Number(selectedProduct.preis_brutto)
                        ? selectedProduct.rabattpreis
                        : selectedProduct.preis_brutto
                      ).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                  <Link
                    href={`/shop/${selectedProduct.id}`}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
                    onClick={() => setSelectedProduct(null)}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Zum Produkt
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

