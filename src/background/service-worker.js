/**
 * EpochLens Service Worker
 * Handles context menu, badge updates, and cross-tab messaging
 */

// Constants (duplicated here since service workers can't share window globals)
const STORAGE_KEY = 'epochlens_settings';
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

const MESSAGE_TYPES = {
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_PAGE_STATS: 'GET_PAGE_STATS',
  UPDATE_BADGE: 'UPDATE_BADGE',
  CONVERT_SELECTION: 'CONVERT_SELECTION',
  CONVERSION_RESULT: 'CONVERSION_RESULT'
};

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  // Set default settings on first install
  if (details.reason === 'install') {
    await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  }
  
  // Create context menu
  createContextMenu();
});

/**
 * Create context menu items
 */
function createContextMenu() {
  // Remove existing menu items first
  chrome.contextMenus.removeAll(() => {
    // Main conversion option
    chrome.contextMenus.create({
      id: 'epochlens-convert',
      title: 'Convert with EpochLens',
      contexts: ['selection']
    });
    
    // Copy as timestamp
    chrome.contextMenus.create({
      id: 'epochlens-copy-timestamp',
      title: 'Copy as Unix timestamp',
      contexts: ['selection']
    });
    
    // Separator
    chrome.contextMenus.create({
      id: 'epochlens-separator',
      type: 'separator',
      contexts: ['selection']
    });
    
    // Quick convert submenu
    chrome.contextMenus.create({
      id: 'epochlens-quick',
      title: 'Quick Convert',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'epochlens-quick-local',
      parentId: 'epochlens-quick',
      title: 'To Local Time',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'epochlens-quick-utc',
      parentId: 'epochlens-quick',
      title: 'To UTC',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'epochlens-quick-iso',
      parentId: 'epochlens-quick',
      title: 'To ISO 8601',
      contexts: ['selection']
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selection = info.selectionText?.trim();
  if (!selection) return;
  
  const settings = await getSettings();
  
  switch (info.menuItemId) {
    case 'epochlens-convert':
      await handleConvert(selection, tab, settings);
      break;
    
    case 'epochlens-copy-timestamp':
      await handleCopyTimestamp(selection, tab);
      break;
    
    case 'epochlens-quick-local':
      await handleQuickConvert(selection, tab, { ...settings, timezone: 'local' });
      break;
    
    case 'epochlens-quick-utc':
      await handleQuickConvert(selection, tab, { ...settings, timezone: 'UTC' });
      break;
    
    case 'epochlens-quick-iso':
      await handleQuickConvert(selection, tab, { ...settings, format: 'iso' });
      break;
  }
});

/**
 * Handle main convert action
 */
async function handleConvert(selection, tab, settings) {
  const result = convertTimestamp(selection, settings);
  
  if (result.success) {
    // Show notification with result
    showNotification(
      'Timestamp Converted',
      `${selection} → ${result.formatted}`,
      result.formatted
    );
    
    // Also inject result into page
    await injectConversionResult(tab.id, result);
  } else {
    // Try to parse as date and convert to timestamp
    const timestamp = dateToTimestamp(selection);
    if (timestamp) {
      showNotification(
        'Date Converted',
        `${selection} → ${timestamp}`,
        String(timestamp)
      );
    } else {
      showNotification('Conversion Failed', 'Invalid timestamp or date format');
    }
  }
}

/**
 * Handle copy as timestamp
 */
async function handleCopyTimestamp(selection, tab) {
  // First check if it's already a timestamp
  if (isValidTimestamp(selection)) {
    const ms = toMilliseconds(selection);
    await copyToClipboard(String(ms), tab.id);
    showNotification('Copied', `Timestamp: ${ms}ms`);
    return;
  }
  
  // Try to parse as date
  const timestamp = dateToTimestamp(selection);
  if (timestamp) {
    await copyToClipboard(String(timestamp), tab.id);
    showNotification('Copied', `Timestamp: ${timestamp}`);
  } else {
    showNotification('Conversion Failed', 'Could not parse date');
  }
}

/**
 * Handle quick convert options
 */
async function handleQuickConvert(selection, tab, settings) {
  const result = convertTimestamp(selection, settings);
  
  if (result.success) {
    await copyToClipboard(result.formatted, tab.id);
    showNotification('Copied', result.formatted);
  } else {
    showNotification('Conversion Failed', 'Invalid timestamp');
  }
}

/**
 * Show notification
 */
function showNotification(title, message, copyText = null) {
  // For now, just log - notifications require additional permission
  console.log(`[EpochLens] ${title}: ${message}`);
  
  // Could use chrome.notifications API if permission is added
}

/**
 * Copy text to clipboard via content script
 */
async function copyToClipboard(text, tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (textToCopy) => {
        navigator.clipboard.writeText(textToCopy);
      },
      args: [text]
    });
  } catch (e) {
    console.error('[EpochLens] Failed to copy:', e);
  }
}

