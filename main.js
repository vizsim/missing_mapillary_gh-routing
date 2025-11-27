// 📦 Routing
import { setupRouting } from './js/routing/routing.js';

// 📦 UI & Interaktion
import { setupBaseLayerControls } from './js/ui/setupBaseLayerControls.js';
import { setupPanelPositioning } from './js/ui/panelPositioning.js';
import { setupToggleHandlers } from './js/ui/toggleHandlers.js';
import { setupContextMenu } from './js/ui/contextMenu.js';

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
  const osmThumb = document.querySelector('[data-map="osm"]');
  const satelliteThumb = document.querySelector('[data-map="satellite"]');
  if (standardThumb) {
    standardThumb.style.backgroundImage = "url('./thumbs/thumb-standard.png')";
  }
  if (osmThumb) {
    osmThumb.style.backgroundImage = "url('./thumbs/thumb-osm.png')";
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
    // Expected behavior: config.js might not exist locally (it's in .gitignore)
    // Fallback to public config or continue without API key
    if (isLocalhost && err.message && err.message.includes('Failed to fetch')) {
      console.warn("⚠️ Lokale config.js nicht gefunden, verwende config.public.js als Fallback");
      try {
        const publicConfig = await import('./js/config/config.public.js');
        ({ MAPTILER_API_KEY } = publicConfig);
        console.log("🔑 config.public.js geladen (Fallback)");
      } catch (fallbackErr) {
        console.warn("⚠️ Konfig konnte nicht geladen werden, starte ohne API Key:", fallbackErr.message);
      }
    } else {
      console.warn("⚠️ Konfig konnte nicht geladen werden, starte ohne API Key:", err.message);
    }
    // Continue initialization even without API key
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
    setupContextMenu(map);
    updateExternalLinks(map);
  });

  // Update external links on map move/zoom
  map.on('moveend', () => updateExternalLinks(map));
  map.on('zoomend', () => updateExternalLinks(map));
}

function updateExternalLinks(map) {
  if (!map) return;

  const center = map.getCenter();
  const zoom = map.getZoom();

  // Update radinfra link
  const radinfraLink = document.getElementById('radinfra-link');
  if (radinfraLink) {
    const lat = center.lat.toFixed(3);
    const lng = center.lng.toFixed(3);
    // Format: ?map={zoom}/{lat}/{lng}&config=1v92rco.7h39.4pt3i8&v=2
    radinfraLink.href = `https://tilda-geo.de/regionen/radinfra?map=${zoom}/${lat}/${lng}&config=1v92rco.7h39.4pt3i8&v=2`;
  }

  // Update osm-verkehrswende link
  const osmLink = document.getElementById('osm-verkehrswende-link');
  if (osmLink) {
    const lat = center.lat.toFixed(2);
    const lng = center.lng.toFixed(2);
    // Format: ?map={zoom}/{lng}/{lat}&anzeige=current_all
    // Note: order is zoom/lng/lat (different from radinfra)
    osmLink.href = `https://www.osm-verkehrswende.org/mapillary/map/?map=${zoom}/${lng}/${lat}&anzeige=current_all`;
  }
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
