## 🛒 **2. Preislogik für Artikel (Priorität)**

### **Ab‑Preis & Angebotsformular**

Bei bestimmten Geräten, z. B. Klimaanlagen, soll der Preis nicht als fester Endpreis dargestellt werden, sondern als **„Ab (Preis) in Euro“**.  
Wenn ein Kunde auf einen solchen Artikel klickt, soll er zu einem **Angebotsanfrage‑Formular** weitergeleitet werden.

Im Formular:

- Der Kunde muss die Artikel‑Details **nicht manuell eingeben**.
- Diese Informationen sollen **automatisch übernommen und im Formular gespeichert** werden.
- Zusätzlich soll ein **optional ausfüllbares Textfeld** vorhanden sein.
- Das Formular soll an uns (Verkäufer) per E‑Mail gesendet werden.
- Kundendaten wie Name, Telefonnummer und E‑Mail sollen abgefragt werden, damit klar ist, mit wem der Verkäufer kommuniziert und wie man ihn erreichen kann.
  Diese Produkte, sind nur auf Angebot Anfrage per Email auch ohne Anmeldung, möglich.

Kontaktformular für ein Angebot sollte zusätzlich wichtige infos haben, wie Wie viele Räume möchten Sie kühlen oder heizen 1 Raum  2 Räume  3 Räume  4 Räume oder Mehr.  Wie groß ist die zu kühlende Fläche(m²) insgesamt?  Standort der Anlage/n Dachgeschoss  Erdgeschoss   Dach- und Erdgeschoss.

Diese Produkte sollten in der AdminPage hinzufügt werden. Wenn der Produkt ist mit Ab (Preis) gespeichert, das heißt Kunde schickt uns die Angebot Anfrage.
Wenn das Produkt kein Ab Preis hat dann kann er das in der Warenkorb hinzufügen.

Das heißt du solltest hier eine kreative aber einfache Lösung finden, vielleicht mit Ab checkbox der als boolean verwendet wurde, um zwichen ab Preis Produkte und Fest Preis Produkte zu unterscheiden.

### **Fester Endpreis**

Andere Artikel oder Ersatzteile haben weiterhin einen **Endpreis**, der jedoch nicht fix ist, da er in der Admin‑Page veränderbar bleibt.

Produkte sollten auch ohne Anmeldung bestellbar sein.
Kunde sollte ohne Anmeldung bestellen, das heißt er geht zur Warenkorb, dort sieht er sein Warenkorb mit der wichtige Info zu der Preis, Menge, Artikel. Dann wenn er zur Kasse klickt sollte er zu einer weiteren Seite. Er hat dort drei moglichkeiten zur Auswahl: Weiter ohne Konto, Konto erstellen, Anmelden, danach sollte er genau seine Daten Vorname, Name, Firma(Optional), Telefonnumer, Email, Lieferadresse, Rechnungsadresse falls es anders ist als die Lieferadresse dann sie auch eingeben. Diese Daten sind für uns wichtig um ihn die Lieferung per Post zu schicken. Danach kommt der Zahlungsmethode mit Stripe, dann Bestellbestätigung.

### **Admin‑Page Änderung**

Beim Erstellen eines Artikels soll es möglich sein:

- zwischen **Ab‑Preis** und **Endpreis** zu wählen.
- Dafür reicht vermutlich eine einfache **„Ab‑Preis“-Checkbox**.

---

## 🛠️ **3. Dienstleistungs‑Hinweis (Medium Priorität)**

In der Dienstleistungs‑Sektion soll erwähnt werden, dass unsere Dienstleistungen **in Osnabrück und im Umkreis von 70 km** angeboten werden.

---

## 📘 **4. Technische Daten als Rich‑Text (Hohe Priorität)**

Die aktuelle Tabelle für technische Daten soll durch ein **Textfeld** ersetzt werden, das sich wie in Word bearbeiten lässt.  
Das bedeutet:

- In der Admin‑Page sollen technische Daten formatiert werden können  
  (Überschriften, Tabellen, Listen, Textformatierung usw.).
