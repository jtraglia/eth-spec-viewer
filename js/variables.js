/**
 * Variables (Constants, Presets, Configurations) rendering module
 *
 * Handles the rendering and display of Ethereum consensus specification variables
 * including constants, preset variables, and configuration variables. These variables
 * can vary between different forks and network configurations.
 */

import {
  getIncludedForks,
  parseForkName,
  parseValue,
  forkGroupCompareAscending,
  forkGroupCompareDescending,
  generateItemId,
  createShareLink,
  highlightDiff
} from './utils.js';
import { appState } from './state.js';
import { createForkBadgesHTML, createDeprecatedBadgeHTML, createShareButtonHTML } from './uiUtils.js';

/**
 * Get the value of a variable for a specific fork
 *
 * @param {string} fk - Fork name to get value for
 * @param {Object} baseVal - Base variable object with introducingFork, value, type
 * @param {Array} forkArr - Array of fork-specific overrides
 * @returns {{value: any, type: string}} Variable value and type for the fork
 */
function getForkValue(fk, baseVal, forkArr) {
  if (!baseVal) return { value: undefined, type: "" };
  if (fk === baseVal.introducingFork) {
    return { value: baseVal.value, type: baseVal.type };
  }
  if (!forkArr) return { value: undefined, type: "" };

  let foundVal = null;
  let foundType = null;
  forkArr.forEach((f) => {
    if (f.fork === fk) {
      foundVal = f.value;
      foundType = f.type;
    }
  });
  if (foundVal === null) {
    return { value: undefined, type: "" };
  }
  return { value: foundVal, type: foundType };
}

/**
 * Build rows for variable table
 */
function buildRows(mBase, mForks, nBase, nForks) {
  const allForks = new Set();
  if (mBase) allForks.add(mBase.introducingFork);
  (mForks || []).forEach((f) => allForks.add(f.fork));

  if (nBase) allForks.add(nBase.introducingFork);
  (nForks || []).forEach((f) => allForks.add(f.fork));

  let forkArray = Array.from(allForks);
  forkArray.sort(forkGroupCompareDescending);

  return forkArray.map((fk) => {
    const mainnet = getForkValue(fk, mBase, mForks);
    const minimal = getForkValue(fk, nBase, nForks);

    return {
      fork: fk,
      type: mainnet.type,
      mainnetValue: mainnet.value,
      minimalValue: minimal.value,
    };
  });
}

/**
 * Build HTML table for variable display
 */
