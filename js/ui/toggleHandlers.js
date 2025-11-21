// Toggle handlers for various UI elements (Hillshade, Terrain, Bike Lanes, Missing Streets, etc.)

export function setupToggleHandlers() {
  // Toggle logic for Hillshade and Terrain
  const toggleHillshade = document.getElementById('toggleHillshade');
  const toggleTerrain = document.getElementById('toggleTerrain');
  
  if (toggleHillshade) {
    toggleHillshade.addEventListener('change', (e) => {
      if (window.map && window.map.getLayer('hillshade-layer')) {
        const visibility = e.target.checked ? 'visible' : 'none';
        window.map.setLayoutProperty('hillshade-layer', 'visibility', visibility);
      }
    });
  }

  if (toggleTerrain) {
    toggleTerrain.addEventListener('change', (e) => {
      if (window.map) {
        if (e.target.checked && window.map.getSource('terrain')) {
          window.map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
        } else {
          window.map.setTerrain(null);
        }
      }
    });
  }

  // Map Settings Menu Toggle
  const mapSettingsToggle = document.getElementById('map-settings-toggle');
  const mapSettingsPanel = document.getElementById('map-settings-panel');
  const mapSettingsMenu = document.getElementById('map-settings-menu');
  
  if (mapSettingsToggle && mapSettingsPanel && mapSettingsMenu) {
    mapSettingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mapSettingsPanel.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!mapSettingsMenu.contains(e.target)) {
        mapSettingsPanel.classList.add('hidden');
      }
    });
  }

  // Bike lanes toggle
  const toggleBikelanes = document.getElementById('toggle-bikelanes');
  const bikelanesLegend = document.getElementById('bikelanes-legend');
  const toggleBikelanesSegment = document.getElementById('toggle-bikelanes-segment');
  const bikelanesSegmentContent = document.getElementById('bikelanes-segment-content');

  if (toggleBikelanes) {
    toggleBikelanes.addEventListener('change', (e) => {
      if (window.map) {
        const visibility = e.target.checked ? 'visible' : 'none';
        const layers = [
          'bike-lanes-needsClarification',
          'bike-lanes-gehweg',
          'bike-lanes-kfz',
          'bike-lanes-fussverkehr',
          'bike-lanes-eigenstaendig',
          'bike-lanes-baulich'
        ];
        
        layers.forEach(layerId => {
          if (window.map.getLayer(layerId)) {
            window.map.setLayoutProperty(layerId, 'visibility', visibility);
          }
        });

        // Show/hide legend and content
        if (bikelanesLegend) {
          bikelanesLegend.style.display = e.target.checked ? 'flex' : 'none';
        }
        // Auto-expand when enabled, auto-collapse when disabled
        if (bikelanesSegmentContent) {
          if (e.target.checked) {
            bikelanesSegmentContent.classList.remove('collapsed');
          } else {
            bikelanesSegmentContent.classList.add('collapsed');
          }
        }
      }
    });
  }

  // Toggle bike lanes segment (click on header to expand/collapse)
  if (toggleBikelanesSegment && bikelanesSegmentContent) {
    toggleBikelanesSegment.addEventListener('click', (e) => {
      // Don't toggle if clicking on the switch itself
      if (e.target.closest('.switch-toggle')) {
        return;
      }
      const isCollapsed = bikelanesSegmentContent.classList.contains('collapsed');
      bikelanesSegmentContent.classList.toggle('collapsed');
    });
  }

  // Missing streets toggle
  const toggleMissingStreets = document.getElementById('toggle-missing-streets');
  const missingStreetsLegend = document.getElementById('missing-streets-legend');
  const toggleMissingStreetsSegment = document.getElementById('toggle-missing-streets-segment');
  const missingStreetsSegmentContent = document.getElementById('missing-streets-segment-content');

  if (toggleMissingStreets) {
    toggleMissingStreets.addEventListener('change', (e) => {
      if (window.map) {
        const visibility = e.target.checked ? 'visible' : 'none';
        const layers = [
          // 'missing-streets-missing-pathclasses', // vorerst ausgeschaltet
          'missing-streets-missing-roads',
          'missing-streets-missing-bikelanes',
          // 'missing-streets-regular-pathclasses', // vorerst ausgeschaltet
          'missing-streets-regular-roads',
          'missing-streets-regular-bikelanes',
          // 'missing-streets-pano-pathclasses', // vorerst ausgeschaltet
          'missing-streets-pano-roads',
          'missing-streets-pano-bikelanes'
        ];
        
        layers.forEach(layerId => {
          if (window.map.getLayer(layerId)) {
            window.map.setLayoutProperty(layerId, 'visibility', visibility);
          }
        });

        // Auto-expand when enabled, auto-collapse when disabled
        if (missingStreetsSegmentContent) {
          if (e.target.checked) {
            missingStreetsSegmentContent.classList.remove('collapsed');
          } else {
            missingStreetsSegmentContent.classList.add('collapsed');
          }
        }
      }
    });
  }

  // Toggle missing streets segment (click on header to expand/collapse)
  if (toggleMissingStreetsSegment && missingStreetsSegmentContent) {
    toggleMissingStreetsSegment.addEventListener('click', (e) => {
      // Don't toggle if clicking on the switch itself
      if (e.target.closest('.switch-toggle')) {
        return;
      }
      const isCollapsed = missingStreetsSegmentContent.classList.contains('collapsed');
      missingStreetsSegmentContent.classList.toggle('collapsed');
    });
  }
}

