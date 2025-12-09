/**
 * Specification viewer module - displays selected items
 */

import { getForkDisplayName, getForkColor, getForkShortLabel, getCategoryDisplayName } from './constants.js';
import { addClickableReferences } from './references.js';

// Current item being displayed
let currentItem = null;

/**
 * Display a specification item
 */
export function displaySpec(item, data) {
  currentItem = item;

  const title = document.getElementById('specTitle');
  const breadcrumb = document.getElementById('breadcrumb');
  const content = document.getElementById('specContent');

  // Set title as inline code
  title.innerHTML = `<code>${item.name}</code>`;

  // Set breadcrumb
  breadcrumb.innerHTML = `
    <span>${getCategoryDisplayName(item.category)}</span> /
    <span>${getForkDisplayName(item.forks[0])}</span> /
    <span>${item.name}</span>
  `;

  // Update URL hash for direct linking
  const itemId = `${item.category}-${item.name}`;
  history.replaceState(null, '', `#${itemId}`);

  // Clear existing content
  content.innerHTML = '';

  // Check if this is a variable type (constants, presets, config) or code type
  const isVariable = ['constant_vars', 'preset_vars', 'config_vars'].includes(item.category);

  if (isVariable) {
    displayVariable(item, content);
  } else {
    displayCode(item, content);
  }
}

/**
 * Parse a variable value array into type and value
 */
function parseVariableValue(value) {
  if (Array.isArray(value)) {
    return {
      type: value[0] || '',
      value: value[1] !== undefined ? value[1] : ''
    };
  }
  return { type: '', value: value || '' };
}

/**
 * Check if mainnet and minimal values differ for any fork in the item
 */
function hasNetworkDifferences(item) {
  for (const fork of item.forks) {
    const forkValue = item.values[fork];
    if (forkValue && typeof forkValue === 'object' && ('mainnet' in forkValue || 'minimal' in forkValue)) {
      const mainnetParsed = parseVariableValue(forkValue.mainnet);
      const minimalParsed = parseVariableValue(forkValue.minimal);
      if (String(mainnetParsed.value) !== String(minimalParsed.value)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Display a variable item (constants, presets, config)
 * Only shows forks where the value changed
 */
function displayVariable(item, container) {
  // Check if there are differences between mainnet and minimal
  const hasDifferences = hasNetworkDifferences(item);

  // Create a table showing values across forks
  const box = document.createElement('div');
  box.className = 'fork-box';

  // Header with copy link button
  const header = document.createElement('div');
  header.className = 'variable-header';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-link-icon';
  copyBtn.innerHTML = '<i class="fas fa-link"></i>';
  copyBtn.title = 'Copy link to this item';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fas fa-link"></i>';
      }, 1500);
    });
  });

  header.appendChild(copyBtn);
  box.appendChild(header);

  const tableWrapper = document.createElement('div');
  tableWrapper.style.padding = '0 1rem 1rem 1rem';

  const table = document.createElement('table');
  table.className = 'variable-table';

  // Header - show separate columns only if values differ
  const thead = document.createElement('thead');
  if (hasDifferences) {
    thead.innerHTML = `
      <tr>
        <th>Fork</th>
        <th>Type</th>
        <th>Mainnet</th>
        <th>Minimal</th>
      </tr>
    `;
  } else {
    thead.innerHTML = `
      <tr>
        <th>Fork</th>
        <th>Type</th>
        <th>Value</th>
      </tr>
    `;
  }
  table.appendChild(thead);

  // Body - show each fork's value (item.forks already only contains forks where value changed)
  const tbody = document.createElement('tbody');

  // Reverse to show newest first
  const forksReversed = [...item.forks].reverse();

  forksReversed.forEach(fork => {
    const forkValue = item.values[fork];

    // Handle both old format (single value) and new format ({ mainnet, minimal })
    let mainnetParsed, minimalParsed;
    if (forkValue && typeof forkValue === 'object' && ('mainnet' in forkValue || 'minimal' in forkValue)) {
      mainnetParsed = parseVariableValue(forkValue.mainnet);
      minimalParsed = parseVariableValue(forkValue.minimal);
    } else {
      // Old format - same value for both
      mainnetParsed = parseVariableValue(forkValue);
      minimalParsed = mainnetParsed;
    }

    const row = document.createElement('tr');

    // Use mainnet type, or minimal if mainnet not available
    const displayType = mainnetParsed.type || minimalParsed.type;

    if (hasDifferences) {
      row.innerHTML = `
        <td>
          <span class="fork-badge" style="background-color: ${getForkColor(fork)}">
            ${getForkDisplayName(fork)}
          </span>
        </td>
        <td><code>${escapeHtml(displayType)}</code></td>
        <td><code>${escapeHtml(String(mainnetParsed.value))}</code></td>
        <td><code>${escapeHtml(String(minimalParsed.value))}</code></td>
      `;
    } else {
      row.innerHTML = `
        <td>
          <span class="fork-badge" style="background-color: ${getForkColor(fork)}">
            ${getForkDisplayName(fork)}
          </span>
        </td>
        <td><code>${escapeHtml(displayType)}</code></td>
        <td><code>${escapeHtml(String(mainnetParsed.value))}</code></td>
      `;
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  box.appendChild(tableWrapper);
  container.appendChild(box);
}

/**
 * Display a code item (functions, types, classes, etc.)
 * Only shows forks where the value changed
 */
function displayCode(item, container) {
  // Show each fork's code in collapsible boxes
  // item.forks already only contains forks where the code changed
  // Reverse to show newest first
  const forksReversed = [...item.forks].reverse();

  forksReversed.forEach((fork, index) => {
    const value = item.values[fork];
    const isFirst = index === 0;

    const box = document.createElement('div');
    box.className = 'file-box fork-code-block';
    box.dataset.fork = fork;

    // Header (matching test viewer style)
    const header = document.createElement('div');
    header.className = 'file-header';

    const icon = document.createElement('i');
    icon.className = isFirst ? 'fas fa-chevron-down file-toggle-icon' : 'fas fa-chevron-right file-toggle-icon';

    const nameEl = document.createElement('span');
    nameEl.className = 'file-name-badge';
    nameEl.textContent = getForkDisplayName(fork);
    nameEl.style.backgroundColor = getForkColor(fork);

    // Copy link button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-link-icon';
    copyBtn.innerHTML = '<i class="fas fa-link"></i>';
    copyBtn.title = 'Copy link to this item';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't toggle the collapsible
      // Include fork in the URL hash: category-itemName-fork
      const itemId = `${item.category}-${item.name}-${fork.toLowerCase()}`;
      const url = new URL(window.location.href);
      url.hash = itemId;
      navigator.clipboard.writeText(url.href).then(() => {
        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fas fa-link"></i>';
        }, 1500);
      });
    });

    header.appendChild(icon);
    header.appendChild(nameEl);
    header.appendChild(copyBtn);

    // Content
    const content = document.createElement('div');
    content.className = 'file-content';
    if (!isFirst) {
      content.classList.add('collapsed');
    }

    const codeBox = document.createElement('pre');
    codeBox.className = 'test-code-box';

    const code = document.createElement('code');
    code.className = 'language-python';
    code.textContent = value;

    codeBox.appendChild(code);
    content.appendChild(codeBox);

    // Toggle functionality
    header.addEventListener('click', () => {
      const isCollapsed = content.classList.contains('collapsed');
      content.classList.toggle('collapsed');
      icon.className = isCollapsed ? 'fas fa-chevron-down file-toggle-icon' : 'fas fa-chevron-right file-toggle-icon';
    });

    box.appendChild(header);
    box.appendChild(content);
    container.appendChild(box);
  });

  // Trigger syntax highlighting
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(container);
  }

  // Add clickable references after syntax highlighting
  // Use broader selector since Prism may add additional classes
  container.querySelectorAll('code[class*="language-python"]').forEach(block => {
    addClickableReferences(block);
  });
}

