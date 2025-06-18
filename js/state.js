/**
 * Application state management
 */

export class AppState {
  constructor() {
    this.jsonData = {};
    this.deprecatedItems = new Set();
    this.itemsById = new Map();
    this.activeFilters = {
      search: '',
      fork: '',
      change: '',
      type: '',
      deprecated: false
    };
  }

  setJsonData(data) {
    this.jsonData = data;
  }

  getJsonData() {
    return this.jsonData;
  }

  addDeprecatedItem(itemName) {
    this.deprecatedItems.add(itemName);
  }

  isItemDeprecated(itemName) {
    return this.deprecatedItems.has(itemName);
  }

  registerItem(itemId, element) {
    this.itemsById.set(itemId, element);
  }

  getItemById(itemId) {
    return this.itemsById.get(itemId);
  }

  updateActiveFilters(filters) {
    Object.assign(this.activeFilters, filters);
  }

  getActiveFilters() {
    return { ...this.activeFilters };
  }

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