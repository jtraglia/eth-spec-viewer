/**
 * Utility functions
 */

import { FORK_COLORS, FORK_ORDER } from './constants.js';

/**
 * Get color for a specific fork
 * @param {string} forkName - Name of the fork
 * @returns {string} Hex color code
 */
export function getForkColor(forkName) {
  const up = forkName.toUpperCase();
  return FORK_COLORS[up] || "#17a2b8"; // fallback = teal
}

/**
 * Check if a phase should be included
 * @param {string} phaseName - Name of the phase
 * @returns {boolean} Whether the phase should be included
 */
export function phaseIncluded(phaseName) {
  return !phaseName.toUpperCase().startsWith("EIP") 
    && phaseName.toUpperCase() != "WHISK";
}

/**
 * Get list of included forks from preset data
 * @param {Object} presetData - Preset data object
 * @returns {string[]} Array of included fork names
 */
export function getIncludedForks(presetData) {
  if (!presetData) return [];
  return Object.keys(presetData).filter(phaseIncluded);
}

/**
 * Parse fork name from variable name
 * @param {string} varName - Variable name
 * @param {string[]} knownForkNames - List of known fork names
 * @returns {{base: string, fork: string|null}} Parsed base name and fork
 */
export function parseForkName(varName, knownForkNames) {
  const varNameUpper = varName.toUpperCase();
  for (const forkNameUpper of knownForkNames) {
    const suffix = "_" + forkNameUpper;
    if (varNameUpper.endsWith(suffix)) {
      const base = varName.slice(0, varName.length - suffix.length);
      return { base, fork: forkNameUpper };
    }
  }
  return { base: varName, fork: null };
}

/**
 * Parse value fields
 * @param {Array} fields - Value fields array
 * @returns {{type: string, value: string}} Parsed type and value
 */
export function parseValue(fields) {
  return {
    type: fields[0] ?? "Unknown",
    value: fields[1] ?? "N/A",
  };
}

/**
 * Compare fork groups in ascending order (chronological)
 * @param {string} a - First fork name
 * @param {string} b - Second fork name
 * @returns {number} Comparison result
 */
export function forkGroupCompareAscending(a, b) {
  const aIndex = FORK_ORDER.indexOf(a.toUpperCase());
  const bIndex = FORK_ORDER.indexOf(b.toUpperCase());
  
  // If both forks are in the known order, use that
  if (aIndex !== -1 && bIndex !== -1) {
    return aIndex - bIndex;
  }
  
  // If only one is in the known order, prioritize it
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;
  
  // If neither is in the known order, use alphabetical
  return a.localeCompare(b);
}

/**
 * Compare fork groups in descending order (reverse chronological)
 * @param {string} a - First fork name
 * @param {string} b - Second fork name
 * @returns {number} Comparison result
 */
export function forkGroupCompareDescending(a, b) {
  return forkGroupCompareAscending(b, a);
}

/**
 * Generate a unique ID for an item
 * @param {string} category - Category of the item
 * @param {string} name - Name of the item
 * @returns {string} Generated ID
 */
export function generateItemId(category, name) {
  // Convert to URL-friendly format
  const urlName = name.replace(/[^\w-]+/g, '_');
  return `${category}-${urlName}`;
}

/**
 * Create share link for an item
 * @param {string} itemId - ID of the item
 * @returns {string} Full URL with hash
 */
export function createShareLink(itemId) {
  const url = new URL(window.location.href);
  url.hash = itemId;
  return url.href;
}

/**
 * Highlight differences between two pieces of text
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 * @returns {string} HTML with highlighted differences
 */
export function highlightDiff(oldText, newText) {
  if (!oldText || !newText) return newText;

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Highlight entire lines that are different
  const result = [];
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    if (i >= newLines.length) {
      // Line was removed
      result.push(`<div class="diff-highlight-removed">${oldLines[i]}</div>`);
    } else if (i >= oldLines.length) {
      // Line was added
      result.push(`<div class="diff-highlight-added">${newLines[i]}</div>`);
    } else if (oldLines[i] !== newLines[i]) {
      // Line was changed
      result.push(`<div class="diff-highlight-removed">${oldLines[i]}</div>`);
      result.push(`<div class="diff-highlight-added">${newLines[i]}</div>`);
    } else {
      // Line is the same
      result.push(newLines[i]);
    }
  }

  return result.join('\n');
}