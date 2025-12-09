/**
 * Constants and utilities for the specification viewer
 */

// Category types mapping
export const CATEGORY_TYPES = {
  'constant_vars': 'constants',
  'preset_vars': 'presets',
  'config_vars': 'configs',
  'custom_types': 'types',
  'dataclasses': 'dataclasses',
  'ssz_objects': 'ssz objects',
  'functions': 'functions'
};

// Category order for display (alphabetical by display name)
export const CATEGORY_ORDER = [
  'config_vars',      // configs
  'constant_vars',    // constants
  'dataclasses',      // dataclasses
  'functions',        // functions
  'preset_vars',      // presets
  'ssz_objects',      // ssz objects
  'custom_types'      // types
];

// Fork display names
export const FORK_DISPLAY_NAMES = {
  'PHASE0': 'phase0',
  'ALTAIR': 'altair',
  'BELLATRIX': 'bellatrix',
  'CAPELLA': 'capella',
  'DENEB': 'deneb',
  'ELECTRA': 'electra',
  'FULU': 'fulu'
};

// Fork colors
export const FORK_COLORS = {
  'PHASE0': '#6c757d',
  'ALTAIR': '#28a745',
  'BELLATRIX': '#007bff',
  'CAPELLA': '#6f42c1',
  'DENEB': '#e83e8c',
  'ELECTRA': '#ffc107',
  'FULU': '#17a2b8',
  'GLOAS': '#fd7e14'
};

// Fork short labels for badges
export const FORK_SHORT_LABELS = {
  'PHASE0': '0',
  'ALTAIR': 'A',
  'BELLATRIX': 'B',
  'CAPELLA': 'C',
  'DENEB': 'D',
  'ELECTRA': 'E',
  'FULU': 'F',
  'GLOAS': 'G'
};

/**
 * Get fork display name
 */
export function getForkDisplayName(fork) {
  return FORK_DISPLAY_NAMES[fork] || fork.toLowerCase();
}

/**
 * Get fork color
 */
export function getForkColor(fork) {
  return FORK_COLORS[fork] || '#6c757d';
}

/**
 * Get fork short label for badges
 */
export function getForkShortLabel(fork) {
  return FORK_SHORT_LABELS[fork] || fork.charAt(0).toUpperCase();
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category) {
  return CATEGORY_TYPES[category] || category;
}
