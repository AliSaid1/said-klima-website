/**
 * Central Postgres / Supabase error translator.
 *
 * Converts raw DB error codes and constraint names into user-friendly
 * German messages that are safe to display directly in the UI.
 *
 * Usage (in API routes):
 *   import { apiDbError } from '@/lib/api-response';
 *   if (error) return apiDbError(error);
 */

export interface DbError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

// ── Unique constraint name → friendly message ─────────────────────────────────
// Keep this map updated whenever you add a new UNIQUE constraint to the DB.
const UNIQUE_CONSTRAINT_MESSAGES: Record<string, string> = {
  // Products
  'artikel_artikelnummer_key':               'Diese Artikelnummer ist bereits vergeben. Bitte wählen Sie eine andere.',
  'artikel_slug_key':                        'Dieser URL-Pfad (Slug) ist bereits vergeben.',
  // Brands
  'marken_name_key':                         'Diese Marke existiert bereits.',
  // Categories
  'kategorien_slug_key':                     'Dieser Kategorie-URL-Pfad existiert bereits.',
  // Users
  'benutzer_email_key':                      'Diese E-Mail-Adresse ist bereits registriert.',
  // Orders
  'bestellungen_bestellnummer_key':          'Diese Bestellnummer wird bereits verwendet.',
  // Services
  'dienstleistungen_code_key':               'Dieser Dienstleistungs-Code ist bereits vergeben.',
  // Legal / CMS
  'rechtstexte_slug_key':                    'Dieser Seitenname (Slug) existiert bereits.',
  // Email templates
  'email_vorlagen_typ_key':                  'Eine E-Mail-Vorlage dieses Typs existiert bereits.',
  // Blocked dates
  'gesperrte_tage_datum_techniker_id_key':   'Für dieses Datum ist bereits ein Eintrag vorhanden.',
};

// ── Foreign key constraint name → friendly message ────────────────────────────
const FK_CONSTRAINT_MESSAGES: Record<string, string> = {
  'artikel_kategorie_id_fkey':               'Diese Kategorie kann nicht gelöscht werden, da ihr noch Produkte zugeordnet sind.',
  'artikel_marke_id_fkey':                   'Diese Marke kann nicht gelöscht werden, da ihr noch Produkte zugeordnet sind.',
  'bestellpositionen_artikel_id_fkey':       'Dieses Produkt kann nicht gelöscht werden, da es in bestehenden Bestellungen vorkommt.',
  'artikel_bilder_artikel_id_fkey':          'Die Produktbilder konnten nicht verarbeitet werden.',
  'buchungen_dienstleistung_id_fkey':        'Diese Dienstleistung kann nicht gelöscht werden, da aktive Buchungen existieren.',
  'buchungen_techniker_id_fkey':             'Dieser Techniker kann nicht gelöscht werden, da aktive Buchungen existieren.',
};

// ── Helper: extract constraint name from PG error text ────────────────────────
function extractConstraintName(text: string): string | null {
  const match = text.match(/constraint "([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Translates a raw DB/Supabase error into a user-friendly German string.
 * Returns null if the error is unknown (caller should use a generic fallback).
 */
export function translateDbError(err: DbError): string | null {
  const code    = err.code    ?? '';
  const message = err.message ?? '';
  const details = err.details ?? '';

  // ── Unique violation (23505) ──────────────────────────────────────────────
  if (code === '23505') {
    const constraint =
      extractConstraintName(message) ||
      extractConstraintName(details);

    if (constraint && UNIQUE_CONSTRAINT_MESSAGES[constraint]) {
      return UNIQUE_CONSTRAINT_MESSAGES[constraint];
    }
    return 'Dieser Eintrag existiert bereits. Bitte prüfen Sie Ihre Eingabe auf Duplikate.';
  }

  // ── Foreign key violation (23503) ────────────────────────────────────────
  if (code === '23503') {
    const constraint =
      extractConstraintName(message) ||
      extractConstraintName(details);

    if (constraint && FK_CONSTRAINT_MESSAGES[constraint]) {
      return FK_CONSTRAINT_MESSAGES[constraint];
    }
    const combined = `${message} ${details}`.toLowerCase();
    if (combined.includes('delete') || combined.includes('update')) {
      return 'Dieser Eintrag wird noch verwendet und kann nicht gelöscht oder geändert werden.';
    }
    return 'Ein referenzierter Datensatz wurde nicht gefunden.';
  }

  // ── Not-null violation (23502) ────────────────────────────────────────────
  if (code === '23502') {
    const fieldMatch = message.match(/column "([^"]+)"/);
    if (fieldMatch) {
      return `Das Feld "${fieldMatch[1]}" ist ein Pflichtfeld und darf nicht leer sein.`;
    }
    return 'Ein Pflichtfeld fehlt. Bitte füllen Sie alle erforderlichen Felder aus.';
  }

  // ── Check constraint violation (23514) ───────────────────────────────────
  if (code === '23514') {
    return 'Ein Wert liegt außerhalb des erlaubten Bereichs. Bitte prüfen Sie Ihre Eingabe.';
  }

  // ── Invalid text representation (22P02) ──────────────────────────────────
  if (code === '22P02') {
    return 'Ungültiges Datenformat. Bitte prüfen Sie Ihre Eingabe.';
  }

  // ── Supabase PostgREST: no row found (PGRST116) ───────────────────────────
  if (code === 'PGRST116') {
    return 'Der angeforderte Datensatz wurde nicht gefunden.';
  }

  // ── Permission denied (42501) ─────────────────────────────────────────────
  if (code === '42501') {
    return 'Sie haben keine Berechtigung für diese Aktion.';
  }

  return null; // unknown — let caller decide
}

/**
 * Returns true for "user-caused" errors that are safe to show verbatim.
 * Returns false for server/infra errors that should be masked in production.
 */
export function isUserFacingDbError(code: string): boolean {
  return ['23505', '23503', '23502', '23514', '22P02', 'PGRST116', '42501'].includes(code);
}

