# Equip Aftank Registratie

Mobiele PWA voor het registreren van brandstof-aftankbeurten. De app werkt volledig lokaal in de browser en opent na validatie een conceptmail via `mailto:`.

## Lokaal starten

Start in deze map een eenvoudige webserver:

```powershell
python -m http.server 8080
```

Open daarna:

```text
http://localhost:8080
```

Gebruik op telefoon bij voorkeur hetzelfde wifi-netwerk en open het lokale IP-adres van de computer. Camera/barcode werkt alleen in een veilige context: `localhost` werkt lokaal, op een telefoon is HTTPS of een geïnstalleerde PWA meestal nodig.

## Belangrijk over foto's

Browsers staan niet toe dat `mailto:` automatisch bestanden als bijlage toevoegt. De app telt en benoemt toegevoegde foto's in de conceptmail, waarna de gebruiker de foto's handmatig in de mail-app kan toevoegen.

## Bestanden

- `index.html` - Mobiele layout en formulier
- `styles.css` - Responsive Equip-achtige styling
- `app.js` - Validatie, barcode, foto's, PWA-installatie en mailgeneratie
- `manifest.webmanifest` - PWA metadata
- `service-worker.js` - Offline cache
- `assets/icons/` - App-iconen voor PWA-installatie

## Toekomstige uitbreidingen

- Vaste ontvanger of CC-adressen configureerbaar maken.
- Lokale concepten bewaren wanneer de gebruiker slechte verbinding heeft.
- QR-codes met meerdere velden ondersteunen, bijvoorbeeld klant en machine tegelijk.
- Foto's verkleinen en exporteren naar een deelbare ZIP zodra een backend of native wrapper beschikbaar is.
