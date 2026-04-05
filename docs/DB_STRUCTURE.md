# Database Structure — Said Kälte- & Klimatechnik

> **Source of truth:** Live Supabase DB (`aqqfwaozvlaeqjpkgrxy`)  
> **Verified on:** 2026-03-29 via direct REST API column inspection  
> **Important:** The migration files in `/supabase/migrations/` are *not* a reliable reference —
> several migrations describe tables/columns that were never applied or were applied differently.
> This document reflects what **actually exists** in the live database.
>
> **Applied migrations:** 001 → 012 ✅  
> **Pending migrations:** 013 (rls_remaining_tables), 014 (drop_unused_tables) — apply via `npm run migrate` or paste into Supabase SQL Editor  
> **Migration runner:** `scripts/apply-migrations.mjs` — uses Supabase Management API (HTTPS port 443, no direct Postgres TCP needed)  
> Requires `SUPABASE_ACCESS_TOKEN` in `.env.local` (generate at https://supabase.com/dashboard/account/tokens)

---

## Contents

1. [Table Overview](#table-overview)
2. [Table Details](#table-details)
3. [Foreign Key Relationships](#foreign-key-relationships)
4. [Unique Constraints](#unique-constraints)
5. [Trigger Functions](#trigger-functions)
6. [Triggers per Table](#triggers-per-table)
7. [RLS Policies](#rls-policies)
8. [Undocumented / Legacy Tables](#undocumented--legacy-tables)
9. [Applied Migrations](#applied-migrations)
10. [Pending Migrations](#pending-migrations)
11. [Known Gaps / Incomplete Columns](#known-gaps--incomplete-columns)

---

## Table Overview

| Table | Exists | # Columns | Notes |
|---|:---:|:---:|---|
| `marken` | ✅ | 2 | No timestamp columns |
| `kategorien` | ✅ | 4 | Minimal — no extras |
| `artikel` | ✅ | 19 | `ist_ab_preis` + `varianten` added by migration 010 ✅ |
| `artikel_bilder` | ✅ | 5 | No `erstellt_am` — added by migration 011 |
| `artikel_technische_daten` | ✅ | 4 | `schluessel`/`wert` dropped, `inhalt` added by migration 010 ✅ |
| `lagerbestaende` | ✅ | 4 | No timestamp columns |
| `benutzer` | ✅ | 11 | Full user profile |
| `benutzer_adressen` | ✅ | 12 | Different structure than migrations suggest |
| `dienstleistungen` | ✅ | 8 | No timestamp columns |
| `techniker` | ✅ | 6 | No timestamp columns |
| `techniker_verfuegbarkeit` | ✅ | 7 | Has `datum` column (for specific-date overrides) |
| `buchungen` | ✅ | 15 | Uses `geplant_von/bis` not `datum/start_zeit/ende_zeit` |
| `buchung_dienstleistungen` | ✅ | 4 | Junction table |
| `bestellungen` | ✅ | 9 | Pricing cols added by migration 011 |
| `bestellpositionen` | ✅ | 5 | Line-item detail cols added by migration 011 |
| `zahlungen` | ✅ | 7 | `betrag_brutto`/`anbieter` added by migration 011 |
| `zahlungsvorgaenge` | ✅ | 3 | Detail cols added by migration 011 |
| `firmeneinstellungen` | ✅ | 16 | Singleton row |
| `rechtstexte` | ✅ | 7 | CMS legal texts |
| `inhalt_versionen` | ✅ | 6 | Version history for rechtstexte |
| `email_vorlagen` | ✅ | 6 | Email templates |
| `gesperrte_tage` | ✅ | 5 | Blocked calendar dates |
| `medien_dateien` | ✅ | 7 | File/media metadata |
| `admin_audit_logs` | ✅ | 5 | Audit trail |
| `email_bestaetigung_tokens` | ✅ | — | Legacy custom token table — **not used** (Supabase Auth handles this natively). RLS locked. Keep or drop. |
| `passwort_reset_tokens` | ✅ | — | Legacy custom token table — **not used** (Supabase Auth handles this natively). RLS locked. Keep or drop. |
| `einwilligungen` | ✅ | — | GDPR consent log — **not implemented**. Low priority. RLS locked. See undocumented tables section. |
| `service_gebiete` | ✅ | — | Geographic service areas — **not in scope**. **Will be dropped** (migration 014). |
| `service_gebiet_plz` | ✅ | — | ZIP codes per service area — **not in scope**. **Will be dropped** (migration 014). |
| `warenkoerbe` | ✅ | — | Server-side cart — **not needed** (app uses localStorage). **Will be dropped** (migration 014). |
| `warenkorb_positionen` | ✅ | — | Server-side cart items — **not needed**. **Will be dropped** (migration 014). |

---

## Table Details

### `marken` — Brands

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `name` | text | NO | UNIQUE constraint |

---

### `kategorien` — Categories

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `name` | text | NO | |
| `slug` | text | NO | UNIQUE |
| `parent_id` | uuid | YES | FK → `kategorien.id` (self-reference, SET NULL) |

---

### `artikel` — Products

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `artikelnummer` | text | NO | UNIQUE |
| `titel` | text | NO | |
| `slug` | text | YES | UNIQUE (added in migration 003) |
| `beschreibung` | text | YES | |
| `marke_id` | uuid | YES | FK → `marken.id` |
| `kategorie_id` | uuid | YES | FK → `kategorien.id` |
| `preis_brutto` | numeric(10,2) | NO | **Base price** incl. VAT — serves as the starting point; variant surcharges are added on top |
| `rabattpreis` | numeric(10,2) | YES | Sale price for the base product (added in migration 003) |
| `steuersatz` | numeric(5,2) | NO | Default 19.00 |
| `installation_option_verfügbar` | boolean | NO | Default true |
| `aktiv` | boolean | NO | Default true |
| `meta_titel` | text | YES | SEO title (added in migration 003) |
| `meta_beschreibung` | text | YES | SEO description (added in migration 003) |
| `meta_tags` | text[] | YES | SEO tags array (added in migration 003) |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |
| `ist_ab_preis` | boolean | NO | Default `false`. When `true`: product shows "Ab X €" + contact-request instead of buy button |
| `varianten` | jsonb | NO | Default `'[]'`. Inline variant list — see structure below |

#### `varianten` JSONB array structure

Each element in the array represents one selectable size/length/variant option:

```jsonc
[
  { "name": "50 Meter",  "preis_aufschlag": 0.00  },
  { "name": "100 Meter", "preis_aufschlag": 45.00 },
  { "name": "150 Meter", "preis_aufschlag": 90.00 }
]
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Display label the admin enters, e.g. `"50 Meter"`, `"100 Meter"` |
| `preis_aufschlag` | number | Surcharge added **on top of** `artikel.preis_brutto`. Base size = `0.00` |

**Price calculation (done in JavaScript):**
```
endpreis = artikel.preis_brutto + variante.preis_aufschlag
```

**Rules:**
- If `varianten` is empty (`[]`) → the product has no variants; `preis_brutto` is shown directly.
- If `varianten` has entries → the shop renders a selector; the price updates when the customer picks a size.
- The base size entry should have `preis_aufschlag: 0.00`.
- `ist_ab_preis: true` overrides both: always shows "Ab X€" + contact request, no direct purchase.

> **Why JSONB and not a separate table?**  
> Variants here are purely cosmetic price variants of the *same product* (same name, same images, same
> technical data). They carry only two fields (`name`, `preis_aufschlag`) and have no independent
> stock tracking, no separate images, and no separate SEO. A JSONB column on `artikel` is the
> correct fit — no JOIN overhead, readable in one query, and trivially editable by the admin.

---

### `artikel_bilder` — Product Images

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `artikel_id` | uuid | NO | FK → `artikel.id` (CASCADE DELETE) |
| `datei_id` | uuid | YES | FK → `medien_dateien.id` (SET NULL) |
| `alt_text` | text | YES | |
| `anzeige_reihenfolge` | integer | NO | Default 0 |

> **Note:** No `url` column — image URL is resolved at runtime via `medien_dateien.speicherpfad`  
> **Note:** No `erstellt_am` column

---

### `artikel_technische_daten` — Technical Data (Rich Text)

> **Migration 010 applied ✅.** `schluessel`/`wert` columns have been dropped. `inhalt` has been added.

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `artikel_id` | uuid | NO | FK → `artikel.id` (CASCADE DELETE) |
| `inhalt` | text | YES | Rich-text HTML content (produced by the admin RichTextEditor) |
| `anzeige_reihenfolge` | integer | NO | Default 0 — allows multiple content blocks per product |

> **Design:** Technical data is no longer a structured key-value table.
> The admin writes formatted specs (tables, lists, bold text) in a RichTextEditor.
> The result (HTML string) is stored in `inhalt`.  
> `anzeige_reihenfolge` allows multiple ordered rich-text blocks per product — in practice most products have a single row at position 0.

---

### `lagerbestaende` — Stock Levels

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `artikel_id` | uuid | NO | FK → `artikel.id` UNIQUE (one row per product) |
| `bestand` | integer | NO | Current stock |
| `mindestbestand` | integer | NO | Low-stock threshold |

> **Note:** No timestamp columns  
> **Note:** UNIQUE constraint on `artikel_id` (one stock row per product)

---

### `benutzer` — Customer / User Accounts

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK — same as `auth.users.id` (Supabase Auth) |
| `vorname` | text | NO | |
| `nachname` | text | NO | |
| `email` | text | NO | UNIQUE |
| `passwort_hash` | text | NO | Value: `'supabase-auth'` (managed by Supabase Auth) |
| `telefonnummer` | text | YES | |
| `firma` | text | YES | Company name (added in migration 006) |
| `rolle` | text | NO | `'kunde'` or `'admin'` |
| `email_bestaetigt` | boolean | NO | Default false |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |

---

### `benutzer_adressen` — Customer Addresses

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `benutzer_id` | uuid | NO | FK → `benutzer.id` (CASCADE DELETE) |
| `bezeichnung` | text | YES | Label, e.g. "Zuhause", "Büro" |
| `strasse` | text | NO | Street + house number |
| `plz` | text | NO | |
| `ort` | text | NO | |
| `bundesland` | text | YES | |
| `land` | text | NO | Default `'DE'` |
| `standard_lieferadresse` | boolean | NO | Default false |
| `standard_rechnungsadresse` | boolean | NO | Default false |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()` |

> **Note:** No separate `vorname`/`nachname` on address — uses the account's name

---

### `dienstleistungen` — Services

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `code` | text | NO | UNIQUE, e.g. `'INSTALLATION'`, `'WARTUNG'` |
| `name` | text | NO | Display name |
| `beschreibung` | text | YES | |
| `basispreis_brutto` | numeric(10,2) | NO | |
| `steuersatz` | numeric(5,2) | NO | Default 19.00 |
| `dauer_minuten` | integer | NO | |
| `aktiv` | boolean | NO | Default true |

> **Note:** No timestamp columns

---

### `techniker` — Technicians

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `vorname` | text | NO | |
| `nachname` | text | NO | |
| `telefon` | text | YES | |
| `email` | text | YES | |
| `aktiv` | boolean | NO | Default true |

> **Note:** No timestamp columns

---

### `techniker_verfuegbarkeit` — Technician Availability

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `techniker_id` | uuid | NO | FK → `techniker.id` (CASCADE DELETE) |
| `wochentag` | integer | YES | 1=Mon … 7=Sun (ISO weekday) |
| `datum` | date | YES | Specific date override (nullable) |
| `start_zeit` | time | NO | |
| `ende_zeit` | time | NO | |
| `verfuegbar` | boolean | NO | Default true |

---

### `buchungen` — Bookings / Service Appointments

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `benutzer_id` | uuid | YES | FK → `benutzer.id` (nullable for guest bookings) |
| `dienstleistung_id` | uuid | YES | FK → `dienstleistungen.id` |
| `techniker_id` | uuid | YES | FK → `techniker.id` |
| `adresse_id` | uuid | YES | FK → `benutzer_adressen.id` |
| `geplant_von` | timestamptz | NO | Booking start datetime |
| `geplant_bis` | timestamptz | NO | Booking end datetime |
| `status` | text | NO | e.g. `'angefragt'`, `'bestaetigt'`, `'storniert'`, `'abgeschlossen'` |
| `hinweise` | text | YES | Customer notes |
| `erinnerung_gesendet` | boolean | NO | Default false |
| `kontakt_name` | text | YES | Guest name (added in migration 009) |
| `kontakt_email` | text | YES | Guest email (added in migration 009) |
| `kontakt_telefon` | text | YES | Guest phone (added in migration 009) |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |

> **Note:** No `buchungsnummer` column (no human-readable booking number)  
> **Note:** No direct datetime columns — uses `geplant_von` + `geplant_bis` (not `datum/start_zeit/ende_zeit`)  
> **Relation to services:** Multiple services per booking via `buchung_dienstleistungen` junction table

---

### `buchung_dienstleistungen` — Booking ↔ Service Junction

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `buchung_id` | uuid | NO | FK → `buchungen.id` (CASCADE DELETE) |
| `dienstleistung_id` | uuid | NO | FK → `dienstleistungen.id` (CASCADE DELETE) |
| `erstellt_am` | timestamptz | NO | Default `now()` |

> **Constraint:** UNIQUE `(buchung_id, dienstleistung_id)`

---

### `bestellungen` — Orders

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `bestellnummer` | text | NO | UNIQUE, human-readable order number |
| `benutzer_id` | uuid | YES | FK → `benutzer.id` (nullable for guest orders) |
| `lieferadresse_json` | jsonb | YES | Snapshot of shipping address |
| `rechnungsadresse_json` | jsonb | YES | Snapshot of billing address |
| `status` | text | NO | `'offen'` → `'bezahlt'` → `'versendet'` → `'storniert'` |
| `notizen` | jsonb | YES | Array of `{text, erstellt_am, autor}` |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |
| `gast_email` | text | YES | Guest email for unauthenticated checkout — added by migration 011 |
| `zwischensumme_brutto` | numeric(10,2) | NO | Cart subtotal incl. VAT — added by migration 011 |
| `steuer_summe` | numeric(10,2) | NO | Total VAT amount — added by migration 011 |
| `versand_brutto` | numeric(10,2) | NO | Shipping cost incl. VAT — added by migration 011 |
| `gesamt_brutto` | numeric(10,2) | NO | Grand total incl. VAT — added by migration 011 |
| `zahlungsmethode` | text | YES | e.g. `'card'` — added by migration 011 |
| `stripe_session_id` | text | YES | Stripe Checkout Session ID — added by migration 011 |
| `stripe_payment_intent_id` | text | YES | Stripe PaymentIntent ID — added by migration 011 |
| `bestellt_am` | timestamptz | YES | Set by Stripe webhook when payment completes — added by migration 011 |

---

### `bestellpositionen` — Order Line Items

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `bestellung_id` | uuid | NO | FK → `bestellungen.id` |
| `artikel_id` | uuid | YES | FK → `artikel.id` |
| `menge` | integer | NO | Quantity |
| `steuersatz` | numeric(5,2) | YES | VAT rate applied |
| `variante_name` | text | YES | Selected variant label (from `artikel.varianten` JSONB) — added by migration 011 |
| `typ` | text | NO | `'artikel'` or `'dienstleistung'` — added by migration 011 |
| `titel` | text | YES | Snapshot of `artikel.titel` at time of order — added by migration 011 |
| `preis_brutto` | numeric(10,2) | NO | Unit price incl. VAT — added by migration 011 |
| `einzelpreis_netto` | numeric(10,2) | NO | Unit price excl. VAT — added by migration 011 |
| `erstellt_am` | timestamptz | NO | Default `now()` — added by migration 011 |

---

### `zahlungen` — Payment Records

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `bestellung_id` | uuid | NO | FK → `bestellungen.id` |
| `stripe_payment_intent_id` | text | YES | Stripe PI reference |
| `waehrung` | text | NO | e.g. `'eur'` |
| `status` | text | NO | Stripe payment status, e.g. `'erfasst'` |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()` |
| `anbieter` | text | NO | Payment provider, default `'stripe'` — added by migration 011 |
| `betrag_brutto` | numeric(10,2) | NO | Total amount incl. VAT — added by migration 011 |

---

### `zahlungsvorgaenge` — Payment Events / Webhooks

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `zahlung_id` | uuid | NO | FK → `zahlungen.id` |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `ereignis` | text | YES | Stripe event type, e.g. `'checkout.session.completed'` — added by migration 011 |
| `betrag_brutto` | numeric(10,2) | YES | Amount from the event — added by migration 011 |
| `rohdaten` | jsonb | YES | Full raw Stripe event payload — added by migration 011 |

---

### `firmeneinstellungen` — Company Settings (Singleton)

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `firmenname` | text | NO | |
| `email` | text | NO | |
| `telefon` | text | YES | |
| `ust_id` | text | YES | VAT ID |
| `adresse_json` | jsonb | YES | `{strasse, plz, ort, land}` |
| `support_zeiten` | text | YES | Free-text support hours |
| `logo_datei_id` | uuid | YES | FK → `medien_dateien.id` |
| `oeffnungszeiten` | jsonb | YES | Array of `{tag, von, bis, geoeffnet}` |
| `primaerfarbe` | text | YES | Hex, default `'#2563EB'` |
| `sekundaerfarbe` | text | YES | Hex, default `'#0F172A'` |
| `akzentfarbe` | text | YES | Hex, default `'#3B82F6'` |
| `support_email` | text | YES | |
| `support_telefon` | text | YES | |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |

> **Note:** Singleton — only one row allowed (`UNIQUE INDEX single_firmeneinstellungen ON firmeneinstellungen ((true))`)

---

### `rechtstexte` — Legal / CMS Pages

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `slug` | text | NO | UNIQUE, e.g. `'agb'`, `'impressum'` |
| `titel` | text | NO | |
| `content_html` | text | YES | Full HTML content |
| `version` | text | YES | e.g. `'1.0'` |
| `veröffentlicht` | boolean | NO | Default false |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |

> **Note:** No `erstellt_am` column  
> **Note:** Column name contains German umlaut: `veröffentlicht` (ö)

---

### `inhalt_versionen` — CMS Content Version History

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `rechtstext_id` | uuid | NO | FK → `rechtstexte.id` (CASCADE DELETE) |
| `content_html` | text | NO | Snapshot of the content at this version |
| `version_nummer` | integer | NO | Incremental version number |
| `erstellt_am` | timestamptz | NO | Default `now()` |
| `erstellt_von` | uuid | YES | FK → `benutzer.id` (SET NULL) |

> **Constraint:** UNIQUE `(rechtstext_id, version_nummer)`

---

### `email_vorlagen` — Email Templates

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `typ` | text | NO | UNIQUE, e.g. `'buchung_bestaetigung'`, `'bestellung_bestaetigung'` |
| `betreff` | text | NO | Subject line with `{{placeholder}}` variables |
| `inhalt_html` | text | NO | HTML body with `{{placeholder}}` variables |
| `variablen` | text[] | YES | List of available placeholders |
| `aktualisiert_am` | timestamptz | NO | Default `now()`, auto-updated by trigger |

---

### `gesperrte_tage` — Blocked Calendar Dates

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `datum` | date | NO | |
| `grund` | text | YES | Reason for blocking |
| `techniker_id` | uuid | YES | FK → `techniker.id` (CASCADE DELETE); NULL = global block |
| `erstellt_am` | timestamptz | NO | Default `now()` |

> **Constraint:** UNIQUE `(datum, techniker_id)`

---

### `medien_dateien` — Media File Metadata

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `speicherpfad` | text | NO | Path in Supabase Storage |
| `mime_type` | text | NO | e.g. `'image/jpeg'` |
| `groesse_bytes` | integer | YES | File size |
| `breite` | integer | YES | Image width in px |
| `hoehe` | integer | YES | Image height in px |
| `erstellt_am` | timestamptz | NO | Default `now()` |

> **Note:** No `dateiname`, `bucket`, `hochgeladen_von` or `aktualisiert_am` columns

---

### `admin_audit_logs` — Admin Action Log

| Column | Type | Nullable | Notes |
|---|---|:---:|---|
| `id` | uuid | NO | PK, `gen_random_uuid()` |
| `aktion` | text | NO | Action description |
| `entitaet_typ` | text | YES | Entity type, e.g. `'artikel'` |
| `entitaet_id` | uuid | YES | ID of the affected entity |
| `erstellt_am` | timestamptz | NO | Default `now()` |

> **Note:** No `admin_id` or `details` columns

---

## Foreign Key Relationships

```
kategorien.parent_id ──────────────────────▶ kategorien.id           (SET NULL on delete)

artikel.marke_id ──────────────────────────▶ marken.id
artikel.kategorie_id ──────────────────────▶ kategorien.id
artikel.varianten ─────────────────────────  (JSONB column — no FK; self-contained in artikel row)

artikel_bilder.artikel_id ─────────────────▶ artikel.id              (CASCADE DELETE)
artikel_bilder.datei_id ───────────────────▶ medien_dateien.id        (SET NULL)

artikel_technische_daten.artikel_id ───────▶ artikel.id              (CASCADE DELETE)


lagerbestaende.artikel_id ─────────────────▶ artikel.id              (1-to-1 unique)

benutzer_adressen.benutzer_id ─────────────▶ benutzer.id             (CASCADE DELETE)

techniker_verfuegbarkeit.techniker_id ─────▶ techniker.id            (CASCADE DELETE)

buchungen.benutzer_id ─────────────────────▶ benutzer.id
buchungen.dienstleistung_id ───────────────▶ dienstleistungen.id
buchungen.techniker_id ────────────────────▶ techniker.id
buchungen.adresse_id ──────────────────────▶ benutzer_adressen.id

buchung_dienstleistungen.buchung_id ───────▶ buchungen.id            (CASCADE DELETE)
buchung_dienstleistungen.dienstleistung_id ▶ dienstleistungen.id     (CASCADE DELETE)

bestellungen.benutzer_id ──────────────────▶ benutzer.id

bestellpositionen.bestellung_id ───────────▶ bestellungen.id
bestellpositionen.artikel_id ──────────────▶ artikel.id

zahlungen.bestellung_id ───────────────────▶ bestellungen.id

zahlungsvorgaenge.zahlung_id ──────────────▶ zahlungen.id

inhalt_versionen.rechtstext_id ────────────▶ rechtstexte.id          (CASCADE DELETE)
inhalt_versionen.erstellt_von ─────────────▶ benutzer.id             (SET NULL)

gesperrte_tage.techniker_id ───────────────▶ techniker.id            (CASCADE DELETE, nullable = global)

firmeneinstellungen.logo_datei_id ─────────▶ medien_dateien.id
```

---

## Unique Constraints

| Table | Constraint | Columns |
|---|---|---|
| `marken` | `marken_name_key` | `(name)` |
| `kategorien` | `kategorien_slug_key` | `(slug)` |
| `artikel` | `artikel_artikelnummer_key` | `(artikelnummer)` |
| `artikel` | `artikel_slug_key` | `(slug)` |
| `lagerbestaende` | *(implied)* | `(artikel_id)` |
| `artikel_technische_daten` | ~~`(artikel_id, schluessel)`~~ | Dropped when `schluessel` is removed in migration 010 |
| `benutzer` | `benutzer_email_key` | `(email)` |
| `dienstleistungen` | `dienstleistungen_code_key` | `(code)` |
| `buchung_dienstleistungen` | *(implied)* | `(buchung_id, dienstleistung_id)` |
| `bestellungen` | `bestellungen_bestellnummer_key` | `(bestellnummer)` |
| `firmeneinstellungen` | `single_firmeneinstellungen` | `((true))` — singleton |
| `rechtstexte` | `rechtstexte_slug_key` | `(slug)` |
| `inhalt_versionen` | *(implied)* | `(rechtstext_id, version_nummer)` |
| `email_vorlagen` | `email_vorlagen_typ_key` | `(typ)` |
| `gesperrte_tage` | *(implied)* | `(datum, techniker_id)` |

---

## Trigger Functions

### `update_aktualisiert_am()` — Auto-update timestamp

Defined in migration **003_ergaenzungen.sql**, section 10.

```sql
CREATE OR REPLACE FUNCTION update_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Used by every `BEFORE UPDATE` trigger listed below.

---

### `handle_new_user()` — Sync Supabase Auth → benutzer

Defined in migration **005_auth_trigger.sql**, updated in **006_firma_telefon_fix.sql**.

```sql
-- Fires AFTER INSERT ON auth.users
-- Creates a matching row in public.benutzer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.benutzer (id, vorname, nachname, email, passwort_hash,
    telefonnummer, firma, rolle, email_bestaetigt)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    NEW.email, 'supabase-auth',
    NULLIF(NEW.raw_user_meta_data->>'telefon', ''),
    NULLIF(NEW.raw_user_meta_data->>'firma', ''),
    'kunde',
    (NEW.email_confirmed_at IS NOT NULL)
  );
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Upsert existing benutzer fields
  UPDATE public.benutzer SET ... WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
```

---

## Triggers per Table

| Table | Trigger Name | Event | Function |
|---|---|---|---|
| `auth.users` | `on_auth_user_created` | AFTER INSERT | `handle_new_user()` |
| `artikel` | *(inferred from 003)* | BEFORE UPDATE | `update_aktualisiert_am()` |
| `benutzer` | *(inferred from 003)* | BEFORE UPDATE | `update_aktualisiert_am()` |
| `bestellungen` | *(inferred from 003)* | BEFORE UPDATE | `update_aktualisiert_am()` |
| `buchungen` | *(inferred from 003)* | BEFORE UPDATE | `update_aktualisiert_am()` |
| `firmeneinstellungen` | *(inferred from 003)* | BEFORE UPDATE | `update_aktualisiert_am()` |
| `email_vorlagen` | `set_aktualisiert_email_vorlagen` | BEFORE UPDATE | `update_aktualisiert_am()` |
| `rechtstexte` | `set_aktualisiert_rechtstexte` | BEFORE UPDATE | `update_aktualisiert_am()` |

> **Note:** Not all `update_aktualisiert_am` trigger names were verified directly via the live DB.
> The function `update_aktualisiert_am()` **definitely exists** (referenced and created in migration 003, column exists on `artikel.aktualisiert_am`).

---

## RLS Policies

### Public Read (no authentication required)

| Table | Policy Name | Condition |
|---|---|---|
| `artikel` | `"Jeder kann aktive Artikel lesen"` | `USING (true)` |
| `kategorien` | `"Jeder kann Kategorien lesen"` | `USING (true)` |
| `marken` | `"Jeder kann Marken lesen"` | `USING (true)` |
| `lagerbestaende` | `"Jeder kann Lagerbestände lesen"` | `USING (true)` |
| `artikel_bilder` | `"Jeder kann Artikel-Bilder lesen"` | `USING (true)` |
| `artikel_technische_daten` | `"Jeder kann Technische Daten lesen"` | `USING (true)` |
| `dienstleistungen` | `"Jeder kann Dienstleistungen lesen"` | `USING (true)` |
| `techniker` | `"Jeder kann Techniker lesen"` | `USING (true)` |
| `techniker_verfuegbarkeit` | `"Jeder kann Verfuegbarkeit lesen"` | `USING (verfuegbar = true)` |
| `gesperrte_tage` | `"Jeder kann gesperrte Tage lesen"` | `USING (true)` |
| `firmeneinstellungen` | `"Jeder kann Firmeneinstellungen lesen"` | `USING (true)` |
| `rechtstexte` | `"Jeder kann veröffentlichte Rechtstexte lesen"` | `USING (true)` |
| `medien_dateien` | `"Jeder kann Medien lesen"` | `USING (true)` |

### Public Insert

| Table | Policy Name | Condition |
|---|---|---|
| `buchungen` | `"Oeffentlich: Buchung erstellen"` | `WITH CHECK (true)` |

### Customer (authenticated, own data only)

| Table | Policy | Access |
|---|---|---|
| `benutzer` | Own row only | SELECT, UPDATE, DELETE via `auth.uid() = id` |
| `benutzer_adressen` | Own addresses | CRUD via `auth.uid() = benutzer_id` |
| `bestellungen` | Own orders | SELECT via `auth.uid() = benutzer_id` |
| `bestellpositionen` | Own order items | SELECT via join to `bestellungen.benutzer_id` |
| `buchungen` | Own bookings | SELECT via `auth.uid() = benutzer_id` |

### Admin Write (authenticated role)

All tables listed below have three policies (INSERT / UPDATE / DELETE) with `auth.role() = 'authenticated'`:

`techniker`, `techniker_verfuegbarkeit`, `gesperrte_tage`, `email_vorlagen`, `firmeneinstellungen`,
`rechtstexte`, `inhalt_versionen`, `medien_dateien`, `dienstleistungen`, `artikel`, `kategorien`,
`marken`, `lagerbestaende`, `artikel_technische_daten`, `artikel_bilder`, `bestellungen`,
`bestellpositionen`, `buchungen`, `zahlungen`, `zahlungsvorgaenge`, `admin_audit_logs`

> **Note:** In practice, all admin API routes use the `service_role` key which **bypasses RLS entirely**.
> The `auth.role() = 'authenticated'` policies are a secondary safety net.

---

## Undocumented / Legacy Tables

These 7 tables exist in the live database but were never implemented in the application code.
They were created during early planning. Below is an explanation of what each table is, why it
might have been created, and the decision for this project.

---

### `email_bestaetigung_tokens`

| | |
|---|---|
| **What** | A custom table to store one-time tokens for email address confirmation (e.g., `token`, `benutzer_id`, `expires_at`). |
| **Why it exists** | Early projects often build custom email-confirmation flows before using a managed auth service. Someone created this during initial setup. |
| **Does Supabase do this natively?** | **Yes.** Supabase Auth handles email confirmation completely. When a user registers, Supabase sends a confirmation email automatically. The result is stored in `auth.users.email_confirmed_at`, and our `handle_new_user()` trigger syncs it into `benutzer.email_bestaetigt`. |
| **Is it used in this project?** | **No.** Zero references in any API route or component. |
| **Decision** | 🟡 **Keep for now, locked.** Not worth dropping yet as it causes no harm (RLS fully locks it). Can be dropped in a future cleanup migration if desired. |
| **Priority** | **None** — do not implement. |

---

### `passwort_reset_tokens`

| | |
|---|---|
| **What** | A custom table to store password-reset tokens (e.g., `token`, `benutzer_id`, `expires_at`). |
| **Why it exists** | Same reasoning as `email_bestaetigung_tokens` — early custom auth flow before using Supabase. |
| **Does Supabase do this natively?** | **Yes.** Supabase Auth handles password reset via `supabase.auth.resetPasswordForEmail()`. It sends a recovery email with a magic link. No custom token table is needed. Our `/account/passwort-vergessen` page already uses this native Supabase flow. |
| **Is it used in this project?** | **No.** Zero references anywhere. |
| **Decision** | 🟡 **Keep for now, locked.** Same as above — harmless, low priority to drop. |
| **Priority** | **None** — do not implement. |

---

### `einwilligungen`

| | |
|---|---|
| **What** | A GDPR consent log — stores a record of when a user consented to something: Terms of Service, Privacy Policy, marketing emails, etc. Typically: `(benutzer_id, typ, version, eingewilligt, erstellt_am)`. |
| **Why it exists** | Under GDPR (§7 DSGVO), you must be able to **prove** that a user gave consent, at what time, and to which version of a document. This table provides that audit trail. |
| **Does Supabase do this natively?** | No — consent logging is app-specific business logic. |
| **Is it used in this project?** | **No.** Zero references anywhere. |
| **Should it be implemented?** | It is good practice for GDPR compliance, but it is **not a legal requirement to have a DB table** for it. Accepting the Terms on registration is currently enough for a small B2C shop. If you add marketing newsletters or need a formal consent audit trail, implement it then. |
| **Decision** | 🟡 **Keep, locked, low priority.** Schema is unknown — lock it down and implement properly later if needed. |
| **Priority** | **Low** — not required for current project scope. |

---

### `warenkoerbe` + `warenkorb_positionen`

| | |
|---|---|
| **What** | Server-side shopping cart: `warenkoerbe` = one cart per user/session; `warenkorb_positionen` = one row per product in the cart. |
| **Why they exist** | Server-side carts enable: (1) cart persistence across devices, (2) "abandoned cart" email campaigns, (3) inventory pre-reservation. They were probably created with those ideas in mind. |
| **How the cart works in this project** | The cart lives entirely in **client-side React state** (`lib/cart-context.tsx`). It is stored in `localStorage` and is wiped when the user clears their browser. The flow is: `add to cart (client) → POST /api/checkout → Stripe session → bestellungen`. No DB cart step. |
| **Is a DB cart needed?** | **No.** For this project the cart is intentionally simple: customer adds items, goes to checkout immediately, pays. There is no "save cart for later", no abandoned cart email, and no cross-device sync. A DB cart would add complexity with zero benefit. |
| **Decision** | 🔴 **DROP** (migration 014). These tables will be deleted. |
| **Priority** | **None** — drop them. |

---

### `service_gebiete` + `service_gebiet_plz`

| | |
|---|---|
| **What** | `service_gebiete` = geographic service areas (e.g., "Stuttgart", "Böblingen"); `service_gebiet_plz` = which ZIP codes belong to each area. Used to answer "Do you service my postcode?" |
| **Why it exists** | Probably planned for a booking-form feature where customers check availability by ZIP code. |
| **Is it in scope?** | **No.** Said Kälte- & Klimatechnik serves a fixed local region. There is no ZIP-code availability check in any page, API route, or component. |
| **Decision** | 🔴 **DROP** (migration 014). |
| **Priority** | **None** — drop them. |

---

## Applied Migrations

| Migration | File | Status | Summary |
|---|---|:---:|---|
| 001 | `001_initial_schema.sql` | ✅ | Initial English-schema tables (categories, products, orders…) |
| 002 | `002_seed_data.sql` | ✅ | Seed data |
| 003 | `003_ergaenzungen.sql` | ✅ | German-schema tables, `update_aktualisiert_am()` trigger function |
| 004 | `004_seed_testdaten.sql` | ✅ | Test data |
| 005 | `005_auth_trigger.sql` | ✅ | `handle_new_user()` auth trigger |
| 006 | `006_firma_telefon_fix.sql` | ✅ | `benutzer.firma` + `telefonnummer` columns |
| 007 | `007_rls_policies.sql` | ✅ | Initial customer-owned RLS policies |
| 008 | `008_admin_fixes.sql` | ✅ | Admin write policies (later corrected by 012) |
| 009 | `009_buchungen_kontakt.sql` | ✅ | Guest contact columns on `buchungen` |
| 009b | `009_rechtstexte_update_trigger.sql` | ✅ | Auto-update trigger for `rechtstexte` |
| 010 | `010_artikel_updates_und_varianten.sql` | ✅ | `ist_ab_preis`, `varianten`, `inhalt` on tech data |
| 011 | `011_bekannte_luecken.sql` | ✅ | Missing columns for checkout, webhook, audit |
| 012 | `012_rls_policies.sql` | ✅ | RLS cleanup — removed incorrect `auth.role()` write policies, enforced service_role strategy |

---

## Pending Migrations

### Migration 013 — RLS for Remaining Tables (`013_rls_remaining_tables.sql`)

**Status:** ⏳ Not yet applied.

Enables RLS on 7 tables that existed in the DB but were missed by migration 012.
All 7 are locked down (zero policies = service_role only). Fixes 9 Supabase Security Advisor errors.

```sql
-- Paste into: https://supabase.com/dashboard/project/aqqfwaozvlaeqjpkgrxy/sql/new
-- or run: npm run migrate
```

---

### Migration 014 — Drop Unused Tables (`014_drop_unused_tables.sql`)

**Status:** ⏳ Not yet applied. Run **after** migration 013.

Drops 4 tables that are confirmed as not needed in this project:

| Table | Reason |
|---|---|
| `service_gebiet_plz` | Feature not in scope — dropped first (FK child) |
| `service_gebiete` | Feature not in scope |
| `warenkorb_positionen` | App uses localStorage cart — no DB cart needed — dropped first (FK child) |
| `warenkoerbe` | Same reason |

`einwilligungen`, `email_bestaetigung_tokens`, `passwort_reset_tokens` are **not dropped** — they are kept locked (RLS, zero policies) for potential future use.

---

## Known Gaps / Incomplete Columns

All items below are resolved by migration 011 (already applied ✅).

| Table | Columns Added | Status |
|---|---|:---:|
| `artikel_bilder` | `erstellt_am` | ✅ Applied |
| `marken` | `erstellt_am` | ✅ Applied |
| `lagerbestaende` | `erstellt_am`, `aktualisiert_am` | ✅ Applied |
| `kategorien` | `beschreibung`, `bild_url`, `anzeige_reihenfolge`, `aktiv`, timestamps | ✅ Applied |
| `dienstleistungen` | timestamps | ✅ Applied |
| `techniker` | timestamps | ✅ Applied |
| `bestellungen` | `gast_email`, pricing cols, Stripe cols, `bestellt_am` | ✅ Applied |
| `bestellpositionen` | `variante_name`, `typ`, `titel`, `preis_brutto`, `einzelpreis_netto`, `erstellt_am` | ✅ Applied |
| `zahlungen` | `anbieter`, `betrag_brutto` | ✅ Applied |
| `zahlungsvorgaenge` | `ereignis`, `betrag_brutto`, `rohdaten` | ✅ Applied |
| `admin_audit_logs` | `admin_id`, `details` | ✅ Applied |
| `medien_dateien` | `dateiname`, `bucket`, `hochgeladen_von` | ✅ Applied |
