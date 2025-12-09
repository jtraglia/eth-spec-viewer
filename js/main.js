/**
 * Main application entry point for the Ethereum Consensus Specifications viewer
 */

import { initDarkMode } from './darkMode.js';
import { initResizable } from './resizable.js';
import { buildTree, filterTree, setOnItemSelectCallback } from './tree.js';
import { displaySpec, clearSpec, openForkInViewer } from './specViewer.js';
import { CATEGORY_TYPES, CATEGORY_ORDER, getForkDisplayName } from './constants.js';
import { initReferenceClickHandler, addToHistory, goBack, goForward, navigateToReference } from './references.js';

// Application state
const state = {
  data: null,
  currentItem: null,
  forks: [],
  categories: [],
  activeForkFilter: null,
  activeTypeFilter: null,
  searchTerm: ''
};

/**
 * Extract forks from data
 */
function extractForks(data) {
  const networkData = data.mainnet || data.minimal;
  if (!networkData) return [];

  const knownOrder = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU'];
  const discoveredForks = Object.keys(networkData)
    .filter(f => !f.toUpperCase().startsWith('EIP') && f.toUpperCase() !== 'WHISK')
    .map(f => f.toUpperCase());

  // Sort by known order, then alphabetically for unknown forks
  const knownForks = knownOrder.filter(f => discoveredForks.includes(f));
  const unknownForks = discoveredForks.filter(f => !knownOrder.includes(f)).sort();

  return [...knownForks, ...unknownForks];
}

/**
 * Build fork filter buttons
 */
function buildForkFilters() {
  const container = document.getElementById('forkFilters');
  container.innerHTML = '';

  state.forks.forEach(fork => {
    const btn = document.createElement('button');
    btn.className = 'fork-filter-btn';
    btn.textContent = getForkDisplayName(fork);
    btn.dataset.fork = fork;

    btn.addEventListener('click', () => {
      // Toggle filter
      if (state.activeForkFilter === fork) {
        state.activeForkFilter = null;
        btn.classList.remove('active');
      } else {
        // Remove active from all fork buttons
        container.querySelectorAll('.fork-filter-btn').forEach(b => b.classList.remove('active'));
        state.activeForkFilter = fork;
        btn.classList.add('active');
      }
      applyFilters();
    });

    container.appendChild(btn);
  });
}

/**
 * Build type filter buttons
 */
function buildTypeFilters() {
  const container = document.getElementById('typeFilters');
  container.innerHTML = '';

  CATEGORY_ORDER.forEach(key => {
    const displayName = CATEGORY_TYPES[key];
    const btn = document.createElement('button');
    btn.className = 'type-filter-btn';
    btn.textContent = displayName;
    btn.dataset.type = key;

    btn.addEventListener('click', () => {
      // Toggle filter
      if (state.activeTypeFilter === key) {
        state.activeTypeFilter = null;
        btn.classList.remove('active');
      } else {
        // Remove active from all type buttons
        container.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
        state.activeTypeFilter = key;
        btn.classList.add('active');
      }
      applyFilters();
    });

    container.appendChild(btn);
  });
}

/**
 * Apply all filters to the tree
 */
function applyFilters() {
  filterTree(state.activeForkFilter, state.activeTypeFilter, state.searchTerm);
}

/**
 * Initialize search functionality
 */
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');

  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);

    const hasText = searchInput.value.length > 0;
    searchClear.classList.toggle('hidden', !hasText);

    debounceTimer = setTimeout(() => {
      state.searchTerm = searchInput.value.toLowerCase();
      applyFilters();
    }, 300);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    state.searchTerm = '';
    applyFilters();
  });
}

/**
 * Handle item selection from tree
 * @param {Object} item - The item to display
 * @param {boolean} addHistory - Whether to add to navigation history
 * @param {string} preferredFork - The fork to open (null for latest)
 */