- Größenangaben müssen in **Meter und Zoll** angegeben werden können. Größeangaben sind bei Zubehör Produkte sehr wichtig. Weil durch die Größe kann der Preis auch geändert werden. Andere Größen haben andere Preise. Aber wenn ich ein Produkt erstelle, zum beispiel Kabel. Kabel bekommt nur ein Foto und gleiche Technische Daten aber unterschiedliche Größen. Wenn die Größe 50Meter der Preis ist 20 Euro und bei Größe 100 Meter der Preis ist dann 40 Euro. Aber die andere Angaben, wie Foto, Artikelname, Technische Daten sind gleich.
  Bei der Shop Seite bei solche Produkten, es soll möglich sein so ein Produkt zu klicken (Kabel) und dann als Default eine Größe ausgewählt mit der Preis, dann durch ein Feature sollte der Kunde die möglichkeit haben, die Variante der Produkt zu ändern, wie zum Beispiel der Größe und gleichzeitig ändert sich der Preis. Problem ist aus meiner Sicht, wie wir solche Produkte mit gleicher Namen aber unterschiedliche Größen, in der DB speichern. Analysiere diese komplexe Änderung und gib mir die beste smarte kreative Lösung.
- Auch beim Erstellen eines Artikels soll die Eingabe dieser Formate unterstützt werden.

**Beschlossene Lösung (Ansatz B):**
1. **Technische Daten als Rich-Text:** Die Tabelle `artikel` erhält eine neue Spalte `technische_daten_rte` (HTML-Text), um formatierten Text aus dem bestehenden `RichTextEditor` zu speichern.
2. **Varianten-Logik (Absolute Preise):** Eine neue Tabelle `artikel_varianten` (oder analoge Namensgebung passend zur DB) wird erstellt. Jede Variante bekommt einen Namen (z.B. "50 Meter") und einen **festen Preis** (`preis_brutto`). 
Im Shop wird bei Varianten-Produkten ein "Ab X €" Preis angezeigt. Auf der Artikel-Detailseite kann der Kunde per Dropdown/Buttons die Variante wählen, was den Preis live ändert. Beim Kauf wird die gewählte `variant_id` in den Warenkorb gelegt.

---

## 🧾 **5. Dienstleistungs‑Section – Booking entfernen (Medium Priorität)**

Der Bereich, in dem man aktuell direkt einen Termin buchen kann, soll **vorerst nicht angezeigt** werden.

Wenn ein Nutzer auf „Service buchen“ klickt:

- soll er **nicht** zur Buchungsseite gehen,
- sondern direkt zur **Kontaktseite**, wo er ein Kontaktformular ausfüllt und angeben kann,
    - welche Dienstleistung er buchen möchte
    - oder eine allgemeine Frage stellen kann.

Das bestehende Kontaktformular kann dafür genutzt werden.

---

## 📞 **6. Kontaktseite – Überarbeitung (Hohe Priorität)**

### **a) Alte Kontaktseite sichern**

Die aktuelle Kontaktseite soll **komplett im Projekt abgespeichert** werden, damit sie später wiederverwendet werden kann.  
Die alte Version soll in einen Ordner mit einem passenden Namen gelegt werden, z. B.:

- `/unused-pages/`
- `/archived/contact-old/`

### **b) Neue Kontaktseite**

Die neue Kontaktseite soll schlanker aufgebaut sein.

- Das bestehende Kontaktformular wird weiterhin verwendet.
- Der Bereich **„Interesse an“** soll unbedingt bestehen bleiben.
- Elemente, die nicht mehr benötigt werden, sollen entfernt werden:
    - Kontaktdaten
    - Kartenansicht (Google Maps o. Ä.)

---

## 🧩 **7. Dienstleistungen‑Seite – UI Anpassung (Medium Priorität)**

Ich finde die Darstellung unserer Services sehr gut, aber es gibt ein paar visuelle Anpassungen:

### **a) Buttons entfernen**

Aktuell haben die drei Service‑Karten jeweils einen Button, der zur Kontaktseite führt.  
Diese Buttons sollen entfernt werden, damit die Karten harmonischer wirken.

### **b) Hover‑Effekte**

Die Karten wirken etwas statisch.  
Ich möchte:

- Schatten‑Effekt beim Hover
- Leichten Zoom
- Dezenten interaktiven Eindruck

### **c) Starker CTA am Seitenende**

Unter den drei Karten soll weiterhin ein klarer Call‑to‑Action stehen:

**„Welchen Service benötigen Sie? Wir helfen Ihnen weiter.“**  
_„Unsere Experten beraten Sie kostenlos und finden die passende Lösung.“_

Darunter ein großer Button:  
**„Jetzt Beratung anfragen“**
