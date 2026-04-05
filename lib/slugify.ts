/**
 * slugify — converts a human-readable title into a URL-safe slug.
 *
 * Strategy (Option A — server-side autoslug):
 *  1. Direct replacements for German umlauts (ä→ae, ö→oe, ü→ue, ß→ss)
 *     and common symbols (&→und, +→plus, @→at).
 *  2. Unicode NFKD normalization decomposes composite chars (e.g. é → e + ̈)
 *     then we strip all combining diacritic marks (U+0300–U+036F).
 *     This handles French, Spanish, Portuguese, Nordic, … without a large table.
 *  3. Lowercase, replace every remaining non-alphanumeric run with a single dash.
 *  4. Trim leading/trailing dashes.
 *
 * Examples:
 *   "Neue Klimaanlage 2.0"  → "neue-klimaanlage-2-0"
 *   "Daikin Perfera 3,5 kW" → "daikin-perfera-3-5-kw"
 *   "Kälte & Klimatechnik"  → "kaelte-und-klimatechnik"
 *   "Café Résumé"           → "cafe-resume"
 */
export function slugify(input: string): string {
  if (!input) return '';

  // ── 1. Direct map for chars that don't decompose well via NFKD ──────────────
  const directMap: Record<string, string> = {
    ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
    Ä: 'ae', Ö: 'oe', Ü: 'ue',
    '&': 'und', '+': 'plus', '@': 'at',
  };

  let s = input.trim();
  s = s.replace(/[äöüÄÖÜß&+@]/g, (ch) => directMap[ch] ?? ch);

  // ── 2. Lowercase + NFKD normalization + strip combining diacritics ──────────
  s = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''); // strip combining marks

  // ── 3. Replace non-alphanumeric sequences with a single dash ─────────────────
  s = s.replace(/[^a-z0-9]+/g, '-');

  // ── 4. Trim leading/trailing dashes ──────────────────────────────────────────
  s = s.replace(/^-+|-+$/g, '');

  return s;
}
