'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Package, Calendar, Settings, LogOut, Trash2, AlertTriangle, X, Loader2, MapPin, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────
interface Benutzer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefonnummer: string | null;
  firma: string | null;
  rolle: string;
}

interface Adresse {
  id: string;
  bezeichnung: string | null;
  strasse: string;
  plz: string;
  ort: string;
  bundesland: string | null;
  land: string;
  standard_lieferadresse: boolean;
  standard_rechnungsadresse: boolean;
}

interface Bestellung {
  id: string;
  bestellnummer: string;
  status: string;
  gesamt_brutto: number;
  bestellt_am: string | null;
  erstellt_am: string;
  bestellpositionen: { id: string; titel: string; menge: number; preis_brutto: number }[];
}

interface Buchung {
  id: string;
  geplant_von: string;
  geplant_bis: string;
  status: string;
  hinweise: string | null;
  kontakt_name: string | null;
  kontakt_email: string | null;
  kontakt_telefon: string | null;
  dienstleistungen: { name: string } | { name: string }[] | null;
  techniker: { vorname: string; nachname: string } | null;
  buchung_dienstleistungen?: { dienstleistungen: { name: string } }[] | null;
}

// ─── Helpers ─────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, string> = {
    offen: 'bg-yellow-100 text-yellow-800',
    bezahlt: 'bg-blue-100 text-blue-800',
    versandt: 'bg-purple-100 text-purple-800',
    abgeschlossen: 'bg-green-100 text-green-800',
    storniert: 'bg-red-100 text-red-800',
    erstattet: 'bg-slate-100 text-slate-800',
    ausstehend: 'bg-yellow-100 text-yellow-800',
    bestaetigt: 'bg-blue-100 text-blue-800',
    abgesagt: 'bg-red-100 text-red-800',
    nicht_erschienen: 'bg-slate-100 text-slate-800',
  };
  const label: Record<string, string> = {
    offen: 'Offen', bezahlt: 'Bezahlt', versandt: 'Versandt',
    abgeschlossen: 'Abgeschlossen', storniert: 'Storniert', erstattet: 'Erstattet',
    ausstehend: 'Ausstehend', bestaetigt: 'Bestätigt', abgesagt: 'Abgesagt',
    nicht_erschienen: 'Nicht erschienen',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-slate-100 text-slate-800'}`}>
      {label[status] || status}
    </span>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ─── Main Component ──────────────────────────────────────
export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile
  const [profile, setProfile] = useState<Benutzer | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Addresses
  const [adressen, setAdressen] = useState<Adresse[]>([]);
  const [adresseForm, setAdresseForm] = useState({ strasse: '', plz: '', ort: '', bundesland: '', land: 'DE', standard_lieferadresse: false, standard_rechnungsadresse: false });
  const [editingAdresseId, setEditingAdresseId] = useState<string | null>(null);
  const [adresseSaving, setAdresseSaving] = useState(false);

  // Orders
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Bookings
  const [buchungen, setBuchungen] = useState<Buchung[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Password change
  const [passwords, setPasswords] = useState({ newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Undo state
  const [lastAdresseAction, setLastAdresseAction] = useState<{ type: 'add' | 'update'; id?: string; data?: any } | null>(null);

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'orders', label: 'Bestellungen', icon: Package },
    { id: 'appointments', label: 'Termine', icon: Calendar },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  // ─── Load auth + profile on mount ──────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/account/login'); return; }
      setAuthUser(user);

      const { data: benutzer } = await supabase
        .from('benutzer')
        .select('id, vorname, nachname, email, telefonnummer, firma, rolle')
        .eq('id', user.id)
        .single();

      if (benutzer) {
        setProfile(benutzer);
      } else {
        setProfile({
          id: user.id,
          vorname: user.user_metadata?.vorname || '',
          nachname: user.user_metadata?.nachname || '',
          email: user.email || '',
          telefonnummer: user.user_metadata?.telefon || null,
          firma: user.user_metadata?.firma || null,
          rolle: 'kunde',
        });
      }

      const { data: addr } = await supabase
        .from('benutzer_adressen')
        .select('*')
        .eq('benutzer_id', user.id)
        .order('erstellt_am', { ascending: false });
      if (addr) setAdressen(addr);

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Lazy-load orders ──────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'orders' || !authUser) return;
    const load = async () => {
      setOrdersLoading(true);
      const { data } = await supabase
        .from('bestellungen')
        .select('id, bestellnummer, status, gesamt_brutto, bestellt_am, erstellt_am, bestellpositionen(id, titel, menge, preis_brutto)')
        .eq('benutzer_id', authUser.id)
        .order('erstellt_am', { ascending: false });
      setBestellungen((data as unknown as Bestellung[]) || []);
      setOrdersLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authUser]);

  // ─── Lazy-load bookings ────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'appointments' || !authUser) return;
    const load = async () => {
      setBookingsLoading(true);
      try {
        const res = await fetch('/api/bookings');
        const json = await res.json();
        setBuchungen((json.data || []) as Buchung[]);
      } catch {
        setBuchungen([]);
      }
      setBookingsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authUser]);

  // ─── Save profile ─────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!profile || !authUser) return;
    setProfileSaving(true);

    const { error: dbError } = await supabase
      .from('benutzer')
      .update({
        vorname: profile.vorname,
        nachname: profile.nachname,
        telefonnummer: profile.telefonnummer || null,
        firma: profile.firma || null,
        aktualisiert_am: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (dbError) { toast.error('Fehler beim Speichern: ' + dbError.message); setProfileSaving(false); return; }

    await supabase.auth.updateUser({
      data: { vorname: profile.vorname, nachname: profile.nachname, telefon: profile.telefonnummer, firma: profile.firma },
    });

    toast.success('Profil erfolgreich gespeichert!');
    setProfileSaving(false);
  };

  // ─── Address CRUD ─────────────────────────────────────
  const reloadAddresses = async () => {
    if (!authUser) return;
    const { data } = await supabase.from('benutzer_adressen').select('*').eq('benutzer_id', authUser.id).order('erstellt_am', { ascending: false });
    if (data) setAdressen(data);
  };

  const handleSaveAdresse = async () => {
    if (!authUser) return;
    if (!adresseForm.strasse || !adresseForm.plz || !adresseForm.ort) { toast.error('Bitte Straße, PLZ und Ort ausfüllen.'); return; }
    setAdresseSaving(true);

    try {
      if (editingAdresseId) {
        // Store previous state for undo
        const prevAddress = adressen.find(a => a.id === editingAdresseId);

        // Update via API
        const body = { id: editingAdresseId, benutzer_id: authUser.id, ...adresseForm };
        const res = await fetch('/api/benutzer-adressen', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Fehler beim Aktualisieren');

        setLastAdresseAction({ type: 'update', id: editingAdresseId, data: prevAddress });
        toast.success('Adresse aktualisiert!', {
          action: {
            label: 'Rückgängig',
            onClick: () => handleUndoAddressAction(),
          },
        });
        setEditingAdresseId(null);
      } else {
        const payload = { benutzer_id: authUser.id, ...adresseForm };
        const res = await fetch('/api/benutzer-adressen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Fehler beim Erstellen');

        setLastAdresseAction({ type: 'add', id: data.data?.id });
        toast.success('Adresse hinzugefügt!', {
          action: {
            label: 'Rückgängig',
            onClick: () => handleUndoAddressAction(),
          },
        });
      }
      await reloadAddresses();
      setAdresseForm({ strasse: '', plz: '', ort: '', bundesland: '', land: 'DE', standard_lieferadresse: false, standard_rechnungsadresse: false });
    } catch (err: any) {
      toast.error(err.message || 'Unbekannter Fehler');
    }

    setAdresseSaving(false);
  };

  const handleUndoAddressAction = async () => {
    if (!lastAdresseAction) return;
    try {
      if (lastAdresseAction.type === 'add' && lastAdresseAction.id) {
        await handleDeleteAdresse(lastAdresseAction.id);
        toast.success('Änderung rückgängig gemacht');
      } else if (lastAdresseAction.type === 'update' && lastAdresseAction.id && lastAdresseAction.data) {
        const body = { id: lastAdresseAction.id, benutzer_id: authUser?.id, ...lastAdresseAction.data };
        const res = await fetch('/api/benutzer-adressen', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Fehler beim Rückgängigmachen');
        await reloadAddresses();
        toast.success('Änderung rückgängig gemacht');
      }
      setLastAdresseAction(null);
    } catch (err: any) {
      toast.error(err.message || 'Unbekannter Fehler beim Rückgängigmachen');
    }
  };

  const handleDeleteAdresse = async (id: string) => {
    try {
      const res = await fetch(`/api/benutzer-adressen?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Fehler beim Löschen');
      setAdressen((prev) => prev.filter((a) => a.id !== id));
      toast.success('Adresse gelöscht.');
    } catch (err: any) {
      toast.error(err.message || 'Unbekannter Fehler');
    }
  };

  const handleSetDefaultDeliveryAddress = async (id: string) => {
    if (!authUser) return;
    setAdresseSaving(true);
    try {
      const res = await fetch('/api/benutzer-adressen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'liefer', benutzer_id: authUser.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Fehler beim Setzen');
      toast.success('Lieferadresse aktualisiert!');
      await reloadAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Unbekannter Fehler');
    }
    setAdresseSaving(false);
  };

  const handleSetDefaultBillingAddress = async (id: string) => {
    if (!authUser) return;
    setAdresseSaving(true);
    try {
      const res = await fetch('/api/benutzer-adressen', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: 'rechnung', benutzer_id: authUser.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Fehler beim Setzen');
      toast.success('Rechnungsadresse aktualisiert!');
      await reloadAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Unbekannter Fehler');
    }
    setAdresseSaving(false);
  };

  const startEditAdresse = (addr: Adresse) => {
    setEditingAdresseId(addr.id);
    setAdresseForm({
      strasse: addr.strasse,
      plz: addr.plz,
      ort: addr.ort,
      bundesland: addr.bundesland || '',
      land: addr.land,
      standard_lieferadresse: !!addr.standard_lieferadresse,
      standard_rechnungsadresse: !!addr.standard_rechnungsadresse,
    });
  };

  // ─── Change password ──────────────────────────────────
  const handleChangePassword = async () => {
    if (!passwords.newPw || passwords.newPw.length < 6) { toast.error('Passwort muss mindestens 6 Zeichen haben.'); return; }
    if (passwords.newPw !== passwords.confirm) { toast.error('Passwörter stimmen nicht überein.'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPw });
    if (error) toast.error('Fehler: ' + error.message);
    else { toast.success('Passwort erfolgreich geändert!'); setPasswords({ newPw: '', confirm: '' }); }
    setPwSaving(false);
  };

  // ─── Delete account ───────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'KONTO LÖSCHEN' || !authUser) return;
    setDeleting(true);
    await supabase.from('benutzer').delete().eq('id', authUser.id);
    await supabase.auth.signOut();
    toast.success('Ihr Konto wurde gelöscht.');
    setShowDeleteModal(false);
    router.push('/');
  };

  // ─── Logout ───────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Erfolgreich abgemeldet.');
    router.push('/');
    router.refresh();
  };

  // ─── Loading / Guard ──────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!profile) return null;

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-outfit font-bold text-slate-900">Mein Konto</h1>
        <p className="text-slate-600 mt-2">Willkommen zurück, {profile.vorname} {profile.nachname}!</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <ul className="flex flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${isActive ? 'bg-blue-50 text-blue-600 border-blue-600' : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-slate-100">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-l-4 border-transparent">
                  <LogOut className="w-5 h-5" />
                  Abmelden
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-grow">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 min-h-[500px]">

            {/* ═══ PROFIL ═══ */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Persönliche Daten</h2>
                <div className="space-y-6 max-w-2xl">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vorname</label>
                      <input type="text" value={profile.vorname} onChange={(e) => setProfile({ ...profile, vorname: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nachname</label>
                      <input type="text" value={profile.nachname} onChange={(e) => setProfile({ ...profile, nachname: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail Adresse</label>
                    <input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
                    <p className="text-xs text-slate-400 mt-1">E-Mail kann nicht geändert werden.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Telefonnummer</label>
                    <input type="tel" value={profile.telefonnummer || ''} onChange={(e) => setProfile({ ...profile, telefonnummer: e.target.value })} placeholder="+49 123 456789" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Firmenname <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="text" value={profile.firma || ''} onChange={(e) => setProfile({ ...profile, firma: e.target.value })} placeholder="Firma GmbH" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="pt-4">
                    <button onClick={handleSaveProfile} disabled={profileSaving} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Änderungen speichern
                    </button>
                  </div>
                </div>

                {/* Adressen */}
                <div className="mt-10 pt-8 border-t border-slate-200 max-w-2xl">
                  <h3 className="text-xl font-bold font-outfit text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Adressen
                  </h3>
                  {adressen.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {adressen.map((addr) => (
                        <div key={addr.id} className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{addr.strasse}</p>
                            <p className="text-sm text-slate-600">{addr.plz} {addr.ort}</p>
                            {addr.bundesland && <p className="text-sm text-slate-500">{addr.bundesland}</p>}
                            <div className="flex gap-2 mt-2">
                              {addr.standard_lieferadresse && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Lieferadresse</span>}
                              {addr.standard_rechnungsadresse && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Rechnungsadresse</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => startEditAdresse(addr)} className="text-sm text-blue-600 hover:underline">Bearbeiten</button>
                            <button onClick={() => handleDeleteAdresse(addr.id)} className="text-sm text-red-500 hover:underline">Löschen</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">{editingAdresseId ? 'Adresse bearbeiten' : 'Neue Adresse hinzufügen'}</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Straße & Hausnummer</label>
                        <input type="text" value={adresseForm.strasse} onChange={(e) => setAdresseForm({ ...adresseForm, strasse: e.target.value })} placeholder="Musterstraße 123" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">PLZ</label>
                          <input type="text" value={adresseForm.plz} onChange={(e) => setAdresseForm({ ...adresseForm, plz: e.target.value })} placeholder="10115" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ort</label>
                          <input type="text" value={adresseForm.ort} onChange={(e) => setAdresseForm({ ...adresseForm, ort: e.target.value })} placeholder="Berlin" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bundesland <span className="text-slate-400">(optional)</span></label>
                        <input type="text" value={adresseForm.bundesland} onChange={(e) => setAdresseForm({ ...adresseForm, bundesland: e.target.value })} placeholder="Berlin" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      </div>
                      {/* Checkboxes inside the new/edit form */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!adresseForm.standard_lieferadresse}
                            onChange={(e) => setAdresseForm({ ...adresseForm, standard_lieferadresse: e.target.checked })}
                            disabled={adresseSaving}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-700">Als Lieferadresse verwenden</div>
                            <div className="text-xs text-slate-400">Wenn aktiviert, wird diese Adresse als Standard-Lieferadresse gesetzt.</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!adresseForm.standard_rechnungsadresse}
                            onChange={(e) => setAdresseForm({ ...adresseForm, standard_rechnungsadresse: e.target.checked })}
                            disabled={adresseSaving}
                            className="w-4 h-4 rounded border-slate-300 text-green-600 cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-700">Als Rechnungsadresse verwenden</div>
                            <div className="text-xs text-slate-400">Wenn aktiviert, wird diese Adresse als Standard-Rechnungsadresse gesetzt.</div>
                          </div>
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleSaveAdresse} disabled={adresseSaving} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {adresseSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {editingAdresseId ? 'Aktualisieren' : 'Adresse speichern'}
                        </button>
                        {editingAdresseId && (
                          <button onClick={() => { setEditingAdresseId(null); setAdresseForm({ strasse: '', plz: '', ort: '', bundesland: '', land: 'DE', standard_lieferadresse: false, standard_rechnungsadresse: false }); }} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            Abbrechen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BESTELLUNGEN ═══ */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Meine Bestellungen</h2>
                {ordersLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                ) : bestellungen.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">Noch keine Bestellungen</p>
                    <p className="text-slate-400 text-sm mt-1">Ihre Bestellungen werden hier angezeigt.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bestellungen.map((order) => (
                      <div key={order.id} className="border border-slate-200 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">#{order.bestellnummer}</span>
                            {statusBadge(order.status)}
                          </div>
                          <span className="font-bold text-lg text-slate-900">{formatCurrency(Number(order.gesamt_brutto))}</span>
                        </div>
                        <p className="text-sm text-slate-500">Bestellt am: {formatDate(order.bestellt_am || order.erstellt_am)}</p>
                        {order.bestellpositionen && order.bestellpositionen.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            {order.bestellpositionen.map((pos) => (
                              <p key={pos.id} className="text-sm text-slate-600">{pos.menge}x {pos.titel} — {formatCurrency(Number(pos.preis_brutto))}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ TERMINE ═══ */}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Meine Termine</h2>
                {bookingsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                ) : buchungen.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">Keine Termine</p>
                    <p className="text-slate-400 text-sm mt-1">Ihre angefragten Termine werden hier angezeigt.</p>
                    <a href="/contact?thema=Wartung" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                      <Calendar className="w-4 h-4" /> Service anfragen
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buchungen.map((b) => {
                      const isPast = new Date(b.geplant_bis) < new Date();
                      // Get service name(s)
                      const allServices: string[] = [];
                      if (b.buchung_dienstleistungen && Array.isArray(b.buchung_dienstleistungen)) {
                        b.buchung_dienstleistungen.forEach((bd: { dienstleistungen: { name: string } }) => {
                          if (bd.dienstleistungen?.name) allServices.push(bd.dienstleistungen.name);
                        });
                      }
                      if (allServices.length === 0) {
                        const dl = b.dienstleistungen;
                        if (Array.isArray(dl)) {
                          dl.forEach((d) => { if (d?.name) allServices.push(d.name); });
                        } else if (dl?.name) {
                          allServices.push(dl.name);
                        }
                      }
                      const serviceName = allServices.length > 0 ? allServices.join(', ') : 'Termin';
                      const techName = b.techniker ? `${b.techniker.vorname} ${b.techniker.nachname}` : null;

                      return (
                        <div key={b.id} className={`border rounded-2xl p-6 transition-all ${isPast ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50/60'}`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-300 text-white' : 'bg-blue-600 text-white'}`}>
                              <span className="text-[10px] font-semibold uppercase tracking-wide">{new Date(b.geplant_von).toLocaleDateString('de-DE', { month: 'short' })}</span>
                              <span className="text-xl font-bold leading-none">{new Date(b.geplant_von).getDate()}</span>
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h3 className="font-bold text-slate-900 text-base">{serviceName}</h3>
                                {statusBadge(b.status)}
                              </div>
                              <p className="text-slate-600 text-sm">
                                {new Date(b.geplant_von).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <p className="text-slate-700 text-sm font-medium mt-0.5">
                                🕐 {formatTime(b.geplant_von)} – {formatTime(b.geplant_bis)} Uhr
                              </p>
                              {techName && (
                                <p className="text-slate-500 text-xs mt-1">👤 Techniker: {techName}</p>
                              )}
                              {b.hinweise && <p className="text-sm text-slate-400 mt-2 italic">💬 {b.hinweise}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ EINSTELLUNGEN ═══ */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Sicherheit & Einstellungen</h2>
                <div className="space-y-6 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Neues Passwort</label>
                    <input type="password" value={passwords.newPw} onChange={(e) => setPasswords({ ...passwords, newPw: e.target.value })} autoComplete="new-password" placeholder="Mind. 6 Zeichen" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Neues Passwort bestätigen</label>
                    <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} autoComplete="new-password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="pt-4">
                    <button onClick={handleChangePassword} disabled={pwSaving} className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">
                      {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Passwort ändern
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-red-600 mb-2">Gefahrenzone</h3>
                  <p className="text-sm text-slate-500 mb-4">Das Löschen Ihres Kontos ist unwiderruflich. Alle Ihre Daten, Bestellungen und Termine werden dauerhaft gelöscht.</p>
                  <button onClick={() => setShowDeleteModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Konto löschen
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-2xl z-50 p-8">
            <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-bold text-slate-900">Konto endgültig löschen?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. Alle Ihre Daten werden dauerhaft gelöscht.</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Geben Sie <strong>&quot;KONTO LÖSCHEN&quot;</strong> ein, um zu bestätigen</label>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="KONTO LÖSCHEN" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }} className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Abbrechen</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'KONTO LÖSCHEN' || deleting} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Konto löschen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
