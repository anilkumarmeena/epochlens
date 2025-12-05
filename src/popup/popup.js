/**
 * EpochLens Popup Script
 * Handles popup UI interactions and state
 */

// Constants
const STORAGE_KEY = 'epochlens_settings';
const STATS_KEY = 'epochlens_stats';
const MIN_TIMESTAMP_MS = 946684800000;
const MAX_TIMESTAMP_MS = 4102444800000;

const DEFAULT_SETTINGS = {
  enabled: true,
  displayMode: 'tooltip',
  timezone: 'local',
  showSecondaryTimezone: false,
  secondaryTimezone: 'UTC',
  dateFormat: 'locale',
  customFormat: 'YYYY-MM-DD HH:mm:ss',
  showBadgeCount: true,
  highlightStyle: 'dotted',
  autoScan: true,
  scanDelay: 500
};

// State
let settings = { ...DEFAULT_SETTINGS };
let currentInput = '';

// DOM Elements
const elements = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Converter
  input: document.getElementById('input'),
  inputHint: document.getElementById('inputHint'),
  clearInput: document.getElementById('clearInput'),
  pasteBtn: document.getElementById('pasteBtn'),
  nowBtn: document.getElementById('nowBtn'),
  
  // Results
  resultCard: document.getElementById('resultCard'),
  errorCard: document.getElementById('errorCard'),
  emptyState: document.getElementById('emptyState'),
  errorMessage: document.getElementById('errorMessage'),
  
  // Result values
  timestampType: document.getElementById('timestampType'),
  epochSeconds: document.getElementById('epochSeconds'),
  epochMs: document.getElementById('epochMs'),
  timezoneLabel: document.getElementById('timezoneLabel'),
  formattedDate: document.getElementById('formattedDate'),
  secondaryTzGroup: document.getElementById('secondaryTzGroup'),
  secondaryTzLabel: document.getElementById('secondaryTzLabel'),
  secondaryDate: document.getElementById('secondaryDate'),
  isoDate: document.getElementById('isoDate'),
  relativeTime: document.getElementById('relativeTime'),
  
  // Stats
  pageCount: document.getElementById('pageCount'),
  totalConverted: document.getElementById('totalConverted'),
  
  // Quick settings
  enabledToggle: document.getElementById('enabledToggle'),
  badgeToggle: document.getElementById('badgeToggle'),
  autoScanToggle: document.getElementById('autoScanToggle'),
  rescanBtn: document.getElementById('rescanBtn'),
  
  // Other
  openSettings: document.getElementById('openSettings'),
  fullSettingsLink: document.getElementById('fullSettingsLink'),
  toast: document.getElementById('toast')
};

/**
 * Initialize popup
 */
async function init() {
  // Load settings
  settings = await getSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update quick settings toggles
  updateToggles();
  
  // Load stats
  await loadStats();
  
  // Focus input
  elements.input.focus();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Tab switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Input handling
  elements.input.addEventListener('input', handleInput);
  elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleInput();
    }
  });
  
  // Clear input
  elements.clearInput.addEventListener('click', () => {
    elements.input.value = '';
    currentInput = '';
    showEmptyState();
    elements.input.focus();
  });
  
  // Paste button
  elements.pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      elements.input.value = text.trim();
      handleInput();
    } catch {
      // Clipboard access denied
    }
  });
  
  // Now button
  elements.nowBtn.addEventListener('click', () => {
    elements.input.value = Date.now().toString();
    handleInput();
  });
  
  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copy;
      const target = document.getElementById(targetId);
      if (target) {
        copyToClipboard(target.textContent);
        showCopyFeedback(btn);
      }
    });
  });
  
  // Quick settings toggles
  elements.enabledToggle.addEventListener('change', async () => {
    await updateSetting('enabled', elements.enabledToggle.checked);
    notifyContentScript();
  });
  
  elements.badgeToggle.addEventListener('change', async () => {
    await updateSetting('showBadgeCount', elements.badgeToggle.checked);
  });
  
  elements.autoScanToggle.addEventListener('change', async () => {
    await updateSetting('autoScan', elements.autoScanToggle.checked);
    notifyContentScript();
  });
  
  // Rescan button
  elements.rescanBtn.addEventListener('click', rescanPage);
  
  // Settings links
  elements.openSettings.addEventListener('click', openOptionsPage);
  elements.fullSettingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    openOptionsPage();
  });
}

