/**
 * Search and filtering functionality for the Ethereum Consensus Specifications viewer
 *
 * Provides real-time search and filtering capabilities for specification items.
 * Supports filtering by search terms, specific forks, changes, item types, and
 * deprecated status. Includes performance optimizations like debouncing and
 * batched DOM operations.
 *
 * @module filters
 */

import { appState } from './state.js';
import { CATEGORY_DISPLAY_NAMES } from './constants.js';
import { debounce, batchDOMOperations } from './performance.js';
import { logger, ErrorHandler } from './logger.js';
import { getElement, getElements, toggleVisibility } from './domUtils.js';

/**
 * Apply all active filters
 */
export function applyFilters() {
  try {
    logger.debug('Applying filters');

    const filterElements = getElements(['searchInput', 'forkFilter', 'changeFilter', 'typeFilter'], true);

    appState.updateActiveFilters({
      search: filterElements.searchInput.value.toLowerCase(),
      fork: filterElements.forkFilter.value,
      change: filterElements.changeFilter.value,
      type: filterElements.typeFilter.value
    });

    updateActiveFiltersDisplay();
    filterItems();

    // Show/hide diff toggle based on whether we're filtering for a single type
    const toggleDiffContainer = getElement('toggleDiffContainer');
    if (toggleDiffContainer) {
      toggleVisibility(toggleDiffContainer, !!filterElements.typeFilter.value, 'class', 'hidden');
    }

    logger.debug('Filters applied successfully', appState.getActiveFilters());
  } catch (error) {
    ErrorHandler.handle(error, 'Apply filters');
  }
}

/**
 * Clear all filters
 */
export function clearFilters() {
  try {
    const filterElements = getElements(['searchInput', 'forkFilter', 'changeFilter', 'typeFilter'], true);
    const searchClear = getElement('searchClear');
    const toggleDiffContainer = getElement('toggleDiffContainer');

    // Clear all filter values
    filterElements.searchInput.value = '';
    filterElements.forkFilter.value = '';
    filterElements.changeFilter.value = '';
    filterElements.typeFilter.value = '';

    // Hide search clear button and diff toggle
    if (searchClear) {
      toggleVisibility(searchClear, false, 'class', 'hidden');
    }
    if (toggleDiffContainer) {
      toggleVisibility(toggleDiffContainer, false, 'class', 'hidden');
    }

    appState.clearFilters();
    updateActiveFiltersDisplay();
    filterItems();

    logger.debug('All filters cleared');
  } catch (error) {
    ErrorHandler.handle(error, 'Clear filters');
  }
}

/**
 * Update the display of active filters
 */
function updateActiveFiltersDisplay() {
  const container = document.getElementById('activeFilters');
  container.innerHTML = '';

  const activeFilters = appState.getActiveFilters();
  let hasFilters = false;

  if (activeFilters.search) {
    container.appendChild(createFilterBadge('Search', activeFilters.search));
    hasFilters = true;
  }

  if (activeFilters.fork) {
    container.appendChild(createFilterBadge('Fork', activeFilters.fork));
    hasFilters = true;
  }

  if (activeFilters.change) {
    container.appendChild(createFilterBadge('Changed in', activeFilters.change));
    hasFilters = true;
  }

  if (activeFilters.type) {
    const displayType = CATEGORY_DISPLAY_NAMES[activeFilters.type] || activeFilters.type;
    container.appendChild(createFilterBadge('Type', displayType));
    hasFilters = true;
  }

  if (activeFilters.deprecated) {
    container.appendChild(createFilterBadge('Status', 'Deprecated'));
    hasFilters = true;
  }
}

/**
 * Create a filter badge element
 */
function createFilterBadge(label, value) {
  const badge = document.createElement('div');
  badge.className = 'filter-badge';
  badge.innerHTML = `${label}: ${value} <span class="filter-badge-remove">×</span>`;

  badge.querySelector('.filter-badge-remove').addEventListener('click', () => {
    // Remove this specific filter
    switch(label) {
      case 'Search':
        document.getElementById('searchInput').value = '';
        appState.updateActiveFilters({ search: '' });
        document.getElementById('searchClear').classList.add('hidden');
        break;
      case 'Fork':
        document.getElementById('forkFilter').value = '';
        appState.updateActiveFilters({ fork: '' });
        break;
      case 'Changed in':
        document.getElementById('changeFilter').value = '';
        appState.updateActiveFilters({ change: '' });
        break;
      case 'Type':
        document.getElementById('typeFilter').value = '';
        appState.updateActiveFilters({ type: '' });
        document.getElementById('toggleDiffContainer').classList.add('hidden');
        break;
      case 'Status':
        appState.updateActiveFilters({ deprecated: false });
        break;
    }

    updateActiveFiltersDisplay();
    filterItems();
  });

  return badge;
}

/**
 * Filter items based on active filters
 */
function filterItems() {
  // Use requestAnimationFrame to batch DOM operations for better performance
  batchDOMOperations(() => {
    performFiltering();
  });
}

/**
 * Perform the actual filtering logic
 */
