-- ============================================
-- SEED DATA — Run after 001_initial_schema.sql
-- ============================================

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO categories (id, name, slug, sort_order) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Wandgerät', 'wandgeraet', 1),
  ('c1000000-0000-0000-0000-000000000002', 'Truhengerät', 'truhengeraet', 2),
  ('c1000000-0000-0000-0000-000000000003', 'Kassettengerät', 'kassettengeraet', 3),
  ('c1000000-0000-0000-0000-000000000004', 'Kompaktgerät', 'kompaktgeraet', 4),
  ('c1000000-0000-0000-0000-000000000005', 'Kanalgerät', 'kanalgeraet', 5);

-- ============================================
-- PRODUCTS (migrated from lib/data.ts)
-- ============================================
INSERT INTO products (id, name, slug, description, brand, type, price, stock, energy_efficiency, room_size, noise_level, cooling_capacity, heating_capacity, dimensions, weight, refrigerant, status) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'Daikin Sensira', 'daikin-sensira', 'Das Daikin Sensira Wandgerät bietet hervorragendes Preis-Leistungs-Verhältnis und zuverlässige Kühlung mit minimalem Energieverbrauch.', 'Daikin', 'Wandgerät', 899.00, 10, 'A++', 'bis 30m²', '21 dB(A)', '2.5 kW', '2.8 kW', '286 x 770 x 225 mm', '9 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000002', 'Daikin Perfera', 'daikin-perfera', 'Perfera sorgt für erstklassige Luftqualität und optimalen Komfort dank 3D-Luftstrom und fortschrittlicher Luftreinigung.', 'Daikin', 'Wandgerät', 1199.00, 8, 'A+++', 'bis 40m²', '19 dB(A)', '3.5 kW', '4.0 kW', '295 x 778 x 272 mm', '10 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000003', 'Daikin Stylish', 'daikin-stylish', 'Kompaktes und funktionales Design, das sich in jedes Interieur einfügt. Höchste Effizienz und intelligenter Komfort.', 'Daikin', 'Wandgerät', 1499.00, 5, 'A+++', 'bis 50m²', '19 dB(A)', '4.2 kW', '5.0 kW', '295 x 798 x 189 mm', '12 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000004', 'Daikin Emura', 'daikin-emura', 'Das ultimative Klimagerät in Sachen Design und Technologie. Emura vereint Ästhetik mit herausragender Leistung.', 'Daikin', 'Wandgerät', 1799.00, 6, 'A+++', 'bis 60m²', '19 dB(A)', '5.0 kW', '5.8 kW', '305 x 900 x 214 mm', '12 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000005', 'Mitsubishi Heavy Premium', 'mitsubishi-heavy-premium', 'Premium-Wandgerät mit höchster Energieeffizienz und fortschrittlichem Allergen-Filter.', 'Mitsubishi', 'Wandgerät', 1299.00, 7, 'A+++', 'bis 40m²', '19 dB(A)', '3.5 kW', '4.3 kW', '290 x 870 x 230 mm', '9.5 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000006', 'Daikin Truhengerät', 'daikin-truhengeraet', 'Ideal für die Installation unter Fenstern. Sorgt für eine optimale Wärmeverteilung im Raum.', 'Daikin', 'Truhengerät', 1299.00, 4, 'A++', 'bis 35m²', '23 dB(A)', '3.5 kW', '4.5 kW', '600 x 700 x 210 mm', '14 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000007', 'Daikin Deckenkassette', 'daikin-deckenkassette', 'Perfekt für abgehängte Decken in gewerblichen Räumen. Bietet eine gleichmäßige Luftverteilung ohne Zugluft.', 'Daikin', 'Kassettengerät', 1899.00, 3, 'A++', 'bis 80m²', '27 dB(A)', '6.8 kW', '7.5 kW', '256 x 840 x 840 mm', '22 kg', 'R-32', 'active'),
  ('p1000000-0000-0000-0000-000000000008', 'Mitsubishi Compact', 'mitsubishi-compact', 'Kompaktes Einstiegsmodell für kleinere Räume mit solider Leistung.', 'Mitsubishi', 'Kompaktgerät', 799.00, 12, 'A+', 'bis 20m²', '22 dB(A)', '2.0 kW', '2.5 kW', '280 x 780 x 215 mm', '8 kg', 'R-32', 'active');