function onItemSelect(item, addHistory = true, preferredFork = null) {
  state.currentItem = item;

  // Update active state in tree
  document.querySelectorAll('.tree-label.active').forEach(el => el.classList.remove('active'));
  if (item.element) {
    item.element.classList.add('active');
  }

  // Add to navigation history (include fork if specified)
  if (addHistory) {
    addToHistory(item.name, preferredFork);
  }

  // Display the spec
  displaySpec(item, state.data);

  // Open the preferred fork if specified
  if (preferredFork) {
    openForkInViewer(preferredFork);
  }

  // Show spec viewer, hide welcome
  document.getElementById('welcome').classList.add('hidden');
  document.getElementById('specViewer').classList.remove('hidden');
}

// Expose for reference navigation
window.selectItem = onItemSelect;

/**
 * Handle direct links (URL hash)
 * Format: category-itemName or category-itemName-FORK
 */
function handleDirectLink() {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const parts = hash.split('-');

    // Check if last part is a fork name
    const knownForks = ['phase0', 'altair', 'bellatrix', 'capella', 'deneb', 'electra', 'fulu', 'gloas'];
    let preferredFork = null;
    let itemName = null;

    const lastPart = parts[parts.length - 1].toLowerCase();
    if (parts.length >= 3 && knownForks.includes(lastPart)) {
      // Format: category-itemName-fork
      preferredFork = lastPart.toUpperCase(); // Convert back to uppercase for internal use
      itemName = parts.slice(1, -1).join('-');
    } else if (parts.length >= 2) {
      // Format: category-itemName
      itemName = parts.slice(1).join('-');
    } else {
      itemName = hash;
    }

    // Try to find and select the item
    setTimeout(() => {
      const treeNodes = document.querySelectorAll('.tree-node[data-name]');
      for (const node of treeNodes) {
        const name = node.dataset.name;
        if (name === itemName || name === hash) {
          // Found the item
          const label = node.querySelector('.tree-label');
          if (label) {
            // Expand parent nodes
            let parent = node.parentElement;
            while (parent) {
              if (parent.classList.contains('tree-children')) {
                parent.classList.remove('collapsed');
                const parentNode = parent.previousElementSibling;
                if (parentNode) {
                  const icon = parentNode.querySelector('.tree-icon');
                  if (icon) icon.textContent = '▼';
                }
              }
              parent = parent.parentElement;
            }

            // Get item data and select with preferred fork
            const itemData = node._itemData;
            if (itemData) {
              onItemSelect({ ...itemData, element: label }, true, preferredFork);
            } else {
              label.click();
            }

            label.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      }
    }, 500);
  }
}

/**
 * Load data and initialize the application
 */
async function loadData() {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  loading.classList.remove('hidden');

  try {
    const response = await fetch('pyspec.json');
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }

    state.data = await response.json();
    state.forks = extractForks(state.data);

    // Build UI
    buildForkFilters();
    buildTypeFilters();

    // Set up tree callback
    setOnItemSelectCallback(onItemSelect);

    // Build the navigation tree
    buildTree(state.data, state.forks);

    // Handle direct links
    handleDirectLink();

    loading.classList.add('hidden');

  } catch (err) {
    console.error('Error loading data:', err);
    loading.classList.add('hidden');
    error.textContent = `Error loading specification data: ${err.message}`;
    error.classList.remove('hidden');
  }
}

/**
 * Initialize navigation buttons
 */
function initNavigation() {
  const backButton = document.getElementById('navBack');
  const forwardButton = document.getElementById('navForward');

  if (backButton) {
    backButton.addEventListener('click', () => {
      const entry = goBack();
      if (entry) {
        navigateToReference(entry.name, false, entry.fork);
      }
    });
  }

  if (forwardButton) {
    forwardButton.addEventListener('click', () => {
      const entry = goForward();
      if (entry) {
        navigateToReference(entry.name, false, entry.fork);
      }
    });
  }
}

/**
 * Initialize the application
 */
function init() {
  initDarkMode();
  initResizable();
  initSearch();
  initNavigation();
  initReferenceClickHandler();
  loadData();
}

// Start the application
init();
