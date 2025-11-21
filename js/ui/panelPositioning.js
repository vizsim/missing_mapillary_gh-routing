// Panel positioning logic - positions context panel below routing panel
// Handles responsive positioning for desktop and mobile

export function setupPanelPositioning() {
  const routingPanel = document.querySelector('.routing-panel');
  const contextPanel = document.querySelector('.context-panel');
  
  if (!routingPanel || !contextPanel) {
    return;
  }
  
  let isUpdating = false; // Flag to prevent infinite loops
  let updateTimeout = null;
  
  const updateContextPanelPosition = () => {
    // Prevent recursive calls
    if (isUpdating) return;
    isUpdating = true;
    
    // Clear any pending timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    // Force a reflow to get accurate measurements
    contextPanel.style.display = 'block';
    
    // Temporarily remove max-height from routing panel to get natural height
    routingPanel.style.maxHeight = 'none';
    
    // Force reflow
    void routingPanel.offsetHeight;
    
    const routingRect = routingPanel.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topPadding = 5; // Padding from top
    const padding = 10; // Padding between panels (increased for more space)
    const bottomPadding = 5; // Padding from bottom edge
    
    // Get attribution control height to avoid overlap (desktop) or bottom controls/geocoder (mobile)
    const isMobile = window.innerWidth <= 768;
    let bottomSpace = 0;
    let attributionHeight = 0;
    let attributionPadding = 0;
    
    if (isMobile) {
      // On mobile: account for bottom-left controls and geocoder
      const bottomControls = document.querySelector('#bottom-left-ui-container');
      const geocoder = document.querySelector('.geocoder');
      
      let controlsSpace = 0;
      let geocoderSpace = 0;
      
      if (bottomControls) {
        const controlsRect = bottomControls.getBoundingClientRect();
        // Controls are at bottom: 10px, so space needed = controls height + bottom offset (10px) + padding (10px)
        controlsSpace = controlsRect.height + 10 + 10; // Height + bottom: 10px + padding: 10px
      } else {
        controlsSpace = 70; // Fallback: ~50px controls + 10px bottom + 10px padding
      }
      
      if (geocoder) {
        const geocoderRect = geocoder.getBoundingClientRect();
        // Geocoder is at bottom: 40px, so space needed = geocoder height + bottom offset (40px) + padding (10px)
        geocoderSpace = geocoderRect.height + 40 + 10; // Height + bottom: 40px + padding: 10px
      } else {
        geocoderSpace = 100; // Fallback: ~50px geocoder + 40px bottom + 10px padding
      }
      
      // Use the larger value to ensure no overlap with either element
      bottomSpace = Math.max(controlsSpace, geocoderSpace);
    } else {
      // On desktop: account for attribution control
      const attributionControl = document.querySelector('.maplibregl-ctrl-attrib');
      attributionHeight = attributionControl ? attributionControl.offsetHeight : 0;
      attributionPadding = attributionHeight > 0 ? 5 : 0; // Extra padding if attribution exists
      bottomSpace = attributionHeight + attributionPadding; // Height + padding
    }
    
    // Calculate available space (accounting for top padding, bottom space)
    const availableViewportHeight = viewportHeight - topPadding - bottomPadding - bottomSpace;
    
    // Calculate available space
    const routingNaturalHeight = routingRect.height;
    const contextNaturalHeight = contextPanel.scrollHeight;
    
    let routingActualMaxHeight, contextActualMaxHeight;
    
    // Always position context panel directly below routing panel
    const totalNeededHeight = routingNaturalHeight + contextPanel.scrollHeight + padding;
    
    if (totalNeededHeight <= availableViewportHeight) {
      // Enough space: both panels get their natural size
      routingActualMaxHeight = 'none';
      contextActualMaxHeight = contextPanel.scrollHeight;
    } else {
      // Not enough space: limit routing panel
      const routingMaxHeight = availableViewportHeight - contextPanel.scrollHeight - padding;
      routingActualMaxHeight = `${routingMaxHeight}px`;
      contextActualMaxHeight = contextPanel.scrollHeight;
    }
    
    // Apply max-height to routing panel (only if it changed)
    if (routingPanel.style.maxHeight !== routingActualMaxHeight) {
      routingPanel.style.maxHeight = routingActualMaxHeight;
    }
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const updatedRoutingRect = routingPanel.getBoundingClientRect();
      const routingBottomCalculated = updatedRoutingRect.top + updatedRoutingRect.height;
      
      // Calculate maximum bottom position (accounting for attribution on desktop, or controls/geocoder on mobile)
      const maxBottom = viewportHeight - bottomSpace - bottomPadding;
      
      let contextTop, finalMaxHeight;
      
      // Always position context panel directly below routing panel
      contextTop = routingBottomCalculated + padding;
      
      // Calculate maximum height respecting bottom constraints (attribution on desktop, controls/geocoder on mobile)
      const maxContextHeightFromBottom = Math.max(0, maxBottom - contextTop); // Ensure non-negative
      
      // Use the smaller of contextActualMaxHeight and maxContextHeightFromBottom to avoid overlap
      finalMaxHeight = Math.min(contextActualMaxHeight, maxContextHeightFromBottom);
      
      // Position context panel
      contextPanel.style.top = `${contextTop}px`;
      contextPanel.style.maxHeight = `${finalMaxHeight}px`;
      // Only enable scrolling if content is taller than available space
      contextPanel.style.overflowY = contextNaturalHeight > finalMaxHeight ? 'auto' : 'visible';
      contextPanel.style.bottom = 'auto';
      contextPanel.style.display = 'block'; // Ensure it's visible
      
      // Dispatch event to signal that panel positioning is complete
      // This allows other code (like heightgraph drawing) to wait for positioning
      window.dispatchEvent(new CustomEvent('panelPositioningComplete', {
        detail: {
          routingPanelHeight: updatedRoutingRect.height,
          contextPanelTop: contextTop,
          contextPanelMaxHeight: finalMaxHeight
        }
      }));
      
      // Reset flag after a short delay to allow for any pending updates
      updateTimeout = setTimeout(() => {
        isUpdating = false;
      }, 50);
    });
  };
  
  // Debounced version for observer
  const debouncedUpdate = () => {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(() => {
      updateContextPanelPosition();
    }, 100);
  };
  
  // Update on load
  setTimeout(updateContextPanelPosition, 100);
  
  // Update on window resize (debounced)
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateContextPanelPosition, 150);
  });
  
  // Collapse/expand context panel handler
  const collapseContextBtn = document.getElementById('collapse-context-panel');
  if (collapseContextBtn) {
    collapseContextBtn.addEventListener('click', () => {
      const isCollapsed = contextPanel.classList.contains('collapsed');
      if (isCollapsed) {
        // Expand panel
        contextPanel.classList.remove('collapsed');
        collapseContextBtn.classList.remove('collapsed');
        collapseContextBtn.title = 'Einklappen';
      } else {
        // Collapse panel
        contextPanel.classList.add('collapsed');
        collapseContextBtn.classList.add('collapsed');
        collapseContextBtn.title = 'Ausklappen';
      }
      
      // Update panel positioning after collapse/expand
      setTimeout(() => {
        updateContextPanelPosition();
      }, 50);
    });
  }
  
  // Update when routing panel content changes (e.g., route calculated, heightgraph shown)
  // Only observe childList and class changes, not style (to avoid loops)
  const observer = new MutationObserver(() => {
    if (!isUpdating) {
      debouncedUpdate();
    }
  });
  
  observer.observe(routingPanel, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'] // Observe 'class' changes (including collapsed state)
  });
  
  // Also observe context panel class changes
  observer.observe(contextPanel, {
    attributes: true,
    attributeFilter: ['class'] // Observe 'class' changes (including collapsed state)
  });
  
  // Also update when route info changes (heightgraph appears/disappears)
  const routeInfo = document.getElementById('route-info');
  if (routeInfo) {
    observer.observe(routeInfo, { childList: true, subtree: true, attributes: true });
  }
  
  const heightgraphContainer = document.getElementById('heightgraph-container');
  if (heightgraphContainer) {
    observer.observe(heightgraphContainer, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['style'] 
    });
    
    // When heightgraph container becomes visible, redraw heightgraph after panel positioning
    // But only if it wasn't just drawn (to avoid duplicate drawings)
    let isDrawingHeightgraph = false;
    let lastDrawTime = 0;
    const heightgraphObserver = new MutationObserver((mutations) => {
      // Skip if we're already drawing to prevent duplicate calls
      if (isDrawingHeightgraph) return;
      
      // Skip if we just drew recently (within 1 second) to prevent duplicate drawings
      const now = Date.now();
      if (now - lastDrawTime < 1000) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const display = window.getComputedStyle(heightgraphContainer).display;
          if (display !== 'none' && window.routeState?.currentRouteData) {
            // Check if heightgraph was just drawn (has content)
            const canvas = document.getElementById('heightgraph-canvas');
            if (canvas && canvas.width > 0) {
              // Heightgraph already has content, just redraw after panel positioning
              // This happens when panel positioning changes the container size
              isDrawingHeightgraph = true;
              lastDrawTime = now;
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const { elevations, distance, encodedValues, coordinates } = window.routeState.currentRouteData;
                  if (elevations || Object.keys(encodedValues || {}).length > 0) {
                    import('../routing/heightgraph.js').then(({ drawHeightgraph }) => {
                      drawHeightgraph(
                        elevations || [], 
                        distance, 
                        encodedValues || {}, 
                        coordinates || []
                      );
                      // Reset flag after a delay
                      setTimeout(() => {
                        isDrawingHeightgraph = false;
                      }, 500);
                    });
                  } else {
                    isDrawingHeightgraph = false;
                  }
                });
              });
            }
          }
        }
      });
    });
    
    heightgraphObserver.observe(heightgraphContainer, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  // Update when routing panel is collapsed/expanded
  window.addEventListener('routingPanelToggled', () => {
    setTimeout(() => {
      updateContextPanelPosition();
    }, 50);
  });
}

