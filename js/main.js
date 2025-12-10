/**
 * Main application entry point for the Ethereum Consensus Specifications viewer
 */

import { initDarkMode } from './darkMode.js';
import { initResizable } from './resizable.js';
import { buildTree, filterTree, setOnItemSelectCallback } from './tree.js';
import { displaySpec, clearSpec, openForkInViewer, showItemNotFound } from './specViewer.js';
import { CATEGORY_TYPES, CATEGORY_ORDER, getForkDisplayName } from './constants.js';
import { initReferenceClickHandler, addToHistory, goBack, goForward, navigateToReference } from './references.js';

// Application state
const state = {
  data: null,
  currentItem: null,
  currentItemName: null, // Track item name separately for version changes
  forks: [],
  categories: [],
  activeForkFilter: null,
  activeTypeFilter: null,
  searchTerm: '',
  currentVersion: 'nightly',
  availableVersions: ['nightly']
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
  state.currentItemName = item.name;

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

// Expose current version for URL generation
window.getCurrentVersion = () => state.currentVersion;

/**
 * Handle direct links (URL hash)
 * Format: version/category-itemName or version/category-itemName-FORK
 * Legacy format: category-itemName or category-itemName-FORK
 */
function handleDirectLink() {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);

    // Check if hash contains version (has a slash)
    let version = null;
    let remainder = hash;

    if (hash.includes('/')) {
      const slashIndex = hash.indexOf('/');
      version = hash.substring(0, slashIndex);
      remainder = hash.substring(slashIndex + 1);
    }

    const parts = remainder.split('-');

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
      itemName = remainder;
    }

    // If a version was specified in the URL, switch to it first
    if (version && version !== state.currentVersion && state.availableVersions.includes(version)) {
      state.currentVersion = version;
      // Update the dropdown
      const select = document.getElementById('versionSelect');
      if (select) select.value = version;
      // Load the version data, then select the item
      loadVersionData(version).then(() => {
        selectItemByName(itemName, preferredFork);
      });
    } else {
      // Try to find and select the item in current version
      setTimeout(() => {
        selectItemByName(itemName, preferredFork);
      }, 500);
    }
  }
}

/**
 * Select an item by name
 */
