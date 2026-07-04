'use client';

/**
 * Admin — product editor, /admin/products/[id].
 *
 * Client component. Loads one artikel (product) plus kategorie (category) and
 * brand options from /api/products/[id], /api/categories, and /api/brands.
 * Updates or deletes the product through /api/products/[id] and can create a
 * brand inline. Offers CRUD editing for product data, variants, stock, images,
 * technical content, SEO, and visibility within the admin auth context.
 */
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateArtikelSchema } from '@/lib/validators/artikel';
import { slugify } from '@/lib/slugify';
import type { z } from 'zod';
import ImageUpload from '@/components/admin/ImageUpload';
import { ArrowLeft, Save, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

type FormValues = z.infer<typeof updateArtikelSchema>;

interface Kategorie { id: string; name: string; slug: string }
interface Marke { id: string; name: string }

/**
 * Renders the edit-artikel (product) form and persists changes, inline brand
 * additions, and destructive deletion actions for the selected product.
 */
export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [marken, setMarken] = useState<Marke[]>([]);
  const [images, setImages] = useState<Array<{ datei_id?: string; url: string; alt_text?: string; anzeige_reihenfolge: number }>>([]);
  const [showNewMarke, setShowNewMarke] = useState(false);
  const [newMarkeName, setNewMarkeName] = useState('');
  const [savingMarke, setSavingMarke] = useState(false);
  const [bestand, setBestand] = useState(0);
  const [mindestbestand, setMindestbestand] = useState(2);

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(updateArtikelSchema) as any,
  });

  const { fields: variantFields, append: addVariant, remove: removeVariant, replace: replaceVariant } = useFieldArray({
    control,
    name: 'varianten',
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
          // Load rich text from the related artikel_technische_daten row
          technische_daten_rte: p.artikel_technische_daten?.[0]?.inhalt || '',
          ist_ab_preis: p.ist_ab_preis ?? false,
          marke_id: p.marke_id || '',
          kategorie_id: p.kategorie_id || '',
          preis_brutto: p.preis_brutto,
          rabattpreis: p.rabattpreis,
          steuersatz: p.steuersatz,
          'installation_option_verfügbar': p.installation_option_verfügbar,
          aktiv: p.aktiv,
          meta_titel: p.meta_titel || '',
          meta_beschreibung: p.meta_beschreibung || '',
        });

        // Load varianten from artikel.varianten JSONB column
        if (Array.isArray(p.varianten) && p.varianten.length > 0) {
          replaceVariant(
            p.varianten.map((v: { name: string; preis_aufschlag: number }) => ({
              name: v.name,
              preis_aufschlag: v.preis_aufschlag ?? 0,
            }))
          );
        }

        // Load stock
        if (p.lagerbestaende) {
          setBestand(p.lagerbestaende.bestand ?? 0);
          setMindestbestand(p.lagerbestaende.mindestbestand ?? 2);
        }

        // Load images
        if (p.artikel_bilder?.length > 0) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          setImages(p.artikel_bilder.map((img: { datei_id: string; alt_text: string; anzeige_reihenfolge: number; medien_dateien?: { speicherpfad: string } }) => {
            const path = img.medien_dateien?.speicherpfad || '';
            const url = path.startsWith('http') ? path : (path ? `${supabaseUrl}/storage/v1/object/public/product-images/${path}` : '');
            return {
              datei_id: img.datei_id,
              url,
              alt_text: img.alt_text || '',
              anzeige_reihenfolge: img.anzeige_reihenfolge,
            };
          }));
        }
      }
      setKategorien(catRes.flat || []);
      setMarken(brandRes.data || []);
      setLoading(false);
    })
    .catch(() => {
      toast.error('Fehler beim Laden des Produkts');
      setLoading(false);
    });
  }, [id, reset, replaceVariant]);

  const createMarke = async () => {
    if (!newMarkeName.trim()) return;
    setSavingMarke(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMarkeName.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setMarken((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Marke "${json.data.name}" erstellt`);
        setNewMarkeName('');
        setShowNewMarke(false);
      } else {
        toast.error(json.error || 'Fehler beim Erstellen');
      }
    } catch {
      toast.error('Verbindungsfehler');
    }
    setSavingMarke(false);
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);

    const payload = {
      ...data,
      // Convert empty-string select values to null (z.any() passes them through as-is)
      marke_id:     data.marke_id     || null,
      kategorie_id: data.kategorie_id || null,
      bestand,
      mindestbestand,
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

    const json = await res.json();
    if (res.ok) {
      const finalSlug = json.data?.slug;
      if (finalSlug) setValue('slug', finalSlug);
      toast.success(finalSlug ? `Gespeichert · Slug: ${finalSlug}` : 'Produkt gespeichert');
    } else {
      toast.error(json.error || 'Fehler beim Speichern');
    }
    setSaving(false);
  };

  const FIELD_LABELS: Record<string, string> = {
    titel:         'Titel',
    artikelnummer: 'Artikelnummer',
    slug:          'URL-Pfad (Slug)',
    preis_brutto:  'Grundpreis',
    steuersatz:    'MwSt-Satz',
    beschreibung:  'Beschreibung',
    marke_id:      'Marke',
    kategorie_id:  'Kategorie',
    varianten:     'Varianten',
  };

  // Use the live validationErrors argument — NOT the stale closed-over `errors` state
  const onFormError = (validationErrors: FieldErrors<FormValues>) => {
    const fields = Object.entries(validationErrors)
      .map(([field, err]) => {
        const label = FIELD_LABELS[field] || field;
        const msg   = (err as { message?: string })?.message;
        return msg ? `${label}: ${msg}` : label;
      })
      .join(' · ');
    if (fields) toast.error(`Bitte korrigieren Sie: ${fields}`);
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

      <form onSubmit={handleSubmit(onSubmit as any, onFormError)} className="space-y-8">
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Slug
                <button
                  type="button"
                  onClick={() => { const t = watch('titel'); if (t) setValue('slug', slugify(t)); }}
                  className="ml-2 text-xs text-blue-600 hover:underline font-normal"
                  title="Slug aus aktuellem Titel neu berechnen"
                >
                  ↺ Neu generieren
                </button>
              </label>
              <input
                {...register('slug')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                Achtung: Slug-Änderungen können bestehende Links brechen.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Marke</label>
              {showNewMarke ? (
                <div className="flex gap-2">
                  <input
                    value={newMarkeName}
                    onChange={(e) => setNewMarkeName(e.target.value)}
                    placeholder="Neuer Markenname"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createMarke())}
                    autoFocus
                  />
                  <button type="button" onClick={createMarke} disabled={savingMarke || !newMarkeName.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {savingMarke ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => { setShowNewMarke(false); setNewMarkeName(''); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select {...register('marke_id')} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white">
                    <option value="">— Keine —</option>
                    {marken.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewMarke(true)} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors" title="Neue Marke erstellen">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
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
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Preise &amp; Verfügbarkeit</h2>

          {/* Netto → Brutto calculator */}
          <div className="mb-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3">Preisrechner (Netto → Brutto)</p>
            <div className="grid sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">Nettopreis (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="z.B. 755.46"
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  onChange={(e) => {
                    const netto = parseFloat(e.target.value);
                    const tax = watch('steuersatz') || 19;
                    if (!isNaN(netto) && netto >= 0) {
                      const brutto = Math.round(netto * (1 + tax / 100) * 100) / 100;
                      setValue('preis_brutto', brutto);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">MwSt-Satz</label>
                <p className="px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-sm text-slate-600">{watch('steuersatz') || 19} %</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">= Bruttopreis</label>
                <p className="px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-sm font-bold text-slate-900">
                  {watch('preis_brutto') ? `${Number(watch('preis_brutto')).toFixed(2)} €` : '—'}
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Geben Sie den Nettopreis ein — der Bruttopreis wird automatisch unten übernommen. Sie können den Bruttopreis auch direkt eingeben.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Grundpreis (brutto) *</label>
              <input type="number" step="0.01" {...register('preis_brutto', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rabattpreis</label>
              <input type="number" step="0.01" {...register('rabattpreis', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">MwSt-Satz (%)</label>
              <input type="number" step="0.01" {...register('steuersatz', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('ist_ab_preis')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm font-medium text-slate-700">&quot;Ab-Preis&quot; / Projektanfrage (Kunde stellt Anfrage statt Kauf)</span>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lagerbestand</label>
              <input type="number" value={bestand} onChange={(e) => setBestand(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mindestbestand</label>
              <input type="number" value={mindestbestand} onChange={(e) => setMindestbestand(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('aktiv')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm text-slate-700">Aktiv (im Shop sichtbar)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('installation_option_verfügbar')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm text-slate-700">Installation als Option anbieten</span>
            </label>
          </div>
        </div>

        {/* Varianten */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-outfit font-bold text-slate-900">Varianten</h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Fügen Sie Größen, Längen oder sonstige Varianten hinzu. Der Endpreis berechnet sich als<br/>
                <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">Grundpreis + Aufschlag</span>.
                Für die Basisgröße gilt Aufschlag = 0.
              </p>
            </div>
            <button
              type="button"
              onClick={() => addVariant({ name: '', preis_aufschlag: 0 })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Variante hinzufügen
            </button>
          </div>
          {variantFields.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Varianten — der Grundpreis gilt direkt.</p>
          ) : (
            <div className="space-y-3">
              {variantFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bezeichnung *</label>
                    <input
                      {...register(`varianten.${index}.name`)}
                      placeholder="z.B. 50 Meter"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    {errors.varianten?.[index]?.name && <span className="text-red-500 text-xs mt-1 block">{(errors.varianten[index] as any).name?.message}</span>}
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Aufschlag (€) <span className="text-slate-400 font-normal">Basis = 0</span>
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      {...register(`varianten.${index}.preis_aufschlag`, { valueAsNumber: true })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <button type="button" onClick={() => removeVariant(index)} className="mt-5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Variante löschen">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Bilder</h2>
          <ImageUpload images={images} onChange={setImages} />
        </div>

        {/* Technical Data RTE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Technische Daten</h2>
          <p className="text-sm text-slate-500 mb-4">Geben Sie die technischen Daten als formatierten Text ein (Tabellen, Listen, Fettschrift etc.).</p>
          <div className="prose-editor min-h-[300px] border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent">
            <RichTextEditor value={watch('technische_daten_rte') || ''} onChange={(val) => setValue('technische_daten_rte', val)} />
          </div>
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
