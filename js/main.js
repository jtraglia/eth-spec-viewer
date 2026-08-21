/**
 * Main application entry point for the Ethereum Specifications viewer
 */

import { initDarkMode } from './darkMode.js';
import { initResizable } from './resizable.js';
import { buildTree, filterTree, setOnItemSelectCallback } from './tree.js';
import { displaySpec, clearSpec, openForkInViewer, showItemNotFound } from './specViewer.js';
import { getCategoryOrder, getCategoryDisplayName, getForkOrder, getForkDisplayName } from './constants.js';
import { REPO_ORDER, DEFAULT_REPO, getRepo, getActiveRepo, setActiveRepo, isRepoId, applyForkOrderFromData } from './repos.js';
import { initReferenceClickHandler, addToHistory, goBack, goForward, navigateToReference, clearHistory } from './references.js';

// Mobile sidebar state
let isMobileMenuOpen = false;

/**
 * Check if we're in mobile view
 */
function isMobileView() {
  return window.innerWidth <= 768;
}

/**
 * Toggle mobile sidebar
 */
function toggleMobileSidebar(forceClose = false) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuToggle = document.getElementById('menuToggle');

  if (forceClose || isMobileMenuOpen) {
    // Close sidebar
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    isMobileMenuOpen = false;
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  } else {
    // Open sidebar
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    isMobileMenuOpen = true;
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', 'true');
    }
  }
}

/**
 * Close mobile sidebar if open
 */
function closeMobileSidebar() {
  if (isMobileMenuOpen) {
    toggleMobileSidebar(true);
  }
}

/**
 * Initialize mobile sidebar functionality
 */
function initMobileSidebar() {
  const menuToggle = document.getElementById('menuToggle');
  const overlay = document.getElementById('sidebarOverlay');

  // Toggle button click
  if (menuToggle) {
    menuToggle.addEventListener('click', () => toggleMobileSidebar());
  }

  // Overlay click closes sidebar
  if (overlay) {
    overlay.addEventListener('click', () => closeMobileSidebar());
  }

  // Escape key closes sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobileMenuOpen) {
      closeMobileSidebar();
    }
  });

  // Close sidebar on window resize if going to desktop view
  window.addEventListener('resize', () => {
    if (!isMobileView() && isMobileMenuOpen) {
      closeMobileSidebar();
    }
  });
}

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
  availableVersions: ['nightly'],
  currentRepo: DEFAULT_REPO,
  // Version list and last-viewed version, remembered per repo so switching
  // back and forth does not lose your place
  versionsByRepo: {},
  lastVersionByRepo: {}
};

/**
 * Extract forks from data
 */
