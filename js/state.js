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

    /** @type {Map<string, string>} Map of item names to their IDs for reference linking */
    this.itemNameToId = new Map();

    /** @type {Array<string>} Navigation history of visited item IDs */
    this.navigationHistory = [];

    /** @type {number} Current position in navigation history */
    this.historyPosition = -1;

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
   * @param {string} [itemName] - Optional item name for reference linking
   */
  registerItem(itemId, element, itemName) {
    this.itemsById.set(itemId, element);
    if (itemName) {
      this.itemNameToId.set(itemName, itemId);
    }
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
   * Get the item ID for a given item name
   * @param {string} itemName - Name of the item
   * @returns {string|undefined} The item ID or undefined if not found
   */
  getItemIdByName(itemName) {
    return this.itemNameToId.get(itemName);
  }

  /**
   * Check if an item name exists in the registry
   * @param {string} itemName - Name of the item
   * @returns {boolean} True if the item exists
   */
  hasItem(itemName) {
    return this.itemNameToId.has(itemName);
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

  /**
   * Add an item to navigation history
   * @param {string} itemId - ID of the item to add to history
   */
  addToHistory(itemId) {
    // If we're not at the end of history, truncate forward history
    if (this.historyPosition < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.historyPosition + 1);
    }

    // Don't add duplicate of current position
    if (this.navigationHistory[this.historyPosition] !== itemId) {
      this.navigationHistory.push(itemId);
      this.historyPosition++;
    }
  }

  /**
   * Check if we can navigate backward in history
   * @returns {boolean} True if backward navigation is possible
   */
  canGoBack() {
    return this.historyPosition > 0;
  }

  /**
   * Check if we can navigate forward in history
   * @returns {boolean} True if forward navigation is possible
   */
  canGoForward() {
    return this.historyPosition < this.navigationHistory.length - 1;
  }

  /**
   * Navigate backward in history
   * @returns {string|null} Item ID to navigate to, or null if can't go back
   */
  goBack() {
    if (this.canGoBack()) {
      this.historyPosition--;
      return this.navigationHistory[this.historyPosition];
    }
    return null;
  }

  /**
   * Navigate forward in history
   * @returns {string|null} Item ID to navigate to, or null if can't go forward
   */
  goForward() {
    if (this.canGoForward()) {
      this.historyPosition++;
      return this.navigationHistory[this.historyPosition];
    }
    return null;
  }
}

// Create singleton instance
export const appState = new AppState();