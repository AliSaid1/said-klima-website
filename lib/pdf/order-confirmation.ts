/**
 * React-PDF document composition for customer-facing order confirmations.
 * It assembles shared PDF components into an A4 German Bestellbestätigung
 * (order confirmation) using order data, company branding, and fixed footers.
 */
import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { styles } from './styles';
import {
  PdfHeader,
  PdfTitleRow,
  PdfAddressRow,
  PdfItemsTable,
  PdfTotals,
  PdfThankYou,
  PdfFooter,
} from './components';
import type { OrderPdfData, PdfCompanyInfo } from './types';

/**
 * Full React-PDF Document component for Order Confirmation.
 * Rendered server-side via renderToBuffer().
 *
 * @param props - Component props.
 * @param props.data - Complete bestellung (order) data including addresses,
 * line items, totals, status, and payment metadata.
 * @param props.company - Company identity and contact information for branding.
 * @returns React-PDF Document element ready for server-side rendering.
 */
export function OrderConfirmationDocument({
  data,
  company,
}: {
  data: OrderPdfData;
  company: PdfCompanyInfo;
}) {
  return React.createElement(
    Document,
    {
      title: `Bestellbestätigung ${data.bestellnummer}`,
      author: company.name,
      subject: `Bestellung #${data.bestellnummer}`,
      language: 'de',
    },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header with logo + company info
      React.createElement(PdfHeader, { company }),
      // Title + order meta (number, date, status)
      React.createElement(PdfTitleRow, {
        title: 'Bestellbestätigung',
        bestellnummer: data.bestellnummer,
        datum: data.bestellt_am,
        status: 'Bezahlt',
      }),
      // Billing + Shipping addresses
      React.createElement(PdfAddressRow, {
        rechnungsadresse: data.rechnungsadresse,
        lieferadresse: data.lieferadresse,
      }),
      // Line items table
      React.createElement(PdfItemsTable, {
        positionen: data.positionen,
      }),
      // Totals + payment method
      React.createElement(PdfTotals, {
        zwischensumme: data.zwischensumme_brutto,
        versand: data.versand_brutto,
        steuer: data.steuer_summe,
        gesamt: data.gesamt_brutto,
        zahlungsmethode: data.zahlungsmethode,
      }),
      // Thank-you box
      React.createElement(PdfThankYou, { company }),
      // Fixed footer on every page
      React.createElement(PdfFooter, { company })
    )
  );
}

