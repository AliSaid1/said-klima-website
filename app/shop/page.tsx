'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Search, Filter } from 'lucide-react';
import { products } from '@/lib/data';

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('Alle');
  const [selectedBrand, setSelectedBrand] = useState('Alle');
  const [selectedEnergy, setSelectedEnergy] = useState('Alle');
  const [priceRange, setPriceRange] = useState([0, 3000]);

  const types = ['Alle', ...Array.from(new Set(products.map(p => p.type)))];
  const brands = ['Alle', ...Array.from(new Set(products.map(p => p.brand)))];
  const energyClasses = ['Alle', ...Array.from(new Set(products.map(p => p.energyEfficiency)))];

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = selectedType === 'Alle' || product.type === selectedType;
      const matchesBrand = selectedBrand === 'Alle' || product.brand === selectedBrand;
      const matchesEnergy = selectedEnergy === 'Alle' || product.energyEfficiency === selectedEnergy;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      
      return matchesSearch && matchesType && matchesBrand && matchesEnergy && matchesPrice;
    });
  }, [searchQuery, selectedType, selectedBrand, selectedEnergy, priceRange]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">SHOP</span>
      </div>
      <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-12">
        Alle Klimageräte
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filter
            </h3>
            
            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Suche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Suchen..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gerätetyp</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {types.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Marke</label>
                <select 
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>

              {/* Energy Efficiency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Energieeffizienz</label>
                <select 
                  value={selectedEnergy}
                  onChange={(e) => setSelectedEnergy(e.target.value)}
                  className="w-full p-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {energyClasses.map(energy => <option key={energy} value={energy}>{energy}</option>)}
                </select>
              </div>

              {/* Price Range (Simplified) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Maximaler Preis: {priceRange[1]} €</label>
                <input 
                  type="range" 
                  min="0" 
                  max="3000" 
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="w-full accent-blue-600"
                />
              </div>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('Alle');
                  setSelectedBrand('Alle');
                  setSelectedEnergy('Alle');
                  setPriceRange([0, 3000]);
                }}
                className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Filter zurücksetzen
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-grow">
          <div className="mb-6 flex justify-between items-center">
            <p className="text-slate-600">{filteredProducts.length} Produkte gefunden</p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Link href={`/shop/${product.id}`} key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-shadow group flex flex-col">
                  <div className="relative h-48 bg-slate-200 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                        {product.type}
                      </div>
                      <div className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        {product.energyEfficiency}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 font-outfit group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">{product.price} €</span>
                      <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <p className="text-lg text-slate-500">Keine Produkte gefunden, die Ihren Kriterien entsprechen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
