// 📦 Routing
import { setupRouting } from './js/routing/routing.js';

// 📦 UI & Interaktion
import { setupBaseLayerControls } from './js/ui/setupBaseLayerControls.js';
import { setupPanelPositioning } from './js/ui/panelPositioning.js';
import { setupToggleHandlers } from './js/ui/toggleHandlers.js';

// 📦 Map Data
import { addBasicSources } from './js/mapdata/sources.js';
import { addBasicLayers } from './js/mapdata/basicLayers.js';
import { addBikeLanesLayers } from './js/mapdata/bikeLanesLayers.js';
import { addMissingStreetsLayers } from './js/mapdata/missingStreetsLayers.js';

// 📦 Geocoder
import { setupPhotonGeocoder } from './js/utils/geocoder.js';

// 📦 Permalink
import { setupPermalink } from './js/utils/permalink.js';

let MAPTILER_API_KEY = '';

const isLocalhost = location.hostname === "localhost";

// Set thumbnail background images (wait for DOM to be ready)
function setupThumbnails() {
  const standardThumb = document.querySelector('[data-map="standard"]');
  const satelliteThumb = document.querySelector('[data-map="satellite"]');
  if (standardThumb) {
    standardThumb.style.backgroundImage = "url('./thumbs/thumb-standard.png')";
  }
  if (satelliteThumb) {
    satelliteThumb.style.backgroundImage = "url('./thumbs/thumb-satellite.png')";
  }
}

// Set thumbnails when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupThumbnails);
} else {
  setupThumbnails();
}

(async () => {
  try {
    const config = await import(isLocalhost ? './js/config/config.js' : './js/config/config.public.js');
    ({ MAPTILER_API_KEY } = config);
    console.log(`🔑 ${isLocalhost ? "Lokale config.js" : "config.public.js"} geladen`);

    initMap();

  } catch (err) {
    console.error("❌ Konfig konnte nicht geladen werden:", err);
    // Fallback: ohne API Key starten
    initMap();
  }
})();

async function initMap() {
  // Load pmtiles protocol
  const pmtilesBaseURL = "https://f003.backblazeb2.com/file/nettobreite/";
  const protocol = new pmtiles.Protocol(name => `${pmtilesBaseURL}${name}`);
  maplibregl.addProtocol("pmtiles", protocol.tile);

  window.map = new maplibregl.Map({
    container: "map",
    style: "./style.json",
    center: [13.42113, 52.47676], // Default center (Berlin)
    zoom: 12,                  // Default zoom
    minZoom: 7,
    maxZoom: 20
  });

  // Setup permalink functionality (reads URL params and updates URL on map move)
  setupPermalink(map);

  map.on("load", () => {
    initializeMapModules(map);
    setupUI(map);
    setupRouting(map);
  });
}


function addNavigationControl(map) {
  const nav = new maplibregl.NavigationControl();

  const customNavContainer = document.getElementById("custom-nav-control");
  if (customNavContainer) {
    customNavContainer.appendChild(nav.onAdd(map));

    // Kompass-Reset aktivieren
    setTimeout(() => {
      const compass = customNavContainer.querySelector('.maplibregl-ctrl-compass');
      if (compass) {
        compass.addEventListener('click', () => {
          map.setPitch(0);
          map.easeTo({ bearing: 0 });
        });
      }
    }, 100);
  }
}

function setupUI(map) {
  setupBaseLayerControls(map, { value: true });
}

function initializeMapModules(map) {
  setupPhotonGeocoder(map);
  addNavigationControl(map);
  addBasicSources(map, MAPTILER_API_KEY);
  addBasicLayers(map);
  addBikeLanesLayers(map);
  addMissingStreetsLayers(map);
}



// Setup UI handlers
document.addEventListener('DOMContentLoaded', () => {
  setupToggleHandlers();
  setupPanelPositioning();
});
