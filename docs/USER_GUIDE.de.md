# Benutzeranleitung: Reisekostenabrechnung

Mit der App erfassen Sie eine Reise mit mehreren Reisezielen, Ausgaben,
Kilometerpauschalen und Belegen. Daraus erstellen Sie einen PDF-Bericht.

App: <https://heythorsten.github.io/travel-expense-report/>

## Wichtig: Daten selbst speichern

**Es gibt keine automatische Speicherung.** Eingaben und Belege bleiben nur im
Arbeitsspeicher des aktuellen Browser-Tabs. Beim Neuladen oder Schließen gehen
ungespeicherte Daten verloren.

Speichern Sie deshalb regelmäßig mit **Bericht als ZIP speichern** eine
bearbeitbare Sicherung. Die heruntergeladene Datei hat die Endung
**`.reisekosten`**. Ein PDF ersetzt diese Sicherung nicht.

Berichte und Belege werden von der App nicht an einen Berichtsserver
hochgeladen. Heruntergeladene PDF- und Sicherungsdateien sind nicht durch die App
verschlüsselt und enthalten gegebenenfalls personenbezogene Daten. Bewahren Sie
sie geschützt auf und geben Sie sie nur an berechtigte Personen weiter.

## 1. Persönliche Daten und Reisezweck

Unter **Persönliche Daten** sind **Nachname** und **Vorname** erforderlich.
**Personalnummer** und **Abteilung** sind optional.

Tragen Sie unter **Reisedaten** den erforderlichen **Reisezweck** ein, zum
Beispiel einen Kundentermin oder eine Fortbildung.

## 2. Reiseziele und Zeiten erfassen

Für jedes Reiseziel:

1. Geben Sie **Ort oder Reiseziel** ein.
2. Wählen Sie das **Land**. Deutschland ist vorausgewählt.
3. Falls angeboten und zutreffend, wählen Sie **Region/Stadt (optional)**.
   Die Auswahl kann für einen abweichenden Pauschbetrag relevant sein.
4. Wählen Sie für **Start** und **Ende** jeweils Datum und Uhrzeit.
   Wählen Sie die Uhrzeit über das Zifferblatt (zuerst Stunden, dann Minuten)
   und bestätigen Sie mit **Übernehmen**. Das Ende muss nach dem Start
   liegen. Die App verwendet lokale Datums-/Zeitangaben, keine separat
   wählbaren Zeitzonen.

Alternativ können Sie die Stunden und Minuten direkt in die Felder des
Uhrzeitdialogs eingeben. Per Tastatur öffnen Sie den fokussierten
Datums-/Uhrzeitwähler mit der Pfeil-nach-unten-Taste, wechseln mit Tab zu den
Feldern bzw. Schaltflächen und aktivieren **Übernehmen** mit der Eingabetaste.
**Abbrechen** verwirft Änderungen im Uhrzeitdialog.

Mit **+ Reiseziel hinzufügen** legen Sie weitere Abschnitte an. Ab dem zweiten
Reiseziel wird der Start automatisch aus dem Ende des vorherigen Abschnitts
übernommen und ist nicht direkt änderbar. Ändern Sie bei Bedarf dessen Ende.
Zusätzliche Reiseziele können Sie mit **Entfernen** löschen; das erste bleibt
bestehen.

## 3. Verpflegungsmehraufwand prüfen

Bei passenden Reisezeiten erscheint **Verpflegungsmehraufwand** mit den
berechneten Tagesbeträgen:

- Bei einer eintägigen Reise setzt die App erst bei mehr als acht Stunden
  Abwesenheit eine Pauschale an.
- Bei mehrtägigen Reisen unterscheidet die App Reisetage und volle
  Abwesenheitstage.
- Markieren Sie unter **Gestellte Mahlzeit** jeweils **Frühstück**,
  **Mittagessen** oder **Abendessen**, wenn eine entsprechende Mahlzeit gestellt
  wurde. Dadurch vermindert sich der angezeigte Betrag.

