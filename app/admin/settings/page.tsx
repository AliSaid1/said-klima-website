'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Save, Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface OeffnungsTag {
  tag: string;
  von: string;
  bis: string;
  geoeffnet: boolean;
}

interface SettingsData {
  firmenname: string;
  email: string;
  telefon: string;
  ust_id: string;
  adresse_json: {
    strasse?: string;
    plz?: string;
    ort?: string;
    bundesland?: string;
    land?: string;
  } | null;
  oeffnungszeiten: OeffnungsTag[];
  primaerfarbe: string;
  sekundaerfarbe: string;
  akzentfarbe: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [oeffnungszeiten, setOeffnungszeiten] = useState<OeffnungsTag[]>([]);
  const [colors, setColors] = useState({ primaerfarbe: '#2563EB', sekundaerfarbe: '#0F172A', akzentfarbe: '#3B82F6' });

  const { register, handleSubmit, reset } = useForm<SettingsData>();

  useEffect(() => {
    let mounted = true;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json.data) {
          const d = json.data;
          reset({
            firmenname: d.firmenname || '',
            email: d.email || '',
            telefon: d.telefon || '',
            ust_id: d.ust_id || '',
            adresse_json: d.adresse_json || {},
          });
          setOeffnungszeiten(d.oeffnungszeiten || []);
          setColors({
            primaerfarbe: d.primaerfarbe || '#2563EB',
            sekundaerfarbe: d.sekundaerfarbe || '#0F172A',
            akzentfarbe: d.akzentfarbe || '#3B82F6',
          });
        }
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [reset]);

  const onSubmit = async (data: SettingsData) => {
    setSaving(true);

    const payload = {
      ...data,
      oeffnungszeiten,
      ...colors,
    };

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success('Einstellungen gespeichert');
    } else {
      toast.error('Fehler beim Speichern');
    }
    setSaving(false);
  };

  const updateOeffnungszeit = (index: number, field: keyof OeffnungsTag, value: string | boolean) => {
    const updated = [...oeffnungszeiten];
    updated[index] = { ...updated[index], [field]: value };
    setOeffnungszeiten(updated);
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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-outfit font-bold text-slate-900">Firmendaten</h1>
        <p className="text-slate-500 mt-1">Verwalten Sie Ihre Unternehmensinformationen</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Company Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-outfit font-bold text-slate-900">Firmendaten</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Firmenname</label>
              <input {...register('firmenname')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Mail</label>
              <input type="email" {...register('email')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input {...register('telefon')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">USt-IdNr.</label>
              <input {...register('ust_id')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" placeholder="DE123456789" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Adresse</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Straße & Hausnummer</label>
              <input {...register('adresse_json.strasse')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">PLZ</label>
              <input {...register('adresse_json.plz')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ort</label>
              <input {...register('adresse_json.ort')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bundesland</label>
              <input {...register('adresse_json.bundesland')} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Land</label>
              <input {...register('adresse_json.land')} defaultValue="Deutschland" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-outfit font-bold text-slate-900 mb-5">Öffnungszeiten</h2>
          <div className="space-y-3">
            {oeffnungszeiten.map((tag, i) => (
              <div key={tag.tag} className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 w-36 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={tag.geoeffnet}
                    onChange={(e) => updateOeffnungszeit(i, 'geoeffnet', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span className={`text-sm font-medium ${tag.geoeffnet ? 'text-slate-900' : 'text-slate-400'}`}>
                    {tag.tag}
                  </span>
                </label>
                {tag.geoeffnet ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={tag.von}
                      onChange={(e) => updateOeffnungszeit(i, 'von', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-slate-400 text-sm">bis</span>
                    <input
                      type="time"
                      value={tag.bis}
                      onChange={(e) => updateOeffnungszeit(i, 'bis', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Geschlossen</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Palette className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-outfit font-bold text-slate-900">Farbdesign</h2>
          </div>
          <p className="text-sm text-slate-500 mb-5">Passen Sie die Markenfarben Ihrer Website an. Die Änderungen werden sofort auf der gesamten Website wirksam.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { key: 'primaerfarbe' as const, label: 'Primärfarbe', desc: 'Buttons, Links, Akzente' },
              { key: 'sekundaerfarbe' as const, label: 'Sekundärfarbe', desc: 'Footer, dunkle Bereiche' },
              { key: 'akzentfarbe' as const, label: 'Akzentfarbe', desc: 'Hover-Effekte, Highlights' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="text-center">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-3 border-2 border-slate-200 shadow-sm cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: colors[key] }}
                >
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                <p className="text-xs font-mono text-slate-400 mt-1">{colors[key]}</p>
              </div>
            ))}
          </div>

          {/* Live Preview */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vorschau</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                style={{ backgroundColor: colors.primaerfarbe }}
              >
                Primär-Button
              </button>
              <button
                type="button"
                className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                style={{ backgroundColor: colors.sekundaerfarbe }}
              >
                Sekundär
              </button>
              <span className="text-sm font-medium" style={{ color: colors.akzentfarbe }}>
                Akzent-Link →
              </span>
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
            Einstellungen speichern
          </button>
        </div>
      </form>
    </div>
  );
}

