/**
 * Validates adresse (address) payloads used for user billing and shipping records.
 * The schema normalizes default-address flags and country defaults before data is
 * persisted through Supabase-backed account, checkout, and order flows.
 */
import { z } from 'zod';

/**
 * Validates an adresse (address) submitted by a benutzer (user).
 * Requires street, postal code, city, and a country code of at least two
 * characters; optional UUID and ownership fields support editing existing rows.
 */
export const adresseSchema = z.object({
  id: z.string().uuid().optional(),
  benutzer_id: z.string().optional(),
  strasse: z.string().min(1),
  plz: z.string().min(1),
  ort: z.string().min(1),
  bundesland: z.string().nullable().optional(),
  land: z.string().min(2).optional().default('DE'),
  standard_lieferadresse: z.boolean().optional().default(false),
  standard_rechnungsadresse: z.boolean().optional().default(false),
});

/**
 * Parsed adresse (address) input accepted by forms and server actions.
 */
export type AdresseInput = z.infer<typeof adresseSchema>;
