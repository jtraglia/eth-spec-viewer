/**
 * Reference linking module - makes spec references clickable
 */

// Registry of all known item names mapped to their tree node elements
const itemRegistry = new Map();

// Navigation history - stores { name, fork } objects
const navigationHistory = [];
let historyPosition = -1;

// Fork suffixes for parsing fork-specific names
const FORK_SUFFIXES = ['PHASE0', 'ALTAIR', 'BELLATRIX', 'CAPELLA', 'DENEB', 'ELECTRA', 'FULU', 'GLOAS'];

/**
 * Register an item name for reference linking
 */
export function registerItem(name, element) {
  itemRegistry.set(name, element);
}

/**
 * Check if an item exists in the registry
 */
export function hasItem(name) {
  return itemRegistry.has(name);
}

/**
 * Get the element for an item name
 */
export function getItemElement(name) {
  return itemRegistry.get(name);
}

/**
 * Clear the item registry
 */
export function clearRegistry() {
  itemRegistry.clear();
}

/**
 * Add item to navigation history
 * @param {string} itemName - The item name
 * @param {string} fork - The fork being viewed (optional)
 */
export function addToHistory(itemName, fork = null) {
  // If we're not at the end of history, truncate forward history
  if (historyPosition < navigationHistory.length - 1) {
    navigationHistory.length = historyPosition + 1;
  }

  const entry = { name: itemName, fork: fork };
  const currentEntry = navigationHistory[historyPosition];

  // Don't add duplicate of current position
  if (!currentEntry || currentEntry.name !== itemName || currentEntry.fork !== fork) {
    navigationHistory.push(entry);
    historyPosition++;
  }

  updateNavigationButtons();
}

/**
 * Check if we can go back
 */
export function canGoBack() {
  return historyPosition > 0;
}

/**
 * Check if we can go forward
 */
export function canGoForward() {
  return historyPosition < navigationHistory.length - 1;
}

/**
 * Go back in history
 * @returns {{ name: string, fork: string } | null}
 */
export function goBack() {
  if (canGoBack()) {
    historyPosition--;
    const entry = navigationHistory[historyPosition];
    updateNavigationButtons();
    return entry;
  }
  return null;
}

/**
 * Go forward in history
 * @returns {{ name: string, fork: string } | null}
 */
export function goForward() {
  if (canGoForward()) {
    historyPosition++;
    const entry = navigationHistory[historyPosition];
    updateNavigationButtons();
    return entry;
  }
  return null;
}

/**
 * Update navigation button states
 */
function updateNavigationButtons() {
  const backButton = document.getElementById('navBack');
  const forwardButton = document.getElementById('navForward');

  if (!backButton || !forwardButton) return;

  // Update button states
  backButton.disabled = !canGoBack();
  forwardButton.disabled = !canGoForward();
}

/**
 * Parse fork name from variable name (e.g., MIN_PER_EPOCH_CHURN_LIMIT_ELECTRA -> MIN_PER_EPOCH_CHURN_LIMIT)
 */
function parseForkName(varName) {
  const varNameUpper = varName.toUpperCase();
  for (const fork of FORK_SUFFIXES) {
    const suffix = '_' + fork;
    if (varNameUpper.endsWith(suffix)) {
      return {
        base: varName.slice(0, varName.length - suffix.length),
        fork: fork
      };
    }
  }
  return { base: varName, fork: null };
}

/**
 * Add clickable references to a code block
 */
export function addClickableReferences(block) {
  // Skip if already processed
  if (block.dataset.referencesAdded) return;

  // Get all text nodes
  const walker = document.createTreeWalker(
    block,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  // Process each text node
  textNodes.forEach(textNode => {
    const text = textNode.textContent;

    // Find Python identifiers
    const identifierRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let match;
    const replacements = [];

    while ((match = identifierRegex.exec(text)) !== null) {
      const identifier = match[1];
      let targetName = null;

      // Check if this identifier exists in our registry
      if (hasItem(identifier)) {
        targetName = identifier;
      } else {
        // Try parsing fork-specific names
        const { base, fork } = parseForkName(identifier);
        if (fork && base !== identifier && hasItem(base)) {
          targetName = base;
        }
      }

      if (targetName) {
        replacements.push({
          start: match.index,
          end: match.index + identifier.length,
          identifier: identifier,
          targetName: targetName
        });
      }
    }

    // If we found any replacements, rebuild the node
    if (replacements.length > 0) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      replacements.forEach(replacement => {
        // Add text before the match
        if (replacement.start > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, replacement.start))
          );
        }

        // Create clickable span for the identifier
        const refSpan = document.createElement('span');
        refSpan.className = 'spec-reference';
        refSpan.textContent = replacement.identifier;
        refSpan.dataset.targetName = replacement.targetName;
        refSpan.title = `Jump to ${replacement.targetName}`;
        fragment.appendChild(refSpan);

        lastIndex = replacement.end;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace the text node with the fragment
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  });

  block.dataset.referencesAdded = 'true';
}

/**
 * Navigate to a referenced item
 * @param {string} targetName - The item name to navigate to
 * @param {boolean} addHistory - Whether to add this navigation to history (default: true)
 * @param {string} preferredFork - The fork to try to open (default: null, opens latest)
 */
export function navigateToReference(targetName, addHistory = true, preferredFork = null) {
  const element = getItemElement(targetName);
  if (!element) return false;

  // Add to history before navigating (if requested)
  if (addHistory) {
    addToHistory(targetName, preferredFork);
  }

  // Find the tree node and click it
  const label = element.querySelector('.tree-label');
  if (label) {
    // Expand parent nodes
    let parent = element.parentElement;
    while (parent) {
      if (parent.classList.contains('tree-children')) {
        parent.classList.remove('collapsed');
        const parentNode = parent.previousElementSibling;
        if (parentNode) {
          const icon = parentNode.querySelector('.tree-icon');
          if (icon) icon.textContent = '▼';
        }
      }
      parent = parent.parentElement;
    }

    // Manually trigger item selection to avoid double history entry
    // Get item data from the node
    const itemData = element._itemData;
    if (itemData && window.selectItem) {
      window.selectItem(itemData, false, preferredFork);
    } else {
      // Fallback to click
      label.click();
    }

    // Scroll the sidebar to show the item
    label.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return true;
  }

  return false;
}

/**
 * Find the current fork being viewed by traversing up from an element
 */
function findCurrentFork(element) {
  let current = element;
  while (current && current !== document.body) {
    if (current.classList && current.classList.contains('fork-code-block')) {
      return current.dataset.fork;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Get the currently displayed item name from the URL hash or state
 */
function getCurrentItemName() {
  // Try to get from URL hash
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    // Format is category-itemName
    const parts = hash.split('-');
    if (parts.length >= 2) {
      return parts.slice(1).join('-'); // Join back in case name has dashes
    }
  }
  return null;
}

/**
 * Initialize reference click handling
 */
export function initReferenceClickHandler() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('spec-reference')) {
      const targetName = e.target.dataset.targetName;
      if (targetName) {
        // Find which fork the user is currently viewing
        const currentFork = findCurrentFork(e.target);

        // Find the current item name and add it to history FIRST
        const currentItemName = getCurrentItemName();
        if (currentItemName) {
          // Get current entry to check if we need to add
          const currentEntry = navigationHistory[historyPosition];
          if (!currentEntry || currentEntry.name !== currentItemName || currentEntry.fork !== currentFork) {
            addToHistory(currentItemName, currentFork);
          }
        }

        // Now navigate to the target with the same fork context
        navigateToReference(targetName, true, currentFork);
      }
    }
  });
}
