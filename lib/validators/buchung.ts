import { z } from 'zod';

// ============================================
// BUCHUNGEN Validators
// ============================================

export const createBuchungSchema = z.object({
  kundenname: z.string().min(1, 'Name ist erforderlich'),
  kunden_email: z.string().email('Ungültige E-Mail-Adresse'),
  kunden_telefon: z.string().optional(),
  dienstleistung_id: z.string().uuid('Dienstleistung ist erforderlich'),
  datum: z.string().min(1, 'Datum ist erforderlich'),
  start_zeit: z.string().min(1, 'Startzeit ist erforderlich'),
  ende_zeit: z.string().min(1, 'Endzeit ist erforderlich'),
  adresse_id: z.string().uuid().nullable().optional(),
  hinweise: z.string().optional(),
});

export const updateBuchungSchema = z.object({
  status: z.enum(['ausstehend', 'bestaetigt', 'abgeschlossen', 'abgesagt', 'nicht_erschienen']).optional(),
  geplant_von: z.string().optional(),
  geplant_bis: z.string().optional(),
  techniker_id: z.string().uuid().nullable().optional(),
  hinweise: z.string().optional(),
});

export const gesperrterTagSchema = z.object({
  datum: z.string().min(1, 'Datum ist erforderlich'),
  grund: z.string().optional(),
  techniker_id: z.string().uuid().nullable().optional(),
});

export type CreateBuchungInput = z.infer<typeof createBuchungSchema>;
export type UpdateBuchungInput = z.infer<typeof updateBuchungSchema>;
export type GesperrterTagInput = z.infer<typeof gesperrterTagSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

export interface Buchung {
  id: string;
  benutzer_id: string | null;
  dienstleistung_id: string;
  techniker_id: string | null;
  adresse_id: string | null;
  geplant_von: string;
  geplant_bis: string;
  status: 'ausstehend' | 'bestaetigt' | 'abgeschlossen' | 'abgesagt' | 'nicht_erschienen';
  hinweise: string | null;
  erinnerung_gesendet: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined
  dienstleistung?: Dienstleistung;
  techniker?: Techniker;
  benutzer?: { vorname: string; nachname: string; email: string; telefonnummer: string | null };
}

export interface Dienstleistung {
  id: string;
  code: string;
  name: string;
  beschreibung: string | null;
  basispreis_brutto: number;
  steuersatz: number;
  dauer_minuten: number;
  aktiv: boolean;
}

export interface Techniker {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  email: string | null;
  aktiv: boolean;
}

export interface TechnikerVerfuegbarkeit {
  id: string;
  techniker_id: string;
  wochentag: number | null;
  datum: string | null;
  start_zeit: string;
  ende_zeit: string;
  verfuegbar: boolean;
}

export interface GesperrterTag {
  id: string;
  datum: string;
  grund: string | null;
  techniker_id: string | null;
}

