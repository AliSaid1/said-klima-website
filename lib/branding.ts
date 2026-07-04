/**
 * Centralised brand constants (company name, logo assets, contact details).
 *
 * Single source of truth for text and asset paths reused across the site UI,
 * PDFs and transactional emails. Email-facing values must use absolute public
 * URLs because email clients cannot resolve relative/localhost paths.
 */
// Centralized branding variables
export const COMPANY_NAME = 'KÄLTE-UND KLIMATECHNIK SAID';
export const COMPANY_NAME_DISPLAY = 'KÄLTE-UND KLIMATECHNIK SAID';
export const LOGO_SRC = '/images/KKS_LOGO.png';
export const LOGO_SRC_SILVER = '/images/KKS_LOGO_SILVER.png';
export const LOGO_ALT = 'Kälte- und Klimatechnik Said - Logo';

// ─── Email-specific branding ──────────────────────────────
export const COMPANY_DOMAIN = 'kks-said.de';
export const COMPANY_EMAIL_FROM = 'noreply@mail.kks-said.de';
export const COMPANY_EMAIL_REPLY_TO = 'info@kks-said.de';
export const COMPANY_PHONE = '+49 176 80140769';
export const COMPANY_ADDRESS = 'Eichengrund 32, 49191 Belm';
export const COMPANY_WEBSITE = 'https://kks-said.de';
// Logo must be a public URL for email clients (cannot use localhost)
export const COMPANY_LOGO_EMAIL = `https://kks-said.de/images/KKS_LOGO.png`;

