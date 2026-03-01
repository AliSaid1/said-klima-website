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

export const technischeDatenSchema = z.object({
  schluessel: z.string().min(1, 'Schlüssel ist erforderlich'),
  wert: z.string().min(1, 'Wert ist erforderlich'),
  anzeige_reihenfolge: z.number().int().min(0).optional().default(0),
});

export const createArtikelSchema = z.object({
  artikelnummer: z.string().min(1, 'Artikelnummer ist erforderlich'),
  titel: z.string().min(1, 'Titel ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  beschreibung: z.string().optional(),
  marke_id: z.string().uuid().nullable().optional(),
  kategorie_id: z.string().uuid().nullable().optional(),
  preis_brutto: z.number().min(0, 'Preis muss positiv sein'),
  rabattpreis: z.number().min(0).nullable().optional(),
  steuersatz: z.number().min(0).max(100).optional(),
  installation_option_verfuegbar: z.boolean().optional(),
  aktiv: z.boolean().optional(),
  meta_titel: z.string().optional(),
  meta_beschreibung: z.string().optional(),
  meta_tags: z.array(z.string()).optional(),
  bilder: z.array(artikelBildSchema).optional(),
  technische_daten: z.array(technischeDatenSchema).optional(),
});

export const updateArtikelSchema = createArtikelSchema.partial();

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
  installation_option_verfuegbar: boolean;
  aktiv: boolean;
  meta_titel: string | null;
  meta_beschreibung: string | null;
  meta_tags: string[] | null;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined data
  marke?: Marke;
  kategorie?: Kategorie;
  bilder?: ArtikelBild[];
  technische_daten?: TechnischeDaten[];
  lagerbestand?: Lagerbestand;
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
  medien_datei?: MedienDatei;
}

export interface MedienDatei {
  id: string;
  speicherpfad: string;
  mime_type: string;
  breite: number | null;
  hoehe: number | null;
  groesse_bytes: number | null;
}

export interface TechnischeDaten {
  id: string;
  artikel_id: string;
  schluessel: string;
  wert: string;
  anzeige_reihenfolge: number;
}

export interface Lagerbestand {
  id: string;
  artikel_id: string;
  bestand: number;
  mindestbestand: number;
}

