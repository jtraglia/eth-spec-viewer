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
  addEventListenerSafe(darkModeToggle, 'change', function(event) {
    const isDarkMode = event.target.checked;
    console.log('Toggle clicked, isDarkMode:', isDarkMode); // Debug log
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
  console.log('Setting dark mode:', enabled); // Debug log
  
  if (enabled) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    console.log('Dark theme applied'); // Debug log
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
    console.log('Light theme applied'); // Debug log
  }

  // Refresh syntax highlighting to match the new theme
  if (typeof Prism !== 'undefined') {
    // Use setTimeout to ensure theme CSS has been applied
    setTimeout(() => {
      Prism.highlightAll();
    }, 0);
  }
}