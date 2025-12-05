/**
 * EpochLens Options Page Script
 * Handles settings management and UI
 */

// Constants
const STORAGE_KEY = 'epochlens_settings';

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
let hasChanges = false;

// DOM Elements
const elements = {
  // General
  enabled: document.getElementById('enabled'),
  autoScan: document.getElementById('autoScan'),
  showBadgeCount: document.getElementById('showBadgeCount'),
  
  // Display
  displayMode: document.getElementById('displayMode'),
  highlightStyle: document.getElementById('highlightStyle'),
  
  // Timezone
  timezone: document.getElementById('timezone'),
  showSecondaryTimezone: document.getElementById('showSecondaryTimezone'),
  secondaryTimezone: document.getElementById('secondaryTimezone'),
  secondaryTzRow: document.getElementById('secondaryTzRow'),
  
  // Format
  dateFormat: document.getElementById('dateFormat'),
  customFormat: document.getElementById('customFormat'),
  customFormatRow: document.getElementById('customFormatRow'),
  formatPreview: document.getElementById('formatPreview'),
  
  // Advanced
  scanDelay: document.getElementById('scanDelay'),
  
  // Actions
  resetBtn: document.getElementById('resetBtn'),
  saveBtn: document.getElementById('saveBtn'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toastMessage')
};

/**
 * Initialize options page
 */
async function init() {
  // Load settings
  settings = await getSettings();
  
  // Populate form
  populateForm();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update conditional visibility
  updateConditionalFields();
  
  // Update format preview
  updateFormatPreview();
}

/**
 * Get settings from storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] });
    });
  });
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Populate form with current settings
 */
function populateForm() {
  // General
  elements.enabled.checked = settings.enabled;
  elements.autoScan.checked = settings.autoScan;
  elements.showBadgeCount.checked = settings.showBadgeCount;
  
  // Display
  elements.displayMode.value = settings.displayMode;
  elements.highlightStyle.value = settings.highlightStyle;
  
  // Timezone
  elements.timezone.value = settings.timezone;
  elements.showSecondaryTimezone.checked = settings.showSecondaryTimezone;
  elements.secondaryTimezone.value = settings.secondaryTimezone;
  
  // Format
  elements.dateFormat.value = settings.dateFormat;
  elements.customFormat.value = settings.customFormat;
  
  // Advanced
  elements.scanDelay.value = settings.scanDelay;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Track changes for all inputs
  const trackChange = () => {
    hasChanges = true;
  };
  
  // General toggles
  elements.enabled.addEventListener('change', () => {
    settings.enabled = elements.enabled.checked;
    trackChange();
  });
  
  elements.autoScan.addEventListener('change', () => {
    settings.autoScan = elements.autoScan.checked;
    trackChange();
  });
  
  elements.showBadgeCount.addEventListener('change', () => {
    settings.showBadgeCount = elements.showBadgeCount.checked;
    trackChange();
  });
  
  // Display
  elements.displayMode.addEventListener('change', () => {
    settings.displayMode = elements.displayMode.value;
    trackChange();
  });
  
  elements.highlightStyle.addEventListener('change', () => {
    settings.highlightStyle = elements.highlightStyle.value;
    trackChange();
  });
  
  // Timezone
  elements.timezone.addEventListener('change', () => {
    settings.timezone = elements.timezone.value;
    trackChange();
    updateFormatPreview();
  });
  
  elements.showSecondaryTimezone.addEventListener('change', () => {
    settings.showSecondaryTimezone = elements.showSecondaryTimezone.checked;
    updateConditionalFields();
    trackChange();
  });
  
  elements.secondaryTimezone.addEventListener('change', () => {
    settings.secondaryTimezone = elements.secondaryTimezone.value;
    trackChange();
  });
  
  // Format
  elements.dateFormat.addEventListener('change', () => {
    settings.dateFormat = elements.dateFormat.value;
    updateConditionalFields();
    updateFormatPreview();
    trackChange();
  });
  
  elements.customFormat.addEventListener('input', () => {
    settings.customFormat = elements.customFormat.value;
    updateFormatPreview();
    trackChange();
  });
  
  // Advanced
  elements.scanDelay.addEventListener('change', () => {
    settings.scanDelay = parseInt(elements.scanDelay.value, 10) || 500;
    trackChange();
  });
  
  // Actions
  elements.resetBtn.addEventListener('click', resetSettings);
  elements.saveBtn.addEventListener('click', handleSave);
  
  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

/**
 * Update conditional field visibility
 */
function updateConditionalFields() {
  // Secondary timezone row
  if (elements.showSecondaryTimezone.checked) {
    elements.secondaryTzRow.classList.remove('hidden');
  } else {
    elements.secondaryTzRow.classList.add('hidden');
  }
  
  // Custom format row
  if (elements.dateFormat.value === 'custom') {
    elements.customFormatRow.classList.remove('hidden');
  } else {
    elements.customFormatRow.classList.add('hidden');
  }
}

/**
 * Update format preview
 */
function updateFormatPreview() {
  const now = new Date();
  const format = settings.dateFormat;
  const timezone = settings.timezone;
  
  let preview;
  
  try {
    switch (format) {
      case 'iso':
        preview = now.toISOString();
        break;
      
      case 'relative':
        preview = 'just now';
        break;
      
      case 'custom':
        preview = formatCustom(now, settings.customFormat, timezone);
        break;
      
      case 'locale':
      default:
        const options = timezone === 'local' ? {} : { timeZone: timezone };
        preview = now.toLocaleString(undefined, {
          ...options,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
    }
  } catch {
    preview = now.toLocaleString();
  }
  
  elements.formatPreview.textContent = preview;
}

/**
 * Format date with custom pattern
 */
function formatCustom(date, pattern, timezone) {
  const options = timezone === 'local' ? {} : { timeZone: timezone };
  
  // Get parts
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...options,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = {};
  formatter.formatToParts(date).forEach(({ type, value }) => {
    parts[type] = value;
  });
  
  const hour = parseInt(parts.hour, 10);
  const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
  
  // Token replacements
  const tokens = {
    'YYYY': parts.year,
    'MM': parts.month,
    'DD': parts.day,
    'HH': parts.hour,
    'hh': String(hour12).padStart(2, '0'),
    'mm': parts.minute,
    'ss': parts.second,
    'A': hour < 12 ? 'AM' : 'PM',
    'a': hour < 12 ? 'am' : 'pm'
  };
  
  let result = pattern;
  Object.keys(tokens).sort((a, b) => b.length - a.length).forEach(token => {
    result = result.replace(new RegExp(token, 'g'), tokens[token]);
  });
  
  return result;
}

/**
 * Handle save button click
 */
async function handleSave() {
  try {
    await saveSettings();
    hasChanges = false;
    showToast('Settings saved!');
    
    // Notify all tabs to reload settings
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'UPDATE_SETTINGS',
            settings
          }).catch(() => {
            // Tab might not have content script
          });
        }
      });
    });
  } catch (error) {
    showToast('Failed to save settings', true);
    console.error('Save error:', error);
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  
  settings = { ...DEFAULT_SETTINGS };
  populateForm();
  updateConditionalFields();
  updateFormatPreview();
  
  try {
    await saveSettings();
    hasChanges = false;
    showToast('Settings reset to defaults');
  } catch (error) {
    showToast('Failed to reset settings', true);
  }
}

/**
 * Show toast notification
 */
function showToast(message, isError = false) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

