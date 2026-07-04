/**
 * AGB legal/CMS page — /legal/agb.
 * Server component that loads agb (terms) from the rechtstexte (legal/CMS pages) table in Supabase.
 * agb means Allgemeine Geschäftsbedingungen, the terms and conditions text shown to customers.
 * Key interactions are read-only; content is injected into the legal typography container by the shared legal layout.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Renders the published AGB legal text from Supabase, or an unavailable/unpublished fallback.
 * @returns The AGB rich-text content or a status message when it cannot be shown.
 */
export default async function AGBPage() {
  // Server-side fetch from Supabase to get the published AGB content
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rechtstexte')
    .select('titel, content_html, aktualisiert_am, veröffentlicht')
    .eq('slug', 'agb')
    .single();

  if (error || !data) {
    return (
      <div>
        <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-slate-600">Die AGB konnten nicht geladen werden.</p>
      </div>
    );
  }
  // Cast to any for safe property access (column name includes non-ASCII characters)
  const page = data as any;
  // Normalize the published flag: prefer ASCII 'published' if present
  const published = page.published ?? page['veröffentlicht'];

  // If the entry exists but is not published, show a message
  if (!published) {
    return (
      <div>
        <h1>{page.titel || 'Allgemeine Geschäftsbedingungen (AGB)'}</h1>
        <p className="text-slate-600">Diese Seite ist derzeit nicht veröffentlicht.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="sr-only">{page.titel || 'Allgemeine Geschäftsbedingungen (AGB)'}</h1>
      <div className="rte-content" dangerouslySetInnerHTML={{ __html: page.content_html || '' }} />
    </div>
  );
}
