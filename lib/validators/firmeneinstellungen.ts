/**
 * Defines validators and types for firmeneinstellungen (company settings).
 * These settings feed branding, contact details, opening hours, dynamic
 * versandkosten (shipping cost), and PDF/email company information.
 */
import { z } from 'zod';

// ============================================
// FIRMENEINSTELLUNGEN Validators
// ============================================

/**
 * Validates one opening-hours row inside company settings.
 * Captures weekday label, start/end time, and whether the location is open.
 */
const oeffnungszeitSchema = z.object({
  tag: z.string(),
  von: z.string(),
  bis: z.string(),
  geoeffnet: z.boolean(),
});

/**
 * Validates mutable firmeneinstellungen (company settings).
 * Accepts optional contact data, adresse (address) JSON, opening hours, brand
 * colors as six-digit hex codes, logo media UUID, and non-negative shipping
 * cost thresholds.
 */
export const updateFirmeneinstellungenSchema = z.object({
  firmenname: z.string().min(1, 'Firmenname ist erforderlich').optional(),
  email: z.string().email('Ungültige E-Mail').optional(),
  telefon: z.string().optional(),
  ust_id: z.string().optional(),
  adresse_json: z.object({
    strasse: z.string().optional(),
    plz: z.string().optional(),
    ort: z.string().optional(),
    bundesland: z.string().optional(),
    land: z.string().optional(),
  }).optional(),
  support_zeiten: z.string().optional(),
  oeffnungszeiten: z.array(oeffnungszeitSchema).optional(),
  primaerfarbe: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültiger Hex-Farbcode').optional(),
  sekundaerfarbe: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültiger Hex-Farbcode').optional(),
  akzentfarbe: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültiger Hex-Farbcode').optional(),
  logo_datei_id: z.string().uuid().nullable().optional(),
  // Dynamic shipping cost settings
  versandkosten:       z.number().min(0, 'Versandkosten dürfen nicht negativ sein').optional(),
  versandkostenlos_ab: z.number().min(0, 'Schwellenwert darf nicht negativ sein').optional(),
});

/**
 * Parsed update payload for firmeneinstellungen (company settings).
 */
export type UpdateFirmeneinstellungenInput = z.infer<typeof updateFirmeneinstellungenSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Supabase firmeneinstellungen (company settings) row used for public branding,
 * support contact display, shipping configuration, and document metadata.
 */
export interface Firmeneinstellungen {
  id: string;
  firmenname: string;
  email: string;
  telefon: string | null;
  /** German VAT identification number, if configured. */
  ust_id: string | null;
  /** Structured company adresse (address) used for contact and documents. */
  adresse_json: {
    strasse?: string;
    plz?: string;
    ort?: string;
    bundesland?: string;
    land?: string;
  } | null;
  /** Human-readable support availability text. */
  support_zeiten: string | null;
  /** Weekly opening-hours schedule. */
  oeffnungszeiten: Array<{
    tag: string;
    von: string;
    bis: string;
    geoeffnet: boolean;
  }>;
  /** Uploaded logo media file identifier. */
  logo_datei_id: string | null;
  /** Primary brand color as a hex code. */
  primaerfarbe: string;
  /** Secondary brand color as a hex code. */
  sekundaerfarbe: string;
  /** Accent brand color as a hex code. */
  akzentfarbe: string;
  /** Default versandkosten (shipping cost) for orders. */
  versandkosten: number;
  /** Gross order threshold from which shipping is free. */
  versandkostenlos_ab: number;
  erstellt_am: string;
  aktualisiert_am: string;
}
