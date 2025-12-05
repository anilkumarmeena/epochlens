# Privacy Policy for EpochLens

**Last Updated: December 2024**

## Overview

EpochLens is a Chrome browser extension that converts Unix epoch timestamps to human-readable dates. We are committed to protecting your privacy and being transparent about our practices.

## Data Collection

**EpochLens does NOT collect, store, or transmit any personal data.**

### What We Don't Collect

- ❌ Personal information
- ❌ Browsing history
- ❌ Page content
- ❌ Timestamps you convert
- ❌ Analytics or usage data
- ❌ Cookies or tracking identifiers

### What We Store Locally

The extension stores only your preferences locally on your device using Chrome's `storage.sync` API:

- Display mode preference (tooltip/inline)
- Timezone settings
- Date format preferences
- Extension enabled/disabled state

This data:
- Never leaves your device (except for Chrome sync if enabled in your browser)
- Is not accessible to us
- Can be cleared by uninstalling the extension

## Permissions Explained

EpochLens requires certain permissions to function. Here's why:

| Permission | Purpose |
|------------|---------|
| `storage` | Save your preferences locally |
| `activeTab` | Read page content to find timestamps on the current tab only |
| `contextMenus` | Add right-click menu options for timestamp conversion |
| `<all_urls>` | Scan any webpage for timestamps (content script injection) |

## Third-Party Services

EpochLens does **not** use any third-party services, APIs, or analytics.

## Data Security

- All processing happens locally in your browser
- No network requests are made for functionality
- No data is transmitted to external servers

## Children's Privacy

EpochLens does not knowingly collect any information from children under 13.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last Updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository.

## Open Source

EpochLens is open source. You can review the complete source code to verify our privacy practices:
https://github.com/anilkumarmeena/epochlens

---

**Summary**: EpochLens runs entirely in your browser, stores only your preferences locally, and never transmits any data externally.
