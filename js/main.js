/**
 * Main application entry point
 */

import { appState } from './state.js';
import { initDarkMode } from './darkMode.js';
import { addVariables } from './variables.js';
import { addItems } from './items.js';
import { applyFilters, clearFilters } from './filters.js';
import { CATEGORY_TYPES } from './constants.js';

/**
 * Handle direct links to items
 */
function handleDirectLinks() {
  // Check if URL has a hash
  if (window.location.hash) {
    const itemId = window.location.hash.substring(1);

    // After the data is loaded and rendered
    setTimeout(() => {
      const item = document.getElementById(itemId);
      if (item) {
        // Open all parent details elements
        let parent = item.parentElement;
        while (parent) {
          if (parent.tagName === 'DETAILS') {
            parent.setAttribute('open', 'true');
          }
          parent = parent.parentElement;
        }

        // Open the item itself
        item.setAttribute('open', 'true');

        // Scroll to the item (with a slight delay to let rendering complete)
        setTimeout(() => {
          item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }, 500);
  }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Search input event
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');

  searchInput.addEventListener('input', function() {
    const hasText = this.value.length > 0;
    searchClear.classList.toggle('hidden', !hasText);
    applyFilters();
  });

  searchClear.addEventListener('click', function() {
    searchInput.value = '';
    this.classList.add('hidden');
    applyFilters();
  });

  // Filter buttons
  document.getElementById('applyFilters').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);

  // Diff toggle
  document.getElementById('showDiffToggle').addEventListener('change', function() {
    loadData(); // Reload and re-render to apply diff highlighting
  });

  // Share button click event (delegation)
  document.addEventListener('click', function(e) {
    if (e.target.closest('.share-button')) {
      const shareButton = e.target.closest('.share-button');
      const link = shareButton.dataset.link;

      // Copy link to clipboard
      navigator.clipboard.writeText(link).then(() => {
        // Show a brief visual confirmation
        shareButton.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          shareButton.innerHTML = '<i class="fas fa-link"></i>';
        }, 1000);
      });
    }
  });
}

/**
 * Initialize deprecated items
 */
function initDeprecatedItems() {
  // Add any deprecated items here
  // Example: appState.addDeprecatedItem('SOME_DEPRECATED_ITEM');
}

/**
 * Load data and render everything
 */
async function loadData() {
  try {
    const resp = await fetch("pyspec.json");
    if (!resp.ok) throw new Error(`HTTP error: ${resp.status}`);
    const jsonData = await resp.json();
    
    appState.setJsonData(jsonData);

    addVariables(jsonData, CATEGORY_TYPES.CONSTANTS);
    addVariables(jsonData, CATEGORY_TYPES.PRESETS);
    addVariables(jsonData, CATEGORY_TYPES.CONFIG);
    addItems(jsonData, CATEGORY_TYPES.CUSTOM_TYPES, true);
    addItems(jsonData, CATEGORY_TYPES.DATACLASSES);
    addItems(jsonData, CATEGORY_TYPES.SSZ_OBJECTS);
    addItems(jsonData, CATEGORY_TYPES.FUNCTIONS);

    // Apply any active filters
    applyFilters();

    // Handle direct links
    handleDirectLinks();

  } catch (err) {
    console.error("Error loading data:", err);
    // Display error message to user
    document.getElementById('noResults').innerHTML = `
      <p>Error loading specification data: ${err.message}</p>
      <p>Make sure pyspec.json is available in the same directory as this HTML file.</p>
    `;
    document.getElementById('noResults').classList.remove('hidden');
  }

  Prism.highlightAll();
}

/**
 * Fallback data function to show example data if JSON loading fails
 */
function loadFallbackData() {
  console.log("Loading fallback data");

  // Example data structure that matches expected format
  const fallbackData = {
    mainnet: {
      PHASE0: {
        constant_vars: {
          "EXAMPLE_CONSTANT": ["uint64", "1234"],
          "ANOTHER_CONSTANT": ["string", "example value"]
        },
        preset_vars: {
          "EXAMPLE_PRESET": ["uint64", "5678"]
        },
        config_vars: {
          "EXAMPLE_CONFIG": ["string", "test"]
        },
        custom_types: {
          "ExampleType": "type ExampleType = uint64"
        },
        dataclasses: {
          "ExampleClass": "class ExampleClass(Container):\n    field1: uint64\n    field2: boolean"
        },
        ssz_objects: {
          "ExampleSSZ": "class ExampleSSZ(Container):\n    field1: uint64\n    field2: Bytes32"
        },
        functions: {
          "example_function": "def example_function(x: uint64) -> uint64:\n    return x * 2"
        }
      }
    },
    minimal: {
      PHASE0: {
        constant_vars: {
          "EXAMPLE_CONSTANT": ["uint64", "1234"],
        },
        preset_vars: {
          "EXAMPLE_PRESET": ["uint64", "1234"]
        }
      }
    }
  };

  // If fetch fails to load data after 3 seconds, use fallback data
  setTimeout(() => {
    if (Object.keys(appState.getJsonData()).length === 0) {
      console.log("Using fallback data");
      appState.setJsonData(fallbackData);

      addVariables(fallbackData, CATEGORY_TYPES.CONSTANTS);
      addVariables(fallbackData, CATEGORY_TYPES.PRESETS);
      addVariables(fallbackData, CATEGORY_TYPES.CONFIG);
      addItems(fallbackData, CATEGORY_TYPES.CUSTOM_TYPES, true);
      addItems(fallbackData, CATEGORY_TYPES.DATACLASSES);
      addItems(fallbackData, CATEGORY_TYPES.SSZ_OBJECTS);
      addItems(fallbackData, CATEGORY_TYPES.FUNCTIONS);

      // Apply any active filters
      applyFilters();

      // Add notice about fallback data
      const notice = document.createElement('div');
      notice.style.background = '#ffe6cc';
      notice.style.color = '#663c00';
      notice.style.padding = '10px';
      notice.style.marginBottom = '20px';
      notice.style.borderRadius = '4px';
      notice.innerHTML = '<strong>Note:</strong> Displaying example data. Could not load pyspec.json.';
      document.body.insertBefore(notice, document.body.firstChild);

      Prism.highlightAll();
    }
  }, 3000);
}

// Initialize application
initDarkMode();
initEventListeners();
initDeprecatedItems();
loadData();
loadFallbackData(); // Add fallback data if the main load fails