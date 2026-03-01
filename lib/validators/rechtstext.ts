import { z } from 'zod';

// ============================================
// RECHTSTEXTE (CMS Content) Validators
// ============================================

export const updateRechtstextSchema = z.object({
  titel: z.string().min(1, 'Titel ist erforderlich').optional(),
  content_html: z.string().optional(),
  version: z.string().optional(),
  veröffentlicht: z.boolean().optional(),
});

export type UpdateRechtstextInput = z.infer<typeof updateRechtstextSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

export interface Rechtstext {
  id: string;
  slug: string;
  titel: string;
  content_html: string;
  version: string | null;
  veröffentlicht: boolean;
  aktualisiert_am: string;
}

export interface InhaltVersion {
  id: string;
  rechtstext_id: string;
  content_html: string;
  version_nummer: number;
  erstellt_am: string;
  erstellt_von: string | null;
}

