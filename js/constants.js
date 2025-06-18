/**
 * Constants used throughout the Ethereum Consensus Specifications viewer application
 * 
 * This module contains all the constants for fork colors, ordering, category types,
 * and display names used across the application.
 */

/**
 * Color mapping for different Ethereum consensus forks
 * Used for visual distinction in badges and UI elements
 * @type {Object<string, string>}
 */
export const FORK_COLORS = {
  /** @type {string} Phase 0 - Genesis phase (gray) */
  PHASE0:    "#6c757d",
  /** @type {string} Altair upgrade (green) */
  ALTAIR:    "#28a745",
  /** @type {string} Bellatrix upgrade - The Merge (blue) */
  BELLATRIX: "#007bff",
  /** @type {string} Capella upgrade - Staking withdrawals (purple) */
  CAPELLA:   "#6f42c1",
  /** @type {string} Deneb upgrade - Proto-danksharding (pink) */
  DENEB:     "#e83e8c",
  /** @type {string} Electra upgrade - Validator experience improvements (yellow) */
  ELECTRA:   "#ffc107",
  /** @type {string} Fulu upgrade - Future upgrade (greenish yellow) */
  FULU:      "#c1c107",
};

/**
 * Chronological order of Ethereum consensus forks
 * Used for sorting and displaying forks in correct temporal sequence
 * @type {string[]}
 */
export const FORK_ORDER = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU'];

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