/**
 * agy-statusline configuration constants
 * Zero-dependency configuration for visual components, thresholds, and fallbacks.
 */

export const CONFIG = {
  // Active visual theme: 'white' (white minimal), 'andrewii23' (coral minimal), or 'classic' (bracketed)
  theme: 'white',
  multiline: false,

  // Display toggles (AGY CLI already displays model and state in the UI header)
  showModel: false,
  showState: false,

  // Completion notification settings (notifies when AI finishes tasks)
  notifications: {
    enabled: true, // Toggle desktop & sound alerts on task completion
    sound: true,   // Play system audio alert
    desktop: true, // Native OS Desktop Toast notification
    title: 'Antigravity (AGY)',
    message: 'AI ทำงานเสร็จเรียบร้อยแล้ว!',
  },

  // Theme palettes
  themes: {
    white: {
      barFilled: '\x1b[38;2;255;255;255m', // Pure Bright White
      barEmpty: '\x1b[38;2;75;75;75m',      // Charcoal Dark Gray
      text: '\x1b[38;2;255;255;255m',      // Crisp White
      dim: '\x1b[38;2;160;160;160m',       // Muted Light Gray
    },
    andrewii23: {
      barFilled: '\x1b[38;2;221;129;97m',  // Coral Truecolor
      barEmpty: '\x1b[38;2;80;60;50m',      // Dark Coral
      text: '\x1b[38;2;220;220;220m',      // Off-white
      dim: '\x1b[2m',                      // Dim
    },
  },

  // Progress bar dimensions
  progressBar: {
    length: 10,
    filledGlyph: '▆',
    emptyGlyph: '░',
    asciiFilledGlyph: '=',
    asciiEmptyGlyph: '-',
  },

  // Glyphs and icons
  icons: {
    model: '✦',
    asciiModel: '*',
    middleDot: '·',
    asciiDot: '-',
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
    tool_use: 'tool_use',
    initializing: 'initializing',
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

  // ANSI escape codes (16-color standard and Truecolor RGB)
  ansi: {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    white: '\x1b[38;2;220;220;220m',
    coral: '\x1b[38;2;221;129;97m',
    coralEmpty: '\x1b[38;2;80;60;50m',
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
  dimSeparator: ' \x1b[2m|\x1b[0m ',
  brackets: {
    open: '[',
    close: ']',
  },
};
