/**
 * Defines validators and data shapes for buchung (booking) scheduling.
 * The module is shared by booking forms, technician planning, blocked-day
 * administration, and Supabase booking persistence.
 */
import { z } from 'zod';

// ============================================
// BUCHUNGEN Validators
// ============================================

/**
 * Validates a customer-created buchung (booking).
 * Requires customer contact data, selected dienstleistung (service), date, and
 * start/end time; optional address and notes support on-site appointments.
 */
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

/**
 * Validates mutable scheduling fields for an existing buchung (booking).
 * Allows status transitions, planned time-window changes, technician assignment,
 * and administrative notes.
 */
export const updateBuchungSchema = z.object({
  status: z.enum(['ausstehend', 'bestaetigt', 'abgeschlossen', 'abgesagt', 'nicht_erschienen']).optional(),
  geplant_von: z.string().optional(),
  geplant_bis: z.string().optional(),
  techniker_id: z.string().uuid().nullable().optional(),
  hinweise: z.string().optional(),
});

/**
 * Validates a blocked calendar day.
 * Requires the date to block and optionally scopes the block to one techniker
 * (technician) with a human-readable reason.
 */
export const gesperrterTagSchema = z.object({
  datum: z.string().min(1, 'Datum ist erforderlich'),
  grund: z.string().optional(),
  techniker_id: z.string().uuid().nullable().optional(),
});

/**
 * Parsed create payload for a buchung (booking).
 */
export type CreateBuchungInput = z.infer<typeof createBuchungSchema>;

/**
 * Parsed update payload for a buchung (booking).
 */
export type UpdateBuchungInput = z.infer<typeof updateBuchungSchema>;

/**
 * Parsed input for creating or editing a blocked scheduling day.
 */
export type GesperrterTagInput = z.infer<typeof gesperrterTagSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Supabase buchung (booking) row with planning status and optional joined
 * service, technician, and user contact summaries.
 */
export interface Buchung {
  id: string;
  /** Optional benutzer (user) owner; null represents guest booking. */
  benutzer_id: string | null;
  /** Dienstleistung (service) selected for the appointment. */
  dienstleistung_id: string;
  /** Assigned techniker (technician), if scheduling has assigned one. */
  techniker_id: string | null;
  /** On-site adresse (address), if the booking requires a location. */
  adresse_id: string | null;
  /** Planned appointment start timestamp. */
  geplant_von: string;
  /** Planned appointment end timestamp. */
  geplant_bis: string;
  /** Booking lifecycle state used by scheduling and admin views. */
  status: 'ausstehend' | 'bestaetigt' | 'abgeschlossen' | 'abgesagt' | 'nicht_erschienen';
  /** Customer or admin notes for the appointment. */
  hinweise: string | null;
  /** Whether an appointment reminder has already been sent. */
  erinnerung_gesendet: boolean;
  erstellt_am: string;
  aktualisiert_am: string;
  // Joined
  dienstleistung?: Dienstleistung;
  techniker?: Techniker;
  benutzer?: { vorname: string; nachname: string; email: string; telefonnummer: string | null };
}

/**
 * Dienstleistung (service) available for booking or installation add-ons.
 */
export interface Dienstleistung {
  id: string;
  /** Stable service code used for admin identification and integrations. */
  code: string;
  name: string;
  beschreibung: string | null;
  /** Base gross service price before custom additions. */
  basispreis_brutto: number;
  /** VAT percentage applied to the service. */
  steuersatz: number;
  /** Default planned service duration in minutes. */
  dauer_minuten: number;
  aktiv: boolean;
}

/**
 * Techniker (technician) profile used for assigning and filtering bookings.
 */
export interface Techniker {
  id: string;
  vorname: string;
  nachname: string;
  telefon: string | null;
  email: string | null;
  aktiv: boolean;
}

/**
 * Availability window for a techniker (technician), either recurring by weekday
 * or specific to one calendar date.
 */
export interface TechnikerVerfuegbarkeit {
  id: string;
  /** Techniker (technician) whose calendar this availability belongs to. */
  techniker_id: string;
  /** Recurring weekday number when the availability is not date-specific. */
  wochentag: number | null;
  /** Specific date override when availability is not recurring. */
  datum: string | null;
  start_zeit: string;
  ende_zeit: string;
  /** Whether the time window can be booked. */
  verfuegbar: boolean;
}

/**
 * Blocked date that prevents booking globally or for one techniker (technician).
 */
export interface GesperrterTag {
  id: string;
  /** Calendar date blocked from booking. */
  datum: string;
  /** Optional reason shown in admin scheduling. */
  grund: string | null;
  /** Optional techniker (technician) scope; null means global block. */
  techniker_id: string | null;
}
