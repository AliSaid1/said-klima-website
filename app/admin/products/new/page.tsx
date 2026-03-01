'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createArtikelSchema } from '@/lib/validators/artikel';
import type { z } from 'zod';
import ImageUpload from '@/components/admin/ImageUpload';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

type FormValues = z.input<typeof createArtikelSchema>;

interface Kategorie { id: string; name: string; slug: string }
interface Marke { id: string; name: string }

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [marken, setMarken] = useState<Marke[]>([]);
  const [images, setImages] = useState<Array<{ datei_id?: string; url: string; alt_text?: string; anzeige_reihenfolge: number }>>([]);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createArtikelSchema) as any,
    defaultValues: {
      steuersatz: 19.00,
      installation_option_verfuegbar: true,
      aktiv: true,
      technische_daten: [],
    },
  });

  const { fields: techFields, append: addTech, remove: removeTech } = useFieldArray({
    control,
    name: 'technische_daten',
  });

  const titel = watch('titel');

  // Auto-generate slug from title
  useEffect(() => {
    if (titel) {
      const slug = titel
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', slug);
    }
  }, [titel, setValue]);

  // Fetch categories and brands
  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => setKategorien(j.flat || []));
    // Brands — fetch directly
    fetch('/api/brands').then((r) => r.json()).then((j) => setMarken(j.data || [])).catch(() => {});
  }, []);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);

    const payload = {
      ...data,
      bilder: images.map((img, i) => ({
        datei_id: img.datei_id,
        url: img.url,
        alt_text: img.alt_text || '',
        anzeige_reihenfolge: i,
      })),
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success('Produkt erstellt');
      router.push('/admin/products');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Fehler beim Erstellen');
    }

    setSaving(false);
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-outfit font-bold text-slate-900">Neues Produkt</h1>
          <p className="text-slate-500 text-sm mt-0.5">Füllen Sie die Produktdaten aus</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Grunddaten</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titel *</label>
              <input {...register('titel')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="z.B. Daikin Sensira" />
              {errors.titel && <p className="text-red-600 text-xs mt-1">{errors.titel.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Artikelnummer *</label>
              <input {...register('artikelnummer')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="z.B. DAI-SEN-001" />
              {errors.artikelnummer && <p className="text-red-600 text-xs mt-1">{errors.artikelnummer.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
              <input {...register('slug')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="daikin-sensira" />
              {errors.slug && <p className="text-red-600 text-xs mt-1">{errors.slug.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Marke</label>
              <select {...register('marke_id')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                <option value="">— Keine —</option>
                {marken.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategorie</label>
              <select {...register('kategorie_id')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                <option value="">— Keine —</option>
                {kategorien.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Beschreibung</label>
              <textarea {...register('beschreibung')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" placeholder="Produktbeschreibung..." />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Preise & Verfügbarkeit</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preis (brutto) *</label>
              <input type="number" step="0.01" {...register('preis_brutto', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="899.00" />
              {errors.preis_brutto && <p className="text-red-600 text-xs mt-1">{errors.preis_brutto.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rabattpreis</label>
              <input type="number" step="0.01" {...register('rabattpreis', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="749.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">MwSt-Satz (%)</label>
              <input type="number" step="0.01" {...register('steuersatz', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('aktiv')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm text-slate-700">Aktiv (im Shop sichtbar)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('installation_option_verfuegbar')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm text-slate-700">Installation als Option anbieten</span>
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Bilder</h2>
          <ImageUpload images={images} onChange={setImages} />
        </div>

        {/* Technical Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-outfit font-bold text-slate-900">Technische Daten</h2>
            <button
              type="button"
              onClick={() => addTech({ schluessel: '', wert: '', anzeige_reihenfolge: techFields.length })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>
          {techFields.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine technischen Daten hinzugefügt.</p>
          ) : (
            <div className="space-y-3">
              {techFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start">
                  <input
                    {...register(`technische_daten.${index}.schluessel`)}
                    placeholder="z.B. Kühlleistung"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <input
                    {...register(`technische_daten.${index}.wert`)}
                    placeholder="z.B. 2.5 kW"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button type="button" onClick={() => removeTech(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">SEO</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meta-Titel</label>
              <input {...register('meta_titel')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="Seitentitel für Suchmaschinen" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meta-Beschreibung</label>
              <textarea {...register('meta_beschreibung')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" placeholder="Kurze Beschreibung für Suchmaschinen (max. 160 Zeichen)" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Produkt erstellen
          </button>
          <Link href="/admin/products" className="px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}