-- ============================================
-- PRODUCT IMAGES (using existing unsplash URLs)
-- ============================================
INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Sensira', 0),
  ('p1000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Perfera', 0),
  ('p1000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Stylish', 0),
  ('p1000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Emura', 0),
  ('p1000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Mitsubishi Heavy Premium', 0),
  ('p1000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Truhengerät', 0),
  ('p1000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Daikin Deckenkassette', 0),
  ('p1000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop', 'Mitsubishi Compact', 0);

-- ============================================
-- PRODUCT ↔ CATEGORY mapping
-- ============================================
INSERT INTO product_categories (product_id, category_id) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'), -- Sensira → Wandgerät
  ('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001'), -- Perfera → Wandgerät
  ('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001'), -- Stylish → Wandgerät
  ('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001'), -- Emura → Wandgerät
  ('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001'), -- Mitsubishi Premium → Wandgerät
  ('p1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000002'), -- Truhengerät → Truhengerät
  ('p1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000003'), -- Deckenkassette → Kassettengerät
  ('p1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004'); -- Compact → Kompaktgerät

-- ============================================
-- COMPANY SETTINGS (singleton row)
-- ============================================
INSERT INTO company_settings (company_name, phone, email, street, zip, city, country) VALUES
  ('Said Kälte- und Klimatechnik', '0800 123 4567', 'info@said-klima.de', 'Musterstraße 123', '10115', 'Berlin', 'Deutschland');

-- ============================================
-- CONTENT PAGES (initial CMS pages)
-- ============================================
INSERT INTO content_pages (slug, title, status) VALUES
  ('startseite', 'Startseite', 'published'),
  ('ueber-uns', 'Über uns', 'published'),
  ('agb', 'Allgemeine Geschäftsbedingungen (AGB)', 'published'),
  ('impressum', 'Impressum', 'published'),
  ('datenschutz', 'Datenschutzerklärung', 'published'),
  ('widerruf', 'Widerrufsbelehrung', 'published'),
  ('versand-zahlung', 'Versand und Zahlung', 'published');

-- ============================================
-- TIME SLOTS (Mon-Fri business hours)
-- ============================================
INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, is_active) VALUES
  (0, '08:00', '09:00', 1, true),  -- Monday
  (0, '09:00', '10:00', 1, true),
  (0, '10:00', '11:00', 1, true),
  (0, '11:00', '12:00', 1, true),
  (0, '13:00', '14:00', 1, true),
  (0, '14:00', '15:00', 1, true),
  (0, '15:00', '16:00', 1, true),
  (0, '16:00', '17:00', 1, true),
  (1, '08:00', '09:00', 1, true),  -- Tuesday
  (1, '09:00', '10:00', 1, true),
  (1, '10:00', '11:00', 1, true),
  (1, '11:00', '12:00', 1, true),
  (1, '13:00', '14:00', 1, true),
  (1, '14:00', '15:00', 1, true),
  (1, '15:00', '16:00', 1, true),
  (1, '16:00', '17:00', 1, true),
  (2, '08:00', '09:00', 1, true),  -- Wednesday
  (2, '09:00', '10:00', 1, true),
  (2, '10:00', '11:00', 1, true),
  (2, '11:00', '12:00', 1, true),
  (2, '13:00', '14:00', 1, true),
  (2, '14:00', '15:00', 1, true),
  (2, '15:00', '16:00', 1, true),
  (2, '16:00', '17:00', 1, true),
  (3, '08:00', '09:00', 1, true),  -- Thursday
  (3, '09:00', '10:00', 1, true),
  (3, '10:00', '11:00', 1, true),
  (3, '11:00', '12:00', 1, true),
  (3, '13:00', '14:00', 1, true),
  (3, '14:00', '15:00', 1, true),
  (3, '15:00', '16:00', 1, true),
  (3, '16:00', '17:00', 1, true),
  (4, '08:00', '09:00', 1, true),  -- Friday
  (4, '09:00', '10:00', 1, true),
  (4, '10:00', '11:00', 1, true),
  (4, '11:00', '12:00', 1, true),
  (4, '13:00', '14:00', 1, true),
  (4, '14:00', '15:00', 1, true),
  (4, '15:00', '16:00', 1, true),
  (4, '16:00', '17:00', 1, true),
  (5, '09:00', '10:00', 1, true),  -- Saturday
  (5, '10:00', '11:00', 1, true),
  (5, '11:00', '12:00', 1, true),
  (5, '12:00', '13:00', 1, true);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