function selectItemByName(itemName, preferredFork) {
  const treeNodes = document.querySelectorAll('.tree-node[data-name]');
  for (const node of treeNodes) {
    const name = node.dataset.name;
    if (name === itemName) {
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
}

/**
 * Discover available versions from versions.json
 */
async function discoverVersions() {
  try {
    const response = await fetch('pyspec/versions.json');
    if (response.ok) {
      const versions = await response.json();
      state.availableVersions = versions;
    }
  } catch (err) {
    // If versions.json doesn't exist, fall back to nightly only
    console.log('versions.json not found, using nightly only');
    state.availableVersions = ['nightly'];
  }
}

/**
 * Populate the version dropdown
 */
function populateVersionDropdown() {
  const select = document.getElementById('versionSelect');
  select.innerHTML = '';

  // Sort versions: nightly first, then tagged versions in reverse order (newest first)
  const sortedVersions = [...state.availableVersions].sort((a, b) => {
    if (a === 'nightly') return -1;
    if (b === 'nightly') return 1;
    // Reverse sort for semver (newest first)
    return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
  });

  sortedVersions.forEach(version => {
    const option = document.createElement('option');
    option.value = version;
    option.textContent = version;
    if (version === state.currentVersion) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

/**
 * Handle version change
 */
async function onVersionChange(version) {
  if (version === state.currentVersion) return;

  // Use tracked item name (persists even when item not found in a version)
  const itemNameToFind = state.currentItemName;

  state.currentVersion = version;

  // Update URL to reflect version change
  if (itemNameToFind && state.currentItem) {
    // If viewing an item, update the full hash
    const itemId = `${version}/${state.currentItem.category}-${itemNameToFind}`;
    history.replaceState(null, '', `#${itemId}`);
  } else if (itemNameToFind) {
    // Item name tracked but not found - just update version in URL
    history.replaceState(null, '', `#${version}/`);
  } else {
    // No item selected - just show version
    history.replaceState(null, '', `#${version}/`);
  }

  // Reload data for the new version (preserves search term and filters)
  await loadVersionData(version);

  // Try to re-select the same item in the new version
  if (itemNameToFind) {
    // Find the item in the new data
    let itemFound = false;
    const treeNodes = document.querySelectorAll('.tree-node[data-name]');
    for (const node of treeNodes) {
      if (node.dataset.name === itemNameToFind) {
        const itemData = node._itemData;
        if (itemData) {
          const label = node.querySelector('.tree-label');
          onItemSelect({ ...itemData, element: label }, false);
          label.scrollIntoView({ behavior: 'smooth', block: 'center' });
          itemFound = true;
        }
        break;
      }
    }

    // Show not found message if item doesn't exist in this version
    if (!itemFound) {
      showItemNotFound(itemNameToFind, version);
      state.currentItem = null;
      // Keep currentItemName so we can try again when version changes
    }
  }
}

/**
 * Load data for a specific version
 */
async function loadVersionData(version) {
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');

  loading.classList.remove('hidden');
  error.classList.add('hidden');

  // Save current filter states
  const savedForkFilter = state.activeForkFilter;
  const savedTypeFilter = state.activeTypeFilter;
  const savedSearchTerm = state.searchTerm;

  try {
    const response = await fetch(`pyspec/${version}/pyspec.json`);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }

    state.data = await response.json();
    state.forks = extractForks(state.data);

    // Build UI (this resets button states)
    buildForkFilters();
    buildTypeFilters();

    // Restore filter states
    state.activeForkFilter = savedForkFilter;
    state.activeTypeFilter = savedTypeFilter;
    state.searchTerm = savedSearchTerm;

    // Re-apply active states to buttons
    if (savedForkFilter) {
      const forkBtn = document.querySelector(`.fork-filter-btn[data-fork="${savedForkFilter}"]`);
      if (forkBtn) forkBtn.classList.add('active');
    }
    if (savedTypeFilter) {
      const typeBtn = document.querySelector(`.type-filter-btn[data-type="${savedTypeFilter}"]`);
      if (typeBtn) typeBtn.classList.add('active');
    }

    // Set up tree callback
    setOnItemSelectCallback(onItemSelect);

    // Build the navigation tree
    buildTree(state.data, state.forks);

    // Re-apply filters to tree
    if (savedForkFilter || savedTypeFilter || savedSearchTerm) {
      applyFilters();
    }

    // Handle direct links (only on initial load)
    if (!state.initialLoadComplete) {
      handleDirectLink();
      state.initialLoadComplete = true;
    }

    loading.classList.add('hidden');

  } catch (err) {
    console.error('Error loading data:', err);
    loading.classList.add('hidden');
    error.textContent = `Error loading specification data: ${err.message}`;
    error.classList.remove('hidden');
  }
}

/**
 * Load data and initialize the application
 */
async function loadData() {
  // Discover available versions
  await discoverVersions();

  // Check if URL hash specifies a version
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    if (hash.includes('/')) {
      const versionFromHash = hash.substring(0, hash.indexOf('/'));
      if (state.availableVersions.includes(versionFromHash)) {
        state.currentVersion = versionFromHash;
      }
    }
  }

  // Populate the version dropdown
  populateVersionDropdown();

  // Load data for the current version
  await loadVersionData(state.currentVersion);
}

/**
 * Initialize version selector
 */
function initVersionSelector() {
  const select = document.getElementById('versionSelect');
  select.addEventListener('change', () => {
    onVersionChange(select.value);
  });
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
  initVersionSelector();
  initReferenceClickHandler();
  loadData();
}

// Start the application
init();
