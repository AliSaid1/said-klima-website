import Image from 'next/image';
import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
import { products } from '@/lib/data';
import { notFound } from 'next/navigation';
import ProductActions from '@/components/ProductActions';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const product = products.find(p => p.id === resolvedParams.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zum Shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative h-[400px] sm:h-[500px] bg-slate-200 rounded-3xl overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-bold tracking-wider text-blue-600 uppercase">{product.brand}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-sm font-medium text-slate-500">{product.type}</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-outfit font-bold text-slate-900 mb-4">
            {product.name}
          </h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-slate-900">ab {product.price.toLocaleString('de-DE')} €</span>
            <span className="text-sm font-medium px-3 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-1">
              <Check className="w-4 h-4" /> {product.availability}
            </span>
          </div>

          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {product.description}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Energieeffizienz</p>
              <p className="font-bold text-slate-900">{product.energyEfficiency}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Raumgröße</p>
              <p className="font-bold text-slate-900">{product.roomSize}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Lautstärke</p>
              <p className="font-bold text-slate-900">{product.noiseLevel}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Garantie</p>
              <p className="font-bold text-slate-900">5 Jahre</p>
            </div>
          </div>

          <ProductActions product={{ id: product.id, name: product.name, price: product.price, image: product.image }} />
        </div>
      </div>

      {/* Tabs / Details Section */}
      <div className="border-t border-slate-200 pt-12">
        <div className="grid md:grid-cols-3 gap-12">
          
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold font-outfit mb-6">Technische Daten</h3>
            <ul className="space-y-4">
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Kühlleistung</span>
                <span className="font-medium text-slate-900">{product.technicalData.coolingCapacity}</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Heizleistung</span>
                <span className="font-medium text-slate-900">{product.technicalData.heatingCapacity}</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Abmessungen</span>
                <span className="font-medium text-slate-900">{product.technicalData.dimensions}</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Gewicht</span>
                <span className="font-medium text-slate-900">{product.technicalData.weight}</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Kältemittel</span>
                <span className="font-medium text-slate-900">{product.technicalData.refrigerant}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-12">
            <div>
              <h3 className="text-2xl font-bold font-outfit mb-6">Häufig gestellte Fragen</h3>
              {product.faqs && product.faqs.length > 0 ? (
                <div className="space-y-4">
                  {product.faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-2">{faq.question}</h4>
                      <p className="text-slate-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Keine FAQs für dieses Produkt verfügbar.</p>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold font-outfit mb-6">Kundenrezensionen</h3>
              {product.reviews && product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((review, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="font-bold text-sm text-slate-900">{review.author}</span>
                      </div>
                      <p className="text-slate-600">{review.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Noch keine Rezensionen vorhanden.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
