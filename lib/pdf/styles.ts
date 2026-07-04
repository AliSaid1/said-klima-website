/**
 * Shared React-PDF style definitions for branded commerce documents.
 * The module centralizes colors, layout metrics, table styling, totals,
 * payment badges, and fixed footers used by generated German PDFs.
 */
import { StyleSheet } from '@react-pdf/renderer';

// ─── KKS Brand Colors ─────────────────────────────────────
/**
 * Brand and semantic color tokens used by PDF components.
 * Values are static hex colors so documents render consistently in server-side
 * React-PDF output and email attachments.
 */
export const COLORS = {
  primary: '#1e3a5f',       // Dark blue (header gradient start)
  primaryLight: '#2563EB',  // Blue-600 (accents, links)
  accent: '#0074cd',        // Accent blue
  dark: '#1e293b',          // Slate-800 (headings)
  text: '#334155',          // Slate-700 (body text)
  muted: '#64748b',         // Slate-500 (secondary text)
  light: '#94a3b8',         // Slate-400 (tertiary)
  border: '#e2e8f0',        // Slate-200 (borders, lines)
  background: '#f8fafc',    // Slate-50 (section backgrounds)
  white: '#ffffff',
  success: '#16a34a',       // Green-600 (paid badge)
  successBg: '#f0fdf4',     // Green-50
};

// ─── Shared Styles ─────────────────────────────────────────
/**
 * React-PDF StyleSheet shared across document sections.
 * Includes page sizing, header, address, line-item table, totals, payment,
 * footer, and thank-you box styles for order confirmation documents.
 */
export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 80, // space for footer
    paddingHorizontal: 40,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 7.5,
    color: COLORS.muted,
    lineHeight: 1.5,
  },

  // ── Document title area ─────────────────────────────────
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaBox: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 7.5,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 6,
  },

  // ── Status Badge ────────────────────────────────────────
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.successBg,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.success,
  },

  // ── Address Blocks ──────────────────────────────────────
  addressRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  addressBlock: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addressTitle: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  addressName: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 3,
  },
  addressLine: {
    fontSize: 8.5,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // ── Items Table ─────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.dark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'flex-start',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  cellPos: { width: '7%' },
  cellArtikel: { width: '43%' },
  cellMenge: { width: '10%', textAlign: 'center' as const },
  cellPreis: { width: '20%', textAlign: 'right' as const },
  cellGesamt: { width: '20%', textAlign: 'right' as const },
  cellText: {
    fontSize: 8.5,
    color: COLORS.text,
  },
  cellTextBold: {
    fontSize: 8.5,
    fontWeight: 700,
    color: COLORS.dark,
  },
  cellTextMuted: {
    fontSize: 7.5,
    color: COLORS.muted,
    marginTop: 1,
  },

  // ── Totals ──────────────────────────────────────────────
  totalsContainer: {
    marginTop: 16,
    marginLeft: 'auto',
    width: 240,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.muted,
  },
  totalsValue: {
    fontSize: 9,
    color: COLORS.dark,
    fontWeight: 500,
  },
  totalsDivider: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginVertical: 4,
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.primary,
  },
  totalsFinalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.primary,
  },

  // ── Payment Info ────────────────────────────────────────
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentLabel: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: 500,
  },
  paymentValue: {
    fontSize: 9,
    color: COLORS.dark,
    fontWeight: 700,
    textTransform: 'capitalize',
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCol: {
    flex: 1,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.light,
    lineHeight: 1.5,
  },
  footerBold: {
    fontSize: 7,
    fontWeight: 700,
    color: COLORS.muted,
    marginBottom: 3,
  },

  // ── Thank-you Section ──────────────────────────────────
  thankYou: {
    marginTop: 28,
    padding: 16,
    backgroundColor: '#eff6ff', // blue-50
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe', // blue-200
    textAlign: 'center',
  },
  thankYouTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: 4,
  },
  thankYouText: {
    fontSize: 9,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
});
