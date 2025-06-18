/**
 * Dark mode functionality for the Ethereum Consensus Specifications viewer
 * 
 * Handles theme switching between light and dark modes, with persistence
 * and system preference detection.
 */

import { getElement, addEventListenerSafe } from './domUtils.js';

/**
 * Initialize dark mode toggle and preference handling
 * 
 * Sets up the dark mode toggle functionality including:
 * - Reading saved user preference from localStorage
 * - Detecting system preference for dark mode
 * - Setting initial theme state
 * - Adding event listener for theme switching
 * - Refreshing syntax highlighting when theme changes
 * 
 * @throws {Error} If the dark mode toggle element is not found
 */
export function initDarkMode() {
  const darkModeToggle = getElement('darkModeToggle', true);

  // Check for saved preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Set initial state based on saved preference or system preference
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    setDarkMode(true);
    darkModeToggle.checked = true;
  } else {
    setDarkMode(false);
    darkModeToggle.checked = false;
  }

  // Toggle dark mode when user clicks the toggle
  addEventListenerSafe(darkModeToggle, 'change', function() {
    const isDarkMode = this.checked;
    setDarkMode(isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  });
}

/**
 * Apply or remove dark mode theme
 * 
 * @param {boolean} enabled - Whether to enable dark mode
 */
function setDarkMode(enabled) {
  if (enabled) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Refresh syntax highlighting to match the new theme
  if (typeof Prism !== 'undefined') {
    // Use setTimeout to ensure theme CSS has been applied
    setTimeout(() => {
      Prism.highlightAll();
    }, 0);
  }
}