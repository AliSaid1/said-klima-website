/**
 * Shipping and payment legal/CMS page — /legal/versand-zahlung.
 * Server component that loads versand-zahlung (shipping & payment) content from the rechtstexte (legal/CMS pages) table in Supabase.
 * Data source is the rechtstexte row with slug “versand-zahlung”, including title, HTML content, update timestamp, and published flag.
 * Key interactions are read-only; content is injected into the legal typography container by the shared legal layout.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Renders the published shipping and payment text from Supabase, or an unavailable/unpublished fallback.
 * @returns The shipping and payment rich-text content or a status message when it cannot be shown.
 */
export default async function VersandZahlungPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rechtstexte')
    .select('titel, content_html, aktualisiert_am, veröffentlicht')
    .eq('slug', 'versand-zahlung')
    .single();

  if (error || !data) {
    return (
      <div>
        <h1>Versand und Zahlung</h1>
        <p className="text-slate-600">Die Seite Versand & Zahlung konnte nicht geladen werden.</p>
      </div>
    );
  }

  const page = data as any;
  const published = page.published ?? page['veröffentlicht'];
  if (!published) {
    return (
      <div>
        <h1>{page.titel || 'Versand und Zahlung'}</h1>
        <p className="text-slate-600">Diese Seite ist derzeit nicht veröffentlicht.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="sr-only">{page.titel || 'Versand und Zahlung'}</h1>
      <div className="rte-content" dangerouslySetInnerHTML={{ __html: page.content_html || '' }} />
    </div>
  );
}
