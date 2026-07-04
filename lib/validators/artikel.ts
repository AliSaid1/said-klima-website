/**
 * Defines Zod validators and TypeScript shapes for artikel (product), marke
 * (brand), and kategorie (category) administration. These contracts are shared
 * by product forms, Supabase persistence code, and checkout-facing product data.
 */
import { z } from 'zod';

// ============================================
// ARTIKEL (Produkt) Validators
// ============================================

/**
 * Validates one artikel (product) image reference.
 * Accepts either a media UUID or an external URL, optional alt text, and a
 * non-negative display order used when rendering product galleries.
 */
export const artikelBildSchema = z.object({
  datei_id: z.string().uuid().optional(),
  url: z.string().url().optional(),
  alt_text: z.string().optional(),
  anzeige_reihenfolge: z.number().int().min(0).optional().default(0),
});

/**
 * Validates rich-text technical data for an artikel (product).
 * Stores one optional HTML block plus a non-negative display order for the
 * artikel_technische_daten table.
 */
// artikel_technische_daten now stores a single rich-text HTML block per row
export const technischeDatenSchema = z.object({
  inhalt: z.string().optional().default(''),
  anzeige_reihenfolge: z.number().int().min(0).optional().default(0),
});

/**
 * Validates a JSONB artikel (product) variant.
 * Requires a visible variant name and coerces an empty surcharge to zero while
 * rejecting negative price additions.
 */
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

/**
 * Validates create payloads for artikel (product) records.
 * Requires article number, title, URL-safe slug, and non-negative gross price;
 * optional fields cover rich-text technical data, marke (brand), kategorie
 * (category), tax rate, SEO metadata, images, and JSONB variants.
 */
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

/**
 * Validates update payloads for artikel (product) records.
 * Reuses create-field constraints while allowing partial updates, then keeps
 * core editable product fields required for admin edit submissions.
 */
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

/**
 * Parsed create payload for an artikel (product).
 */
export type CreateArtikelInput = z.infer<typeof createArtikelSchema>;

/**
 * Parsed update payload for an artikel (product).
 */
export type UpdateArtikelInput = z.infer<typeof updateArtikelSchema>;

// ============================================
// KATEGORIEN Validators
// ============================================

/**
 * Validates a kategorie (category) create or update payload.
 * Requires a name and lowercase hyphenated slug; optional parent_id links the
 * category into a hierarchy.
 */
export const kategorieSchema = z.object({
  name: z.string().min(1, 'Kategoriename ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  parent_id: z.string().uuid().nullable().optional(),
});

/**
 * Parsed kategorie (category) input for admin forms.
 */
export type KategorieInput = z.infer<typeof kategorieSchema>;

// ============================================
// MARKEN Validators
// ============================================

/**
 * Validates a marke (brand) create or update payload.
 * Requires the display name used for product filtering and attribution.
 */
export const markeSchema = z.object({
  name: z.string().min(1, 'Markenname ist erforderlich'),
});

/**
 * Parsed marke (brand) input for admin forms.
 */
export type MarkeInput = z.infer<typeof markeSchema>;

// ============================================
// TypeScript Interfaces (match DB tables)
// ============================================

/**
 * Supabase artikel (product) row with optional joined catalog, media, technical
 * data, and inventory records.
 */
export interface Artikel {
  id: string;
  /** Internal artikelnummer (product number/SKU) used in catalogs and orders. */
  artikelnummer: string;
  titel: string;
  /** URL-safe product slug used by public product pages. */
  slug: string;
  beschreibung: string | null;
  /** Linked marke (brand), if assigned. */
  marke_id: string | null;
  /** Linked kategorie (category), if assigned. */
  kategorie_id: string | null;
  /** Base gross price before variant surcharges. */
  preis_brutto: number;
  /** Optional discounted gross price. */
  rabattpreis: number | null;
  /** VAT percentage applied to the product. */
  steuersatz: number;
  /** Whether installation can be selected during checkout. */
  'installation_option_verfügbar': boolean;
  aktiv: boolean;
  /** SEO title override for product detail pages. */
  meta_titel: string | null;
  /** SEO description override for product detail pages. */
  meta_beschreibung: string | null;
  /** SEO tag list stored with the product. */
  meta_tags: string[] | null;
  /** JSONB column: [{name, preis_aufschlag}] — endpreis = preis_brutto + preis_aufschlag */
  varianten: ArtikelVariante[];
  /** Whether the displayed price should be shown as an "ab" (from) price. */
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

/**
 * Kategorie (category) row used to group products and build nested navigation.
 */
export interface Kategorie {
  id: string;
  name: string;
  /** URL-safe category slug. */
  slug: string;
  /** Parent kategorie (category) for nested catalog structures. */
  parent_id: string | null;
  /** Optional child categories loaded for navigation trees. */
  children?: Kategorie[];
}

/**
 * Marke (brand) row associated with one or more products.
 */
export interface Marke {
  id: string;
  name: string;
}

/**
 * Product image row linking an artikel (product) to an uploaded media file.
 */
export interface ArtikelBild {
  id: string;
  /** Parent artikel (product) identifier. */
  artikel_id: string;
  /** Uploaded media file identifier, if the image is stored in media. */
  datei_id: string | null;
  /** Accessible alternative text for the product image. */
  alt_text: string | null;
  /** Sort order used when rendering product image galleries. */
  anzeige_reihenfolge: number;
  // Joined
  medien_dateien?: MedienDatei;
}

/**
 * Uploaded media metadata used by product images.
 */
export interface MedienDatei {
  id: string;
  /** Storage path inside the media bucket. */
  speicherpfad: string;
  /** MIME type of the uploaded media file. */
  mime_type: string;
  /** Image width in pixels, if known. */
  breite: number | null;
  /** Image height in pixels, if known. */
  hoehe: number | null;
  /** File size in bytes, if known. */
  groesse_bytes: number | null;
}

/**
 * Row in artikel_technische_daten for rich-text product specifications.
 */
export interface TechnischeDaten {
  id: string;
  /** Parent artikel (product) identifier. */
  artikel_id: string;
  /** Rich-text HTML block containing technical specifications. */
  inhalt: string | null;
  /** Sort order for multiple technical data rows. */
  anzeige_reihenfolge: number;
}

/**
 * Inventory row for an artikel (product), including current and minimum stock.
 */
export interface Lagerbestand {
  id: string;
  /** Parent artikel (product) identifier. */
  artikel_id: string;
  /** Current stock quantity. */
  bestand: number;
  /** Minimum stock threshold for administrative alerts. */
  mindestbestand: number;
}

/**
 * Inline variant stored in the artikel.varianten JSONB array.
 */
export interface ArtikelVariante {
  name: string;
  /** Surcharge added on top of artikel.preis_brutto */
  preis_aufschlag: number;
}
