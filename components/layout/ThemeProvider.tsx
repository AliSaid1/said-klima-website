/**
 * Server component module for applying brand theme colors.
 * Reads firmeneinstellungen (company settings) from Supabase and exposes the
 * configured colors as CSS custom properties for descendant components.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Server Component: Fetches brand colors from firmeneinstellungen
 * and injects CSS custom properties on <html>.
 * Wrap around {children} in root layout.
 *
 * @param props - Component props.
 * @param props.children - React subtree that should receive the configured CSS variables.
 */
export default async function ThemeProvider({ children }: { children: React.ReactNode }) {
  let colors = {
    primary: '#2563EB',
    secondary: '#0F172A',
    accent: '#3B82F6',
  };

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('firmeneinstellungen')
      .select('primaerfarbe, sekundaerfarbe, akzentfarbe')
      .limit(1)
      .single();

    if (data) {
      colors = {
        primary: data.primaerfarbe || colors.primary,
        secondary: data.sekundaerfarbe || colors.secondary,
        accent: data.akzentfarbe || colors.accent,
      };
    }
  } catch {
    // Fallback to defaults if DB not available
  }

  return (
    <div
      style={{
        '--color-primary': colors.primary,
        '--color-secondary': colors.secondary,
        '--color-accent': colors.accent,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
