/**
 * Dark mode functionality
 */

/**
 * Initialize dark mode toggle and preference handling
 */
export function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Check for saved preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Set initial state
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    darkModeToggle.checked = true;
  }

  // Toggle dark mode
  darkModeToggle.addEventListener('change', function() {
    if (this.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }

    // Refresh syntax highlighting
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll();
    }
  });
}