/**
 * Application state management
 * 
 * Centralized state container for the Ethereum spec viewer application.
 * Manages JSON data, deprecated items, UI element references, and filter state.
 */

export class AppState {
  /**
   * Initialize the application state
   */
  constructor() {
    /** @type {Object} The loaded JSON specification data */
    this.jsonData = {};
    
    /** @type {Set<string>} Set of deprecated item names */
    this.deprecatedItems = new Set();
    
    /** @type {Map<string, HTMLElement>} Map of item IDs to DOM elements for direct linking */
    this.itemsById = new Map();
    
    /** @type {Object} Currently active filter state */
    this.activeFilters = {
      /** @type {string} Search term filter */
      search: '',
      /** @type {string} Fork-specific filter */
      fork: '',
      /** @type {string} Change-specific filter */
      change: '',
      /** @type {string} Type/category filter */
      type: '',
      /** @type {boolean} Whether to show only deprecated items */
      deprecated: false
    };
  }

  /**
   * Set the main JSON specification data
   * @param {Object} data - The JSON specification data
   */
  setJsonData(data) {
    this.jsonData = data;
  }

  /**
   * Get the current JSON specification data
   * @returns {Object} The JSON specification data
   */
  getJsonData() {
    return this.jsonData;
  }

  /**
   * Mark an item as deprecated
   * @param {string} itemName - Name of the item to mark as deprecated
   */
  addDeprecatedItem(itemName) {
    this.deprecatedItems.add(itemName);
  }

  /**
   * Check if an item is marked as deprecated
   * @param {string} itemName - Name of the item to check
   * @returns {boolean} True if the item is deprecated
   */
  isItemDeprecated(itemName) {
    return this.deprecatedItems.has(itemName);
  }

  /**
   * Register a DOM element for direct linking by ID
   * @param {string} itemId - Unique identifier for the item
   * @param {HTMLElement} element - DOM element to register
   */
  registerItem(itemId, element) {
    this.itemsById.set(itemId, element);
  }

  /**
   * Get a registered DOM element by its ID
   * @param {string} itemId - Unique identifier for the item
   * @returns {HTMLElement|undefined} The DOM element or undefined if not found
   */
  getItemById(itemId) {
    return this.itemsById.get(itemId);
  }

  /**
   * Update the active filters with new values
   * @param {Object} filters - Filter values to update
   * @param {string} [filters.search] - Search term
   * @param {string} [filters.fork] - Fork filter
   * @param {string} [filters.change] - Change filter
   * @param {string} [filters.type] - Type filter
   * @param {boolean} [filters.deprecated] - Deprecated filter
   */
  updateActiveFilters(filters) {
    Object.assign(this.activeFilters, filters);
  }

  /**
   * Get a copy of the current active filters
   * @returns {Object} Copy of the active filters object
   */
  getActiveFilters() {
    return { ...this.activeFilters };
  }

  /**
   * Reset all filters to their default values
   */
  clearFilters() {
    this.activeFilters = {
      search: '',
      fork: '',
      change: '',
      type: '',
      deprecated: false
    };
  }
}

// Create singleton instance
export const appState = new AppState();