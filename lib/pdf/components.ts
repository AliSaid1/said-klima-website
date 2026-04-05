import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { styles } from './styles';
import type { PdfAddressData, PdfCompanyInfo } from './types';
import path from 'path';

// ─── Format helpers ────────────────────────────────────────
export function formatCurrency(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function countryLabel(code: string | null | undefined): string {
  const map: Record<string, string> = {
    DE: 'Deutschland',
    AT: 'Österreich',
    CH: 'Schweiz',
  };
  return map[code?.toUpperCase() ?? ''] || code || '';
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'Karte';
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    card: 'Kreditkarte',
    link: 'Stripe Link',
    paypal: 'PayPal',
    klarna: 'Klarna',
    sofort: 'Sofort/Klarna',
    giropay: 'giropay',
    sepa_debit: 'SEPA-Lastschrift',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    bancontact: 'Bancontact',
    eps: 'EPS',
    ideal: 'iDEAL',
  };
  return map[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
}

// ─── Logo Path ─────────────────────────────────────────────
const logoPath = path.join(process.cwd(), 'public', 'images', 'KKS_LOGO.png');

// ═══════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════
export function PdfHeader({ company }: { company: PdfCompanyInfo }) {
  return React.createElement(
    View,
    { style: styles.header },
    React.createElement(
      View,
      { style: styles.headerLeft },
      React.createElement(Image, { src: logoPath, style: styles.logo }),
      React.createElement(
        View,
        { style: styles.companyInfo },
        React.createElement(Text, { style: styles.companyName }, company.name),
        React.createElement(Text, { style: styles.companyDetail }, company.address),
        React.createElement(
          Text,
          { style: styles.companyDetail },
          `Tel: ${company.phone}`
        ),
        React.createElement(
          Text,
          { style: styles.companyDetail },
          `${company.email} · ${company.domain}`
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════
// TITLE ROW (Document title + metadata)
// ═══════════════════════════════════════════════════════════
export function PdfTitleRow({
  title,
  bestellnummer,
  datum,
  status,
}: {
  title: string;
  bestellnummer: string;
  datum: string;
  status: string;
}) {
  return React.createElement(
    View,
    { style: styles.titleRow },
    React.createElement(Text, { style: styles.docTitle }, title),
    React.createElement(
      View,
      { style: styles.metaBox },
      React.createElement(Text, { style: styles.metaLabel }, 'Bestellnummer'),
      React.createElement(Text, { style: styles.metaValue }, `#${bestellnummer}`),
      React.createElement(Text, { style: styles.metaLabel }, 'Datum'),
      React.createElement(Text, { style: styles.metaValue }, formatDate(datum)),
      React.createElement(
        View,
        { style: styles.statusBadge },
        React.createElement(Text, { style: styles.statusText }, `✓ ${status}`)
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════
// ADDRESS BLOCK
// ═══════════════════════════════════════════════════════════
export function PdfAddressBlock({
  label,
  address,
}: {
  label: string;
  address: PdfAddressData | null;
}) {
  if (!address) return null;
  return React.createElement(
    View,
    { style: styles.addressBlock },
    React.createElement(Text, { style: styles.addressTitle }, label),
    address.name
      ? React.createElement(Text, { style: styles.addressName }, address.name)
      : null,
    address.strasse
      ? React.createElement(Text, { style: styles.addressLine }, address.strasse)
      : null,
    address.zusatz
      ? React.createElement(Text, { style: styles.addressLine }, address.zusatz)
      : null,
    (address.plz || address.ort)
      ? React.createElement(
          Text,
          { style: styles.addressLine },
          `${address.plz || ''} ${address.ort || ''}`.trim()
        )
      : null,
    address.land
      ? React.createElement(Text, { style: styles.addressLine }, countryLabel(address.land))
      : null
  );
}

// ═══════════════════════════════════════════════════════════
// ADDRESS ROW (two address blocks side by side)
// ═══════════════════════════════════════════════════════════
export function PdfAddressRow({
  rechnungsadresse,
  lieferadresse,
}: {
  rechnungsadresse: PdfAddressData | null;
  lieferadresse: PdfAddressData | null;
}) {
  return React.createElement(
    View,
    { style: styles.addressRow },
    React.createElement(PdfAddressBlock, {
      label: 'Rechnungsadresse',
      address: rechnungsadresse,
    }),
    React.createElement(PdfAddressBlock, {
      label: 'Lieferadresse',
      address: lieferadresse,
    })
  );
}

// ═══════════════════════════════════════════════════════════
// ITEMS TABLE
// ═══════════════════════════════════════════════════════════
export function PdfItemsTable({
  positionen,
}: {
  positionen: {
    pos: number;
    titel: string;
    artikelnummer?: string | null;
    variante_name?: string | null;
    menge: number;
    preis_brutto: number;
  }[];
}) {
  return React.createElement(
    View,
    null,
    React.createElement(Text, { style: styles.sectionTitle }, 'Bestellte Artikel'),
    // Table Header
    React.createElement(
      View,
      { style: styles.tableHeader },
      React.createElement(
        Text,
        { style: { ...styles.tableHeaderText, ...styles.cellPos } },
        'Pos'
      ),
      React.createElement(
        Text,
        { style: { ...styles.tableHeaderText, ...styles.cellArtikel } },
        'Artikel'
      ),
      React.createElement(
        Text,
        { style: { ...styles.tableHeaderText, ...styles.cellMenge } },
        'Menge'
      ),
      React.createElement(
        Text,
        { style: { ...styles.tableHeaderText, ...styles.cellPreis } },
        'Einzelpreis'
      ),
      React.createElement(
        Text,
        { style: { ...styles.tableHeaderText, ...styles.cellGesamt } },
        'Gesamt'
      )
    ),
    // Table Rows
    ...positionen.map((item, idx) =>
      React.createElement(
        View,
        {
          key: idx,
          style: {
            ...styles.tableRow,
            ...(idx % 2 === 1 ? styles.tableRowAlt : {}),
          },
        },
        React.createElement(
          Text,
          { style: { ...styles.cellText, ...styles.cellPos } },
          String(item.pos)
        ),
        React.createElement(
          View,
          { style: styles.cellArtikel },
          React.createElement(Text, { style: styles.cellTextBold }, item.titel),
          item.artikelnummer
            ? React.createElement(
                Text,
                { style: styles.cellTextMuted },
                `Art.Nr: ${item.artikelnummer}`
              )
            : null,
          item.variante_name
            ? React.createElement(
                Text,
                { style: styles.cellTextMuted },
                `Variante: ${item.variante_name}`
              )
            : null
        ),
        React.createElement(
          Text,
          { style: { ...styles.cellText, ...styles.cellMenge } },
          String(item.menge)
        ),
        React.createElement(
          Text,
          { style: { ...styles.cellText, ...styles.cellPreis } },
          formatCurrency(item.preis_brutto)
        ),
        React.createElement(
          Text,
          { style: { ...styles.cellTextBold, ...styles.cellGesamt } },
          formatCurrency(item.preis_brutto * item.menge)
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════
// TOTALS BOX
// ═══════════════════════════════════════════════════════════
export function PdfTotals({
  zwischensumme,
  versand,
  steuer,
  gesamt,
  zahlungsmethode,
}: {
  zwischensumme: number;
  versand: number;
  steuer: number;
  gesamt: number;
  zahlungsmethode?: string | null;
}) {
  return React.createElement(
    View,
    null,
    React.createElement(
      View,
      { style: styles.totalsContainer },
      // Zwischensumme
      React.createElement(
        View,
        { style: styles.totalsRow },
        React.createElement(Text, { style: styles.totalsLabel }, 'Zwischensumme'),
        React.createElement(Text, { style: styles.totalsValue }, formatCurrency(zwischensumme))
      ),
      // Versand
      React.createElement(
        View,
        { style: styles.totalsRow },
        React.createElement(Text, { style: styles.totalsLabel }, 'Versand'),
        React.createElement(
          Text,
          { style: styles.totalsValue },
          versand === 0 ? 'Kostenlos' : formatCurrency(versand)
        )
      ),
      // MwSt — included label, not separate calculation
      React.createElement(
        View,
        { style: styles.totalsRow },
        React.createElement(Text, { style: styles.totalsLabel }, 'inkl. 19% MwSt.'),
        React.createElement(Text, { style: { ...styles.totalsValue, fontSize: 8, color: '#94a3b8' } }, formatCurrency(steuer))
      ),
      // Divider
      React.createElement(View, { style: styles.totalsDivider }),
      // Grand Total
      React.createElement(
        View,
        { style: styles.totalsRow },
        React.createElement(Text, { style: styles.totalsFinalLabel }, 'Gesamtbetrag'),
        React.createElement(Text, { style: styles.totalsFinalValue }, formatCurrency(gesamt))
      )
    ),
    // Payment method
    zahlungsmethode
      ? React.createElement(
          View,
          { style: styles.paymentRow },
          React.createElement(Text, { style: styles.paymentLabel }, 'Bezahlt mit:'),
          React.createElement(
            Text,
            { style: styles.paymentValue },
            paymentMethodLabel(zahlungsmethode)
          )
        )
      : null
  );
}

// ═══════════════════════════════════════════════════════════
// THANK-YOU SECTION
// ═══════════════════════════════════════════════════════════
export function PdfThankYou({ company }: { company: PdfCompanyInfo }) {
  return React.createElement(
    View,
    { style: styles.thankYou },
    React.createElement(
      Text,
      { style: styles.thankYouTitle },
      'Vielen Dank für Ihre Bestellung!'
    ),
    React.createElement(
      Text,
      { style: styles.thankYouText },
      `Bei Fragen erreichen Sie uns unter ${company.email} oder telefonisch unter ${company.phone}.`
    )
  );
}

// ═══════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════
export function PdfFooter({ company }: { company: PdfCompanyInfo }) {
  return React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(
      View,
      { style: styles.footerCol },
      React.createElement(Text, { style: styles.footerBold }, company.name),
      React.createElement(Text, { style: styles.footerText }, company.address)
    ),
    React.createElement(
      View,
      { style: { ...styles.footerCol, alignItems: 'center' } },
      React.createElement(Text, { style: styles.footerText }, `Tel: ${company.phone}`),
      React.createElement(Text, { style: styles.footerText }, company.email)
    ),
    React.createElement(
      View,
      { style: { ...styles.footerCol, alignItems: 'flex-end' } },
      React.createElement(Text, { style: styles.footerText }, company.website),
      React.createElement(
        Text,
        { style: styles.footerText },
        'Diese Bestellbestätigung wurde automatisch erstellt.'
      )
    )
  );
}

