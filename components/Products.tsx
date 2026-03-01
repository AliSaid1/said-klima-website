'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Search, X, Info, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const products = [
  {
    id: 1,
    name: 'Daikin Sensira',
    type: 'Wandgerät',
    price: 'ab 899 €',
    image: '/images/product-placeholder.avif',
    features: ['A++ Kühlen', 'Flüsterleise', 'Online-Controller'],
    description: 'Das Daikin Sensira Wandgerät bietet hervorragendes Preis-Leistungs-Verhältnis und zuverlässige Kühlung mit minimalem Energieverbrauch.'
  },
  {
    id: 2,
    name: 'Daikin Perfera',
    type: 'Wandgerät',
    price: 'ab 1.199 €',
    image: '/images/product-placeholder.avif',
    features: ['A+++ Kühlen', 'Flash Streamer', '3D-Luftstrom'],
    description: 'Perfera sorgt für erstklassige Luftqualität und optimalen Komfort dank 3D-Luftstrom und fortschrittlicher Luftreinigung.'
  },
  {
    id: 3,
    name: 'Daikin Stylish',
    type: 'Wandgerät',
    price: 'ab 1.499 €',
    image: '/images/product-placeholder.avif',
    features: ['Preisgekröntes Design', 'Coanda-Effekt', 'Grid-Eye-Sensor'],
    description: 'Kompaktes und funktionales Design, das sich in jedes Interieur einfügt. Höchste Effizienz und intelligenter Komfort.'
  },
  {
    id: 4,
    name: 'Daikin Emura',
    type: 'Wandgerät',
    price: 'ab 1.799 €',
    image: '/images/product-placeholder.avif',
    features: ['Ikonisches Design', 'Intelligenter Sensor', 'Luftreinigung'],
    description: 'Das ultimative Klimagerät in Sachen Design und Technologie. Emura vereint Ästhetik mit herausragender Leistung.'
  },
  {
    id: 5,
    name: 'Daikin Nexura',
    type: 'Truhengerät',
    price: 'ab 1.599 €',
    image: '/images/product-placeholder.avif',
    features: ['Strahlungswärme', 'Leiser Betrieb', 'Elegantes Design'],
    description: 'Nexura bietet das Beste aus zwei Welten: die Effizienz einer Wärmepumpe und den Komfort einer traditionellen Heizung.'
  },
  {
    id: 6,
    name: 'Daikin Truhengerät',
    type: 'Truhengerät',
    price: 'ab 1.299 €',
    image: '/images/product-placeholder.avif',
    features: ['Bodennahe Montage', 'Dualer Luftstrom', 'Kompakt'],
    description: 'Ideal für die Installation unter Fenstern. Sorgt für eine optimale Wärmeverteilung im Raum.'
  },
  {
    id: 7,
    name: 'Daikin Deckenkassette',
    type: 'Kassettengerät',
    price: 'ab 1.899 €',
    image: '/images/product-placeholder.avif',
    features: ['360° Luftstrom', 'Unsichtbare Montage', 'Selbstreinigend'],
    description: 'Perfekt für abgehängte Decken in gewerblichen Räumen. Bietet eine gleichmäßige Luftverteilung ohne Zugluft.'
  },
  {
    id: 8,
    name: 'Daikin Kanalgerät',
    type: 'Kanalgerät',
    price: 'ab 2.199 €',
    image: '/images/product-placeholder.avif',
    features: ['Unsichtbar', 'Flexibel', 'Leistungsstark'],
    description: 'Die diskreteste Lösung für die Klimatisierung. Nur die Ansaug- und Ausblasgitter sind sichtbar.'
  }
];

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Alle');
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);

  const types = ['Alle', ...Array.from(new Set(products.map(p => p.type)))];

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'Alle' || product.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, selectedType]);

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
            Entdecken Sie unsere Auswahl an hochwertigen Klimaanlagen für Ihr Zuhause oder Büro. Effizient, leise und zuverlässig.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {types.map(type => (
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

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group flex flex-col">
                <div className="relative h-48 bg-slate-200 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(product)}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-medium transition-opacity flex items-center gap-2">
                      <Info className="w-4 h-4" /> Details
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-2">
                    {product.type}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSelectedProduct(product)}>
                    {product.name}
                  </h3>
                  <ul className="space-y-1 mb-6 flex-grow">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <span className="text-lg font-bold text-slate-900">{product.price}</span>
                    <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors">
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-slate-500">Keine Produkte gefunden, die Ihren Kriterien entsprechen.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedType('Alle'); }}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}

        {/* CTA to Shop */}
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
              <div className="relative h-64 sm:h-80 bg-slate-100 flex-shrink-0">
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                <div className="text-sm font-bold tracking-wider text-blue-600 uppercase mb-2">
                  {selectedProduct.type}
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4 font-outfit">
                  {selectedProduct.name}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-8">
                  {selectedProduct.description}
                </p>
                
                <div className="mb-8">
                  <h4 className="font-bold text-slate-900 mb-3">Hauptmerkmale</h4>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {selectedProduct.features.map((feature, idx) => (
                      <li key={idx} className="text-slate-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-slate-100 mt-auto">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Preis</p>
                    <span className="text-2xl font-bold text-slate-900">{selectedProduct.price}</span>
                  </div>
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                    In den Warenkorb
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
