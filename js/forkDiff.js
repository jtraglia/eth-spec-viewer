/**
 * Fork-to-fork diff rendering
 *
 * An item only records the forks in which its value actually changed, so
 * consecutive entries in `item.forks` are exactly the points where the spec
 * rewrote it. Diffing a fork against its predecessor therefore shows precisely
 * what that fork introduced.
 *
 * Diffs render inline (unified), one row per line with both line numbers.
 * Comments are stripped from both sides first, so a fork that only re-worded a
 * `# [Modified in ...]` marker reads as no change.
 *
 * Relies on the jsdiff global (`Diff`) loaded from a CDN in index.html. Every
 * entry point degrades to plain code when that script is unavailable.
 */

const DIFF_ENABLED_KEY = 'specViewerDiffEnabled';

const diffState = {
  enabled: readStored(DIFF_ENABLED_KEY) === 'true'
};

/**
 * Read a persisted preference, tolerating environments where storage throws
 * (private browsing, disabled site data)
 */
function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

/**
 * Persist a preference; failure just means it won't survive a reload
 */
function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    /* storage unavailable - preference stays in-memory only */
  }
}

/**
 * Whether the jsdiff library loaded successfully
 */
export function isDiffAvailable() {
  return typeof Diff !== 'undefined' && typeof Diff.diffLines === 'function';
}

/**
 * Whether fork diffing is currently turned on
 */
export function isDiffEnabled() {
  return diffState.enabled && isDiffAvailable();
}

/**
 * Build the diff controls for the spec header
 * @param {Function} onChange - Called after a toggle, to re-render the item
 * @returns {HTMLElement} The controls container
 */
export function createDiffControls(onChange) {
  const container = document.createElement('div');
  container.className = 'diff-controls';

  const toggle = document.createElement('button');
  toggle.className = 'diff-toggle-btn';
  toggle.innerHTML = '<i class="fas fa-code-compare"></i> Diff';

  if (!isDiffAvailable()) {
    toggle.disabled = true;
    toggle.title = 'Diff library failed to load';
    container.appendChild(toggle);
    return container;
  }

  if (diffState.enabled) {
    toggle.classList.add('active');
    toggle.title = 'Show the full code for each fork';
  } else {
    toggle.title = 'Show what each fork changed';
  }

  toggle.addEventListener('click', () => {
    diffState.enabled = !diffState.enabled;
    writeStored(DIFF_ENABLED_KEY, String(diffState.enabled));
    onChange();
  });

  container.appendChild(toggle);

  return container;
}

/**
 * Scan one line for a comment start, tracking string state.
 *
 * @param {string} line
 * @param {string|null} openDelim - triple-quote delimiter already open, if any
 * @returns {{commentAt: number, openDelim: string|null}} where an unquoted `#`
 *   begins (-1 if none) and any triple-quote still open at end of line
 */
function scanLine(line, openDelim) {
  let delim = openDelim;
  let i = 0;

  while (i < line.length) {
    if (delim) {
      // Inside a string, only its closing delimiter matters
      if (delim.length === 3) {
        if (line.startsWith(delim, i)) { delim = null; i += 3; continue; }
      } else {
        if (line[i] === '\\') { i += 2; continue; }
        if (line[i] === delim) { delim = null; i += 1; continue; }
      }
      i += 1;
      continue;
    }

    const ch = line[i];
    if (ch === '#') return { commentAt: i, openDelim: null };

    if (ch === '"' || ch === "'") {
      if (line.startsWith(ch.repeat(3), i)) { delim = ch.repeat(3); i += 3; }
      else { delim = ch; i += 1; }
      continue;
    }

    i += 1;
  }

  // A single-quoted string cannot span lines
  return { commentAt: -1, openDelim: delim && delim.length === 3 ? delim : null };
}

/**
 * Strip Python comments so a diff shows only real code changes.
 *
 * Comment-only lines are dropped entirely; a trailing comment is cut off the
 * end of its line. A `#` inside a string literal - including a multi-line
 * docstring - is left alone.
 */