// Fork order for finding the best matching fork
const FORK_ORDER = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU', 'GLOAS'];

/**
 * Open a specific fork in the current spec viewer
 * @param {string} preferredFork - The fork to try to open
 */
export function openForkInViewer(preferredFork) {
  const content = document.getElementById('specContent');
  if (!content) return;

  const forkBlocks = content.querySelectorAll('.fork-code-block');
  if (forkBlocks.length === 0) return;

  let forkToOpen = null;

  // If a preferred fork is specified, try to find it
  if (preferredFork) {
    for (const block of forkBlocks) {
      if (block.dataset.fork === preferredFork) {
        forkToOpen = block;
        break;
      }
    }

    // If preferred fork not found, find the most recent fork <= preferred fork
    if (!forkToOpen) {
      const preferredIndex = FORK_ORDER.indexOf(preferredFork);
      if (preferredIndex >= 0) {
        const availableForks = Array.from(forkBlocks).map(block => block.dataset.fork);

        // Starting from preferred fork, go backwards to find the latest one that exists
        for (let i = preferredIndex; i >= 0; i--) {
          const candidateFork = FORK_ORDER[i];
          if (availableForks.includes(candidateFork)) {
            forkToOpen = Array.from(forkBlocks).find(block => block.dataset.fork === candidateFork);
            break;
          }
        }
      }
    }
  }

  // If still not found, open the first one (latest fork available, since they're reversed)
  if (!forkToOpen) {
    forkToOpen = forkBlocks[0];
  }

  // Collapse all fork blocks, then expand the selected one
  forkBlocks.forEach(block => {
    const content = block.querySelector('.file-content');
    const icon = block.querySelector('.file-toggle-icon');
    if (content && icon) {
      if (block === forkToOpen) {
        content.classList.remove('collapsed');
        icon.className = 'fas fa-chevron-down file-toggle-icon';
      } else {
        content.classList.add('collapsed');
        icon.className = 'fas fa-chevron-right file-toggle-icon';
      }
    }
  });
}

/**
 * Clear the spec viewer
 */
export function clearSpec() {
  currentItem = null;

  document.getElementById('specTitle').textContent = '';
  document.getElementById('breadcrumb').innerHTML = '';
  document.getElementById('specContent').innerHTML = '';

  document.getElementById('specViewer').classList.add('hidden');
  document.getElementById('welcome').classList.remove('hidden');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
