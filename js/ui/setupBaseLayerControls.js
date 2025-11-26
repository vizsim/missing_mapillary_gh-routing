//import { updatePermalink } from '../utils/permalink.js';

export function setupBaseLayerControls(map, isInitializingRef) {
  document.querySelectorAll('input[name="color-style"]').forEach(rb => {
    rb.addEventListener("change", () => {
     // updatePermalink(map, isInitializingRef);
    });
  });

  // Support both old .basemap-thumb and new .basemap-btn
  document.querySelectorAll(".basemap-thumb, .basemap-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedMap = btn.dataset.map;
      const isSatellite = selectedMap === "satellite";
      const isOsm = selectedMap === "osm";
      const isStandard = selectedMap === "standard";

      // Show/hide satellite layer
      map.setLayoutProperty("satellite-layer", "visibility", isSatellite ? "visible" : "none");
      
      // Show/hide OSM layer
      if (map.getLayer("osm-layer")) {
        map.setLayoutProperty("osm-layer", "visibility", isOsm ? "visible" : "none");
      }

      // For standard, hide both raster layers (use style.json)
      if (isStandard) {
        map.setLayoutProperty("satellite-layer", "visibility", "none");
        if (map.getLayer("osm-layer")) {
          map.setLayoutProperty("osm-layer", "visibility", "none");
        }
      }

      document.querySelectorAll(".basemap-thumb, .basemap-btn").forEach(t => t.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}
