-- ============================================
-- MIGRATION 024: Email Vorlagen — Bestellung eingegangen & Zahlung fehlgeschlagen
-- Adds 2 new email templates for:
--   1. bestellung_eingegangen — immediate confirmation for bank transfer orders
--      (sent right after checkout when payment_status = 'unpaid')
--   2. zahlung_fehlgeschlagen — notification when async payment fails
--      (bank transfer never arrived / expired)
-- ============================================

INSERT INTO email_vorlagen (typ, betreff, inhalt_html, variablen)
SELECT * FROM (VALUES

  ('bestellung_eingegangen',
   'Bestellung eingegangen — #{{bestellnummer}}',
   '<h1>📦 Bestellung eingegangen!</h1>
<p>Hallo {{kundenname}},</p>
<p>vielen Dank für Ihre Bestellung! Wir haben Ihren Auftrag erhalten und er wird bearbeitet, sobald die Zahlung bei uns eingegangen ist.</p>

<table width="100%" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px;margin:16px 0;">
<tr><td colspan="2" style="font-weight:bold;color:#92400E;padding-bottom:8px;">⏳ Zahlung ausstehend — Banküberweisung</td></tr>
<tr><td style="color:#78716C;padding:4px 8px;width:140px;"><strong>Bestellnummer:</strong></td><td style="font-weight:700;">#{{bestellnummer}}</td></tr>
<tr><td style="color:#78716C;padding:4px 8px;"><strong>Gesamtbetrag:</strong></td><td style="font-weight:700;">{{gesamt}}</td></tr>
<tr><td style="color:#78716C;padding:4px 8px;"><strong>Zahlungsmethode:</strong></td><td>{{zahlungsmethode}}</td></tr>
</table>

<p>Bitte überweisen Sie den Betrag an die in der Stripe-Checkout-Seite angegebene Bankverbindung. Sobald Ihre Zahlung eingegangen ist (in der Regel 1–5 Werktage), erhalten Sie automatisch Ihre Bestellbestätigung mit PDF per E-Mail.</p>

<p style="color:#64748b;font-size:13px;">Bei Fragen erreichen Sie uns jederzeit unter <strong>{{firmen_email}}</strong> oder telefonisch unter <strong>{{firmen_telefon}}</strong>.</p>
<p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>',
   ARRAY['{{kundenname}}','{{bestellnummer}}','{{gesamt}}','{{zahlungsmethode}}','{{firmenname}}','{{firmen_email}}','{{firmen_telefon}}']),

  ('zahlung_fehlgeschlagen',
   'Zahlung fehlgeschlagen — Bestellung #{{bestellnummer}}',
   '<h1>❌ Zahlung fehlgeschlagen</h1>
<p>Hallo {{kundenname}},</p>
<p>leider ist die Zahlung für Ihre Bestellung nicht eingegangen oder konnte nicht verarbeitet werden.</p>

<table width="100%" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px;margin:16px 0;">
<tr><td style="color:#991B1B;padding:4px 8px;width:140px;"><strong>Bestellnummer:</strong></td><td style="font-weight:700;">#{{bestellnummer}}</td></tr>
<tr><td style="color:#991B1B;padding:4px 8px;"><strong>Gesamtbetrag:</strong></td><td style="font-weight:700;">{{gesamt}}</td></tr>
<tr><td style="color:#991B1B;padding:4px 8px;"><strong>Status:</strong></td><td style="color:#DC2626;font-weight:700;">Zahlung fehlgeschlagen</td></tr>
</table>

<p>Möchten Sie es erneut versuchen? Besuchen Sie unseren Shop und legen Sie die Artikel erneut in den Warenkorb, oder kontaktieren Sie uns für Unterstützung.</p>

<p style="color:#64748b;font-size:13px;">Bei Fragen erreichen Sie uns jederzeit unter <strong>{{firmen_email}}</strong> oder telefonisch unter <strong>{{firmen_telefon}}</strong>.</p>
<p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>',
   ARRAY['{{kundenname}}','{{bestellnummer}}','{{gesamt}}','{{firmenname}}','{{firmen_email}}','{{firmen_telefon}}'])

) AS t(typ, betreff, inhalt_html, variablen)
WHERE NOT EXISTS (SELECT 1 FROM email_vorlagen WHERE typ = 'bestellung_eingegangen');

-- End of migration 024

