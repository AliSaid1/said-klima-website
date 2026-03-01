'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateArtikelSchema } from '@/lib/validators/artikel';
import type { z } from 'zod';
import ImageUpload from '@/components/admin/ImageUpload';

type FormValues = z.input<typeof updateArtikelSchema>;
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Kategorie { id: string; name: string; slug: string }
interface Marke { id: string; name: string }

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [marken, setMarken] = useState<Marke[]>([]);
  const [images, setImages] = useState<Array<{ datei_id?: string; url: string; alt_text?: string; anzeige_reihenfolge: number }>>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(updateArtikelSchema) as any,
  });

  const { fields: techFields, append: addTech, remove: removeTech, replace: replaceTech } = useFieldArray({
    control,
    name: 'technische_daten',
  });

  // Fetch product data
  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([productRes, catRes, brandRes]) => {
      if (productRes.data) {
        const p = productRes.data;
        reset({
          artikelnummer: p.artikelnummer,
          titel: p.titel,
          slug: p.slug,
          beschreibung: p.beschreibung || '',
          marke_id: p.marke_id || '',
          kategorie_id: p.kategorie_id || '',
          preis_brutto: Number(p.preis_brutto),
          rabattpreis: p.rabattpreis ? Number(p.rabattpreis) : undefined,
          steuersatz: Number(p.steuersatz),
          installation_option_verfuegbar: p['installation_option_verfügbar'] ?? true,
          aktiv: p.aktiv,
          meta_titel: p.meta_titel || '',
          meta_beschreibung: p.meta_beschreibung || '',
        });

        // Set technical data
        if (p.artikel_technische_daten?.length > 0) {
          replaceTech(p.artikel_technische_daten.map((td: { schluessel: string; wert: string; anzeige_reihenfolge: number }) => ({
            schluessel: td.schluessel,
            wert: td.wert,
            anzeige_reihenfolge: td.anzeige_reihenfolge,
          })));
        }

        // Set images
        if (p.artikel_bilder?.length > 0) {
          setImages(p.artikel_bilder.map((img: { datei_id: string; alt_text: string; anzeige_reihenfolge: number; medien_dateien?: { speicherpfad: string } }) => ({
            datei_id: img.datei_id,
            url: img.medien_dateien?.speicherpfad || '',
            alt_text: img.alt_text || '',
            anzeige_reihenfolge: img.anzeige_reihenfolge,
          })));
        }
      }
      setKategorien(catRes.flat || []);
      setMarken(brandRes.data || []);
      setLoading(false);
    });
  }, [id, reset, replaceTech]);

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

    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success('Produkt gespeichert');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Fehler beim Speichern');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Produkt wirklich unwiderruflich löschen?')) return;
    setDeleting(true);

    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Produkt gelöscht');
      router.push('/admin/products');
    } else {
      toast.error('Fehler beim Löschen');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 rounded-lg hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-outfit font-bold text-slate-900">Produkt bearbeiten</h1>
            <p className="text-slate-500 text-sm mt-0.5">Änderungen werden sofort wirksam</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
        >
          {deleting ? 'Löschen...' : 'Löschen'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Grunddaten</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titel *</label>
              <input {...register('titel')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
              {errors.titel && <p className="text-red-600 text-xs mt-1">{errors.titel.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Artikelnummer *</label>
              <input {...register('artikelnummer')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug *</label>
              <input {...register('slug')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
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
              <textarea {...register('beschreibung')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Preise & Verfügbarkeit</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preis (brutto) *</label>
              <input type="number" step="0.01" {...register('preis_brutto', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rabattpreis</label>
              <input type="number" step="0.01" {...register('rabattpreis', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">MwSt (%)</label>
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
              <span className="text-sm text-slate-700">Installation als Option</span>
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
            <button type="button" onClick={() => addTech({ schluessel: '', wert: '', anzeige_reihenfolge: techFields.length })} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>
          {techFields.length === 0 ? (
            <p className="text-sm text-slate-500">Keine technischen Daten.</p>
          ) : (
            <div className="space-y-3">
              {techFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start">
                  <input {...register(`technische_daten.${index}.schluessel`)} placeholder="Schlüssel" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  <input {...register(`technische_daten.${index}.wert`)} placeholder="Wert" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  <button type="button" onClick={() => removeTech(index)} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
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
              <input {...register('meta_titel')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Meta-Beschreibung</label>
              <textarea {...register('meta_beschreibung')} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Änderungen speichern
          </button>
          <Link href="/admin/products" className="px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}






