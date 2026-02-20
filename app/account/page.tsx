'use client';

import { useState } from 'react';
import { User, Package, FileText, Calendar, Settings, LogOut } from 'lucide-react';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'orders', label: 'Bestellungen', icon: Package },
    { id: 'invoices', label: 'Rechnungen', icon: FileText },
    { id: 'appointments', label: 'Termine', icon: Calendar },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-outfit font-bold text-slate-900">
          Mein Konto
        </h1>
        <p className="text-slate-600 mt-2">Willkommen zurück, Max Mustermann!</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
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
                      className={`w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 border-blue-600' 
                          : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
              <li className="border-t border-slate-100">
                <button className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-l-4 border-transparent">
                  <LogOut className="w-5 h-5" />
                  Abmelden
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-grow">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 min-h-[500px]">
            
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Persönliche Daten</h2>
                <form className="space-y-6 max-w-2xl">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Vorname</label>
                      <input type="text" defaultValue="Max" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nachname</label>
                      <input type="text" defaultValue="Mustermann" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail Adresse</label>
                    <input type="email" defaultValue="max@beispiel.de" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Telefonnummer</label>
                    <input type="tel" defaultValue="+49 123 456789" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold font-outfit text-slate-900 mt-8 mb-4">Adresse</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Straße & Hausnummer</label>
                    <input type="text" defaultValue="Musterstraße 123" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">PLZ</label>
                      <input type="text" defaultValue="10115" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Ort</label>
                      <input type="text" defaultValue="Berlin" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button type="button" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                      Änderungen speichern
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Meine Bestellungen</h2>
                <div className="space-y-4">
                  {[1, 2].map((order) => (
                    <div key={order} className="border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-slate-900">Bestellung #100{order}</span>
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Abgeschlossen</span>
                        </div>
                        <p className="text-sm text-slate-500">Bestellt am: 12. Mai 2023</p>
                        <p className="text-sm text-slate-600 mt-2">1x Daikin Sensira (inkl. Installation)</p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="font-bold text-lg text-slate-900">1.398,00 €</span>
                        <button className="text-sm text-blue-600 font-medium hover:underline">Details ansehen</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Rechnungen</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="pb-3 font-medium">Rechnungs-Nr.</th>
                        <th className="pb-3 font-medium">Datum</th>
                        <th className="pb-3 font-medium">Betrag</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-slate-100">
                        <td className="py-4 font-medium text-slate-900">RE-2023-001</td>
                        <td className="py-4 text-slate-600">15.05.2023</td>
                        <td className="py-4 text-slate-900">1.398,00 €</td>
                        <td className="py-4"><span className="text-green-600 font-medium">Bezahlt</span></td>
                        <td className="py-4 text-right"><button className="text-blue-600 hover:underline">PDF Download</button></td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-4 font-medium text-slate-900">RE-2023-042</td>
                        <td className="py-4 text-slate-600">10.11.2023</td>
                        <td className="py-4 text-slate-900">149,00 €</td>
                        <td className="py-4"><span className="text-green-600 font-medium">Bezahlt</span></td>
                        <td className="py-4 text-right"><button className="text-blue-600 hover:underline">PDF Download</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Meine Termine</h2>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium uppercase">MAI</span>
                      <span className="text-lg font-bold leading-none">24</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Saisonale Wartung</h3>
                      <p className="text-slate-600 mb-2">Mittwoch, 24. Mai 2024 • 10:00 - 12:00 Uhr</p>
                      <p className="text-sm text-slate-500">Techniker: Herr Schmidt</p>
                      <div className="mt-4 flex gap-3">
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">Verschieben</button>
                        <button className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">Stornieren</button>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-4">Vergangene Termine</h3>
                <p className="text-slate-500 text-sm">Keine vergangenen Termine vorhanden.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold font-outfit text-slate-900 mb-6">Sicherheit & Einstellungen</h2>
                <form className="space-y-6 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Aktuelles Passwort</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Neues Passwort</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Neues Passwort bestätigen</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                  <div className="pt-4">
                    <button type="button" className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors">
                      Passwort ändern
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
