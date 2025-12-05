/**
 * EpochLens Content Script
 * Scans pages for timestamps and adds visual indicators
 */

(function() {
  'use strict';
  
  // Wait for EpochLens to be available
  const Constants = window.EpochLens.Constants;
  const Converter = window.EpochLens.Converter;
  const Storage = window.EpochLens.Storage;
  
  const { CSS_PREFIX, SKIP_ELEMENTS, MESSAGE_TYPES } = Constants;
  
  let settings = { ...Constants.DEFAULT_SETTINGS };
  let timestampCount = 0;
  let isScanning = false;
  let scanTimeout = null;
  let observer = null;
  let activeTooltip = null;
  
  /**
   * Initialize the content script
   */
  async function init() {
    // Load settings
    settings = await Storage.getSettings();
    
    if (!settings.enabled) return;
    
    // Initial scan
    scanPage();
    
    // Set up mutation observer for dynamic content
    setupMutationObserver();
    
    // Listen for settings changes
    Storage.onSettingsChange((newSettings) => {
      const wasEnabled = settings.enabled;
      settings = newSettings;
      
      if (!wasEnabled && settings.enabled) {
        scanPage();
        setupMutationObserver();
      } else if (wasEnabled && !settings.enabled) {
        cleanup();
      } else if (settings.enabled) {
        // Re-scan with new settings
        cleanup();
        scanPage();
        setupMutationObserver();
      }
    });
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Set up double-click handler for copy functionality
    document.addEventListener('dblclick', handleTimestampClick);
  }
  
  /**
   * Handle messages from popup/background
   */
  function handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case MESSAGE_TYPES.GET_PAGE_STATS:
        sendResponse({ timestampCount });
        break;
      
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        settings = { ...settings, ...message.settings };
        cleanup();
        if (settings.enabled) {
          scanPage();
          setupMutationObserver();
        }
        sendResponse({ success: true });
        break;
      
      case MESSAGE_TYPES.CONVERT_SELECTION:
        const selection = window.getSelection().toString().trim();
        if (selection && Converter.isValidTimestamp(selection)) {
          const result = Converter.convert(selection, settings);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No valid timestamp selected' });
        }
        break;
    }
    return true; // Keep channel open for async response
  }
  
  /**
   * Scan the entire page for timestamps
   */
  function scanPage() {
    if (isScanning) return;
    isScanning = true;
    timestampCount = 0;
    
    // Use TreeWalker for efficient DOM traversal
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip certain elements
          if (SKIP_ELEMENTS.includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip already processed nodes
          if (parent.classList && parent.classList.contains(`${CSS_PREFIX}-timestamp`)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip if no potential timestamps
          if (!Constants.TIMESTAMP_REGEX.test(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Process text nodes
    textNodes.forEach(processTextNode);
    
    isScanning = false;
    
    // Update badge count
    updateBadge();
    
    // Update stats
    if (timestampCount > 0) {
      Storage.updateStats({ timestampsFound: timestampCount, pagesScanned: 1 });
    }
  }
  
  /**
   * Process a text node and wrap timestamps
   */
  function processTextNode(textNode) {
    const text = textNode.nodeValue;
    const timestamps = Converter.findTimestamps(text);
    
    if (timestamps.length === 0) return;
    
    const parent = textNode.parentNode;
    if (!parent) return;
    
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    timestamps.forEach(({ value, index }) => {
      // Text before timestamp
      if (index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
      }
      
      // Create timestamp wrapper
      const wrapper = createTimestampElement(value);
      fragment.appendChild(wrapper);
      timestampCount++;
      
      lastIndex = index + value.length;
    });
    
    // Remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    
    parent.replaceChild(fragment, textNode);
  }
  
  /**
   * Create a timestamp element with appropriate display mode
   */
  function createTimestampElement(timestamp) {
    const result = Converter.convert(timestamp, settings);
    const wrapper = document.createElement('span');
    
    wrapper.className = `${CSS_PREFIX}-timestamp ${CSS_PREFIX}-${settings.displayMode} ${CSS_PREFIX}-style-${settings.highlightStyle}`;
    wrapper.dataset.epochlensTimestamp = timestamp;
    wrapper.dataset.epochlensMs = result.milliseconds;
    
    // Original timestamp text
    const originalSpan = document.createElement('span');
    originalSpan.className = `${CSS_PREFIX}-original`;
    originalSpan.textContent = timestamp;
    wrapper.appendChild(originalSpan);
    
    if (result.success) {
      // Store tooltip text in data attribute (don't use native title - it has delay)
      wrapper.dataset.epochlensTooltip = `${result.formatted}${result.secondaryFormatted ? '\n' + result.secondaryFormatted : ''}\n${result.relative}\n\nDouble-click to copy`;
      
      // Add inline badge if in inline mode
      if (settings.displayMode === 'inline') {
        const badge = document.createElement('span');
        badge.className = `${CSS_PREFIX}-badge`;
        badge.textContent = result.formatted;
        wrapper.appendChild(badge);
      }
      
      // Add hover handlers for instant tooltip
      wrapper.addEventListener('mouseenter', showTooltip);
      wrapper.addEventListener('mouseleave', hideTooltip);
    } else {
      wrapper.classList.add(`${CSS_PREFIX}-invalid`);
      wrapper.dataset.epochlensTooltip = 'Invalid timestamp';
      wrapper.addEventListener('mouseenter', showTooltip);
      wrapper.addEventListener('mouseleave', hideTooltip);
    }
    
    return wrapper;
  }
  
  /**
   * Show instant tooltip on hover
   */
  function showTooltip(event) {
    const wrapper = event.currentTarget;
    const text = wrapper.dataset.epochlensTooltip;
    
    if (!text) return;
    
    // Remove any existing tooltip
    hideTooltip();
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = `${CSS_PREFIX}-tooltip-popup`;
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;
    
    // Position tooltip
    const rect = wrapper.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Adjust if off-screen horizontally
    if (left < 8) {
      left = 8;
    } else if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    
    // Adjust if off-screen vertically (show above instead)
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - tooltipRect.height - 6;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }
  
  /**
   * Hide instant tooltip
   */
  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }
  
  /**
   * Handle click on timestamp element
   */
  function handleTimestampClick(event) {
    const wrapper = event.target.closest(`.${CSS_PREFIX}-timestamp`);
    if (!wrapper) return;
    
    const timestamp = wrapper.dataset.epochlensTimestamp;
    const result = Converter.convert(timestamp, settings);
    
    if (result.success) {
      copyToClipboard(result.formatted);
      showCopyFeedback(wrapper);
    }
  }
  
  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
  
  /**
   * Show visual feedback when copying
   */
  function showCopyFeedback(element) {
    element.classList.add(`${CSS_PREFIX}-copied`);
    setTimeout(() => {
      element.classList.remove(`${CSS_PREFIX}-copied`);
    }, 1000);
  }
  
  /**
   * Update the extension badge with timestamp count
   */
  function updateBadge() {
    if (settings.showBadgeCount) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_BADGE,
        count: timestampCount
      });
    }
  }
  
  /**
   * Set up mutation observer for dynamic content
   */
  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }
    
    if (!settings.autoScan) return;
    
    observer = new MutationObserver((mutations) => {
      // Debounce scanning
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      
      scanTimeout = setTimeout(() => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              scanElement(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
              processTextNode(node);
            }
          });
        });
        updateBadge();
      }, settings.scanDelay);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Scan a specific element for timestamps
   */
  function scanElement(element) {
    if (SKIP_ELEMENTS.includes(element.tagName)) return;
    if (element.classList && element.classList.contains(`${CSS_PREFIX}-timestamp`)) return;
    
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_ELEMENTS.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.classList && parent.classList.contains(`${CSS_PREFIX}-timestamp`)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!Constants.TIMESTAMP_REGEX.test(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(processTextNode);
  }
  
  /**
   * Clean up all timestamp wrappers
   */
  function cleanup() {
    // Remove all timestamp wrappers
    document.querySelectorAll(`.${CSS_PREFIX}-timestamp`).forEach((wrapper) => {
      const text = wrapper.dataset.epochlensTimestamp;
      const textNode = document.createTextNode(text);
      wrapper.parentNode.replaceChild(textNode, wrapper);
    });
    
    // Remove tooltip if visible
    hideTooltip();
    
    // Reset count
    timestampCount = 0;
    updateBadge();
    
    // Disconnect observer
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