function extractForks(data) {
  const networkData = data.mainnet || data.minimal;
  if (!networkData) return [];

  const repo = getActiveRepo();
  const discoveredForks = Object.keys(networkData)
    .map(f => f.toUpperCase())
    .filter(f => !repo.excludeFork(f));

  // Sort by known order, then alphabetically for unknown forks
  const forkOrder = getForkOrder();
  const knownForks = forkOrder.filter(f => discoveredForks.includes(f));
  const unknownForks = discoveredForks.filter(f => !forkOrder.includes(f)).sort();

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

  getCategoryOrder().forEach(key => {
    const displayName = getCategoryDisplayName(key);
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
  displaySpec(item);

  // Open the preferred fork if specified
  if (preferredFork) {
    openForkInViewer(preferredFork);
  }

  // Show spec viewer, hide welcome
  document.getElementById('welcome').classList.add('hidden');
  document.getElementById('specViewer').classList.remove('hidden');

  // Close mobile sidebar after selecting an item
  if (isMobileView()) {
    closeMobileSidebar();
  }
}

// Expose for reference navigation
window.selectItem = onItemSelect;

// Expose current version for URL generation
window.getCurrentVersion = () => state.currentVersion;

/**
 * Parse a URL hash into its parts.
 *
 * Current format: repo/version/category-itemName[-fork]
 * Legacy formats: version/category-itemName[-fork], or category-itemName[-fork]
 *
 * Legacy hashes predate execution-specs support and always meant consensus,
 * so links shared before this feature keep working.
 */
function parseHash(hash) {
  const segments = hash.split('/');

  let repo = null;
  let version = null;
  let remainder = hash;

  if (segments.length >= 3) {
    [repo, version] = segments;
    remainder = segments.slice(2).join('/');
  } else if (segments.length === 2) {
    // Could be either repo/rest or the legacy version/rest
    if (isRepoId(segments[0])) {
      repo = segments[0];
    } else {
      version = segments[0];
    }
    remainder = segments[1];
  }

  if (!isRepoId(repo)) repo = DEFAULT_REPO;

  // Fork names are matched against the repo the link points at, not the one
  // currently loaded
  const knownForks = getRepo(repo).forkOrder.map(f => f.toLowerCase());
  const parts = remainder.split('-');
  const lastPart = parts[parts.length - 1].toLowerCase();

  let preferredFork = null;
  let itemName;

  if (parts.length >= 3 && knownForks.includes(lastPart)) {
    preferredFork = lastPart.toUpperCase();
    itemName = parts.slice(1, -1).join('-');
  } else if (parts.length >= 2) {
    itemName = parts.slice(1).join('-');
  } else {
    itemName = remainder;
  }

  return { repo, version, itemName, preferredFork };
}

/**
 * Handle direct links (URL hash)
 */
function handleDirectLink() {
  if (!window.location.hash) return;

  const { version, itemName, preferredFork } = parseHash(window.location.hash.substring(1));

  // The repo is already applied before the initial load, so only the version
  // may still need switching here
  if (version && version !== state.currentVersion && state.availableVersions.includes(version)) {
    state.currentVersion = version;
    const select = document.getElementById('versionSelect');
    if (select) select.value = version;
    loadVersionData(version).then(() => {
      selectItemByName(itemName, preferredFork);
    });
  } else {
    setTimeout(() => {
      selectItemByName(itemName, preferredFork);
    }, 500);
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
  const repo = getActiveRepo();

  if (state.versionsByRepo[repo.id]) {
    state.availableVersions = state.versionsByRepo[repo.id];
    return;
  }

  let versions = ['nightly'];
  try {
    const response = await fetch(repo.versionsPath);
    if (response.ok) {
      const entries = await response.json();
      // versions.json is a list of {version, date} already ordered newest
      // first. Older files were a plain list of names, so accept both.
      versions = entries.map(entry =>
        typeof entry === 'string' ? entry : entry.version
      );
    }
  } catch (err) {
    // If versions.json doesn't exist, fall back to nightly only
    console.log(`${repo.versionsPath} not found, using nightly only`);
  }

  state.versionsByRepo[repo.id] = versions;
  state.availableVersions = versions;
}

/**
 * Populate the repo dropdown
 */
function populateRepoDropdown() {
  const select = document.getElementById('repoSelect');
  if (!select) return;

  select.innerHTML = '';
  REPO_ORDER.forEach(id => {
    const option = document.createElement('option');
    option.value = id;
    // The id doubles as the label, so the dropdown always matches the URL
    option.textContent = id;
    if (id === state.currentRepo) option.selected = true;
    select.appendChild(option);
  });
}

/**
 * Handle repo change
 *
 * The two repos share no fork names, versions or items, so this resets the
 * view rather than trying to carry the current selection across.
 */
async function onRepoChange(repoId) {
  if (repoId === state.currentRepo || !isRepoId(repoId)) return;

  state.lastVersionByRepo[state.currentRepo] = state.currentVersion;

  state.currentRepo = repoId;
  setActiveRepo(repoId);

  state.currentItem = null;
  state.currentItemName = null;
  state.activeForkFilter = null;
  state.activeTypeFilter = null;
  clearHistory();
  clearSpec();

  await discoverVersions();

  // Return to whichever version was last open in this repo
  const remembered = state.lastVersionByRepo[repoId];
  state.currentVersion = state.availableVersions.includes(remembered)
    ? remembered
    : (state.availableVersions.includes('nightly') ? 'nightly' : state.availableVersions[0]);

  populateVersionDropdown();
  history.replaceState(null, '', `#${buildHash()}`);

  await loadVersionData(state.currentVersion);
}

/**
 * Populate the version dropdown
 */
function populateVersionDropdown() {
  const select = document.getElementById('versionSelect');
  select.innerHTML = '';

  // versions.json is sorted newest first by the date each version was cut, so
  // the file's order is the display order for every repo
  state.availableVersions.forEach(version => {
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
 * Build the URL hash for the current repo, version and (optional) item
 */
function buildHash(itemName, category) {
  const base = `${state.currentRepo}/${state.currentVersion}/`;
  return itemName && category ? `${base}${category}-${itemName}` : base;
}

/**
 * Handle version change
 */
async function onVersionChange(version) {
  if (version === state.currentVersion) return;

  // Use tracked item name (persists even when item not found in a version)
  const itemNameToFind = state.currentItemName;

  state.currentVersion = version;

  // Clear navigation history when switching versions
  clearHistory();

  // Update URL to reflect version change
  state.lastVersionByRepo[state.currentRepo] = version;
  history.replaceState(null, '', `#${buildHash(
    itemNameToFind,
    state.currentItem && state.currentItem.category
  )}`);

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
    const response = await fetch(getActiveRepo().dataPath(version));
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }

    state.data = await response.json();

    // execution-specs ships its own fork order, since it gains forks too often
    // for a hardcoded list to stay correct
    applyForkOrderFromData(state.data);

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
  // The repo has to be settled before anything else, since it decides which
  // versions exist and where the data lives
  let versionFromHash = null;
  if (window.location.hash) {
    const parsed = parseHash(window.location.hash.substring(1));
    state.currentRepo = parsed.repo;
    versionFromHash = parsed.version;
  }
  setActiveRepo(state.currentRepo);

  populateRepoDropdown();

  await discoverVersions();

  if (versionFromHash && state.availableVersions.includes(versionFromHash)) {
    state.currentVersion = versionFromHash;
  } else if (!state.availableVersions.includes(state.currentVersion)) {
    state.currentVersion = state.availableVersions[0] || 'nightly';
  }

  populateVersionDropdown();

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
 * Initialize repo selector
 */
function initRepoSelector() {
  const select = document.getElementById('repoSelect');
  if (!select) return;
  select.addEventListener('change', () => {
    onRepoChange(select.value);
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
  initMobileSidebar();
  initSearch();
  initNavigation();
  initRepoSelector();
  initVersionSelector();
  initReferenceClickHandler();
  loadData();
}

// Start the application
init();
