// Basic map layers (satellite, hillshade)

export function addBasicLayers(map) {
  // Raster layers
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
      type: "raster",
      source: "hillshade",
      layout: { visibility: "none" },
      paint: {
        "raster-opacity": 0.3
      }
    });
  }

  // Disable terrain initially
  map.setTerrain(null);
}

