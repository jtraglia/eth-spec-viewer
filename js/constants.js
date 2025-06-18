/**
 * Constants used throughout the Ethereum Consensus Specifications viewer application
 * 
 * This module contains all the constants for fork colors, ordering, category types,
 * and display names used across the application.
 */

/**
 * Color palette for fork visualization (26 colors to maintain consistency)
 * Colors are assigned to forks in chronological order
 * @type {string[]}
 */
const FORK_COLOR_PALETTE = [
  "#6c757d", // 0 - Phase 0 - Genesis phase (gray)
  "#28a745", // 1 - Altair upgrade (green)
  "#007bff", // 2 - Bellatrix upgrade - The Merge (blue)
  "#6f42c1", // 3 - Capella upgrade - Staking withdrawals (purple)
  "#e83e8c", // 4 - Deneb upgrade - Proto-danksharding (pink)
  "#ffc107", // 5 - Electra upgrade - Validator experience improvements (yellow)
  "#c1c107", // 6 - Fulu upgrade - Future upgrade (greenish yellow)
  "#17a2b8", // 7 - Additional colors for future forks
  "#fd7e14", // 8
  "#20c997", // 9
  "#dc3545", // 10
  "#6610f2", // 11
  "#e83e8c", // 12
  "#795548", // 13
  "#607d8b", // 14
  "#ff5722", // 15
  "#9c27b0", // 16
  "#3f51b5", // 17
  "#2196f3", // 18
  "#00bcd4", // 19
  "#009688", // 20
  "#4caf50", // 21
  "#8bc34a", // 22
  "#cddc39", // 23
  "#ffeb3b", // 24
  "#ffc107"  // 25
];

/**
 * Default display names for known forks (fallback to title case)
 * @type {Object<string, string>}
 */
const DEFAULT_FORK_DISPLAY_NAMES = {
  PHASE0: "Phase 0",
  ALTAIR: "Altair", 
  BELLATRIX: "Bellatrix",
  CAPELLA: "Capella",
  DENEB: "Deneb",
  ELECTRA: "Electra",
  FULU: "Fulu"
};

/**
 * Dynamic fork configuration populated from JSON data
 * @type {Object}
 */
export let DYNAMIC_FORK_CONFIG = {
  order: [],
  colors: {},
  displayNames: {}
};

/**
 * Initialize fork configuration from JSON data
 * @param {Object} data - The JSON data containing fork information
 */
export function initializeForkConfig(data) {
  // Use mainnet data as primary source, fallback to minimal
  const networkData = data.mainnet || data.minimal;
  if (!networkData) {
    console.warn('No network data found for fork initialization');
    return;
  }

  // Extract fork names using same logic as existing code
  const discoveredForks = Object.keys(networkData).filter(forkName => {
    const upper = forkName.toUpperCase();
    return !upper.startsWith("EIP") && upper !== "WHISK";
  }).map(f => f.toUpperCase());

  // Sort chronologically - maintain known order for existing forks, append new ones
  const knownOrder = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU'];
  const knownForks = knownOrder.filter(fork => discoveredForks.includes(fork));
  const unknownForks = discoveredForks.filter(fork => !knownOrder.includes(fork)).sort();
  
  DYNAMIC_FORK_CONFIG.order = [...knownForks, ...unknownForks];
  
  // Assign colors from palette
  DYNAMIC_FORK_CONFIG.colors = {};
  DYNAMIC_FORK_CONFIG.order.forEach((fork, index) => {
    DYNAMIC_FORK_CONFIG.colors[fork] = FORK_COLOR_PALETTE[index % FORK_COLOR_PALETTE.length];
  });
  
  // Set display names
  DYNAMIC_FORK_CONFIG.displayNames = {};
  DYNAMIC_FORK_CONFIG.order.forEach(fork => {
    DYNAMIC_FORK_CONFIG.displayNames[fork] = DEFAULT_FORK_DISPLAY_NAMES[fork] || 
      fork.charAt(0) + fork.slice(1).toLowerCase();
  });
  
  console.log('Fork configuration initialized:', DYNAMIC_FORK_CONFIG);
}

/**
 * Backward compatibility exports that use dynamic config
 */
export const FORK_COLORS = new Proxy({}, {
  get(target, prop) {
    return DYNAMIC_FORK_CONFIG.colors[prop] || FORK_COLOR_PALETTE[0];
  }
});