Kontrollieren Sie Datum, Land/Region, Kürzungen und Gesamtbetrag. Die App ersetzt
keine Prüfung der geltenden Reisekostenrichtlinie oder steuerlichen Regelungen.
Insbesondere bei grenzüberschreitenden Reisen und abweichenden betrieblichen
Vorgaben müssen Sie die Ergebnisse selbst prüfen.

### Woher kommen die Pauschbeträge?

Beim Öffnen versucht die App, Länder-/Pauschbetragsdaten von jsDelivr zu laden,
und speichert diese Daten lokal im Browser. Falls das nicht gelingt, verwendet
sie bereits gespeicherte oder mitgelieferte Daten und zeigt einen Hinweis an.
Dieser lokale Zwischenspeicher enthält keine Berichtseingaben oder Belege.

Gespeicherte/mitgelieferte Daten können veraltet sein oder für ein Reisedatum
keinen Pauschbetrag enthalten. Beachten Sie entsprechende Meldungen, statt einen
fehlenden Betrag als 0 EUR zu interpretieren. Die Datenquelle kann übliche
Verbindungsmetadaten erhalten; die App überträgt dort keine Berichte.
Die gesamte Webseite ist nicht garantiert offline verfügbar.

## 4. Ausgaben hinzufügen

Öffnen Sie **+ Ausgabe hinzufügen** und wählen Sie eine **Kategorie**:

- **Fahrtkosten**
- **Übernachtung**
- **Reisenebenkosten**

### Tatsächliche Ausgaben

Bei Fahrtkosten wählen Sie **Bahn/Bus/Flugzeug**. Geben Sie **Datum** und
**Betrag** in EUR ein. Der Betrag muss positiv sein und darf höchstens zwei
Nachkommastellen haben. Eine **Beschreibung (optional)** erleichtert die
spätere Zuordnung.

Für Übernachtungen und Reisenebenkosten erfassen Sie ebenfalls Datum und Betrag.
Die App bietet keine Fremdwährungsumrechnung.

### Kilometerpauschale für einen privaten PKW

Wählen Sie **Fahrtkosten > Privat PKW**. Tragen Sie Datum, **Gefahrene
Kilometer** als positive ganze Zahl und **Satz pro Kilometer** ein.
Vorausgewählt sind 0,30 EUR/km; passen Sie den Satz Ihrer geltenden Vorgabe an.
Die App zeigt den **Erstattungsbetrag** an.

Für diesen Ausgabentyp gibt es keinen Beleganhang. Beim Wechsel zu
**Privat PKW** wird ein zuvor im Dialog gewählter Beleg entfernt.

### Belege anhängen

Bei tatsächlichen Ausgaben können Sie mit **Beleg hinzufügen (optional)**
genau einen Beleg je Ausgabe auswählen:

- PDF, JPG/JPEG oder PNG
- maximal **10 MiB je Datei**
- Dateiendung und Inhalt müssen zum unterstützten Format passen

Die App zeigt eine Vorschau. Mit **Beleg ersetzen** tauschen Sie die Datei aus;
mit **Beleg entfernen** entfernen Sie nur den Anhang.

Bestätigen Sie eine neue Ausgabe mit **Ausgabe hinzufügen**. Bei einer
bestehenden Ausgabe verwenden Sie **Änderungen übernehmen**. **Abbrechen**
verwirft die Änderungen im Dialog.

In der Ausgabenliste stehen die Einträge nach Kategorie und Datum mit
Kategorie-Summen. **Bearbeiten** öffnet eine Ausgabe erneut; **Entfernen**
löscht sie samt zugeordnetem Beleg aus dem Bericht.

## 5. Bearbeitbare Sicherung speichern und öffnen

**Bericht als ZIP speichern** speichert Bericht und Belege als ZIP-basiertes
Archiv, beispielsweise `2026-10-17_Reisekostenabrechnung.reisekosten`.
Auch ein noch unvollständiger Bericht kann gesichert werden.

Zum Fortsetzen:

