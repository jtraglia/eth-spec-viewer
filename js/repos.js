/**
 * Repository definitions
 *
 * The viewer serves two upstream specs. Everything that differs between them -
 * where the data lives, which categories exist, how forks are ordered and
 * coloured - is declared here, so the rest of the app reads the active repo
 * rather than hardcoding consensus-specific knowledge.
 */

const CONSENSUS = {
  id: 'consensus',
  dataPath: version => `specs/consensus/${version}/spec.json`,
  versionsPath: 'specs/consensus/versions.json',

  // Display order of categories, alphabetical by display name
  categoryOrder: [
    'config_vars',
    'constant_vars',
    'dataclasses',
    'functions',
    'preset_vars',
    'ssz_objects',
    'custom_types'
  ],

  categoryNames: {
    'constant_vars': 'constants',
    'preset_vars': 'presets',
    'config_vars': 'configs',
    'custom_types': 'types',
    'dataclasses': 'dataclasses',
    'ssz_objects': 'ssz objects',
    'functions': 'functions'
  },

  // Categories rendered as a fork/value table instead of code
  variableCategories: ['constant_vars', 'preset_vars', 'config_vars'],

  ignoreForkNameInComparison: false,

  // In-progress EIP branches are not forks the viewer should list
  excludeFork: fork => fork.startsWith('EIP') || fork === 'WHISK',

  forkOrder: [
    'PHASE0',
    'ALTAIR',
    'BELLATRIX',
    'CAPELLA',
    'DENEB',
    'ELECTRA',
    'FULU',
    'GLOAS',
    'HEZE'
  ],

  forkNames: {
    'PHASE0': 'phase0',
    'ALTAIR': 'altair',
    'BELLATRIX': 'bellatrix',
    'CAPELLA': 'capella',
    'DENEB': 'deneb',
    'ELECTRA': 'electra',
    'FULU': 'fulu',
    'GLOAS': 'gloas',
    'HEZE': 'heze'
  },

  forkColors: {
    'PHASE0': '#6c757d',
    'ALTAIR': '#28a745',
    'BELLATRIX': '#007bff',
    'CAPELLA': '#6f42c1',
    'DENEB': '#e83e8c',
    'ELECTRA': '#ffc107',
    'FULU': '#17a2b8',
    'GLOAS': '#fd7e14',
    'HEZE': '#20c997'
  },

  forkLabels: {
    'PHASE0': '0',
    'ALTAIR': 'A',
    'BELLATRIX': 'B',
    'CAPELLA': 'C',
    'DENEB': 'D',
    'ELECTRA': 'E',
    'FULU': 'F',
    'GLOAS': 'G',
    'HEZE': 'H'
  }
};

const EXECUTION = {
  id: 'execution',
  dataPath: version => `specs/execution/${version}/spec.json`,
  versionsPath: 'specs/execution/versions.json',

  categoryOrder: [
    'classes',
    'constant_vars',
    'dataclasses',
    'functions',
    'custom_types'
  ],

  categoryNames: {
    'classes': 'classes',
    'constant_vars': 'constants',
    'dataclasses': 'dataclasses',
    'functions': 'functions',
    'custom_types': 'types'
  },

  // execution-specs has no mainnet/minimal split and no value tables; every
  // category is source code
  variableCategories: [],

  // Docstrings carry Sphinx cross-references that embed the fork's own name
  // (`~ethereum.forks.cancun.vm.Evm`). Left alone, that boilerplate makes
  // almost every item look like it changed in every fork.
  ignoreForkNameInComparison: true,

  excludeFork: () => false,

  // Superseded by the forkOrder the extractor writes into the data, but kept
  // as a sensible default if that key is ever missing
  forkOrder: [
    'FRONTIER',
    'HOMESTEAD',
    'DAO_FORK',
    'TANGERINE_WHISTLE',
    'SPURIOUS_DRAGON',
    'BYZANTIUM',
    'CONSTANTINOPLE',
    'ISTANBUL',
    'MUIR_GLACIER',
    'BERLIN',
    'LONDON',
    'ARROW_GLACIER',
    'GRAY_GLACIER',
    'PARIS',
    'SHANGHAI',
    'CANCUN',
    'PRAGUE',
    'OSAKA',
    'BPO1',
    'BPO2',
    'BPO3',
    'BPO4',
    'BPO5',
    'AMSTERDAM'
  ],

  forkNames: {},

  forkColors: {
    'FRONTIER': '#6c757d',
    'HOMESTEAD': '#7d8590',
    'DAO_FORK': '#8d6e63',
    'TANGERINE_WHISTLE': '#e8590c',
    'SPURIOUS_DRAGON': '#c92a2a',
    'BYZANTIUM': '#862e9c',
    'CONSTANTINOPLE': '#9c36b5',
    'ISTANBUL': '#364fc7',
    'MUIR_GLACIER': '#1864ab',
    'BERLIN': '#1098ad',
    'LONDON': '#0b7285',
    'ARROW_GLACIER': '#0ca678',
    'GRAY_GLACIER': '#495057',
    'PARIS': '#2b8a3e',
    'SHANGHAI': '#5c940d',
    'CANCUN': '#e67700',
    'PRAGUE': '#d9480f',
    'OSAKA': '#a61e4d',
    'BPO1': '#7950f2',
    'BPO2': '#6741d9',
    'BPO3': '#5f3dc4',
    'BPO4': '#5235ab',
    'BPO5': '#452c92',
    'AMSTERDAM': '#c2255c'
  },

  forkLabels: {
    'TANGERINE_WHISTLE': 'TAN',
    'SPURIOUS_DRAGON': 'SPU',
    'CONSTANTINOPLE': 'CON',
    'MUIR_GLACIER': 'MUI',
    'ARROW_GLACIER': 'ARR',
    'GRAY_GLACIER': 'GRA',
    'BPO1': 'B1',
    'BPO2': 'B2',
    'BPO3': 'B3',
    'BPO4': 'B4',
    'BPO5': 'B5'
  }
};

export const REPOS = {
  consensus: CONSENSUS,
  execution: EXECUTION
};

// Order the repo selector lists them in
export const REPO_ORDER = ['consensus', 'execution'];

export const DEFAULT_REPO = 'consensus';

let activeRepoId = DEFAULT_REPO;

/**
 * Get a repo definition by id
 */
export function getRepo(id) {
  return REPOS[id];
}

/**
 * Whether an id names a known repo
 */
export function isRepoId(id) {
  return Object.prototype.hasOwnProperty.call(REPOS, id);
}

/**
 * Get the repo currently being viewed
 */
export function getActiveRepo() {
  return REPOS[activeRepoId];
}

/**
 * Switch the active repo
 */
export function setActiveRepo(id) {
  if (isRepoId(id)) {
    activeRepoId = id;
  }
}

/**
 * Replace the active repo's fork order with the one shipped in its data.
 *
 * execution-specs gains forks often enough that a hardcoded list would go
 * stale, so the extractor writes the canonical order into the JSON.
 */
export function applyForkOrderFromData(data) {
  if (Array.isArray(data?.forkOrder) && data.forkOrder.length > 0) {
    getActiveRepo().forkOrder = data.forkOrder;
  }
}