function performFiltering() {
  const activeFilters = appState.getActiveFilters();

  // Cache DOM queries for better performance
  const topLevelSections = document.querySelectorAll('main section > details');
  const allSections = document.querySelectorAll('details.preset-group:not(.fork-code-block)');
  let visibleCount = 0;

  // 1. First handle the top-level category sections (Constants, Functions, etc.)
  if (activeFilters.type) {
    // Only open the type filter's section
    for (const section of topLevelSections) {
      const sectionDiv = section.querySelector('div');
      if (sectionDiv && sectionDiv.id === activeFilters.type) {
        section.setAttribute('open', 'true');
      } else {
        section.removeAttribute('open');
      }
    }
  }

  // 2. Batch process all items for better performance
  const sectionsToUpdate = [];
  const forkBlocksToUpdate = [];

  // 3. Apply filters to each item - optimized for performance
  for (const section of allSections) {
    let isVisible = true;

    // Early exit optimizations - check most restrictive filters first
    if (activeFilters.type && section.dataset.category !== activeFilters.type) {
      isVisible = false;
    } else if (activeFilters.search) {
      const name = section.dataset.name;
      if (!name || !name.includes(activeFilters.search)) {
        isVisible = false;
      }
    } else if (activeFilters.fork) {
      const forks = section.dataset.forks;
      if (!forks || !forks.includes(activeFilters.fork)) {
        isVisible = false;
      }
    } else if (activeFilters.change) {
      const changedForks = section.dataset.changedInForks;
      if (!changedForks || !changedForks.includes(activeFilters.change)) {
        isVisible = false;
      }
    } else if (activeFilters.deprecated && section.dataset.deprecated !== "true") {
      isVisible = false;
    }

    // Batch DOM updates
    sectionsToUpdate.push({ section, isVisible });

    if (isVisible) {
      visibleCount++;
    }
  }

  // Apply all DOM updates in one batch
  for (const { section, isVisible } of sectionsToUpdate) {
    section.classList.toggle('hidden', !isVisible);
    if (activeFilters.search) {
      if (isVisible) {
        section.setAttribute('open', 'true');
      } else {
        section.removeAttribute('open');
      }
    }

    // 4. Only handle fork code blocks for visible items
    if (isVisible) {
      // If filtering by fork, we need to prepare nested blocks but not auto-expand the parent
      if (activeFilters.fork) {
        // Get all nested code blocks
        const forkBlocks = section.querySelectorAll('.expanded-content details.fork-code-block');
        let foundMatchingFork = false;

        for (const block of forkBlocks) {
          const fork = block.getAttribute('data-fork');

          if (fork === activeFilters.fork) {
            // This fork matches our filter - prepare it to be shown when parent is expanded
            block.classList.remove('hidden');
            block.setAttribute('open', 'true');
            foundMatchingFork = true;

            // Pre-highlight code (defer to avoid blocking)
            const codeElement = block.querySelector('code');
            if (codeElement) {
              // Queue for syntax highlighting
              setTimeout(() => Prism.highlightElement(codeElement), 0);
            }
          } else {
            // This fork doesn't match - hide it
            block.classList.add('hidden');
          }
        }

        // Hide items with no matching fork
        if (forkBlocks.length > 0 && !foundMatchingFork) {
          section.classList.add('hidden');
          visibleCount--;
        }
      } else {
        // Not filtering by fork - ensure all fork blocks are visible
        // But don't auto-expand parent items
        const forkBlocks = section.querySelectorAll('.expanded-content details.fork-code-block');
        for (const block of forkBlocks) {
          block.classList.remove('hidden');
        }

        // Make sure at least first fork block is open by default
        // (but don't change parent item expansion state)
        if (section.hasAttribute('open')) {
          const firstBlock = forkBlocks[0];
          if (firstBlock) {
            firstBlock.setAttribute('open', 'true');
            for (let i = 1; i < forkBlocks.length; i++) {
              forkBlocks[i].removeAttribute('open');
            }
          }
        }
      }
    }
  }

  // 5. Update phase-group visibility (hide empty groups)
  // Get ALL phase groups across all categories
  const allPhaseGroups = document.querySelectorAll('.phase-group');

  allPhaseGroups.forEach(group => {
    // Check if this phase group has any visible preset-group items
    const visibleItems = Array.from(group.querySelectorAll('details.preset-group:not(.fork-code-block)')).filter(
      item => !item.classList.contains('hidden')
    );

    // Hide the phase group if it has no visible items
    if (visibleItems.length === 0) {
      group.style.display = 'none';
    } else {
      group.style.display = '';
    }
  });

  // 6. Show message if no results
  document.getElementById('noResults').classList.toggle('hidden', visibleCount > 0);

  // Open outer <details> sections if any inner section is visible
  if (activeFilters.search) {
    document.querySelectorAll('main section > details').forEach(section => {
      const innerVisible = Array.from(
        section.querySelectorAll('details.preset-group')
      ).some(el => el.offsetParent !== null);

      if (innerVisible) {
        section.setAttribute('open', 'true');
      } else {
        section.removeAttribute('open');
      }
    });
  }

  // If search was cleared, collapse all preset-group details
  if (!activeFilters.search) {
    // Collapse all outer top-level sections
    document.querySelectorAll('main section > details').forEach(section => {
      section.removeAttribute('open');
    });

    // Optional: collapse fork-level blocks too
    document.querySelectorAll('details.fork-code-block').forEach(section => {
      section.removeAttribute('open');
    });

    // Show all phase groups when no filters are active
    if (!activeFilters.fork && !activeFilters.change && !activeFilters.type && !activeFilters.deprecated) {
      document.querySelectorAll('.phase-group').forEach(group => {
        group.style.display = '';
      });
    }
  }

  // 7. Refresh syntax highlighting (defer to avoid blocking)
  setTimeout(() => {
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  }, 0);
}

/**
 * Debounced version of applyFilters for search input
 */
export const debouncedApplyFilters = debounce(applyFilters, 200);