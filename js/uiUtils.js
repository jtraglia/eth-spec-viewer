/**
 * UI utility functions for common interface elements
 * 
 * Provides reusable functions for creating UI components like badges,
 * buttons, and other common interface elements.
 * 
 * @module uiUtils
 */

import { getForkColor } from './utils.js';
import { createElement } from './domUtils.js';

/**
 * Create a fork badge element
 * @param {string} fork - Fork name
 * @param {Object} options - Badge options
 * @param {string} [options.className='badge'] - CSS class name
 * @param {Object} [options.style] - Additional styles
 * @returns {HTMLElement} Badge element
 */
export function createForkBadge(fork, options = {}) {
  const color = getForkColor(fork);
  const className = options.className || 'badge';
  
  return createElement('span', {
    classes: [className],
    textContent: fork,
    style: {
      backgroundColor: color,
      ...options.style
    }
  });
}

/**
 * Create multiple fork badges
 * @param {string[]} forks - Array of fork names
 * @param {Object} options - Badge options
 * @returns {HTMLElement[]} Array of badge elements
 */
export function createForkBadges(forks, options = {}) {
  return forks.map(fork => createForkBadge(fork, options));
}

/**
 * Create a fork badge HTML string
 * @param {string} fork - Fork name
 * @param {string} className - CSS class name
 * @returns {string} HTML string for the badge
 */
export function createForkBadgeHTML(fork, className = 'badge') {
  const color = getForkColor(fork);
  return `<span class="${className}" style="background-color: ${color}">${fork}</span>`;
}

/**
 * Create multiple fork badge HTML strings
 * @param {string[]} forks - Array of fork names
 * @param {string} className - CSS class name
 * @param {string} separator - String to join badges with
 * @returns {string} HTML string with all badges
 */
export function createForkBadgesHTML(forks, className = 'badge', separator = ' ') {
  return forks.map(fork => createForkBadgeHTML(fork, className)).join(separator);
}

/**
 * Create a deprecated badge
 * @param {Object} options - Badge options
 * @returns {HTMLElement} Deprecated badge element
 */
export function createDeprecatedBadge(options = {}) {
  return createElement('span', {
    classes: ['deprecated-badge'],
    textContent: 'DEPRECATED',
    ...options
  });
}

/**
 * Create a deprecated badge HTML string
 * @returns {string} HTML string for deprecated badge
 */
export function createDeprecatedBadgeHTML() {
  return '<span class="deprecated-badge">DEPRECATED</span>';
}

/**
 * Create a share button
 * @param {string} link - Link to share
 * @param {Object} options - Button options
 * @returns {HTMLElement} Share button element
 */
export function createShareButton(link, options = {}) {
  return createElement('button', {
    classes: ['share-button'],
    attributes: {
      'data-link': link,
      title: 'Copy link to this item'
    },
    innerHTML: '<i class="fas fa-link"></i>',
    ...options
  });
}

/**
 * Create a share button HTML string
 * @param {string} link - Link to share
 * @returns {string} HTML string for share button
 */
export function createShareButtonHTML(link) {
  return `<button class="share-button" data-link="${link}" title="Copy link to this item">
    <i class="fas fa-link"></i>
  </button>`;
}

/**
 * Create a filter badge with remove functionality
 * @param {string} label - Badge label
 * @param {string} value - Badge value
 * @param {Function} onRemove - Callback when remove is clicked
 * @returns {HTMLElement} Filter badge element
 */
export function createFilterBadge(label, value, onRemove) {
  const badge = createElement('div', {
    classes: ['filter-badge'],
    innerHTML: `${label}: ${value} <span class="filter-badge-remove">×</span>`
  });

  if (onRemove) {
    const removeButton = badge.querySelector('.filter-badge-remove');
    removeButton.addEventListener('click', onRemove);
  }

  return badge;
}

/**
 * Create a notification element
 * @param {string} message - Notification message
 * @param {Object} options - Notification options
 * @param {string} [options.type='info'] - Notification type (info, success, warning, error)
 * @param {number} [options.duration=5000] - Auto-dismiss duration in ms (0 for no auto-dismiss)
 * @param {boolean} [options.dismissible=true] - Whether notification can be dismissed
 * @returns {HTMLElement} Notification element
 */
export function createNotification(message, options = {}) {
  const {
    type = 'info',
    duration = 5000,
    dismissible = true
  } = options;

  const typeColors = {
    info: '#17a2b8',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };

  const notification = createElement('div', {
    classes: ['notification', `notification-${type}`],
    textContent: message,
    style: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: typeColors[type] || typeColors.info,
      color: type === 'warning' ? '#000' : '#fff',
      padding: '12px 16px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: '9999',
      maxWidth: '400px',
      cursor: dismissible ? 'pointer' : 'default'
    }
  });

  if (dismissible) {
    notification.addEventListener('click', () => {
      notification.remove();
    });
  }

  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }

  document.body.appendChild(notification);
  return notification;
}