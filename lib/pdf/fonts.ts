import { Font } from '@react-pdf/renderer';
import path from 'path';

let fontsRegistered = false;

/**
 * Register Inter font family for @react-pdf/renderer.
 * Must be called once before any PDF render.
 * Uses TTF files from public/fonts/ (works on Vercel + local).
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

