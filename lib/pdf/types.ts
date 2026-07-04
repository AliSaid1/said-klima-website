/**
 * Central data contracts for React-PDF document generators.
 * These types decouple order, invoice, booking, and quote rendering from
 * Supabase rows while preserving German commerce terms such as bestellung
 * (order), artikel (product), and adresse (address).
 */
// ─── Central PDF data types ────────────────────────────────
// Shared across all PDF document generators (order, invoice, booking, quote)

/**
 * Postal and contact address block rendered in PDFs.
 */
export interface PdfAddressData {
  /** Recipient or company name shown as the first address line. */
  name?: string | null;
  /** Street and house number for the adresse (address). */
  strasse?: string | null;
  /** Optional address supplement such as apartment, floor, or department. */
  zusatz?: string | null;
  /** Postal code displayed next to the city. */
  plz?: string | null;
  /** City or locality. */
  ort?: string | null;
  /** State or federal region, when available. */
  bundesland?: string | null;
  /** ISO-like country code or display value used for localized labels. */
  land?: string | null;
  /** Email contact associated with this address. */
  email?: string | null;
  /** Phone contact associated with this address. */
  phone?: string | null;
}

/**
 * One artikel (product) or service line rendered in a PDF table.
 */
export interface PdfLineItem {
  /** One-based display position inside the document table. */
  pos: number;
  /** Product or service title printed for the customer. */
  titel: string;
  /** Optional artikelnummer (product number/SKU) for product identification. */
  artikelnummer?: string | null;
  /** Optional selected product variant label. */
  variante_name?: string | null;
  /** Quantity purchased or booked. */
  menge: number;
  /** Unit net price before VAT, used by documents that expose net totals. */
  einzelpreis_netto: number;
  /** Unit gross price including VAT, displayed in customer-facing totals. */
  preis_brutto: number; // unit price incl. VAT
  /** VAT percentage applied to this line item, for example 19. */
  steuersatz: number; // e.g. 19
}

/**
 * Complete data needed to render a bestellung (order) confirmation PDF.
 */
export interface OrderPdfData {
  /** Public order number shown to the customer. */
  bestellnummer: string;
  /** ISO date or already formatted order date string. */
  bestellt_am: string; // ISO date or readable string
  /** Current order status label or code. */
  status: string;
  /** Payment method identifier from Stripe or another payment provider. */
  zahlungsmethode?: string | null;

  /** Customer display name used in the document context. */
  kundenname: string;
  /** Customer email used for contact and delivery context. */
  kundenEmail?: string | null;

  /** Billing adresse (address), if available. */
  rechnungsadresse: PdfAddressData | null;
  /** Shipping adresse (address), if different or available. */
  lieferadresse: PdfAddressData | null;

  /** Ordered artikel (product) and service positions. */
  positionen: PdfLineItem[];

  /** Gross subtotal before shipping cost. */
  zwischensumme_brutto: number;
  /** VAT amount included in the gross total. */
  steuer_summe: number;
  /** Versandkosten (shipping cost) charged for the order. */
  versand_brutto: number;
  /** Final gross amount paid by the customer. */
  gesamt_brutto: number;
}

/**
 * Company identity and contact details printed on generated PDFs.
 */
export interface PdfCompanyInfo {
  /** Legal or public company name. */
  name: string;
  /** Single-line postal address for headers and footers. */
  address: string;
  /** Customer-facing phone number. */
  phone: string;
  /** Customer-facing email address. */
  email: string;
  /** Full website URL displayed in the footer. */
  website: string;
  /** Short domain label displayed near the email address. */
  domain: string;
}
