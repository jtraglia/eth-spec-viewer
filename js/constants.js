/**
 * Fork and category helpers for the specification viewer
 *
 * These all resolve against whichever repo is currently active, so callers do
 * not need to know which spec they are rendering. See repos.js for the
 * per-repo definitions.
 */

import { getActiveRepo } from './repos.js';

/**
 * Categories of the active repo, in display order
 */
export function getCategoryOrder() {
  return getActiveRepo().categoryOrder;
}

/**
 * Chronological fork order of the active repo
 */
export function getForkOrder() {
  return getActiveRepo().forkOrder;
}

/**
 * Whether a fork's own name should be ignored when detecting changes
 */
export function ignoresForkNameInComparison() {
  return getActiveRepo().ignoreForkNameInComparison === true;
}

/**
 * Whether a category is rendered as a fork/value table rather than as code
 */
export function isVariableCategory(category) {
  return getActiveRepo().variableCategories.includes(category);
}

/**
 * Get fork display name
 */
export function getForkDisplayName(fork) {
  return getActiveRepo().forkNames[fork] || fork.toLowerCase();
}

/**
 * Get fork color
 */
export function getForkColor(fork) {
  return getActiveRepo().forkColors[fork] || '#6c757d';
}

/**
 * Get fork short label for badges
 *
 * Falls back to the first three characters, which keeps badges distinguishable
 * for repos with many similarly-named forks.
 */
export function getForkShortLabel(fork) {
  const repo = getActiveRepo();
  if (repo.forkLabels[fork]) return repo.forkLabels[fork];
  return fork.slice(0, 3).toUpperCase();
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category) {
  return getActiveRepo().categoryNames[category] || category;
}
