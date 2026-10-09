/**
 * agy-statusline configuration constants
 * Zero-dependency configuration for visual components, thresholds, and fallbacks.
 */

export const CONFIG = {
  // Progress bar dimensions
  progressBar: {
    length: 10,
    filledGlyph: '=',
    emptyGlyph: '░',
    asciiFilledGlyph: '=',
    asciiEmptyGlyph: '-',
  },

  // Agent state labels and icons
  stateIcons: {
    idle: '💤',
    thinking: '💭',
    working: '⚙️',
    tool_use: '🛠️',
    initializing: '🔄',
    unknown: '•',
  },

  // ASCII state text fallback
  stateAscii: {
    idle: 'idle',
    thinking: 'thinking',
    working: 'working',
    tool_use: 'tool',
    initializing: 'init',
    unknown: 'ready',
  },

  // Color thresholds
  thresholds: {
    // Context used percentage (higher = more critical)
    context: {
      warning: 60.0, // >= 60% is yellow
      danger: 80.0,  // >= 80% is red
    },
    // Quota remaining percentage (lower = more critical)
    quota: {
      warning: 30.0, // <= 30% is yellow
      danger: 15.0,  // <= 15% is red
    },
  },

  // ANSI escape codes (16-color standard for universal terminal compatibility)
  ansi: {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
  },

  // Visual separators
  separator: ' | ',
  brackets: {
    open: '[',
    close: ']',
  },
};
