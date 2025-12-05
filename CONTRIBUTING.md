# Contributing to EpochLens

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Browser version and OS
- Screenshots if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please include:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Test your changes by loading the extension in developer mode
3. Ensure your code follows the existing style
4. Update documentation if needed
5. Submit a pull request

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/anilkumarmeena/epochlens.git
   cd epochlens
   ```

2. Load in Chrome:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `epochlens` folder

3. Make changes and reload:
   - Edit files in `src/`
   - Click the refresh icon on the extension card
   - Reload the test page

## Project Structure

```
epochlens/
├── manifest.json           # Extension manifest (MV3)
├── src/
│   ├── content/           # Content scripts (run on pages)
│   ├── background/        # Service worker
│   ├── popup/             # Extension popup UI
│   ├── options/           # Settings page
│   └── utils/             # Shared utilities
├── icons/                 # Extension icons
└── test/                  # Test pages
```

## Code Style

- Use vanilla JavaScript (no frameworks)
- Use `const` and `let` (no `var`)
- Use template literals for strings
- Comment complex logic
- Keep functions small and focused

## Testing

1. Load the extension in developer mode
2. Open `test/test-page.html` in your browser
3. Verify timestamps are detected correctly
4. Test the popup converter
5. Check the options page

## Questions?

Open an issue with the "question" label.

Thanks again for contributing! 🙏
