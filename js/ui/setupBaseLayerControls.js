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

      map.setLayoutProperty("satellite-layer", "visibility", isSatellite ? "visible" : "none");

      document.querySelectorAll(".basemap-thumb, .basemap-btn").forEach(t => t.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}
