# agy-statusline

A high-reliability, zero-dependency custom statusline for **Google Antigravity CLI (AGY) v1.3.2+** on Windows, macOS, and Linux.

Displays a compact, single-line usage dashboard including active AI model name, agent state, context window usage (used / limit / remaining / percentage with visual progress bar), and quota remaining with dynamic collapse.

---

## Key Features & Design Principles

* **Zero External Dependencies**: Implemented purely with Node.js standard libraries (`fs`, `child_process`). No `node_modules` required.
* **Crash-Resilient & Non-Blocking**: Always exits with status `0` and handles missing, null, or malformed JSON payloads gracefully, preventing AGY's auto-disable mechanism.
* **Prompt-Safe Single-Line Rendering**: Strictly cleans all carriage returns and newlines (`\r`, `\n`) to guarantee a single-line output, ensuring the terminal prompt line is never distorted or wrapped unexpectedly.
* **Dynamic Model Resolution**: Reads `model.display_name` with fallback to `model.id` from live payloads. Never hardcodes model names.
* **High-Precision Context Display**: Calculates tokens and remaining capacity from raw payload values before formatting. Automatically shows granular values (e.g., `1.03M left` instead of confusing `1.0M left`).
* **Dynamic Quota Collapse**: Omit the quota segment automatically when using unmetered models or when quota data is unavailable.
* **Privacy & Security First**: Strictly zero raw stdin logging to disk, zero network telemetry, and zero credentials capture.

---

## System Requirements

* **Node.js**: `>= 18.0.0` (Verify with `node -v`)
* **Antigravity CLI (AGY)**: `>= v1.3.2` (Verify with `agy --help` or `agy`)
* **Operating System**: Windows (PowerShell / Command Prompt), Linux, or macOS

---

## Installation & Configuration

AGY CLI reads custom statusline settings from its configuration file:
* **Windows**: `$HOME\.gemini\antigravity-cli\settings.json`
* **macOS / Linux**: `~/.gemini/antigravity-cli/settings.json`

### 1. StatusLine Configuration Schema

```json
{
  "statusLine": {
    "type": "command",
    "command": "node <path-to-agy-statusline>/src/index.js",
    "padding": 0,
    "enabled": true,
    "stack_with_default": false
  }
}
```

### 2. One-Command Automated Setup

From the `agy-statusline` repository directory, simply run:

```powershell
npm run setup
# Or directly:
node bin/install.js
```

This automatically:
1. Detects your OS and finds `~/.gemini/antigravity-cli/settings.json`
2. Creates an automatic backup (`settings.json.backup`)
3. Resolves the script path
4. Updates the `statusLine` configuration block cleanly without altering any other settings

To uninstall or restore the default built-in statusline at any time:
```powershell
npm run uninstall
# Or directly:
node bin/install.js --uninstall
```

### 3. Manual PowerShell Setup (Alternative)

If you prefer to configure manually via PowerShell:

```powershell
# Resolve absolute path and normalize forward slashes
$scriptPath = (Resolve-Path ".\src\index.js").Path.Replace('\', '/')
$settingsFile = Join-Path $HOME ".gemini\antigravity-cli\settings.json"

# Load existing settings or initialize new object
$settings = if (Test-Path $settingsFile) {
    Get-Content $settingsFile -Raw -Encoding utf8 | ConvertFrom-Json
} else {
    [PSCustomObject]@{}
}

# Attach or update statusLine configuration
$settings | Add-Member -NotePropertyName statusLine -NotePropertyValue ([PSCustomObject]@{
    type = "command"
    command = "node $scriptPath"
    padding = 0
    enabled = $true
    stack_with_default = $false
}) -Force

# Save back with UTF-8 encoding
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding utf8
Write-Host "agy-statusline successfully configured in $settingsFile" -ForegroundColor Green
```

---

## Verification & Testing

### Offline Automated Tests
Run the zero-dependency test suite to verify parsing, formatting, edge cases, and CLI subprocess execution:

```powershell
node tests/run-tests.js
```

### Manual Pipe Verification
Simulate an AGY CLI payload pipe:

```powershell
Get-Content tests/fixtures/full-payload.json | node src/index.js
```

