import { createClient } from '@/lib/supabase/server';

export default async function WiderrufPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rechtstexte')
    .select('titel, content_html, aktualisiert_am, veröffentlicht')
    .eq('slug', 'widerruf')
    .single();

  if (error || !data) {
    return (
      <div>
        <h1>Widerrufsbelehrung</h1>
        <p className="text-slate-600">Die Widerrufsbelehrung konnte nicht geladen werden.</p>
      </div>
    );
  }

  const page = data as any;
  const published = page.published ?? page['veröffentlicht'];
  if (!published) {
    return (
      <div>
        <h1>{page.titel || 'Widerrufsbelehrung'}</h1>
        <p className="text-slate-600">Diese Seite ist derzeit nicht veröffentlicht.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="sr-only">{page.titel || 'Widerrufsbelehrung'}</h1>
      <div className="rte-content" dangerouslySetInnerHTML={{ __html: page.content_html || '' }} />
    </div>
  );
}
