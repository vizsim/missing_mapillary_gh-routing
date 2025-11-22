# Missing Mapillary GraphHopper Routing

**Proof of Concept** - Eine interaktive Web-Anwendung für Routenplanung mit GraphHopper-Integration, speziell optimiert für die Identifikation und Planung von Routen entlang von Straßen ohne Mapillary-Abdeckung. Die Anwendung visualisiert Mapillary Coverage-Daten und hilft dabei, Lücken in der Street View-Abdeckung zu identifizieren.

---

## Features

- **Mapillary Coverage Routing**: Routenplanung mit Fokus auf Mapillary-Abdeckung - identifiziere Straßen ohne Street View-Abdeckung
- **Farbcodierte Route-Visualisierung**: Darstellung der Route basierend auf Mapillary Coverage, Surface und Road Class - sofort sichtbar, welche Abschnitte noch keine Mapillary-Abdeckung haben
- **Missing Streets Layer**: Visualisierung von Straßen ohne Mapillary-Abdeckung (Daten von OSM Verkehrswende) als Kontext-Layer
- **Interaktive Routenplanung**: Start- und Endpunkt per Klick oder Geocoding setzen
- **Multi-Profile Routing**: Unterstützung für verschiedene Verkehrsmittel (Auto, Fahrrad, etc.)
- **Höhenprofil**: Interaktives Canvas-basiertes Höhenprofil mit Hover-Funktionalität und Encoded Values Overlay
- **Kontext-Layer**: Radinfrastruktur (OpenStreetMap, FixMyCity) und Mapillary Missing Streets mit Toggle-Funktionalität
- **Permalink**: Vollständige State-Speicherung in der URL (Kartenposition, Route, Profil, Layer)
- **GPX-Export**: Export berechneter Routen als GPX-Datei für Navigation oder weitere Analyse

---

## Technische Details

### Framework & Bibliotheken
- **MapLibre GL JS** (v5.6.0): Kartenvisualisierung
- **GraphHopper Routing API**: Routenberechnung
- **Photon Geocoder**: Adresssuche und Geocoding

### Datenquellen
- **GraphHopper API**: Routenberechnung mit Mapillary Coverage-Daten
- **OpenStreetMap**: Basiskartendaten
- **OSM Verkehrswende**: Mapillary Missing Streets Daten - [osm-verkehrswende.org](https://www.osm-verkehrswende.org)
- **FixMyCity** / **tilda-geo.de**: Vektortiles für Radinfrastruktur - [tilda-geo.de](https://tilda-geo.de)
- **MapTiler** (optional): Hillshade und Terrain-Daten
- **Sonny's Terrain Models**: Höhenmodelle für Elevation-Daten (CC BY 4.0) - [sonny.4lima.de](https://sonny.4lima.de)

---

## Projektstruktur

```
missing_mapillary_gh-routing/
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

## Verwendung

Die Anwendung kann direkt im Browser geöffnet werden. 
https://vizsim.github.io/missing_mapillary_gh-routing/

---

## Lizenz

Die Lizenz wird in Kürze hinzugefügt.

---

## Credits

- **MapLibre GL JS**: Open-Source Kartenbibliothek
- **GraphHopper**: Open-Source Routing-Engine
- **OpenStreetMap**: Community-getriebene Kartendaten
- **Mapillary**: Street View Fotos und Coverage-Daten
- **OSM Verkehrswende**: Mapillary Missing Streets Daten - [osm-verkehrswende.org](https://www.osm-verkehrswende.org)
- **FixMyCity** / **tilda-geo.de**: Vektortiles für Radinfrastruktur - [tilda-geo.de](https://tilda-geo.de)
- **Sonny's Terrain Models**: Höhenmodelle (CC BY 4.0) - [sonny.4lima.de](https://sonny.4lima.de)
