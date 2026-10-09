# agy-statusline

A lightweight, zero-dependency custom statusline for **Google Antigravity CLI (AGY)** on Windows and Unix-like environments.

Displays AI Model Name, Agent State, Context Window Usage (with color-coded progress bar), and Quota Remaining with dynamic collapse when unmetered.

---

## Architecture & Features

* **Zero-Dependency**: Written entirely using native Node.js APIs (`fs`, `process.stdin`, `process.stdout`). No `node_modules` required.
* **Resilient & Defensive**: Guarantees zero unhandled exceptions, zero process crashes, and strictly exits with status `0` to prevent AGY's auto-disable mechanism.
* **Dynamic Collapse**: Automatically hides the quota segment if the current model or account provides no quota data.
* **Terminal Standards**: Honors `NO_COLOR` (https://no-color.org) and `TERM=dumb` with automatic plain text fallback.
* **Single-Line Rendering**: Guaranteed single-line output to preserve terminal real estate.

---

## Project Structure

```text
agy-statusline/
├── src/
│   ├── index.js          # Entry point (stdin pipeline)
│   ├── parser.js         # Defensive schema parser
│   ├── formatter.js      # Statusline assembler & ANSI styling
│   └── config.js         # Glyphs, thresholds, and color definitions
├── tests/
│   ├── run-tests.js      # Zero-dependency test runner
│   └── fixtures/         # Mock payloads for offline testing
├── package.json          # ES Module metadata
└── README.md             # Documentation
```

---

## Testing

Run the automated test suite offline without AGY:

```powershell
node tests/run-tests.js
```

Or test manual piping with simulated fixtures:

```powershell
Get-Content tests/fixtures/full-payload.json | node src/index.js
```

---

## AGY Configuration (Phase 3 Manual Setup)

Add the `statusLine` block to your `~/.gemini/antigravity-cli/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"A:/ส่วนเสริมเขียนเอง/agy-statusline/src/index.js\"",
    "padding": 0,
    "enabled": true,
    "stack_with_default": false
  }
}
```
