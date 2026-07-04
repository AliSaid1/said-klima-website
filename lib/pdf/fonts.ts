/**
 * Registers font resources for server-side React-PDF rendering.
 * The module loads Inter TTF files from public/fonts, disables hyphenation for
 * German PDF text, and guards registration so repeated PDF generation is safe.
 */
import { Font } from '@react-pdf/renderer';
import path from 'path';

let fontsRegistered = false;

/**
 * Register Inter font family for @react-pdf/renderer.
 * Must be called once before any PDF render.
 * Uses TTF files from public/fonts/ (works on Vercel + local).
 *
 * @returns Nothing; registration is cached in module state after the first call.
 * @throws If @react-pdf/renderer cannot load the expected font files.
 */
export function registerFonts() {
  if (fontsRegistered) return;

  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

  Font.register({
    family: 'Inter',
    fonts: [
      { src: path.join(fontsDir, 'Inter-Regular.ttf'), fontWeight: 400 },
      { src: path.join(fontsDir, 'Inter-Medium.ttf'), fontWeight: 500 },
      { src: path.join(fontsDir, 'Inter-Bold.ttf'), fontWeight: 700 },
    ],
  });

  // Disable hyphenation (German words should not be hyphenated in PDFs)
  Font.registerHyphenationCallback((word) => [word]);

  fontsRegistered = true;
}