1. Wählen Sie **Gespeicherten Bericht öffnen**.
2. Wählen Sie die zuvor von der App gespeicherte **`.reisekosten`**-Datei.
   Normale ZIP-Dateien und PDF-Berichte können nicht als Bericht geöffnet
   werden.
3. Bestätigen Sie die Rückfrage. Das Öffnen ersetzt alle aktuell erfassten
   Reisedaten, Ausgaben und Belege. Sichern Sie vorher gegebenenfalls den
   aktuellen Stand.
4. Kontrollieren Sie die geladenen Angaben und bearbeiten Sie den Bericht
   weiter.

Das Archiv ist keine vollständige Momentaufnahme der Pauschbetragsdaten.
Berechnungen verwenden beim erneuten Öffnen die dann verfügbaren
Länder-/Pauschbetragsdaten. Für die Dokumentation eines bereits erstellten
Ergebnisses bewahren Sie zusätzlich den PDF-Bericht auf.

## 6. PDF-Bericht erstellen

Wählen Sie **Bericht als PDF herunterladen**. Die App prüft die erforderlichen
Personen-, Reise- und Zeitangaben. Fehlende oder ungültige Werte werden an den
Feldern angezeigt; korrigieren Sie diese und starten Sie den Download erneut.

Der PDF-Bericht enthält die Kostenübersicht, Ausgaben, die
Verpflegungsaufstellung und angehängte Belege. Prüfen Sie den heruntergeladenen
Bericht auf Vollständigkeit und richtige Summen, bevor Sie ihn weitergeben.
Sie benötigen zum Öffnen einen PDF-Betrachter.

Die Dateinamen tragen das Erstellungsdatum, nicht zwingend das Reisedatum.
Eine PDF-Datei lässt sich nicht wieder als bearbeitbarer Bericht importieren.

## Kurzes Beispiel

1. Tragen Sie einen fiktiven Namen und den Reisezweck „Kundentermin“ ein.
2. Erfassen Sie Berlin, Deutschland, mit Start am 17.10.2026 um 08:00 und Ende
   am selben Tag um 18:00.
3. Prüfen Sie die angezeigte Verpflegungspauschale und markieren Sie
   gegebenenfalls gestellte Mahlzeiten.
4. Fügen Sie unter **Fahrtkosten > Bahn/Bus/Flugzeug** ein Ticket über
   49,90 EUR mit Datum und optionalem Beleg hinzu.
5. Speichern Sie zuerst die `.reisekosten`-Sicherung und laden Sie dann den
   PDF-Bericht herunter. Prüfen Sie beide Dateien.

## Wenn etwas nicht klappt

| Problem | Vorgehen |
| --- | --- |
| Angaben werden rot markiert | Erforderliche Felder ausfüllen; Datum, Uhrzeit und Reihenfolge der Reiseabschnitte prüfen. |
| Kein oder nicht berechenbarer Pauschbetrag | Reisezeiten und Länderauswahl sowie den Datenhinweis prüfen. Fehlende Raten nicht als bestätigten Nullbetrag behandeln. |
| Beleg wird abgelehnt | Format, Dateiendung, Inhalt und 10-MiB-Grenze prüfen. Leere Dateien werden nicht akzeptiert. |
| PDF-Vorschau fehlt | Der Browser unterstützt die eingebettete Vorschau möglicherweise nicht. Die Originaldatei gesondert prüfen. |
| Sicherung kann nicht geöffnet werden | Eine unveränderte `.reisekosten`-Datei der App verwenden und die Fehlermeldung beachten. Beliebige oder neu komprimierte ZIP-Dateien werden nicht unterstützt. |
| PDF-Erstellung scheitert | Die angezeigte Fehlermeldung prüfen. Vor Neuladen zuerst die Sicherung herunterladen; bei einem problematischen Beleg die Originaldatei kontrollieren oder ersetzen. |
| Eingaben nach Neuladen weg | Die letzte `.reisekosten`-Sicherung öffnen. Ohne Sicherung gibt es keine automatische Wiederherstellung. |

[Zurück zur README](../README.md)
