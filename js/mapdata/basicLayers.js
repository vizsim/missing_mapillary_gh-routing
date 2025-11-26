// Basic map layers (osm, satellite, hillshade)

export function addBasicLayers(map) {
  // Raster layers
  map.addLayer({
    id: "osm-layer",
    type: "raster",
    source: "osm",
    layout: { visibility: "none" }
  });

  map.addLayer({
    id: "satellite-layer",
    type: "raster",
    source: "satellite",
    layout: { visibility: "none" }
  });

  // Hillshade layer
  if (map.getSource("hillshade")) {
    map.addLayer({
      id: "hillshade-layer",
      type: "hillshade",
      source: "hillshade",
      layout: { visibility: "none" },
      paint: {
        "hillshade-shadow-color": "#000000",
        "hillshade-highlight-color": "#ffffff",
        "hillshade-accent-color": "#000000"
      }
    });
  }

  // Disable terrain initially
  map.setTerrain(null);
}

