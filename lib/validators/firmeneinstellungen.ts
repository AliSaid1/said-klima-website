import { z } from 'zod';

// ============================================
// FIRMENEINSTELLUNGEN Validators
// ============================================

const oeffnungszeitSchema = z.object({
  tag: z.string(),
  von: z.string(),
  bis: z.string(),
  geoeffnet: z.boolean(),
});

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
});

export type UpdateFirmeneinstellungenInput = z.infer<typeof updateFirmeneinstellungenSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

export interface Firmeneinstellungen {
  id: string;
  firmenname: string;
  email: string;
  telefon: string | null;
  ust_id: string | null;
  adresse_json: {
    strasse?: string;
    plz?: string;
    ort?: string;
    bundesland?: string;
    land?: string;
  } | null;
  support_zeiten: string | null;
  oeffnungszeiten: Array<{
    tag: string;
    von: string;
    bis: string;
    geoeffnet: boolean;
  }>;
  logo_datei_id: string | null;
  primaerfarbe: string;
  sekundaerfarbe: string;
  akzentfarbe: string;
  erstellt_am: string;
  aktualisiert_am: string;
}

