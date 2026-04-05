// ─── Central PDF data types ────────────────────────────────
// Shared across all PDF document generators (order, invoice, booking, quote)

export interface PdfAddressData {
  name?: string | null;
  strasse?: string | null;
  zusatz?: string | null;
  plz?: string | null;
  ort?: string | null;
  bundesland?: string | null;
  land?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PdfLineItem {
  pos: number;
  titel: string;
  artikelnummer?: string | null;
  variante_name?: string | null;
  menge: number;
  einzelpreis_netto: number;
  preis_brutto: number; // unit price incl. VAT
  steuersatz: number; // e.g. 19
}

export interface OrderPdfData {
  bestellnummer: string;
  bestellt_am: string; // ISO date or readable string
  status: string;
  zahlungsmethode?: string | null;

  kundenname: string;
  kundenEmail?: string | null;

  rechnungsadresse: PdfAddressData | null;
  lieferadresse: PdfAddressData | null;

  positionen: PdfLineItem[];

  zwischensumme_brutto: number;
  steuer_summe: number;
  versand_brutto: number;
  gesamt_brutto: number;
}

export interface PdfCompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  domain: string;
}

