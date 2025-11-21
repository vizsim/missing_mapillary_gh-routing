# MapLibre GraphHopper Routing

**Proof of Concept** - Eine interaktive Web-Anwendung für Routenplanung mit GraphHopper-Integration, Höhenprofil-Visualisierung und Kontext-Layern für Radinfrastruktur und Mapillary-Abdeckung.

> ⚠️ Dieses Repository dient als **Template** für weitere Projekte. Siehe [Verwendung als Template](#verwendung-als-template) für mehr Informationen.

---

## Features

- **Multi-Profile Routing**: Unterstützung für verschiedene Verkehrsmittel (Auto, Fahrrad, etc.)
- **Interaktive Routenplanung**: Start- und Endpunkt per Klick oder Geocoding setzen
- **Route-Visualisierung**: Farbcodierte Darstellung basierend auf Mapillary Coverage, Surface und Road Class
- **Höhenprofil**: Interaktives Canvas-basiertes Höhenprofil mit Hover-Funktionalität und Encoded Values Overlay
- **Kontext-Layer**: Radinfrastruktur (OpenStreetMap, FixMyCity) und Mapillary Missing Streets (OpenStreetMap, OSM-Verkehrswendegruppe) mit Toggle-Funktionalität
- **Permalink**: Vollständige State-Speicherung in der URL (Kartenposition, Route, Profil, Layer)
- **GPX-Export**: Export berechneter Routen als GPX-Datei

---

## Technische Details

### Framework & Bibliotheken
- **MapLibre GL JS** (v5.6.0): Kartenvisualisierung
- **GraphHopper Routing API**: Routenberechnung
- **Photon Geocoder**: Adresssuche und Geocoding

### Datenquellen
- **GraphHopper API**: Routenberechnung
- **OpenStreetMap**: Basiskartendaten
- **FixMyCity** / **tilda-geo.de**: Vektortiles für Radinfrastruktur
- **OSM Verkehrswende**: Mapillary Missing Streets Daten
- **MapTiler** (optional): Hillshade und Terrain-Daten
- **Sonny's Terrain Models**: Höhenmodelle für Elevation-Daten (CC BY 4.0) - [sonny.4lima.de](https://sonny.4lima.de)

---

## Projektstruktur

```
maplibre_routing/
├── index.html                    # Haupt-HTML-Datei
├── main.js                       # Haupt-Initialisierung
├── style.css                     # Stylesheet
├── style.json                    # MapLibre Style-Konfiguration
├── logo.svg                      # Logo
├── js/
│   ├── config/                   # Konfiguration
│   │   ├── config.js             # Lokale Konfiguration (nicht versioniert)
│   │   └── config.public.js     # Öffentliche Konfiguration
│   ├── routing/                   # Routing-Module
│   │   ├── routing.js            # Haupt-Routing-Logik
│   │   ├── routingUI.js          # UI-Handler
│   │   ├── routeState.js         # State Management
│   │   ├── routeVisualization.js # Route-Farben & Hover
│   │   ├── colorSchemes.js       # Farb-Schemas
│   │   ├── customModel.js        # Custom Routing Model
│   │   ├── gpxExport.js          # GPX-Export
│   │   └── heightgraph/          # Höhenprofil-Module
│   │       ├── heightgraph.js
│   │       ├── heightgraphCanvas.js
│   │       ├── heightgraphConfig.js
│   │       ├── heightgraphDrawing.js
│   │       ├── heightgraphInteractivity.js
│   │       ├── heightgraphStats.js
│   │       └── heightgraphUtils.js
│   ├── mapdata/                  # Karten-Datenquellen & Layer
│   │   ├── sources.js            # Datenquellen-Definitionen
│   │   ├── basicLayers.js        # Basis-Layer
│   │   ├── bikeLanesLayers.js    # Radinfrastruktur-Layer
│   │   └── missingStreetsLayers.js # Mapillary Missing Streets Layer
│   ├── ui/                       # UI-Komponenten
│   │   ├── setupBaseLayerControls.js
│   │   ├── panelPositioning.js
│   │   └── toggleHandlers.js
│   └── utils/                    # Utilities
│       ├── permalink.js          # Permalink-Funktionalität
│       └── geocoder.js           # Geocoding
└── thumbs/                       # Thumbnails für Basemaps
```

---

## Verwendung als Template

Dieses Repository dient als **Template-Repository** für neue Projekte. Die folgenden Repositories nutzen dieses Template als Basis:

- **missing_mapillary_gh-routing** - [https://github.com/vizsim/missing_mapillary_gh-routing] - *kommt noch*
- **custom_bicycle_gh-routing** - [https://github.com/vizsim/custom_bicycle_gh-routing] - *kommt noch*

> 💡 Um ein neues Projekt aus diesem Template zu erstellen, verwende die GitHub Template-Funktion oder forke dieses Repository.

---

## Lizenz

Die Lizenz wird in Kürze hinzugefügt.

---

## Credits

- **MapLibre GL JS**: Open-Source Kartenbibliothek
- **GraphHopper**: Open-Source Routing-Engine
- **OpenStreetMap**: Community-getriebene Kartendaten
- **Mapillary**: Street View Fotos und Coverage-Daten
- **FixMyCity** / **tilda-geo.de**: Vektortiles für Radinfrastruktur - [tilda-geo.de](https://tilda-geo.de)
- **OSM Verkehrswende**: Mapillary Missing Streets Daten - [osm-verkehrswende.org](https://www.osm-verkehrswende.org)
- **Sonny's Terrain Models**: Höhenmodelle (CC BY 4.0) - [sonny.4lima.de](https://sonny.4lima.de)
