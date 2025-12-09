/**
 * Dark mode toggle functionality
 */

const STORAGE_KEY = 'eth-spec-viewer-dark-mode';

/**
 * Initialize dark mode
 */
export function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');

  // Check for saved preference, otherwise use system preference
  const savedPreference = localStorage.getItem(STORAGE_KEY);
  let isDark;

  if (savedPreference !== null) {
    isDark = savedPreference === 'true';
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Apply initial state
  setDarkMode(isDark);
  toggle.checked = isDark;

  // Listen for toggle changes
  toggle.addEventListener('change', () => {
    setDarkMode(toggle.checked);
    localStorage.setItem(STORAGE_KEY, toggle.checked);
  });

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only apply if user hasn't set a preference
    if (localStorage.getItem(STORAGE_KEY) === null) {
      setDarkMode(e.matches);
      toggle.checked = e.matches;
    }
  });
}

/**
 * Set dark mode on or off
 */
function setDarkMode(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  }
}
