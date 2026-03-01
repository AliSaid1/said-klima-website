import { z } from 'zod';

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

export type AdresseInput = z.infer<typeof adresseSchema>;
