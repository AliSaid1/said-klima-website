import { z } from 'zod';

// ============================================
// BESTELLUNGEN Validators
// ============================================

export const bestellNotizSchema = z.object({
  text: z.string().min(1, 'Notiz darf nicht leer sein'),
  erstellt_am: z.string().optional(),
  autor: z.string().optional(),
});

export const updateBestellungSchema = z.object({
  status: z.enum(['offen', 'bezahlt', 'versandt', 'abgeschlossen', 'storniert', 'erstattet']).optional(),
  notiz: bestellNotizSchema.optional(),
});

export const checkoutPositionSchema = z.object({
  artikel_id: z.string().uuid(),
  menge: z.number().int().min(1, 'Mindestens 1 Stück'),
  mit_installation: z.boolean().default(false),
  dienstleistung_id: z.string().uuid().nullable().optional(),
});

export const checkoutSchema = z.object({
  positionen: z.array(checkoutPositionSchema).min(1, 'Warenkorb ist leer'),
  kunden_email: z.string().email('Ungültige E-Mail').optional(),
});

export type UpdateBestellungInput = z.infer<typeof updateBestellungSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

export interface Bestellung {
  id: string;
  bestellnummer: string;
  benutzer_id: string | null;
  status: 'offen' | 'bezahlt' | 'versandt' | 'abgeschlossen' | 'storniert' | 'erstattet';
  zwischensumme_brutto: number;
  steuer_summe: number;
  versand_brutto: number;
  gesamt_brutto: number;
  rechnungsadresse_json: Record<string, unknown>;
  lieferadresse_json: Record<string, unknown> | null;
  notizen: Array<{ text: string; erstellt_am: string; autor: string }>;
  bestellt_am: string | null;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined
  benutzer?: BestellBenutzer;
  positionen?: Bestellposition[];
}

export interface BestellBenutzer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefonnummer: string | null;
}

export interface Bestellposition {
  id: string;
  bestellung_id: string;
  artikel_id: string | null;
  buchung_id: string | null;
  typ: string;
  titel: string;
  artikelnummer: string | null;
  menge: number;
  preis_brutto: number;
  steuersatz: number;
}

