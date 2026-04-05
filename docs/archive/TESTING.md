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

... (truncated in docs copy) ...