/**
 * Inject conversion result into page
 */
async function injectConversionResult(tabId, result) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (conversionResult) => {
        // Create and show a temporary toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 2147483647;
          cursor: pointer;
          transition: opacity 0.3s ease, transform 0.3s ease;
        `;
        toast.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">EpochLens</div>
          <div style="opacity: 0.9;">${conversionResult.formatted}</div>
          <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Click to copy</div>
        `;
        
        toast.addEventListener('click', () => {
          navigator.clipboard.writeText(conversionResult.formatted);
          toast.innerHTML = '<div style="font-weight: 600;">Copied!</div>';
          setTimeout(() => toast.remove(), 500);
        });
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(() => toast.remove(), 300);
        }, 5000);
      },
      args: [result]
    });
  } catch (e) {
    console.error('[EpochLens] Failed to inject result:', e);
  }
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MESSAGE_TYPES.UPDATE_BADGE:
      updateBadge(message.count, sender.tab?.id);
      break;
    
    case MESSAGE_TYPES.GET_SETTINGS:
      getSettings().then(sendResponse);
      return true; // Keep channel open
    
    case MESSAGE_TYPES.UPDATE_SETTINGS:
      updateSettings(message.settings).then(sendResponse);
      return true;
  }
});

/**
 * Update extension badge
 */
function updateBadge(count, tabId) {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  const color = count > 0 ? '#6366f1' : '#64748b';
  
  if (tabId) {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
  } else {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

/**
 * Get settings from storage
 */
async function getSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}

/**
 * Update settings in storage
 */
async function updateSettings(updates) {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
  return updated;
}

// ============================================
// Timestamp conversion utilities (standalone)
// ============================================

function isValidTimestamp(value) {
  const num = Number(value);
  if (isNaN(num)) return false;
  
  const str = String(value).trim();
  if (!/^\d{10}$|^\d{13}$/.test(str)) return false;
  
  const ms = str.length === 10 ? num * 1000 : num;
  return ms >= MIN_TIMESTAMP_MS && ms <= MAX_TIMESTAMP_MS;
}

function toMilliseconds(timestamp) {
  const str = String(timestamp).trim();
  const num = Number(str);
  return str.length === 10 ? num * 1000 : num;
}

function convertTimestamp(timestamp, settings = {}) {
  if (!isValidTimestamp(timestamp)) {
    return { success: false, error: 'Invalid timestamp' };
  }
  
  const ms = toMilliseconds(timestamp);
  const date = new Date(ms);
  const isSeconds = String(timestamp).length === 10;
  
  const formatted = formatDate(date, settings);
  
  return {
    success: true,
    original: timestamp,
    milliseconds: ms,
    seconds: Math.floor(ms / 1000),
    isSeconds,
    date: date.toISOString(),
    formatted
  };
}

function formatDate(date, settings = {}) {
  const { timezone = 'local', format = 'locale' } = settings;
  
  try {
    const options = timezone === 'local' ? {} : { timeZone: timezone };
    
    if (format === 'iso') {
      return date.toISOString();
    }
    
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

function dateToTimestamp(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    const ms = date.getTime();
    if (ms < MIN_TIMESTAMP_MS || ms > MAX_TIMESTAMP_MS) return null;
    
    return ms;
  } catch {
    return null;
  }
}

// Clear badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    updateBadge(0, tabId);
  }
});