/**
 * Switch between tabs
 */
function switchTab(tabId) {
  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}-tab`);
  });
  
  if (tabId === 'stats') {
    loadStats();
  }
}

/**
 * Handle input changes
 */
function handleInput() {
  const value = elements.input.value.trim();
  
  if (!value) {
    showEmptyState();
    elements.inputHint.textContent = '';
    return;
  }
  
  currentInput = value;
  
  // Detect input type
  const inputType = detectInputType(value);
  elements.inputHint.textContent = inputType ? `(${inputType})` : '';
  
  // Try to convert
  if (isValidTimestamp(value)) {
    showTimestampResult(value);
  } else {
    // Try to parse as date
    const date = parseDate(value);
    if (date) {
      showDateResult(date, value);
    } else {
      showError('Invalid timestamp or date format');
    }
  }
}

/**
 * Detect input type
 */
function detectInputType(value) {
  if (/^\d{10}$/.test(value)) return 'seconds';
  if (/^\d{13}$/.test(value)) return 'milliseconds';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  if (/^\w+ \d+/.test(value)) return 'date string';
  return null;
}

/**
 * Check if value is a valid timestamp
 */
function isValidTimestamp(value) {
  if (!/^\d{10}$|^\d{13}$/.test(value)) return false;
  
  const num = Number(value);
  const ms = value.length === 10 ? num * 1000 : num;
  
  return ms >= MIN_TIMESTAMP_MS && ms <= MAX_TIMESTAMP_MS;
}

/**
 * Parse date string
 */
function parseDate(value) {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    const ms = date.getTime();
    if (ms < MIN_TIMESTAMP_MS || ms > MAX_TIMESTAMP_MS) return null;
    
    return date;
  } catch {
    return null;
  }
}

/**
 * Show timestamp conversion result
 */
function showTimestampResult(timestamp) {
  const num = Number(timestamp);
  const isSeconds = timestamp.length === 10;
  const ms = isSeconds ? num * 1000 : num;
  const date = new Date(ms);
  
  // Update result elements
  elements.timestampType.textContent = isSeconds ? 'Seconds' : 'Milliseconds';
  elements.epochSeconds.textContent = Math.floor(ms / 1000);
  elements.epochMs.textContent = `${ms} ms`;
  
  // Primary timezone
  const tzLabel = settings.timezone === 'local' ? 'Local Time' : settings.timezone;
  elements.timezoneLabel.textContent = tzLabel;
  elements.formattedDate.textContent = formatDate(date, settings.timezone);
  
  // Secondary timezone
  if (settings.showSecondaryTimezone && settings.secondaryTimezone) {
    elements.secondaryTzGroup.style.display = 'block';
    elements.secondaryTzLabel.textContent = settings.secondaryTimezone;
    elements.secondaryDate.textContent = formatDate(date, settings.secondaryTimezone);
  } else {
    elements.secondaryTzGroup.style.display = 'none';
  }
  
  // ISO format
  elements.isoDate.textContent = date.toISOString();
  
  // Relative time
  elements.relativeTime.textContent = formatRelative(date);
  
  // Show result card
  elements.resultCard.style.display = 'block';
  elements.errorCard.style.display = 'none';
  elements.emptyState.style.display = 'none';
}

/**
 * Show date to timestamp result
 */
function showDateResult(date, originalInput) {
  const ms = date.getTime();
  
  // Update result elements
  elements.timestampType.textContent = 'From Date';
  elements.epochSeconds.textContent = Math.floor(ms / 1000);
  elements.epochMs.textContent = `${ms} ms`;
  
  // Primary timezone
  const tzLabel = settings.timezone === 'local' ? 'Local Time' : settings.timezone;
  elements.timezoneLabel.textContent = tzLabel;
  elements.formattedDate.textContent = formatDate(date, settings.timezone);
  
  // Secondary timezone
  if (settings.showSecondaryTimezone && settings.secondaryTimezone) {
    elements.secondaryTzGroup.style.display = 'block';
    elements.secondaryTzLabel.textContent = settings.secondaryTimezone;
    elements.secondaryDate.textContent = formatDate(date, settings.secondaryTimezone);
  } else {
    elements.secondaryTzGroup.style.display = 'none';
  }
  
  // ISO format
  elements.isoDate.textContent = date.toISOString();
  
  // Relative time
  elements.relativeTime.textContent = formatRelative(date);
  
  // Show result card
  elements.resultCard.style.display = 'block';
  elements.errorCard.style.display = 'none';
  elements.emptyState.style.display = 'none';
}

/**
 * Format date for display
 */
function formatDate(date, timezone) {
  try {
    const options = timezone === 'local' ? {} : { timeZone: timezone };
    
    return date.toLocaleString(undefined, {
      ...options,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format relative time
 */
function formatRelative(date) {
  const now = new Date();
  const diff = now - date;
  const absDiff = Math.abs(diff);
  const isPast = diff > 0;
  
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let value, unit;
  
  if (seconds < 60) {
    value = seconds;
    unit = 'second';
  } else if (minutes < 60) {
    value = minutes;
    unit = 'minute';
  } else if (hours < 24) {
    value = hours;
    unit = 'hour';
  } else {
    value = days;
    unit = 'day';
  }
  
  const plural = value !== 1 ? 's' : '';
  
  if (isPast) {
    return value === 0 ? 'just now' : `${value} ${unit}${plural} ago`;
  } else {
    return `in ${value} ${unit}${plural}`;
  }
}

/**
 * Show error state
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorCard.style.display = 'flex';
  elements.resultCard.style.display = 'none';
  elements.emptyState.style.display = 'none';
}

/**
 * Show empty state
 */
function showEmptyState() {
  elements.emptyState.style.display = 'flex';
  elements.resultCard.style.display = 'none';
  elements.errorCard.style.display = 'none';
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast();
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast();
  }
}

/**
 * Show copy feedback on button
 */
function showCopyFeedback(btn) {
  btn.classList.add('copied');
  setTimeout(() => btn.classList.remove('copied'), 1000);
}

/**
 * Show toast notification
 */
function showToast() {
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 2000);
}

/**
 * Load settings from storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
    });
  });
}

/**
 * Update a single setting
 */
async function updateSetting(key, value) {
  settings[key] = value;
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

/**
 * Update toggle states
 */
function updateToggles() {
  elements.enabledToggle.checked = settings.enabled;
  elements.badgeToggle.checked = settings.showBadgeCount;
  elements.autoScanToggle.checked = settings.autoScan;
}

/**
 * Load page and total stats
 */
async function loadStats() {
  // Get page stats from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_STATS' }, (response) => {
        if (response) {
          elements.pageCount.textContent = response.timestampCount || 0;
        }
      });
    }
  } catch {
    elements.pageCount.textContent = '0';
  }
  
  // Get total stats
  chrome.storage.local.get(STATS_KEY, (result) => {
    const stats = result[STATS_KEY] || {};
    elements.totalConverted.textContent = stats.totalConverted || 0;
  });
}

/**
 * Rescan current page
 */
async function rescanPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_SETTINGS', 
        settings: { ...settings, enabled: true } 
      });
      
      // Reload stats after a short delay
      setTimeout(loadStats, 500);
    }
  } catch (e) {
    console.error('Failed to rescan:', e);
  }
}

/**
 * Notify content script of settings change
 */
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_SETTINGS', 
        settings 
      });
    }
  } catch {
    // Tab might not have content script
  }
}

/**
 * Open options page
 */
function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

