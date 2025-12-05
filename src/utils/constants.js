/**
 * EpochLens Constants
 * Shared configuration and constants across the extension
 */

// Initialize global namespace
if (typeof window.EpochLens === 'undefined') {
  window.EpochLens = {};
}

window.EpochLens.Constants = {
  // Timestamp detection regex - matches 10-digit (seconds) or 13-digit (milliseconds) numbers
  TIMESTAMP_REGEX: /\b(\d{10}|\d{13})\b/g,
  
  // Valid timestamp range (2000-01-01 to 2100-01-01)
  MIN_TIMESTAMP_MS: 946684800000,  // 2000-01-01T00:00:00Z
  MAX_TIMESTAMP_MS: 4102444800000, // 2100-01-01T00:00:00Z
  
  // Display modes
  DISPLAY_MODES: {
    TOOLTIP: 'tooltip',
    INLINE: 'inline'
  },
  
  // Date format presets
  DATE_FORMATS: {
    ISO: 'iso',
    LOCALE: 'locale',
    RELATIVE: 'relative',
    CUSTOM: 'custom'
  },
  
  // Predefined format patterns
  FORMAT_PATTERNS: {
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    short: 'YYYY-MM-DD HH:mm',
    long: 'MMMM D, YYYY h:mm:ss A',
    date_only: 'YYYY-MM-DD',
    time_only: 'HH:mm:ss'
  },
  
  // Common timezones
  TIMEZONES: [
    { value: 'local', label: 'Local Time' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'America/Chicago', label: 'Central Time (US)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
  ],
  
  // Default settings
  DEFAULT_SETTINGS: {
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
  },
  
  // Elements to skip when scanning
  SKIP_ELEMENTS: ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'],
  
  // CSS class prefix to avoid conflicts
  CSS_PREFIX: 'epochlens',
  
  // Storage keys
  STORAGE_KEYS: {
    SETTINGS: 'epochlens_settings',
    STATS: 'epochlens_stats'
  },
  
  // Message types for communication between scripts
  MESSAGE_TYPES: {
    GET_SETTINGS: 'GET_SETTINGS',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    GET_PAGE_STATS: 'GET_PAGE_STATS',
    UPDATE_BADGE: 'UPDATE_BADGE',
    CONVERT_SELECTION: 'CONVERT_SELECTION',
    CONVERSION_RESULT: 'CONVERSION_RESULT'
  }
};