export function stripComments(code) {
  const out = [];
  let openDelim = null;

  code.split('\n').forEach(line => {
    const startedInString = openDelim !== null;
    const { commentAt, openDelim: nextDelim } = scanLine(line, openDelim);
    openDelim = nextDelim;

    if (commentAt === -1) {
      out.push(line);
      return;
    }

    const before = line.slice(0, commentAt);

    // A line that was nothing but a comment disappears. A blank line inside a
    // docstring is real content, so only drop lines that started outside one.
    if (!startedInString && before.trim() === '') return;

    out.push(before.trimEnd());
  });

  return out.join('\n').trimEnd();
}

/**
 * Ensure code ends with a newline before diffing.
 *
 * jsdiff tokenizes each line together with its terminator, so a final line
 * with no trailing newline never matches the same text followed by one - an
 * unchanged last line would show up as removed and re-added. Normalizing here
 * rather than in stripComments keeps the plain code view free of a trailing
 * blank line.
 */
function withTrailingNewline(code) {
  return code.endsWith('\n') ? code : `${code}\n`;
}

/**
 * Split a diff part's value into lines, dropping the empty string that a
 * trailing newline leaves behind
 */
function toLines(value) {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Count added and removed lines between two code strings
 * @returns {{added: number, removed: number}}
 */
export function computeDiffStats(oldCode, newCode) {
  if (!isDiffAvailable()) return { added: 0, removed: 0 };

  let added = 0;
  let removed = 0;

  Diff.diffLines(withTrailingNewline(oldCode), withTrailingNewline(newCode)).forEach(part => {
    const count = toLines(part.value).length;
    if (part.added) added += count;
    else if (part.removed) removed += count;
  });

  return { added, removed };
}

/**
 * Flatten the diff into one row per rendered line, carrying both line numbers
 */
function buildUnifiedRows(oldCode, newCode) {
  const oldText = withTrailingNewline(oldCode);
  const newText = withTrailingNewline(newCode);

  const changes = Diff.diffLines(oldText, newText);
  const oldHtml = highlightCodeBlock(oldText);
  const newHtml = highlightCodeBlock(newText);

  const rows = [];
  let oldLine = 0;
  let newLine = 0;

  changes.forEach(part => {
    const count = toLines(part.value).length;

    for (let i = 0; i < count; i++) {
      if (part.added) {
        newLine++;
        rows.push({ type: 'added', newLine, html: newHtml[newLine - 1] || '' });
      } else if (part.removed) {
        oldLine++;
        rows.push({ type: 'removed', oldLine, html: oldHtml[oldLine - 1] || '' });
      } else {
        oldLine++;
        newLine++;
        rows.push({ type: 'context', oldLine, newLine, html: newHtml[newLine - 1] || '' });
      }
    }
  });

  return rows;
}

/**
 * Render an inline diff, with the old and new line numbers side by side
 */
export function renderDiff(container, oldCode, newCode) {
  const table = document.createElement('table');
  table.className = 'diff-unified';

  const tbody = document.createElement('tbody');
  const prefixes = { added: '+', removed: '-', context: ' ' };

  buildUnifiedRows(oldCode, newCode).forEach(row => {
    const tr = document.createElement('tr');
    tr.className = `diff-line-${row.type}`;
    tr.innerHTML = `
      <td class="diff-line-number">${row.oldLine || ''}</td>
      <td class="diff-line-number">${row.newLine || ''}</td>
      <td class="diff-line-prefix">${prefixes[row.type]}</td>
      <td class="diff-line-content">${row.html || '&nbsp;'}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Syntax-highlight a whole code block and return one HTML string per line.
 *
 * The block is highlighted as a unit so Prism sees multi-line constructs like
 * docstrings, then split into lines with any span left open at a line boundary
 * closed and reopened, so each line stands alone inside its own table cell.
 */
export function highlightCodeBlock(code) {
  if (typeof Prism === 'undefined' || !Prism.languages.python) {
    return code.split('\n').map(line => escapeHtml(line));
  }

  const highlighted = Prism.highlight(code, Prism.languages.python, 'python');
  const lines = [];
  let openTags = [];

  highlighted.split('\n').forEach(rawLine => {
    const prefix = openTags.join('');
    const stillOpen = [...openTags];

    const tagRegex = /<(\/?)span([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(rawLine)) !== null) {
      if (match[1] === '/') {
        stillOpen.pop();
      } else {
        stillOpen.push(`<span${match[2]}>`);
      }
    }

    lines.push(prefix + rawLine + '</span>'.repeat(stillOpen.length));
    openTags = stillOpen;
  });

  return lines;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