Expected output (Andrewii23 Coral Minimal Style):
```text
✦ Gemini 3.8 Flash (High) [working] | ▆▆▆▆▆▆▆▆▆▆ 1.41% | 14.8k/1.05M · 1.03M left | Quota | ▆▆▆▆▆▆▆▆▆▆ 85% left | resets in 2h
```

---

## Themes & Customization

You can customize the visual theme in `src/config.js`:

```javascript
export const CONFIG = {
  // 'andrewii23' (coral minimal powerline) or 'classic' (bracketed)
  theme: 'andrewii23',

  // Set true to separate Model/Context and Quota into 2 rows
  multiline: false,
  ...
};
```

1. **Andrewii23 Theme (Default)**:
   Minimalist layout inspired by `@andrewii23/claude-statusline` using lower block glyphs (`▆`), Truecolor Salmon/Coral palette (`RGB 221, 129, 97`), and dim ` | ` separators.
2. **Classic Theme**:
   Traditional bracketed layout `[✦ Model] | [Agent: ...] | [Context: ...] | [Quota: ...]`.
3. **Multi-Row Mode (`multiline: true`)**:
   Splits Model/Context onto Line 1 and Current Quota onto Line 2.

---

## Daily Management & Controls

### Temporary Disable
To temporarily pause custom statusline without removing your configuration, set `"enabled": false` in `settings.json`:

```powershell
$settingsFile = Join-Path $HOME ".gemini\antigravity-cli\settings.json"
$settings = Get-Content $settingsFile -Raw -Encoding utf8 | ConvertFrom-Json
if ($settings.statusLine) {
    $settings.statusLine.enabled = $false
    $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding utf8
    Write-Host "Custom statusline disabled." -ForegroundColor Yellow
}
```

### Re-Enable
Set `"enabled": true` using the same method.

### Rollback to Default AGY Statusline
To completely restore AGY's default built-in statusline without affecting any other settings:

```powershell
$settingsFile = Join-Path $HOME ".gemini\antigravity-cli\settings.json"
$settings = Get-Content $settingsFile -Raw -Encoding utf8 | ConvertFrom-Json
if ($settings.PSObject.Properties['statusLine']) {
    $settings.PSObject.Properties.Remove('statusLine')
    $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding utf8
    Write-Host "Rollback complete: Reverted to default built-in statusline." -ForegroundColor Green
}
```

---

## Technical Constraints & Behavioral Notes

1. **Event-Driven Invocations**:
   AGY CLI v1.3.2 invokes the custom statusline on specific lifecycle events:
   * Session initialization (`Manager.initStatusLine`)
   * Turn completion (`Manager.onTurnEnded`)
   * Dynamic model switching
   * Git / VCS status refresh
   
   AGY CLI does **not** run a periodic background ticker while idle. The statusline does not simulate a fake countdown timer or poll external APIs during idle states.

2. **Single Quota Bucket**:
   The AGY CLI telemetry payload delivers a single active quota bucket (`quota.remaining_fraction`, `quota.reset_in_seconds`, `quota.reset_time`). There is no separate "weekly quota" field in v1.3.2; custom statusline does not fabricate synthetic quota buckets.

3. **Auto-Disable Guard**:
   If a custom statusline command fails 30 consecutive times, AGY CLI automatically disables it for the remainder of the session (`custom status line failed 30 times, disabling it`). `agy-statusline` prevents this by always exiting with code `0` and outputting `[AGY]` fallback on any unexpected error.

---

## Troubleshooting

| Problem | Probable Cause | Solution |
| :--- | :--- | :--- |
| Statusline does not appear | Node.js not in PATH | Verify `node -v` works in terminal. |
| Statusline does not appear | Path contains unquoted spaces | Ensure `node "<path>"` has inner escaped quotes in `settings.json`. |
| Prompt line wraps or flickers | Multi-line string emitted | `agy-statusline` enforces single-line sanitize; verify terminal width `>= 80` cols. |
| AGY falls back to default | `statusLine.enabled` is `false` | Check `settings.json` and set `"enabled": true`. |
| No quota shown | Current model is unmetered | Normal behavior; statusline dynamically collapses missing quota segments. |
