# EpochLens

A powerful Chrome extension that automatically detects and converts Unix timestamps on any webpage to human-readable dates.

![EpochLens](icons/icon128.svg)

## Features

- **Automatic Detection**: Scans pages for 10-digit (seconds) and 13-digit (milliseconds) Unix timestamps
- **Multiple Display Modes**:
  - Tooltip: Hover over timestamps to see converted dates
  - Inline Badge: Shows converted date next to the timestamp
  - Floating Popup: Rich popup with detailed information
- **Timezone Support**: Configure primary and secondary timezones
- **Custom Date Formats**: ISO 8601, locale default, relative time, or custom patterns
- **Context Menu**: Right-click to convert selected text
- **Manual Converter**: Popup with bidirectional conversion (timestamp ↔ date)
- **Badge Count**: Shows number of timestamps found on the current page
- **Dark/Light Theme**: Automatically follows system preferences
- **SPA Support**: MutationObserver detects dynamically loaded content

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `epochlens` folder

### From Chrome Web Store

Coming soon!

## Usage

### Automatic Conversion

Once installed, EpochLens automatically scans every page you visit for Unix timestamps. Valid timestamps are highlighted with a dotted underline. Hover over them to see the converted date.

### Manual Conversion

1. Click the EpochLens icon in your browser toolbar
2. Enter a timestamp or date in the input field
3. View the conversion results instantly

### Context Menu

1. Select any text that looks like a timestamp
2. Right-click and choose "Convert with EpochLens"
3. The converted date appears in a toast notification

### Keyboard Shortcut

- `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac) - Open popup

## Configuration

Click the gear icon in the popup or go to the extension options page to configure:

### General Settings

- **Enable EpochLens**: Toggle automatic page scanning
- **Auto-scan dynamic content**: Detect timestamps in SPAs
- **Show badge count**: Display timestamp count on icon

### Display Settings

- **Display Mode**: Choose between tooltip, inline badge, or floating popup
- **Indicator Style**: Dotted underline, solid underline, or background highlight

### Timezone Settings

- **Primary Timezone**: Default timezone for conversions
- **Secondary Timezone**: Optional additional timezone display

### Date Format

- **Locale Default**: Uses your browser's locale settings
- **ISO 8601**: Standard format (2023-12-05T14:30:00.000Z)
- **Relative**: Human-friendly format (2 hours ago)
- **Custom**: Define your own pattern using tokens

#### Custom Format Tokens

| Token | Description | Example |
|-------|-------------|---------|
| YYYY | 4-digit year | 2023 |
| MM | 2-digit month | 12 |
| DD | 2-digit day | 05 |
| HH | 24-hour hour | 14 |
| hh | 12-hour hour | 02 |
| mm | Minutes | 30 |
| ss | Seconds | 00 |
| A/a | AM/PM | PM/pm |

## Supported Timestamp Formats

- **10-digit**: Unix timestamp in seconds (e.g., `1701792000`)
- **13-digit**: Unix timestamp in milliseconds (e.g., `1701792000000`)

Timestamps are validated to be within the range 2000-01-01 to 2100-01-01.

## Project Structure

```
epochlens/
├── manifest.json           # Extension manifest (V3)
├── src/
│   ├── content/
│   │   ├── content.js      # DOM scanning and timestamp detection
│   │   └── content.css     # Styling for timestamp indicators
│   ├── background/
│   │   └── service-worker.js  # Context menu, badge updates
│   ├── popup/
│   │   ├── popup.html      # Extension popup UI
│   │   ├── popup.js        # Popup logic
│   │   └── popup.css       # Popup styling
│   ├── options/
│   │   ├── options.html    # Full settings page
│   │   ├── options.js
│   │   └── options.css
│   └── utils/
│       ├── converter.js    # Timestamp conversion logic
│       ├── storage.js      # Chrome storage wrapper
│       └── constants.js    # Shared constants
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Development

### Prerequisites

- Chrome or Chromium-based browser
- Basic knowledge of Chrome Extensions Manifest V3

### Building

No build step required! The extension uses vanilla JavaScript and can be loaded directly.

### Testing

1. Load the extension in developer mode
2. Navigate to a page with Unix timestamps (e.g., API responses, log files)
3. Verify timestamps are detected and converted correctly

### Debug

Open the browser console on any page to see EpochLens logs:
- Content script logs appear in the page console
- Service worker logs appear in `chrome://extensions` → EpochLens → "Service worker"

## Browser Support

- Chrome 88+
- Edge 88+
- Other Chromium-based browsers with Manifest V3 support

## Privacy

EpochLens:
- Does NOT collect any user data
- Does NOT send any data to external servers
- Stores settings locally using Chrome's sync storage
- Only accesses page content to detect timestamps

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Changelog

### v1.0.0

- Initial release
- Automatic timestamp detection
- Multiple display modes
- Timezone support
- Custom date formats
- Context menu integration
- Manual converter popup
- Dark/light theme support

