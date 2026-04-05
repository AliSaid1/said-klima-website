import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { registerFonts } from './fonts';
import { OrderConfirmationDocument } from './order-confirmation';
import type { OrderPdfData, PdfCompanyInfo } from './types';
import {
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_PHONE,
  COMPANY_EMAIL_REPLY_TO,
  COMPANY_WEBSITE,
  COMPANY_DOMAIN,
} from '@/lib/branding';

// Re-export types for convenience
export type { OrderPdfData, PdfCompanyInfo, PdfAddressData, PdfLineItem } from './types';

// Default company info from branding constants
const DEFAULT_COMPANY: PdfCompanyInfo = {
  name: COMPANY_NAME,
  address: COMPANY_ADDRESS,
  phone: COMPANY_PHONE,
  email: COMPANY_EMAIL_REPLY_TO,
  website: COMPANY_WEBSITE,
  domain: COMPANY_DOMAIN,
};

/**
 * Generate an Order Confirmation PDF as a Buffer.
 * Ready to be attached to an email via Resend or served as a download.
 *
 * @param data - Full order data (items, addresses, totals)
 * @param company - Optional company info override (defaults to branding constants)
 * @returns Buffer containing the PDF bytes
 */
export async function generateOrderConfirmationPdf(
  data: OrderPdfData,
  company?: Partial<PdfCompanyInfo>
): Promise<Buffer> {
  // Register fonts (idempotent — only runs once)
  registerFonts();

  const mergedCompany = { ...DEFAULT_COMPANY, ...company };

  const doc = React.createElement(OrderConfirmationDocument, {
    data,
    company: mergedCompany,
  });

  const buffer = await renderToBuffer(doc as any);
  return Buffer.from(buffer);
}

