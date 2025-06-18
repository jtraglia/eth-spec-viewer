/**
 * Main application entry point
 */

import { appState } from './state.js';
import { initDarkMode } from './darkMode.js';
import { addVariables } from './variables.js';
import { addItems } from './items.js';
import { applyFilters, clearFilters, debouncedApplyFilters } from './filters.js';
import { CATEGORY_TYPES } from './constants.js';
import { logger, ErrorHandler } from './logger.js';

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
  try {
    logger.info('Initializing event listeners');
    
    // Search input event
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');

    if (!searchInput || !searchClear) {
      throw new Error('Required search elements not found');
    }

    searchInput.addEventListener('input', function() {
      try {
        const hasText = this.value.length > 0;
        searchClear.classList.toggle('hidden', !hasText);
        debouncedApplyFilters();
      } catch (error) {
        ErrorHandler.handle(error, 'Search input handler');
      }
    });

    searchClear.addEventListener('click', function() {
      try {
        searchInput.value = '';
        this.classList.add('hidden');
        applyFilters();
      } catch (error) {
        ErrorHandler.handle(error, 'Search clear handler');
      }
    });

    // Filter buttons
    const applyButton = document.getElementById('applyFilters');
    const clearButton = document.getElementById('clearFilters');
    
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        try {
          applyFilters();
        } catch (error) {
          ErrorHandler.handle(error, 'Apply filters');
        }
      });
    }
    
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        try {
          clearFilters();
        } catch (error) {
          ErrorHandler.handle(error, 'Clear filters');
        }
      });
    }

    // Diff toggle
    const diffToggle = document.getElementById('showDiffToggle');
    if (diffToggle) {
      diffToggle.addEventListener('change', function() {
        try {
          logger.debug('Diff toggle changed, reloading data');
          loadData(); // Reload and re-render to apply diff highlighting
        } catch (error) {
          ErrorHandler.handle(error, 'Diff toggle handler');
        }
      });
    }

    // Share button click event (delegation)
    document.addEventListener('click', function(e) {
      try {
        if (e.target.closest('.share-button')) {
          const shareButton = e.target.closest('.share-button');
          const link = shareButton.dataset.link;

          if (!link) {
            logger.warn('Share button clicked but no link found');
            return;
          }

          // Copy link to clipboard
          navigator.clipboard.writeText(link).then(() => {
            logger.debug('Link copied to clipboard:', link);
            // Show a brief visual confirmation
            shareButton.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
              shareButton.innerHTML = '<i class="fas fa-link"></i>';
            }, 1000);
          }).catch(error => {
            ErrorHandler.handle(error, 'Clipboard copy', true);
          });
        }
      } catch (error) {
        ErrorHandler.handle(error, 'Share button handler');
      }
    });
    
    logger.info('Event listeners initialized successfully');
  } catch (error) {
    ErrorHandler.handle(error, 'Event listener initialization', true);
  }
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
  return ErrorHandler.handleAsync(async () => {
    logger.info('Starting data load');
    
    const resp = await fetch("pyspec.json");
    if (!resp.ok) {
      throw new Error(`Failed to fetch pyspec.json: HTTP ${resp.status} ${resp.statusText}`);
    }
    
    const jsonData = await resp.json();
    logger.info('Successfully loaded JSON data', { size: JSON.stringify(jsonData).length });
    
    appState.setJsonData(jsonData);

    // Render different categories
    logger.debug('Rendering variables and items');
    addVariables(jsonData, CATEGORY_TYPES.CONSTANTS);
    addVariables(jsonData, CATEGORY_TYPES.PRESETS);
    addVariables(jsonData, CATEGORY_TYPES.CONFIG);
    addItems(jsonData, CATEGORY_TYPES.CUSTOM_TYPES, true);
    addItems(jsonData, CATEGORY_TYPES.DATACLASSES);
    addItems(jsonData, CATEGORY_TYPES.SSZ_OBJECTS);
    addItems(jsonData, CATEGORY_TYPES.FUNCTIONS);

    // Apply any active filters
    logger.debug('Applying initial filters');
    applyFilters();

    // Handle direct links
    handleDirectLinks();

    // Syntax highlighting
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
    
    logger.info('Data load completed successfully');
  }, 'Data loading', 3).catch(error => {
    logger.error('Failed to load data after all retries:', error);
    
    // Display user-friendly error message
    const noResults = document.getElementById('noResults');
    if (noResults) {
      noResults.innerHTML = `
        <p><strong>Error loading specification data:</strong> ${error.message}</p>
        <p>Please check that pyspec.json is available and try refreshing the page.</p>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      `;
      noResults.classList.remove('hidden');
    }
    
    throw error; // Re-throw for any calling code
  });
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
(async function initializeApp() {
  try {
    logger.info('Starting application initialization');
    
    // Initialize core functionality
    initDarkMode();
    initEventListeners();
    initDeprecatedItems();
    
    // Load data with fallback
    try {
      await loadData();
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.warn('Main data loading failed, trying fallback data');
      loadFallbackData();
    }
    
  } catch (error) {
    ErrorHandler.handle(error, 'Application initialization', true);
  }
})();