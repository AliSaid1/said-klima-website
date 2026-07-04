#!/usr/bin/env node
/**
 * check-encoding.mjs — fail fast if double-encoded UTF-8 (mojibake) sneaks back
 * into the source tree.
 *
 * Mojibake happens when UTF-8 text is decoded as Windows-1252/Latin-1 and then
 * re-saved as UTF-8, turning an umlaut or a typographic dash into a two- or
 * three-character garble (a Latin-1 lead byte followed by punctuation). Those
 * byte patterns never occur in clean German/English source, so we can detect
 * them reliably.
 *
 * The detection patterns are built from \u escapes on purpose, so THIS file
 * stays pure ASCII and never flags itself. Run via `npm run check:encoding`;
 * it exits non-zero (and prints file:line) when it finds anything.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'coverage',
  'playwright-report', 'test-results', '.turbo', '.vercel',
]);
const EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.sql',
  '.md', '.css', '.html', '.txt', '.yml', '.yaml',
]);

/**
 * High-confidence mojibake signatures. Each starts with a Latin-1 lead byte
 * (Ã \u00C3 / Â \u00C2 / â \u00E2 / ð \u00F0) followed by a code point that
 * only appears as an encoding artefact — never in legitimate prose.
 */
const PATTERNS = [
  /\u00C3[\u0080-\u00BF]/,                         // Ã + Latin-1 -> ä ö ü ß Ä Ö Ü …
  /\u00C2[\u00A0-\u00BF]/,                         // A-circumflex + Latin-1 -> degree/superscript/nbsp artefacts
  /\u00E2[\u0080-\u00BF\u0152-\u0178\u2013-\u2122]/, // â + punct/ext -> "smart" dashes/quotes, box, arrows
  /\u00F0\u0178/,                                  // ð + Ÿ -> start of a mojibaked emoji
  /\uFFFD/,                                        // U+FFFD replacement char (already-lost data)
];

/** Recursively collects candidate source files under `dir`. */
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue; // broken symlink / inaccessible — skip
    }
    if (st.isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) walk(full, out);
    } else if (EXTS.has(extname(name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const findings = [];
for (const file of walk(ROOT)) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (PATTERNS.some((re) => re.test(line))) {
      findings.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

if (findings.length > 0) {
  console.error(`\u2717 Encoding check failed: found ${findings.length} line(s) with mojibake (double-encoded UTF-8):\n`);
  for (const f of findings) console.error('  ' + f);
  console.error('\nFix with:  python scripts/fix-mojibake.py --write   (repairs the affected files)');
  console.error('Ensure your editor saves as UTF-8 (see .editorconfig).');
  process.exit(1);
}

console.log('\u2713 Encoding check passed: no mojibake found.');
