/**
 * Constants used throughout the application
 */

export const FORK_COLORS = {
  PHASE0:    "#6c757d", // gray
  ALTAIR:    "#28a745", // green
  BELLATRIX: "#007bff", // blue
  CAPELLA:   "#6f42c1", // purple
  DENEB:     "#e83e8c", // pink
  ELECTRA:   "#ffc107", // yellow
  FULU:      "#c1c107", // greenish yellow
};

export const FORK_ORDER = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU'];

export const CATEGORY_TYPES = {
  CONSTANTS: 'constant_vars',
  PRESETS: 'preset_vars',
  CONFIG: 'config_vars',
  CUSTOM_TYPES: 'custom_types',
  DATACLASSES: 'dataclasses',
  SSZ_OBJECTS: 'ssz_objects',
  FUNCTIONS: 'functions'
};

export const CATEGORY_DISPLAY_NAMES = {
  [CATEGORY_TYPES.CONSTANTS]: 'Constants',
  [CATEGORY_TYPES.PRESETS]: 'Preset Variables',
  [CATEGORY_TYPES.CONFIG]: 'Configuration Variables',
  [CATEGORY_TYPES.CUSTOM_TYPES]: 'Custom Types',
  [CATEGORY_TYPES.DATACLASSES]: 'Dataclasses',
  [CATEGORY_TYPES.SSZ_OBJECTS]: 'SSZ Objects',
  [CATEGORY_TYPES.FUNCTIONS]: 'Functions'
};