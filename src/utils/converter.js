/**
 * EpochLens Converter
 * Core timestamp conversion and formatting utilities
 */

// Ensure namespace exists
if (typeof window.EpochLens === 'undefined') {
  window.EpochLens = {};
}

window.EpochLens.Converter = {
  /**
   * Check if a value looks like a valid Unix timestamp
   * @param {string|number} value - The value to check
   * @returns {boolean}
   */
  isValidTimestamp(value) {
    const num = Number(value);
    if (isNaN(num)) return false;
    
    const str = String(value).trim();
    // Must be exactly 10 or 13 digits
    if (!/^\d{10}$|^\d{13}$/.test(str)) return false;
    
    // Convert to milliseconds if needed
    const ms = str.length === 10 ? num * 1000 : num;
    
    // Check if within reasonable range
    const { MIN_TIMESTAMP_MS, MAX_TIMESTAMP_MS } = window.EpochLens.Constants;
    return ms >= MIN_TIMESTAMP_MS && ms <= MAX_TIMESTAMP_MS;
  },
  
  /**
   * Convert timestamp string to milliseconds
   * @param {string|number} timestamp - 10 or 13 digit timestamp
   * @returns {number} Milliseconds
   */
  toMilliseconds(timestamp) {
    const str = String(timestamp).trim();
    const num = Number(str);
    return str.length === 10 ? num * 1000 : num;
  },
  
  /**
   * Convert timestamp to Date object
   * @param {string|number} timestamp - Unix timestamp
   * @returns {Date|null}
   */
  toDate(timestamp) {
    if (!this.isValidTimestamp(timestamp)) return null;
    return new Date(this.toMilliseconds(timestamp));
  },
  
  /**
   * Convert Date to Unix timestamp
   * @param {Date|string} date - Date object or date string
   * @param {boolean} inSeconds - Return seconds instead of milliseconds
   * @returns {number|null}
   */
  dateToEpoch(date, inSeconds = false) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return null;
      const ms = d.getTime();
      return inSeconds ? Math.floor(ms / 1000) : ms;
    } catch {
      return null;
    }
  },
  
  /**
   * Format a date according to settings
   * @param {Date} date - Date to format
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  formatDate(date, options = {}) {
    const {
      format = 'locale',
      customFormat = 'YYYY-MM-DD HH:mm:ss',
      timezone = 'local'
    } = options;
    
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    try {
      // Handle timezone
      const tzOptions = timezone === 'local' ? {} : { timeZone: timezone };
      
      switch (format) {
        case 'iso':
          return this._formatISO(date, timezone);
        
        case 'relative':
          return this._formatRelative(date);
        
        case 'custom':
          return this._formatCustom(date, customFormat, timezone);
        
        case 'locale':
        default:
          return date.toLocaleString(undefined, {
            ...tzOptions,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
      }
    } catch (e) {
      // Fallback if timezone is invalid
      return date.toLocaleString();
    }
  },
  
  /**
   * Format date as ISO string with timezone
   * @private
   */
  _formatISO(date, timezone) {
    if (timezone === 'local') {
      // Local ISO format with offset
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const mins = String(Math.abs(offset) % 60).padStart(2, '0');
      
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, -1) + sign + hours + ':' + mins;
    } else if (timezone === 'UTC') {
      return date.toISOString();
    } else {
      // For other timezones, use Intl formatter
      return this._formatCustom(date, 'YYYY-MM-DDTHH:mm:ss', timezone);
    }
  },
  
  /**
   * Format date as relative time (e.g., "2 hours ago")
   * @private
   */
  _formatRelative(date) {
    const now = new Date();
    const diff = now - date;
    const absDiff = Math.abs(diff);
    const isPast = diff > 0;
    
    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
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
    } else if (days < 7) {
      value = days;
      unit = 'day';
    } else if (weeks < 4) {
      value = weeks;
      unit = 'week';
    } else if (months < 12) {
      value = months;
      unit = 'month';
    } else {
      value = years;
      unit = 'year';
    }
    
    const plural = value !== 1 ? 's' : '';
    
    if (isPast) {
      return value === 0 ? 'just now' : `${value} ${unit}${plural} ago`;
    } else {
      return `in ${value} ${unit}${plural}`;
    }
  },
  
  /**
   * Format date using custom pattern
   * @private
   */
  _formatCustom(date, pattern, timezone) {
    // Get date parts in the specified timezone
    const parts = this._getDateParts(date, timezone);
    
    // Token replacements
    const tokens = {
      'YYYY': parts.year,
      'YY': String(parts.year).slice(-2),
      'MMMM': parts.monthLong,
      'MMM': parts.monthShort,
      'MM': String(parts.month).padStart(2, '0'),
      'M': parts.month,
      'DD': String(parts.day).padStart(2, '0'),
      'D': parts.day,
      'dddd': parts.weekdayLong,
      'ddd': parts.weekdayShort,
      'HH': String(parts.hour).padStart(2, '0'),
      'H': parts.hour,
      'hh': String(parts.hour12).padStart(2, '0'),
      'h': parts.hour12,
      'mm': String(parts.minute).padStart(2, '0'),
      'm': parts.minute,
      'ss': String(parts.second).padStart(2, '0'),
      's': parts.second,
      'SSS': String(parts.millisecond).padStart(3, '0'),
      'A': parts.ampm.toUpperCase(),
      'a': parts.ampm.toLowerCase(),
      'Z': parts.offset,
      'z': parts.tzAbbr
    };
    
    // Replace tokens (longest first to avoid partial matches)
    let result = pattern;
    const sortedTokens = Object.keys(tokens).sort((a, b) => b.length - a.length);
    
    for (const token of sortedTokens) {
      result = result.replace(new RegExp(token, 'g'), tokens[token]);
    }
    
    return result;
  },
  
  /**
   * Get all date parts for a given timezone
   * @private
   */
  _getDateParts(date, timezone) {
    const options = timezone === 'local' ? {} : { timeZone: timezone };
    
    // Use Intl.DateTimeFormat for timezone-aware formatting
    const formatter = new Intl.DateTimeFormat('en-US', {
      ...options,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      fractionalSecondDigits: 3
    });
    
    const parts = {};
    formatter.formatToParts(date).forEach(({ type, value }) => {
      parts[type] = value;
    });
    
    // Get month and weekday names
    const monthFormatter = new Intl.DateTimeFormat('en-US', { ...options, month: 'long' });
    const monthShortFormatter = new Intl.DateTimeFormat('en-US', { ...options, month: 'short' });
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'long' });
    const weekdayShortFormatter = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'short' });
    
    const hour = parseInt(parts.hour, 10);
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    
    return {
      year: parseInt(parts.year, 10),
      month: parseInt(parts.month, 10),
      monthLong: monthFormatter.format(date),
      monthShort: monthShortFormatter.format(date),
      day: parseInt(parts.day, 10),
      weekdayLong: weekdayFormatter.format(date),
      weekdayShort: weekdayShortFormatter.format(date),
      hour: hour,
      hour12: hour12,
      minute: parseInt(parts.minute, 10),
      second: parseInt(parts.second, 10),
      millisecond: date.getMilliseconds(),
      ampm: hour < 12 ? 'am' : 'pm',
      offset: this._getTimezoneOffset(date, timezone),
      tzAbbr: this._getTimezoneAbbr(date, timezone)
    };
  },
  
  /**
   * Get timezone offset string (e.g., "+05:30")
   * @private
   */
  _getTimezoneOffset(date, timezone) {
    if (timezone === 'local') {
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const mins = String(Math.abs(offset) % 60).padStart(2, '0');
      return `${sign}${hours}:${mins}`;
    }
    
    // For other timezones, try to extract from formatted string
    try {
      const formatted = date.toLocaleString('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      });
      const match = formatted.match(/GMT([+-]\d{1,2}:?\d{2})/);
      if (match) {
        let offset = match[1];
        if (!offset.includes(':')) {
          offset = offset.slice(0, 3) + ':' + offset.slice(3);
        }
        return offset;
      }
    } catch {}
    
    return '';
  },
  
  /**
   * Get timezone abbreviation
   * @private
   */
  _getTimezoneAbbr(date, timezone) {
    if (timezone === 'local') {
      const formatted = date.toLocaleString('en-US', { timeZoneName: 'short' });
      const parts = formatted.split(' ');
      return parts[parts.length - 1] || '';
    }
    
    try {
      const formatted = date.toLocaleString('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      const parts = formatted.split(' ');
      return parts[parts.length - 1] || '';
    } catch {
      return '';
    }
  },
  
  /**
   * Convert a timestamp to a formatted string
   * @param {string|number} timestamp - Unix timestamp
   * @param {Object} options - Formatting options
   * @returns {Object} Conversion result with formatted string and metadata
   */
  convert(timestamp, options = {}) {
    const date = this.toDate(timestamp);
    
    if (!date) {
      return {
        success: false,
        error: 'Invalid timestamp',
        original: timestamp
      };
    }
    
    const ms = this.toMilliseconds(timestamp);
    const isSeconds = String(timestamp).length === 10;
    
    const result = {
      success: true,
      original: timestamp,
      milliseconds: ms,
      seconds: Math.floor(ms / 1000),
      isSeconds,
      date,
      formatted: this.formatDate(date, options)
    };
    
    // Add secondary timezone if requested
    if (options.showSecondaryTimezone && options.secondaryTimezone) {
      result.secondaryFormatted = this.formatDate(date, {
        ...options,
        timezone: options.secondaryTimezone
      });
    }
    
    // Add relative time
    result.relative = this._formatRelative(date);
    
    return result;
  },
  
  /**
   * Find all timestamps in a text string
   * @param {string} text - Text to search
   * @returns {Array} Array of found timestamps with positions
   */
  findTimestamps(text) {
    const results = [];
    const regex = new RegExp(window.EpochLens.Constants.TIMESTAMP_REGEX.source, 'g');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const timestamp = match[0];
      if (this.isValidTimestamp(timestamp)) {
        results.push({
          value: timestamp,
          index: match.index,
          length: timestamp.length,
          isSeconds: timestamp.length === 10
        });
      }
    }
    
    return results;
  }
};
