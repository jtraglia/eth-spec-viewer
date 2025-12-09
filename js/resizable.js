/**
 * Resizable sidebar functionality
 */

const STORAGE_KEY = 'eth-spec-viewer-sidebar-width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 450;

/**
 * Initialize resizable sidebar
 */
export function initResizable() {
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('resizeHandle');

  // Restore saved width
  const savedWidth = localStorage.getItem(STORAGE_KEY);
  if (savedWidth) {
    const width = parseInt(savedWidth, 10);
    if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
      sidebar.style.width = `${width}px`;
    }
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;

    // Clamp to min/max
    newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));

    sidebar.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;

    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Save width
    localStorage.setItem(STORAGE_KEY, sidebar.offsetWidth);
  });

  // Double-click to reset width
  handle.addEventListener('dblclick', () => {
    sidebar.style.width = `${DEFAULT_WIDTH}px`;
    localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH);
  });
}
