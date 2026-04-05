'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createArtikelSchema } from '@/lib/validators/artikel';
import { slugify } from '@/lib/slugify';
import type { z } from 'zod';
import ImageUpload from '@/components/admin/ImageUpload';
import { ArrowLeft, Save, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ErrorAlert from '@/components/ui/ErrorAlert';
import FormError from '@/components/ui/FormError';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), { ssr: false });

type FormValues = z.infer<typeof createArtikelSchema>;

interface Kategorie { id: string; name: string; slug: string }
interface Marke { id: string; name: string }

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [marken, setMarken] = useState<Marke[]>([]);
  const [images, setImages] = useState<Array<{ datei_id?: string; url: string; alt_text?: string; anzeige_reihenfolge: number }>>([]);
  const [bestand, setBestand] = useState(0);
  const [mindestbestand, setMindestbestand] = useState(2);
  const [showNewMarke, setShowNewMarke] = useState(false);
  const [newMarkeName, setNewMarkeName] = useState('');
  const [savingMarke, setSavingMarke] = useState(false);
  // Track whether the admin manually edited the slug so we stop overwriting it.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createArtikelSchema) as any,
    defaultValues: {
      steuersatz:                     19.00,
      'installation_option_verfügbar': true,
      aktiv:                          true,
      technische_daten_rte:           '',
      ist_ab_preis:                   false,
      varianten:                      [],
      marke_id:                       '',   // empty string → preprocessed to null
      kategorie_id:                   '',   // empty string → preprocessed to null
      beschreibung:                   '',
      meta_titel:                     '',
      meta_beschreibung:              '',
    },
  });

  const { fields: variantFields, append: addVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'varianten',
  });

  const titel = watch('titel');

  // Auto-generate slug from title — only while the admin hasn't manually edited it.
  useEffect(() => {
    if (titel && !slugManuallyEdited) {
      setValue('slug', slugify(titel));
    }
  }, [titel, slugManuallyEdited, setValue]);

  // Fetch categories and brands
  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => setKategorien(j.flat || []));
    fetch('/api/brands').then((r) => r.json()).then((j) => setMarken(j.data || [])).catch(() => {});
  }, []);

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
        setValue('marke_id', json.data.id);
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
    setServerError(null);

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

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        const finalSlug = json.data.slug;
        toast.success(
          finalSlug ? `Produkt erstellt · Slug: ${finalSlug}` : 'Produkt erfolgreich erstellt'
        );
        router.push('/admin/products');
      } else {
        // Show error in the alert box at the top AND as a toast
        const msg = json.error || 'Fehler beim Erstellen des Produkts';
        setServerError(msg);
        toast.error(msg);
        // Scroll error into view
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      const msg = 'Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.';
      setServerError(msg);
      toast.error(msg);
    }

    setSaving(false);
  };

  // German field name map for readable validation summaries
  const FIELD_LABELS: Record<string, string> = {
    titel:            'Titel',
    artikelnummer:    'Artikelnummer',
    slug:             'URL-Pfad (Slug)',
    preis_brutto:     'Grundpreis',
    steuersatz:       'MwSt-Satz',
    beschreibung:     'Beschreibung',
    marke_id:         'Marke',
    kategorie_id:     'Kategorie',
    varianten:        'Varianten',
    rabattpreis:      'Rabattpreis',
    ist_ab_preis:     'Preistyp',
  };

  // handleSubmit passes the CURRENT validation errors as its first argument.
  // Do NOT use the closed-over `errors` state here — it may be stale.
  const onFormError = (validationErrors: FieldErrors<FormValues>) => {
    const fields = Object.entries(validationErrors)
      .map(([field, err]) => {
        const label = FIELD_LABELS[field] || field;
        const msg   = (err as { message?: string })?.message;
        return msg ? `${label}: ${msg}` : label;
      })
      .join(' · ');

    if (fields) {
      toast.error(`Bitte korrigieren Sie: ${fields}`);
    }
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

      <form onSubmit={handleSubmit(onSubmit as any, onFormError)} className="space-y-8">
        {/* Server-side error banner — shown when API returns an error */}
        <ErrorAlert
          message={serverError}
          onClose={() => setServerError(null)}
          title="Produkt konnte nicht erstellt werden"
        />
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Grunddaten</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titel *</label>
              <input {...register('titel')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="z.B. Daikin Sensira" />
              <FormError message={errors.titel?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Artikelnummer *</label>
              <input {...register('artikelnummer')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="z.B. DAI-SEN-001" />
              <FormError message={errors.artikelnummer?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Slug *
                {slugManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => { setSlugManuallyEdited(false); if (titel) setValue('slug', slugify(titel)); }}
                    className="ml-2 text-xs text-blue-600 hover:underline font-normal"
                  >
                    ↺ Aus Titel neu generieren
                  </button>
                )}
              </label>
              <input
                {...register('slug')}
                onInput={() => setSlugManuallyEdited(true)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono text-sm"
                placeholder="daikin-sensira"
              />
              <p className="text-xs text-slate-400 mt-1">
                {slugManuallyEdited
                  ? 'Manuell bearbeitet — Server ergänzt ggf. Suffix bei Kollision.'
                  : 'Wird automatisch aus dem Titel generiert.'}
              </p>
              {errors.slug && <FormError message={errors.slug.message} />}
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
              <textarea {...register('beschreibung')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none" placeholder="Produktbeschreibung..." />
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
              <input type="number" step="0.01" {...register('preis_brutto', { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="899.00" />
              <FormError message={errors.preis_brutto?.message} />
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
              <input type="checkbox" {...register('ist_ab_preis')} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
              <span className="text-sm font-medium text-slate-700">&quot;Ab-Preis&quot; / Projektanfrage (Kunde stellt Anfrage statt Kauf)</span>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 mt-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lagerbestand</label>
              <input type="number" value={bestand} onChange={(e) => setBestand(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mindestbestand</label>
              <input type="number" value={mindestbestand} onChange={(e) => setMindestbestand(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="2" />
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
                Fügen Sie Größen, Längen oder sonstige Varianten hinzu. Der Endpreis berechnet sich als<br />
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
                    {errors.varianten?.[index]?.name && <FormError message={(errors.varianten[index] as any).name?.message} />}
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

        {/* Technical Data */}
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
