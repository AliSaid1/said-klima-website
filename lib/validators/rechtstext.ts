/**
 * Defines validators and data shapes for rechtstext (legal text/CMS page)
 * content. The module supports admin editing, publication state, version labels,
 * and persisted content-version history in Supabase.
 */
import { z } from 'zod';

// ============================================
// RECHTSTEXTE (CMS Content) Validators
// ============================================

/**
 * Validates mutable fields for a rechtstext (legal text/CMS page).
 * Allows optional title, HTML body, version label, and publication flag updates
 * without changing the immutable page slug.
 */
export const updateRechtstextSchema = z.object({
  titel: z.string().min(1, 'Titel ist erforderlich').optional(),
  content_html: z.string().optional(),
  version: z.string().optional(),
  veröffentlicht: z.boolean().optional(),
});

/**
 * Parsed update payload for a rechtstext (legal text/CMS page).
 */
export type UpdateRechtstextInput = z.infer<typeof updateRechtstextSchema>;

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Supabase rechtstext (legal text/CMS page) row for public and admin rendering.
 */
export interface Rechtstext {
  id: string;
  /** Stable route key for the legal text/CMS page. */
  slug: string;
  titel: string;
  /** Stored HTML body rendered on the public page. */
  content_html: string;
  /** Optional editorial or legal version label. */
  version: string | null;
  /** Whether the page is visible publicly. */
  veröffentlicht: boolean;
  aktualisiert_am: string;
}

/**
 * Historical HTML content snapshot for a rechtstext (legal text/CMS page).
 */
export interface InhaltVersion {
  id: string;
  /** Parent rechtstext (legal text/CMS page) identifier. */
  rechtstext_id: string;
  /** Historical HTML body snapshot. */
  content_html: string;
  /** Monotonic version number for rollback/audit display. */
  version_nummer: number;
  erstellt_am: string;
  /** Benutzer (user) identifier that created the snapshot, when known. */
  erstellt_von: string | null;
}
