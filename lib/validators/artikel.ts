import { z } from 'zod';

// ============================================
// ARTIKEL (Produkt) Validators
// ============================================

export const artikelBildSchema = z.object({
  datei_id: z.string().uuid().optional(),
  url: z.string().url().optional(),
  alt_text: z.string().optional(),
  anzeige_reihenfolge: z.number().int().min(0).optional().default(0),
});

// artikel_technische_daten now stores a single rich-text HTML block per row
export const technischeDatenSchema = z.object({
  inhalt: z.string().optional().default(''),
  anzeige_reihenfolge: z.number().int().min(0).optional().default(0),
});

// Variants are stored as a JSONB array on artikel.varianten.
// Each entry carries only a label and a surcharge on top of artikel.preis_brutto.
// endpreis = artikel.preis_brutto + variante.preis_aufschlag
export const artikelVarianteSchema = z.object({
  name: z.string().min(1, 'Name der Variante ist erforderlich'),
  preis_aufschlag: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? 0 : Number(v)),
    z.number().min(0, 'Aufschlag muss 0 oder positiv sein').default(0)
  ),
});

/**
 * Nullable optional UUID field for HTML <select> elements.
 *
 * Uses z.any() so zodResolver NEVER produces an error for this field,
 * regardless of the value. The '' → null conversion is done in onSubmit,
 * and the server re-validates with the same schema.
 */
const nullableUuid = z.any();

export const createArtikelSchema = z.object({
  artikelnummer: z.string().min(1, 'Artikelnummer ist erforderlich'),
  titel: z.string().min(1, 'Titel ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  beschreibung: z.string().optional().default(''),
  // technische_daten_rte: string from the RichTextEditor.
  // The API saves this to artikel_technische_daten.inhalt (NOT to the artikel row).
  technische_daten_rte: z.string().optional().default(''),
  ist_ab_preis: z.boolean().optional().default(false),
  // marke_id / kategorie_id: optional UUIDs from <select> — empty string is treated as null
  marke_id:     nullableUuid,
  kategorie_id: nullableUuid,
  preis_brutto: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().min(0, 'Preis muss positiv sein')
  ),
  rabattpreis: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v)),
    z.number().min(0).nullable().optional()
  ),
  steuersatz: z.preprocess(
    (v) => (v === '' || v === undefined ? 19 : Number(v)),
    z.number().min(0).max(100).optional()
  ),
  'installation_option_verfügbar': z.boolean().optional().default(true),
  aktiv: z.boolean().optional().default(true),
  meta_titel: z.string().optional().default(''),
  meta_beschreibung: z.string().optional().default(''),
  meta_tags: z.array(z.string()).optional(),
  bilder: z.array(artikelBildSchema).optional(),
  // varianten is saved as JSONB directly on the artikel row
  varianten: z.array(artikelVarianteSchema).optional().default([]),
});

export const updateArtikelSchema = createArtikelSchema.partial().extend({
  artikelnummer: z.string().min(1, 'Artikelnummer ist erforderlich'),
  titel: z.string().min(1, 'Titel ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  beschreibung: z.string().optional().default(''),
  technische_daten_rte: z.string().optional().default(''),
  ist_ab_preis: z.boolean().optional().default(false),
  marke_id:     nullableUuid,
  kategorie_id: nullableUuid,
  preis_brutto: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().min(0, 'Preis muss positiv sein')
  ),
  rabattpreis: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v)),
    z.number().min(0).nullable().optional()
  ),
  steuersatz: z.preprocess(
    (v) => (v === '' || v === undefined ? 19 : Number(v)),
    z.number().min(0).max(100).optional()
  ),
  'installation_option_verfügbar': z.boolean().optional().default(true),
  aktiv: z.boolean().optional().default(true),
  meta_titel: z.string().optional().default(''),
  meta_beschreibung: z.string().optional().default(''),
  meta_tags: z.array(z.string()).optional(),
  bilder: z.array(artikelBildSchema).optional(),
  varianten: z.array(artikelVarianteSchema).optional().default([]),
});

export type CreateArtikelInput = z.infer<typeof createArtikelSchema>;
export type UpdateArtikelInput = z.infer<typeof updateArtikelSchema>;

// ============================================
// KATEGORIEN Validators
// ============================================

export const kategorieSchema = z.object({
  name: z.string().min(1, 'Kategoriename ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  parent_id: z.string().uuid().nullable().optional(),
});

export type KategorieInput = z.infer<typeof kategorieSchema>;

// ============================================
// MARKEN Validators
// ============================================

export const markeSchema = z.object({
  name: z.string().min(1, 'Markenname ist erforderlich'),
});

export type MarkeInput = z.infer<typeof markeSchema>;

// ============================================
// TypeScript Interfaces (match DB tables)
// ============================================

export interface Artikel {
  id: string;
  artikelnummer: string;
  titel: string;
  slug: string;
  beschreibung: string | null;
  marke_id: string | null;
  kategorie_id: string | null;
  preis_brutto: number;
  rabattpreis: number | null;
  steuersatz: number;
  'installation_option_verfügbar': boolean;
  aktiv: boolean;
  meta_titel: string | null;
  meta_beschreibung: string | null;
  meta_tags: string[] | null;
  /** JSONB column: [{name, preis_aufschlag}] — endpreis = preis_brutto + preis_aufschlag */
  varianten: ArtikelVariante[];
  ist_ab_preis: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined data
  marken?: Marke;
  kategorien?: Kategorie;
  artikel_bilder?: ArtikelBild[];
  artikel_technische_daten?: TechnischeDaten[];
  lagerbestaende?: Lagerbestand;
}

export interface Kategorie {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children?: Kategorie[];
}

export interface Marke {
  id: string;
  name: string;
}

export interface ArtikelBild {
  id: string;
  artikel_id: string;
  datei_id: string | null;
  alt_text: string | null;
  anzeige_reihenfolge: number;
  // Joined
  medien_dateien?: MedienDatei;
}

export interface MedienDatei {
  id: string;
  speicherpfad: string;
  mime_type: string;
  breite: number | null;
  hoehe: number | null;
  groesse_bytes: number | null;
}

/** Row in artikel_technische_daten — stores rich-text HTML in `inhalt` */
export interface TechnischeDaten {
  id: string;
  artikel_id: string;
  inhalt: string | null;
  anzeige_reihenfolge: number;
}

export interface Lagerbestand {
  id: string;
  artikel_id: string;
  bestand: number;
  mindestbestand: number;
}

/** Inline variant stored in artikel.varianten JSONB array */
export interface ArtikelVariante {
  name: string;
  /** Surcharge added on top of artikel.preis_brutto */
  preis_aufschlag: number;
}

