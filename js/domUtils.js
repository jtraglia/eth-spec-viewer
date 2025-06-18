/**
 * DOM utility functions for common operations
 * 
 * Provides reusable functions for DOM manipulation, element creation,
 * and common UI operations to reduce code duplication.
 * 
 * @module domUtils
 */

import { logger } from './logger.js';

/**
 * Safely get an element by ID with error handling
 * @param {string} id - Element ID to find
 * @param {boolean} required - Whether the element is required (throws if not found)
 * @returns {HTMLElement|null} The element or null if not found
 * @throws {Error} If required is true and element is not found
 */
export function getElement(id, required = false) {
  const element = document.getElementById(id);
  
  if (required && !element) {
    throw new Error(`Required element with ID '${id}' not found`);
  }
  
  if (!element) {
    logger.warn(`Element with ID '${id}' not found`);
  }
  
  return element;
}

/**
 * Safely get multiple elements by ID
 * @param {string[]} ids - Array of element IDs to find
 * @param {boolean} required - Whether all elements are required
 * @returns {Object<string, HTMLElement>} Object mapping IDs to elements
 * @throws {Error} If required is true and any element is not found
 */
export function getElements(ids, required = false) {
  const elements = {};
  const missing = [];
  
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) {
      elements[id] = element;
    } else {
      missing.push(id);
    }
  }
  
  if (required && missing.length > 0) {
    throw new Error(`Required elements not found: ${missing.join(', ')}`);
  }
  
  if (missing.length > 0) {
    logger.warn(`Elements not found: ${missing.join(', ')}`);
  }
  
  return elements;
}

/**
 * Create an element with attributes and content
 * @param {string} tagName - HTML tag name
 * @param {Object} options - Element configuration
 * @param {Object} [options.attributes] - HTML attributes to set
 * @param {Object} [options.dataset] - Data attributes to set
 * @param {string[]} [options.classes] - CSS classes to add
 * @param {string} [options.textContent] - Text content
 * @param {string} [options.innerHTML] - HTML content
 * @param {Object} [options.style] - CSS styles to apply
 * @returns {HTMLElement} Created element
 */
export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  
  // Set attributes
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }
  
  // Set data attributes
  if (options.dataset) {
    for (const [key, value] of Object.entries(options.dataset)) {
      element.dataset[key] = value;
    }
  }
  
  // Add CSS classes
  if (options.classes) {
    element.classList.add(...options.classes);
  }
  
  // Set content
  if (options.textContent) {
    element.textContent = options.textContent;
  } else if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }
  
  // Apply styles
  if (options.style) {
    Object.assign(element.style, options.style);
  }
  
  return element;
}

/**
 * Toggle element visibility with optional animation
 * @param {HTMLElement} element - Element to toggle
 * @param {boolean} visible - Whether to show or hide
 * @param {string} method - Method to use: 'display', 'visibility', or 'class'
 * @param {string} hiddenClass - CSS class for hidden state (when method='class')
 */
export function toggleVisibility(element, visible, method = 'display', hiddenClass = 'hidden') {
  if (!element) return;
  
  switch (method) {
    case 'display':
      element.style.display = visible ? '' : 'none';
      break;
    case 'visibility':
      element.style.visibility = visible ? 'visible' : 'hidden';
      break;
    case 'class':
      element.classList.toggle(hiddenClass, !visible);
      break;
  }
}

/**
 * Add event listener with error handling
 * @param {HTMLElement} element - Element to add listener to
 * @param {string} event - Event type
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options
 * @returns {Function} Function to remove the event listener
 */
export function addEventListenerSafe(element, event, handler, options = {}) {
  if (!element) {
    logger.warn('Cannot add event listener to null element');
    return () => {};
  }
  
  const safeHandler = (e) => {
    try {
      handler(e);
    } catch (error) {
      logger.error(`Error in ${event} event handler:`, error);
    }
  };
  
  element.addEventListener(event, safeHandler, options);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(event, safeHandler, options);
  };
}

/**
 * Batch DOM operations for better performance
 * @param {HTMLElement} container - Container element
 * @param {Function} operations - Function that performs DOM operations
 */
export function batchDOMUpdates(container, operations) {
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  const originalParent = container.parentNode;
  
  // Temporarily remove from DOM
  if (originalParent) {
    originalParent.removeChild(container);
  }
  
  try {
    operations(container, fragment);
  } finally {
    // Re-add to DOM
    if (originalParent) {
      originalParent.appendChild(container);
    }
  }
}

/**
 * Clear all children from an element
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  if (!element) return;
  
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Scroll element into view with smooth animation
 * @param {HTMLElement} element - Element to scroll to
 * @param {Object} options - Scroll options
 * @param {string} [options.behavior='smooth'] - Scroll behavior
 * @param {string} [options.block='start'] - Vertical alignment
 * @param {string} [options.inline='nearest'] - Horizontal alignment
 */
export function scrollToElement(element, options = {}) {
  if (!element) return;
  
  const defaultOptions = {
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  };
  
  element.scrollIntoView({ ...defaultOptions, ...options });
}

/**
 * Check if element is visible in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is visible
 */
export function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}