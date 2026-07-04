/**
 * Defines validators and data shapes for bestellung (order) management and
 * checkout input. These contracts connect cart data, Supabase order rows,
 * payment status changes, shipping cost totals, and admin order notes.
 */
import { z } from 'zod';

// ============================================
// BESTELLUNGEN Validators
// ============================================

/**
 * Validates an admin note attached to a bestellung (order).
 * Requires non-empty text and accepts optional timestamp and author metadata
 * when notes are appended to the order history.
 */
export const bestellNotizSchema = z.object({
  text: z.string().min(1, 'Notiz darf nicht leer sein'),
  erstellt_am: z.string().optional(),
  autor: z.string().optional(),
});

/**
 * Validates mutable fields for an existing bestellung (order).
 * Allows changing the lifecycle status and adding one structured note without
 * accepting price, address, or line-item mutations.
 */
export const updateBestellungSchema = z.object({
  status: z.enum(['offen', 'bezahlt', 'versandt', 'abgeschlossen', 'storniert', 'erstattet']).optional(),
  notiz: bestellNotizSchema.optional(),
});

/**
 * Validates a single checkout position for an artikel (product).
 * Requires a product UUID and positive integer quantity; optional installation
 * data links the line to a dienstleistung (service).
 */
export const checkoutPositionSchema = z.object({
  artikel_id: z.string().uuid(),
  menge: z.number().int().min(1, 'Mindestens 1 Stück'),
  mit_installation: z.boolean().default(false),
  dienstleistung_id: z.string().uuid().nullable().optional(),
});

/**
 * Validates checkout submission data.
 * Requires at least one cart position and optionally accepts the customer email
 * used for guest checkout and payment confirmation.
 */
export const checkoutSchema = z.object({
  positionen: z.array(checkoutPositionSchema).min(1, 'Warenkorb ist leer'),
  kunden_email: z.string().email('Ungültige E-Mail').optional(),
});

/**
 * Parsed update payload for a bestellung (order).
 */
export type UpdateBestellungInput = z.infer<typeof updateBestellungSchema>;

/**
 * Parsed checkout payload containing cart positions and optional customer email.
 */
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Supabase bestellung (order) row with totals, serialized addresses, notes, and
 * optional joined customer and line-item data.
 */
export interface Bestellung {
  id: string;
  /** Public customer-facing order number. */
  bestellnummer: string;
  /** Optional benutzer (user) owner; null represents guest checkout. */
  benutzer_id: string | null;
  /** Payment, fulfillment, cancellation, and refund lifecycle state. */
  status: 'offen' | 'bezahlt' | 'versandt' | 'abgeschlossen' | 'storniert' | 'erstattet';
  /** Gross subtotal before versandkosten (shipping cost). */
  zwischensumme_brutto: number;
  /** VAT amount included in the gross totals. */
  steuer_summe: number;
  /** Versandkosten (shipping cost) charged for delivery. */
  versand_brutto: number;
  /** Final gross total charged to the customer. */
  gesamt_brutto: number;
  /** Serialized billing adresse (address) snapshot captured at order time. */
  rechnungsadresse_json: Record<string, unknown>;
  /** Optional serialized shipping adresse (address) snapshot. */
  lieferadresse_json: Record<string, unknown> | null;
  /** Admin and system notes attached to the order timeline. */
  notizen: Array<{ text: string; erstellt_am: string; autor: string }>;
  /** Timestamp when checkout completed or the order was placed. */
  bestellt_am: string | null;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined
  benutzer?: BestellBenutzer;
  positionen?: Bestellposition[];
}

/**
 * Joined benutzer (user) summary stored with or loaded for a bestellung (order).
 */
export interface BestellBenutzer {
  id: string;
  vorname: string;
  nachname: string;
  email: string;
  telefonnummer: string | null;
}

/**
 * Line item belonging to a bestellung (order), covering products, bookings, and
 * service-like positions with gross price and tax metadata.
 */
export interface Bestellposition {
  id: string;
  /** Parent bestellung (order) identifier. */
  bestellung_id: string;
  /** Linked artikel (product), null for non-product positions. */
  artikel_id: string | null;
  /** Linked buchung (booking), null for pure product positions. */
  buchung_id: string | null;
  /** Position category such as product, booking, or service. */
  typ: string;
  titel: string;
  /** Optional artikelnummer (product number/SKU) snapshot. */
  artikelnummer: string | null;
  menge: number;
  /** Unit gross price including VAT. */
  preis_brutto: number;
  /** VAT percentage applied to the position. */
  steuersatz: number;
}