function buildTable(rows, showDiff = false) {
  if (!rows.length) {
    return `<p style="color: grey;">No data</p>`;
  }

  // Create rows with diff highlighting if requested
  const rowHTML = rows.map((r, index) => {
    let mainnetValue = r.mainnetValue;
    let minimalValue = r.minimalValue;

    // If showing diffs and we have a previous row to compare with
    if (showDiff && index < rows.length - 1) {
      const prevRow = rows[index + 1]; // Since rows are sorted in descending order
      mainnetValue = highlightDiff(prevRow.mainnetValue, mainnetValue);
      minimalValue = highlightDiff(prevRow.minimalValue, minimalValue);
    }

    return `
      <tr>
        <td>${r.fork}</td>
        <td>${r.type}</td>
        <td>${mainnetValue}</td>
        <td>${minimalValue}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="fork-table">
      <thead>
        <tr>
          <th>Fork</th>
          <th>Type</th>
          <th>Mainnet</th>
          <th>Minimal</th>
        </tr>
      </thead>
      <tbody>${rowHTML}</tbody>
    </table>
  `;
}

/**
 * Build summary text for variable display
 */
function buildVariableSummary(name, mBase, mForks, displayTypeAndValue = true) {
  if (!mBase && (!mForks || !mForks.length)) {
    return `${name} = (no mainnet data)`;
  }

  const forkNames = new Set();
  if (mBase) forkNames.add(mBase.introducingFork);
  if (mForks) {
    mForks.forEach((f) => forkNames.add(f.fork));
  }

  const sortedForks = Array.from(forkNames).sort(forkGroupCompareDescending);

  const badges = createForkBadgesHTML(sortedForks);

  let lastVal = mBase?.value || "N/A";
  let lastType = mBase?.type || "";

  if (mForks && mForks.length > 0) {
    const newest = mForks[mForks.length - 1];
    lastVal = newest.value;
    lastType = newest.type || lastType;
  }

  /* If there's a large value (eg KZG_SETUP) don't show the value */
  if (String(lastVal).length > 64) {
    displayTypeAndValue = false;
  }

  // Add deprecated badge if needed
  const deprecatedBadge = appState.isItemDeprecated(name) ?
    createDeprecatedBadgeHTML() : '';

  if (displayTypeAndValue) {
    const displayType = lastType && lastType !== "Unknown" ? `: ${lastType} = ` : ` = `;
    return `${name}${displayType}${lastVal} ${badges} ${deprecatedBadge}`;
  } else {
    return `${name} ${badges} ${deprecatedBadge}`;
  }
}

/**
 * Render a single variable
 */
export function renderVariable(baseName, mBase, mForks, nBase, nForks, category) {
  const rows = buildRows(mBase, mForks, nBase, nForks);
  const showDiff = document.getElementById('showDiffToggle')?.checked || false;
  const table = buildTable(rows, showDiff);
  const summaryText = buildVariableSummary(baseName, mBase, mForks);

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
    ${createShareButtonHTML(shareLink)}
  `;
  details.appendChild(summary);

  const content = document.createElement("div");
  content.className = "expanded-content";
  content.innerHTML = table;
  details.appendChild(content);

  // Add data attributes for filtering
  details.dataset.name = baseName.toLowerCase();
  details.dataset.category = category;

  // Add fork data for filtering
  if (mBase) {
    details.dataset.introducingFork = mBase.introducingFork;
  }

  const forkSet = new Set();
  if (mBase) forkSet.add(mBase.introducingFork);
  if (mForks) {
    mForks.forEach(f => forkSet.add(f.fork));
  }
  details.dataset.forks = Array.from(forkSet).join(' ');

  // Add changes data for filtering
  if (mForks && mForks.length > 0) {
    details.dataset.changedInForks = mForks.map(f => f.fork).join(' ');
  }

  // Add deprecated data for filtering
  if (appState.isItemDeprecated(baseName)) {
    details.dataset.deprecated = "true";
  }

  return details;
}

/**
 * Collect variables from data
 */
export function collectVariables(data, field) {
  const baseVars = {};
  const forkVars = {};
  const lastForkValue = {};

  if (!data) return { baseVars, forkVars };

  const includedPhases = getIncludedForks(data);
  const knownForkNames = includedPhases.map((p) => p.toUpperCase());

  includedPhases.forEach((phaseName) => {
    const phaseObj = data[phaseName];
    if (!phaseObj?.[field]) return;

    Object.keys(phaseObj[field]).forEach((varName) => {
      const { base, fork } = parseForkName(varName, knownForkNames);
      const parsed = parseValue(phaseObj[field][varName]);

      if (!baseVars[base]) {
        baseVars[base] = {
          type: parsed.type,
          value: parsed.value,
          introducingFork: (fork || phaseName).toUpperCase(),
        };
      }

      if (!fork) {
        baseVars[base].type = parsed.type;
        baseVars[base].value = parsed.value;
        return;
      }

      if (!forkVars[base]) {
        forkVars[base] = [];
      }
      if (!lastForkValue[base]) {
        lastForkValue[base] = {};
      }
      if (lastForkValue[base][fork] === undefined) {
        lastForkValue[base][fork] = baseVars[base].value;
      }
      const prevVal = lastForkValue[base][fork];
      if (parsed.value !== prevVal) {
        forkVars[base].push({fork, value: parsed.value, type: parsed.type});
        lastForkValue[base][fork] = parsed.value;
      }
    });
  });

  return { baseVars, forkVars };
}

/**
 * Add variables to the DOM
 */
export function addVariables(jsonData, fieldName) {
  const mainnetPresets = collectVariables(jsonData.mainnet, fieldName);
  const minimalPresets = collectVariables(jsonData.minimal, fieldName);

  const allPresetVars = new Set([
    ...Object.keys(mainnetPresets.baseVars),
    ...Object.keys(minimalPresets.baseVars),
  ]);

  const presetGroups = {};
  allPresetVars.forEach((baseName) => {
    const mVal = mainnetPresets.baseVars[baseName];
    const nVal = minimalPresets.baseVars[baseName];
    const grp = mVal?.introducingFork || nVal?.introducingFork;
    if (!presetGroups[grp]) presetGroups[grp] = [];
    presetGroups[grp].push(baseName);
  });

  const presetGroupKeys = Object.keys(presetGroups).sort(forkGroupCompareAscending);

  const presetVarsContainer = document.getElementById(fieldName);
  presetVarsContainer.innerHTML = "";

  presetGroupKeys.forEach((groupName) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "phase-group";
    groupDiv.innerHTML = `<h2>${groupName}</h2>`;

    const varNames = presetGroups[groupName];
    varNames.sort();
    varNames.forEach((vName) => {
      const row = renderVariable(
        vName,
        mainnetPresets.baseVars[vName],
        mainnetPresets.forkVars[vName] || [],
        minimalPresets.baseVars[vName],
        minimalPresets.forkVars[vName] || [],
        fieldName
      );
      groupDiv.appendChild(row);
    });

    presetVarsContainer.appendChild(groupDiv);
  });
}