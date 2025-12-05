/**
 * EpochLens Storage
 * Chrome storage wrapper for synced settings
 */

// Ensure namespace exists
if (typeof window.EpochLens === 'undefined') {
  window.EpochLens = {};
}

window.EpochLens.Storage = {
  /**
   * Get settings from Chrome storage
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    return new Promise((resolve) => {
      const key = window.EpochLens.Constants.STORAGE_KEYS.SETTINGS;
      
      // Check if chrome.storage is available (content script vs popup)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(key, (result) => {
          const settings = result[key] || {};
          resolve({
            ...window.EpochLens.Constants.DEFAULT_SETTINGS,
            ...settings
          });
        });
      } else {
        // Fallback to localStorage for testing
        try {
          const stored = localStorage.getItem(key);
          const settings = stored ? JSON.parse(stored) : {};
          resolve({
            ...window.EpochLens.Constants.DEFAULT_SETTINGS,
            ...settings
          });
        } catch {
          resolve({ ...window.EpochLens.Constants.DEFAULT_SETTINGS });
        }
      }
    });
  },
  
  /**
   * Save settings to Chrome storage
   * @param {Object} settings - Settings to save
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      const key = window.EpochLens.Constants.STORAGE_KEYS.SETTINGS;
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [key]: settings }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(settings));
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  },
  
  /**
   * Update specific settings
   * @param {Object} updates - Partial settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(updates) {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await this.saveSettings(updated);
    return updated;
  },
  
  /**
   * Reset settings to defaults
   * @returns {Promise<Object>} Default settings
   */
  async resetSettings() {
    const defaults = { ...window.EpochLens.Constants.DEFAULT_SETTINGS };
    await this.saveSettings(defaults);
    return defaults;
  },
  
  /**
   * Get page statistics
   * @returns {Promise<Object>} Stats object
   */
  async getStats() {
    return new Promise((resolve) => {
      const key = window.EpochLens.Constants.STORAGE_KEYS.STATS;
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(key, (result) => {
          resolve(result[key] || { totalConverted: 0, pagesScanned: 0 });
        });
      } else {
        try {
          const stored = localStorage.getItem(key);
          resolve(stored ? JSON.parse(stored) : { totalConverted: 0, pagesScanned: 0 });
        } catch {
          resolve({ totalConverted: 0, pagesScanned: 0 });
        }
      }
    });
  },
  
  /**
   * Update statistics
   * @param {Object} updates - Stats updates
   * @returns {Promise<void>}
   */
  async updateStats(updates) {
    const key = window.EpochLens.Constants.STORAGE_KEYS.STATS;
    const current = await this.getStats();
    const updated = {
      ...current,
      ...updates,
      totalConverted: (current.totalConverted || 0) + (updates.timestampsFound || 0)
    };
    
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: updated }, resolve);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(updated));
        } catch {}
        resolve();
      }
    });
  },
  
  /**
   * Listen for settings changes
   * @param {Function} callback - Called when settings change
   * @returns {Function} Unsubscribe function
   */
  onSettingsChange(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const listener = (changes, area) => {
        if (area === 'sync' && changes[window.EpochLens.Constants.STORAGE_KEYS.SETTINGS]) {
          const newSettings = changes[window.EpochLens.Constants.STORAGE_KEYS.SETTINGS].newValue;
          callback({
            ...window.EpochLens.Constants.DEFAULT_SETTINGS,
            ...newSettings
          });
        }
      };
      
      chrome.storage.onChanged.addListener(listener);
      
      // Return unsubscribe function
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    
    // No-op for non-extension context
    return () => {};
  }
};