export const FORK_ORDER = new Proxy([], {
  get(target, prop) {
    if (prop === 'length') return DYNAMIC_FORK_CONFIG.order.length;
    if (prop === 'indexOf') return DYNAMIC_FORK_CONFIG.order.indexOf.bind(DYNAMIC_FORK_CONFIG.order);
    if (prop === 'filter') return DYNAMIC_FORK_CONFIG.order.filter.bind(DYNAMIC_FORK_CONFIG.order);
    if (prop === Symbol.iterator) return DYNAMIC_FORK_CONFIG.order[Symbol.iterator].bind(DYNAMIC_FORK_CONFIG.order);
    return DYNAMIC_FORK_CONFIG.order[prop];
  }
});

/**
 * Get color for a fork
 * @param {string} fork - Fork name
 * @returns {string} Color hex code
 */
export function getForkColor(fork) {
  return DYNAMIC_FORK_CONFIG.colors[fork.toUpperCase()] || FORK_COLOR_PALETTE[0];
}

/**
 * Get chronological order of forks
 * @returns {string[]} Array of fork names in chronological order
 */
export function getForkOrder() {
  return DYNAMIC_FORK_CONFIG.order;
}

/**
 * Get display name for a fork
 * @param {string} fork - Fork name
 * @returns {string} Display name
 */
export function getForkDisplayName(fork) {
  return DYNAMIC_FORK_CONFIG.displayNames[fork.toUpperCase()] || fork;
}

/**
 * Populate fork filter dropdowns with available forks from data
 * @param {Object} data - The JSON data containing fork information
 */
export function populateForkFilters(data) {
  // Initialize the fork configuration first
  initializeForkConfig(data);
  
  const forkFilter = document.getElementById('forkFilter');
  const changeFilter = document.getElementById('changeFilter');
  
  if (!forkFilter || !changeFilter) return;
  
  // Clear existing options (except the first placeholder)
  forkFilter.innerHTML = '<option value="">Filter by fork...</option>';
  changeFilter.innerHTML = '<option value="">Filter by changes...</option>';
  
  // Add options for each discovered fork
  DYNAMIC_FORK_CONFIG.order.forEach(fork => {
    const displayName = getForkDisplayName(fork);
    
    // Add to fork filter
    const forkOption = document.createElement('option');
    forkOption.value = fork;
    forkOption.textContent = displayName;
    forkFilter.appendChild(forkOption);
    
    // Add to change filter
    const changeOption = document.createElement('option');
    changeOption.value = fork;
    changeOption.textContent = `Changed in ${displayName}`;
    changeFilter.appendChild(changeOption);
  });
}

/**
 * Internal category type identifiers
 * Maps semantic names to the actual field names used in the JSON data
 * @type {Object<string, string>}
 */
export const CATEGORY_TYPES = {
  /** @type {string} Constant variables that don't change between networks */
  CONSTANTS: 'constant_vars',
  /** @type {string} Preset variables that may differ between networks */
  PRESETS: 'preset_vars',
  /** @type {string} Configuration variables specific to network deployments */
  CONFIG: 'config_vars',
  /** @type {string} Custom type definitions and aliases */
  CUSTOM_TYPES: 'custom_types',
  /** @type {string} Python dataclass definitions */
  DATACLASSES: 'dataclasses',
  /** @type {string} SSZ (Simple Serialize) object definitions */
  SSZ_OBJECTS: 'ssz_objects',
  /** @type {string} Function definitions and implementations */
  FUNCTIONS: 'functions'
};

/**
 * Human-readable display names for each category type
 * Used in the UI for section headers and filter options
 * @type {Object<string, string>}
 */
export const CATEGORY_DISPLAY_NAMES = {
  [CATEGORY_TYPES.CONSTANTS]: 'Constants',
  [CATEGORY_TYPES.PRESETS]: 'Preset Variables',
  [CATEGORY_TYPES.CONFIG]: 'Configuration Variables',
  [CATEGORY_TYPES.CUSTOM_TYPES]: 'Custom Types',
  [CATEGORY_TYPES.DATACLASSES]: 'Dataclasses',
  [CATEGORY_TYPES.SSZ_OBJECTS]: 'SSZ Objects',
  [CATEGORY_TYPES.FUNCTIONS]: 'Functions'
};