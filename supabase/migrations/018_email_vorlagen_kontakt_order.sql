-- ============================================
-- MIGRATION 018: Email Vorlagen — Kontakt & Bestellung Admin
-- Adds 3 new email templates for:
--   1. kontakt_anfrage_intern — internal contact form notification
--   2. kontakt_anfrage_bestaetigung — customer contact confirmation
--   3. bestellung_admin_benachrichtigung — new order admin notification
-- ============================================

INSERT INTO email_vorlagen (typ, betreff, inhalt_html, variablen)
SELECT * FROM (VALUES

  ('kontakt_anfrage_intern',
   'Neue Anfrage von {{kundenname}} — {{interesse}}',
   '<h1>📩 Neue Anfrage eingegangen</h1>
<p>Über das Kontaktformular wurde eine neue Anfrage gesendet.</p>
<table width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin:16px 0;">
<tr><td><strong>Art:</strong></td><td>{{interesse}}</td></tr>
<tr><td><strong>Name:</strong></td><td>{{kundenname}}</td></tr>
<tr><td><strong>E-Mail:</strong></td><td>{{kunden_email}}</td></tr>
<tr><td><strong>Telefon:</strong></td><td>{{telefon}}</td></tr>
</table>
<h3>Nachricht</h3>
<p>{{nachricht}}</p>
<p style="color:#64748b;">Bitte antworten Sie dem Kunden zeitnah.</p>',
   ARRAY['{{kundenname}}','{{kunden_email}}','{{telefon}}','{{interesse}}','{{nachricht}}','{{firma_name}}']),

  ('kontakt_anfrage_bestaetigung',
   'Ihre Anfrage — {{firmenname}}',
   '<h1>Vielen Dank für Ihre Anfrage! ✉️</h1>
<p>Hallo {{kundenname}},</p>
<p>wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden. In der Regel antworten wir innerhalb von <strong>1–2 Werktagen</strong>.</p>
<table width="100%" style="background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;">
<tr><td><strong>Ihre Anfrage:</strong></td><td>{{interesse}}</td></tr>
</table>
<p>Falls Sie in der Zwischenzeit Fragen haben, erreichen Sie uns unter <strong>{{firmen_email}}</strong> oder telefonisch unter <strong>{{firmen_telefon}}</strong>.</p>
<p>Mit freundlichen Grüßen,<br/>{{firmenname}}</p>',
   ARRAY['{{kundenname}}','{{interesse}}','{{firmenname}}','{{firmen_email}}','{{firmen_telefon}}']),

  ('bestellung_admin_benachrichtigung',
   'Neue Bestellung #{{bestellnummer}} — {{gesamt}}',
   '<h1>🛒 Neue Bestellung eingegangen!</h1>
<p>Ein Kunde hat soeben eine Bestellung aufgegeben.</p>
<table width="100%" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;margin:16px 0;">
<tr><td><strong>Bestellnummer:</strong></td><td>#{{bestellnummer}}</td></tr>
<tr><td><strong>Kunde:</strong></td><td>{{kundenname}}</td></tr>
<tr><td><strong>E-Mail:</strong></td><td>{{kunden_email}}</td></tr>
<tr><td><strong>Gesamtbetrag:</strong></td><td>{{gesamt}}</td></tr>
</table>
<p>Bitte bearbeiten Sie die Bestellung im Admin-Dashboard.</p>',
   ARRAY['{{bestellnummer}}','{{kundenname}}','{{kunden_email}}','{{gesamt}}','{{firma_name}}'])

) AS t(typ, betreff, inhalt_html, variablen)
WHERE NOT EXISTS (SELECT 1 FROM email_vorlagen WHERE typ = 'kontakt_anfrage_intern');

-- End of migration 018

