# 🧪 Test-Anleitung — Said Kälte- & Klimatechnik

> Lokales Testen **ohne** Domain oder professionelle E-Mail.

---

## Schritt 1 — `.env.local` ausfüllen

Die Datei `.env.local` enthält bereits die Supabase-URL und Keys. ✅

---

## Schritt 2 — Datenbank-Migration + Seed Data

### 2.1 Migration ausführen
1. Gehe zu [Supabase SQL Editor](https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/sql/new)
2. Öffne `supabase/migrations/003_ergaenzungen.sql` → kopiere den gesamten Inhalt → einfügen → **Run**
3. Dies fügt fehlende Tabellen und Spalten hinzu (email_vorlagen, inhalt_versionen, gesperrte_tage, etc.)

### 2.2 Test-Daten laden
1. Öffne `supabase/migrations/004_seed_testdaten.sql` → kopiere den gesamten Inhalt → einfügen → **Run**
2. ⚠️ **NICHT** `002_seed_data.sql` verwenden — diese Datei nutzt englische Tabellennamen!
3. Dies fügt ein: 8 Produkte, 5 Kategorien, 2 Marken, 4 Dienstleistungen, 2 Techniker, Firmendaten, 7 CMS-Seiten

### 2.3 Auth-Trigger einrichten
1. Öffne `supabase/migrations/005_auth_trigger.sql` → kopiere den gesamten Inhalt → einfügen → **Run**
2. ⚠️ Supabase zeigt eine Warnung ("destructive operation") — das ist normal, einfach bestätigen
3. Erstellt automatisch einen `benutzer`-Eintrag wenn sich jemand registriert
4. Bestehende Auth-User werden nachträglich in die `benutzer`-Tabelle übernommen

### 2.4 RLS Policies einrichten
1. Öffne `supabase/migrations/007_rls_policies.sql` → kopiere den gesamten Inhalt → einfügen → **Run**
2. Setzt Row Level Security Policies für alle Kunden-bezogenen Tabellen

### 2.5 Admin Dashboard Fixes
1. Öffne `supabase/migrations/008_admin_fixes.sql` → kopiere den gesamten Inhalt → einfügen → **Run**
2. ⚠️ Supabase zeigt eine Warnung ("destructive operation") — das ist normal, einfach bestätigen
3. Dies fügt hinzu:
   - Fehlende Spalten für `firmeneinstellungen` (Öffnungszeiten, Farben)
   - 5 Standard-E-Mail-Vorlagen
   - RLS Write-Policies für alle Admin-Tabellen
   - Standard-Firmeneinstellungen (falls noch keine existieren)

---

## Schritt 3 — Supabase Auth konfigurieren

Im [Supabase Dashboard → Authentication → Providers → Email](https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/auth/providers):
- ✅ **Email** aktiviert
- ✅ **"Confirm email"** → für Tests auf **AUS** setzen
- ✅ **"Enable sign up"** → **AN**

Im [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/auth/url-configuration):
- **Site URL**: `http://localhost:3000`
- **Redirect URLs** hinzufügen:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/account/passwort-neu`

---

## Schritt 4 — Test-Admin-Benutzer erstellen

Im [Supabase Dashboard → Authentication → Users](https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/auth/users) → **"Add user"**:

| Feld           | Wert                      |
| -------------- | ------------------------- |
| Email          | deine-persoenliche@email  |
| Password       | sicheres-passwort-123     |
| Auto-Confirm   | ✅ Ja                    |

> Aktuell prüft die App nur ob jemand eingeloggt ist.
> Jeder Auth-User kann auf `/admin` zugreifen. Rollen kommen später.

---

## Schritt 5 — App starten

```bash
npm install
npm run dev
```

Öffne **http://localhost:3000**

---

## Schritt 6 — Testplan

### Startseite
- [ ] Hero-Bild + korrekte Umlaute
- [ ] "Produkte entdecken" → `/shop`
- [ ] "Service buchen" → `/booking`
- [ ] "Alle Produkte ansehen" → `/shop`
- [ ] Warenkorb-Icon → `/cart`

### Shop & Produkte
- [ ] `/shop` zeigt 8 Produkte
- [ ] Filter & Suche funktionieren
- [ ] Produktdetails: Umlaute korrekt ✓
- [ ] Radio-Buttons wechseln korrekt
- [ ] "In den Warenkorb" → Toast + Warenkorb-Badge

### Warenkorb
- [ ] `/cart` zeigt hinzugefügte Produkte
- [ ] Menge ändern, Produkt entfernen
- [ ] Gesamtsumme korrekt

### Konto
- [ ] `/account/login` → Anmeldung
- [ ] `/account/register` → Registrierung (Firma optional)
- [ ] `/account/passwort-vergessen` → Passwort-Reset
- [ ] `/account` → Profil mit Firma-Feld
- [ ] Konto löschen mit Bestätigung

### Admin Dashboard
- [ ] `/admin/login` → Anmeldung
- [ ] `/admin` → Dashboard (KPIs)
- [ ] `/admin/products` → Produkte verwalten
- [ ] `/admin/categories` → Kategorien
- [ ] `/admin/orders` → Bestellungen
- [ ] `/admin/bookings` → Termine
- [ ] `/admin/services` → Dienstleistungen
- [ ] `/admin/technicians` → Techniker
- [ ] `/admin/content` → CMS
- [ ] `/admin/settings` → Firmendaten
- [ ] Logout → zurück zum Login

---

## Supabase MCP Verbindung

Die MCP-URL für dieses Projekt:
```
https://mcp.supabase.com/mcp?project_ref=aqqfwaozvlaeqjpkgrxy
```

### JetBrains IDE (Copilot):
Einstellungen → Tools → AI Assistant → MCP Servers → hinzufügen:
- **URL**: `https://mcp.supabase.com/mcp?project_ref=aqqfwaozvlaeqjpkgrxy`

### Oder als CLI MCP Server:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "DEIN_ACCESS_TOKEN"]
    }
  }
}
```
Access Token: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)

---

## Hinweise
- **Stripe**: Verwende Test-Keys (`sk_test_...` / `pk_test_...`)
- **Resend**: Kostenlos bis 100 E-Mails/Tag an deine eigene Adresse
- **Service-Bilder**: Aktuell identisch — ersetze mit echten Fotos
