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

Gebruik op telefoon bij voorkeur hetzelfde wifi-netwerk en open het lokale IP-adres van de computer. Voor installatie als PWA werkt een HTTPS-link het prettigst.

## Belangrijk over foto's

Browsers staan niet toe dat `mailto:` automatisch bestanden als bijlage toevoegt. De app maakt daarom een PNG-tankbonnetje met oplopend bonnummer en gebruikt waar mogelijk de mobiele deel-functie (`navigator.share`). Kies daarna Mail; iPhone en Android kunnen het tankbonnetje en de geselecteerde foto's dan als bijlage meenemen.

Als het toestel geen bestanden kan delen, valt de app terug naar een gewone conceptmail zonder bijlage.

## Bestanden

- `index.html` - Mobiele layout en formulier
- `styles.css` - Responsive Equip-achtige styling
- `app.js` - Validatie, tankbon-PNG, foto's, delen/mailen en mailgeneratie
- `manifest.webmanifest` - PWA metadata
- `service-worker.js` - Offline cache
- `assets/icons/` - App-iconen voor PWA-installatie

## Toekomstige uitbreidingen

- Vaste ontvanger of CC-adressen configureerbaar maken.
- Lokale concepten bewaren wanneer de gebruiker slechte verbinding heeft.
- Een vaste lijst met veelgebruikte klanten of machines toevoegen.
- Foto's verkleinen en exporteren naar een deelbare ZIP zodra een backend of native wrapper beschikbaar is.