INSERT INTO email_templates (type, subject, body_html) VALUES
  ('booking_confirmation', 'Terminbestätigung — {{service_type}}', '<h1>Ihr Termin wurde bestätigt</h1><p>Hallo {{customer_name}},</p><p>Ihr Termin für <strong>{{service_type}}</strong> am <strong>{{date}}</strong> um <strong>{{time}}</strong> wurde erfolgreich gebucht.</p><p>Bei Fragen erreichen Sie uns unter {{company_phone}} oder {{company_email}}.</p><p>Mit freundlichen Grüßen,<br/>{{company_name}}</p>'),
  ('booking_reminder', 'Erinnerung: Ihr Termin morgen — {{service_type}}', '<h1>Terminerinnerung</h1><p>Hallo {{customer_name}},</p><p>Wir möchten Sie daran erinnern, dass Sie morgen (<strong>{{date}}</strong>) um <strong>{{time}}</strong> einen Termin für <strong>{{service_type}}</strong> bei uns haben.</p><p>Falls Sie den Termin stornieren möchten, kontaktieren Sie uns bitte unter {{company_phone}}.</p><p>Mit freundlichen Grüßen,<br/>{{company_name}}</p>'),
  ('booking_cancellation', 'Stornierung: Ihr Termin — {{service_type}}', '<h1>Termin storniert</h1><p>Hallo {{customer_name}},</p><p>Ihr Termin für <strong>{{service_type}}</strong> am <strong>{{date}}</strong> um <strong>{{time}}</strong> wurde storniert.</p><p>Falls Sie einen neuen Termin vereinbaren möchten, besuchen Sie bitte unsere Website oder rufen Sie uns an unter {{company_phone}}.</p><p>Mit freundlichen Grüßen,<br/>{{company_name}}</p>'),
  ('order_confirmation', 'Bestellbestätigung — Bestellung #{{order_number}}', '<h1>Vielen Dank für Ihre Bestellung!</h1><p>Hallo {{customer_name}},</p><p>Wir haben Ihre Bestellung <strong>#{{order_number}}</strong> erhalten und bearbeiten diese nun.</p><p><strong>Gesamtbetrag:</strong> {{total}} €</p><p>Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versendet wird.</p><p>Mit freundlichen Grüßen,<br/>{{company_name}}</p>'),
  ('order_status_update', 'Update zu Ihrer Bestellung #{{order_number}}', '<h1>Status-Update</h1><p>Hallo {{customer_name}},</p><p>Der Status Ihrer Bestellung <strong>#{{order_number}}</strong> wurde auf <strong>{{status}}</strong> aktualisiert.</p><p>Bei Fragen erreichen Sie uns unter {{company_phone}} oder {{company_email}}.</p><p>Mit freundlichen Grüßen,<br/>{{company_name}}</p>');

