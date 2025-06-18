/**
 * Items (Functions, SSZ Objects, Dataclasses, Custom Types) rendering
 */

import { 
  getForkColor, 
  getIncludedForks, 
  forkGroupCompareAscending, 
  forkGroupCompareDescending,
  generateItemId,
  createShareLink,
  highlightDiff
} from './utils.js';
import { appState } from './state.js';
import { FORK_ORDER } from './constants.js';

/**
 * Build summary text for item display
 */
function buildItemSummary(name, mForks, displayValueInSummary) {
  const forkNames = new Set();
  mForks.forEach((f) => forkNames.add(f.fork));
  const sortedForks = Array.from(forkNames).sort(forkGroupCompareDescending);

  const badges = sortedForks
    .map((fork) => {
      const color = getForkColor(fork);
      return `<span class="badge" style="background-color: ${color}">${fork}</span>`;
    })
    .join(" ");

  let lastVal = mForks[0].value || "N/A";
  if (mForks && mForks.length > 0) {
    const newest = mForks[mForks.length - 1];
    lastVal = newest.value;
  }

  // Add deprecated badge if needed
  const deprecatedBadge = appState.isItemDeprecated(name) ?
    '<span class="deprecated-badge">DEPRECATED</span>' : '';

  if (displayValueInSummary) {
    return `${name} = ${lastVal} ${badges} ${deprecatedBadge}`;
  } else {
    return `${name} ${badges} ${deprecatedBadge}`;
  }
}

/**
 * Render a single item
 */
export function renderItem(baseName, mForks, displayValueInSummary, category) {
  const summaryText = buildItemSummary(baseName, mForks, displayValueInSummary);

  // Generate a unique ID for this item
  const itemId = generateItemId(category, baseName);

  const details = document.createElement("details");
  details.className = "preset-group";
  details.id = itemId;

  // Add deprecated class if needed
  if (appState.isItemDeprecated(baseName)) {
    details.classList.add("deprecated-item");
  }

  // Save reference to this item for direct linking
  appState.registerItem(itemId, details);

  const summary = document.createElement("summary");
  const shareLink = createShareLink(itemId);

  summary.innerHTML = `
    <span class="summary-icon"></span>
    <span class="collapsed-header">${summaryText}</span>
    <button class="share-button" data-link="${shareLink}" title="Copy link to this item">
      <i class="fas fa-link"></i>
    </button>
  `;
  details.appendChild(summary);

  const content = document.createElement("div");
  content.className = "expanded-content";

  // Add show diff toggle
  const showDiff = document.getElementById('showDiffToggle')?.checked || false;

  // Store fork details in a more accessible way for filtering
  let forkDetails = [];

  // Sort forks by chronological order, then reverse to show newest first
  const forksSorted = [...mForks].sort((a, b) => {
    const aIndex = FORK_ORDER.indexOf(a.fork);
    const bIndex = FORK_ORDER.indexOf(b.fork);
    return aIndex - bIndex; // Ascending chronological order
  });
  const forksReversed = forksSorted.reverse(); // Newest first
  
  forksReversed.forEach(({fork, value}, index) => {
    const section = document.createElement('div');

    // If showing diffs and this isn't the last fork value, compare with next value
    let displayValue = value;
    if (showDiff && mForks.length > 1) {
      // Find the next newer fork if any (in original chronological order)
      const originalIndex = mForks.findIndex(f => f.fork === fork);
      if (originalIndex > 0) {
        const olderFork = mForks[originalIndex - 1];
        displayValue = highlightDiff(olderFork.value, value);
      }
    }

    // Open only the first item in the reversed array (which is the newest fork)
    const isOpen = index === 0 ? "open" : "";

    // Explicitly create the fork details element to track it
    const forkDetailHTML = `
      <details ${isOpen} class="preset-group fork-code-block" data-fork="${fork}">
        <summary>
          <span class="summary-icon"></span>
          <span class="badge" style="background-color: ${getForkColor(fork)}">${fork}</span>
        </summary>
        <pre class="line-numbers"><code class="language-python">${displayValue}</code></pre>
      </details>
    `;

    section.innerHTML = forkDetailHTML;
    content.appendChild(section);

    // Keep track of this fork detail for filtering
    forkDetails.push(fork);
  });

  details.appendChild(content);

  // Add event listener to auto-open the latest fork when the main item is opened
  details.addEventListener('toggle', function() {
    if (this.open) {
      // When opened, automatically open the first (newest) fork code block
      const firstForkBlock = this.querySelector('.fork-code-block');
      if (firstForkBlock) {
        firstForkBlock.setAttribute('open', 'true');
      }
    }
  });

  // Add data attributes for filtering
  details.dataset.name = baseName.toLowerCase();
  details.dataset.category = category;

  // Add fork data for filtering
  if (mForks && mForks.length > 0) {
    details.dataset.introducingFork = mForks[0].fork;
    details.dataset.forks = mForks.map(f => f.fork).join(' ');
    // Store available fork blocks
    details.dataset.forkBlocks = JSON.stringify(forkDetails);
  }

  // Add changes data for filtering
  if (mForks && mForks.length > 1) {
    details.dataset.changedInForks = mForks.slice(1).map(f => f.fork).join(' ');
  }

  // Add deprecated data for filtering
  if (appState.isItemDeprecated(baseName)) {
    details.dataset.deprecated = "true";
  }

  return details;
}

/**
 * Collect items from data
 */
export function collectItems(data, field) {
  const items = {};
  const lastForkValue = {};

  getIncludedForks(data).forEach((forkName) => {
    const forkObj = data[forkName];
    if (!forkObj?.[field]) return;

    Object.keys(forkObj[field]).forEach((itemName) => {
      const value = forkObj[field][itemName];
      const fork = forkName.toUpperCase();

      if (!items[itemName]) {
        items[itemName] = [{ fork, value: value}];
        lastForkValue[itemName] = value;
        return;
      }

      if (value !== lastForkValue[itemName]) {
        items[itemName].push({fork, value: value});
        lastForkValue[itemName] = value;
      }
    });
  });

  return items;
}

/**
 * Add items to the DOM
 */
export function addItems(jsonData, fieldName, displayValueInSummary = false) {
  const items = collectItems(jsonData.mainnet, fieldName);

  const itemGroups = {};
  Object.keys(items).forEach((itemName) => {
    const value = items[itemName];
    const group = value[0].fork;
    if (!itemGroups[group]) itemGroups[group] = [];
    itemGroups[group].push(itemName);
  });

  const itemContainer = document.getElementById(fieldName);
  itemContainer.innerHTML = "";

  Object.keys(itemGroups).sort(forkGroupCompareAscending).forEach((groupName) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "phase-group";
    groupDiv.innerHTML = `<h2>${groupName}</h2>`;
    itemGroups[groupName].sort().forEach((itemName) => {
      groupDiv.appendChild(renderItem(itemName, items[itemName], displayValueInSummary, fieldName));
    });
    itemContainer.appendChild(groupDiv);
  });
}