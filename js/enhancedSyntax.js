/**
 * Enhanced Python syntax highlighting
 * Runs after Prism to add more colorization to function bodies
 */

import { appState } from './state.js';
import { parseForkName } from './utils.js';
import { FORK_ORDER } from './constants.js';

/**
 * Enhance Python syntax highlighting in code blocks
 */
export function enhancePythonSyntax() {
  // Wait for Prism to finish
  setTimeout(() => {
    const pythonBlocks = document.querySelectorAll('code.language-python');

    pythonBlocks.forEach(block => {
      // Skip if already processed
      if (block.dataset.enhanced) return;

      // Direct HTML processing approach
      let html = block.innerHTML;

      // Replace function calls that aren't already in spans
      // Look for patterns like "word(" that aren't inside existing token spans
      const lines = html.split('\n');
      const processedLines = lines.map(line => {
        // Skip lines that are already heavily tokenized
        if (line.includes('<span class="token')) {
          // For tokenized lines, we need to be more careful
          // Split on existing spans and only process the plain text parts
          const parts = line.split(/(<span[^>]*>.*?<\/span>)/);
          return parts.map(part => {
            if (part.includes('<span')) {
              return part; // Don't modify existing spans
            } else {
              // Process plain text for function calls
              return part.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token function-call">$1</span>');
            }
          }).join('');
        } else {
          // For lines with no tokens, process normally
          return line.replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token function-call">$1</span>');
        }
      });

      const newHTML = processedLines.join('\n');

      if (newHTML !== html) {
        block.innerHTML = newHTML;
      }

      // Add clickable references for known items
      addClickableReferences(block);

      block.dataset.enhanced = 'true';
    });
  }, 150); // Increase timeout to ensure Prism is done
}

/**
 * Add clickable references to known items in code blocks
 * @param {HTMLElement} block - The code block element to process
 */
function addClickableReferences(block) {
  // Skip if already processed for references
  if (block.dataset.referencesAdded) return;

  // Get all text nodes and identifiers
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

    // Find Python identifiers (words that could be variable/function/type names)
    // Match word boundaries to get complete identifiers including CamelCase
    const identifierRegex = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let match;
    const replacements = [];

    while ((match = identifierRegex.exec(text)) !== null) {
      const identifier = match[1];
      let itemId = null;

      // Check if this identifier exists in our registry
      if (appState.hasItem(identifier)) {
        itemId = appState.getItemIdByName(identifier);
      } else {
        // Try parsing fork-specific names (e.g., MIN_PER_EPOCH_CHURN_LIMIT_ELECTRA)
        // Get known fork names for parsing
        const knownForkNames = Array.from(FORK_ORDER);
        const { base, fork } = parseForkName(identifier, knownForkNames);

        // If we found a fork suffix and the base name exists, use that
        if (fork && base !== identifier && appState.hasItem(base)) {
          itemId = appState.getItemIdByName(base);
        }
      }

      if (itemId) {
        replacements.push({
          start: match.index,
          end: match.index + identifier.length,
          identifier: identifier,
          itemId: itemId
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
        refSpan.dataset.itemId = replacement.itemId;
        refSpan.title = `Jump to ${replacement.identifier}`;
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
 * Force re-enhancement of all code blocks (clears flags first)
 */
export function forceReEnhance() {
  // Clear all enhancement flags
  document.querySelectorAll('code.language-python').forEach(block => {
    delete block.dataset.enhanced;
    delete block.dataset.referencesAdded;
  });

  // Run enhancement
  enhancePythonSyntax();
}

/**
 * Initialize enhanced syntax highlighting
 */
export function initEnhancedSyntax() {
  // Run initial enhancement
  enhancePythonSyntax();

  // Also enhance when new content is added
  const observer = new MutationObserver(() => {
    enhancePythonSyntax();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}