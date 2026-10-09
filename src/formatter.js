/**
 * Visual Formatter for agy-statusline.
 * Composes a clean, single-line statusline with ANSI colors, progress bars,
 * and automatic dynamic collapse for missing data.
 * Zero external dependencies.
 */

import { CONFIG } from './config.js';

/**
 * Check if the current environment disallows colors.
 * Honors https://no-color.org and dumb terminal specifications.
 */
export function isColorDisabled(env = process.env) {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') {
    return true;
  }
  if (env.TERM === 'dumb') {
    return true;
  }
  return false;
}

/**
 * Format parsed status data into a single-line terminal statusline.
 * @param {import('./parser.js').ParsedStatus} parsed
 * @param {object} [options]
 * @param {boolean} [options.noColor]
 * @param {boolean} [options.ascii]
 * @returns {string} Single-line formatted statusline
 */
export function formatStatusline(parsed, options = {}) {
  const disableColor = options.noColor ?? isColorDisabled();
  const useAscii = options.ascii ?? (process.env.TERM === 'dumb');
  const theme = options.theme ?? CONFIG.theme ?? 'white';
  const multiline = options.multiline ?? CONFIG.multiline ?? false;

  if (theme === 'classic') {
    return formatClassic(parsed, { disableColor, useAscii });
  }

  return formatAndrewii23(parsed, { disableColor, useAscii, multiline, theme });
}

/**
 * Format statusline using Minimal Powerline style (White or Coral).
 */
function formatAndrewii23(parsed, { disableColor, useAscii, multiline, theme = 'white' }) {
  const plainSep = ' | ';
  const activeSep = disableColor ? plainSep : (CONFIG.dimSeparator || plainSep);
  const palette = CONFIG.themes?.[theme] || CONFIG.themes?.white || {
    barFilled: '\x1b[38;2;255;255;255m',
    barEmpty: '\x1b[38;2;75;75;75m',
    text: '\x1b[38;2;255;255;255m',
    dim: '\x1b[38;2;160;160;160m',
  };

  // 1. Model & State
  let modelPart = '';
  if (parsed?.model) {
    const icon = useAscii ? CONFIG.icons.asciiModel : CONFIG.icons.model;
    let label = `${icon} ${parsed.model}`;
    if (parsed?.state && parsed.state !== 'idle') {
      const stateLabel = CONFIG.stateAscii[parsed.state] || parsed.state;
      label += ` [${stateLabel}]`;
    }
    modelPart = colorize(label, palette.text, disableColor);
  } else if (parsed?.state) {
    const stateLabel = CONFIG.stateAscii[parsed.state] || parsed.state;
    modelPart = colorize(`[Agent: ${stateLabel}]`, CONFIG.ansi.gray, disableColor);
  }

  // 2. Context Segment
  const contextParts = [];
  if (parsed?.context) {
    const ctx = parsed.context;
    const bar = renderProgressBar(ctx.usedPercentage ?? 0, useAscii, disableColor, theme);
    const pct = colorize(`${ctx.usedPercentage ?? 0}%`, palette.text, disableColor);

    let tokens = '';
    const dot = useAscii ? CONFIG.icons.asciiDot : CONFIG.icons.middleDot;
    if (ctx.totalTokens !== null && ctx.windowSize !== null && ctx.remainingTokens !== null) {
      tokens = `${formatTokenNumber(ctx.totalTokens)}/${formatTokenNumber(ctx.windowSize)} ${dot} ${formatTokenNumber(ctx.remainingTokens)} left`;
    } else if (ctx.totalTokens !== null && ctx.windowSize !== null) {
      tokens = `${formatTokenNumber(ctx.totalTokens)}/${formatTokenNumber(ctx.windowSize)}`;
    } else if (ctx.totalTokens !== null) {
      tokens = `${formatTokenNumber(ctx.totalTokens)}`;
    }

    const tokensStyled = colorize(tokens, palette.text, disableColor);
    contextParts.push(`${bar} ${pct}`);
    if (tokensStyled) {
      contextParts.push(tokensStyled);
    }
  }

  // 3. Quota Segment
  const quotaParts = [];
  if (parsed?.quota && parsed.quota.percentage !== null) {
    const q = parsed.quota;
    const quotaBar = renderProgressBar(q.percentage, useAscii, disableColor, theme);
    const remPct = colorize(`${q.percentage}% left`, palette.text, disableColor);

    let resetText = '';
    if (q.resetInSeconds !== null) {
      resetText = formatDuration(q.resetInSeconds);
    } else if (typeof q.resetTime === 'string' && q.resetTime.trim().length > 0) {
      const trimmed = q.resetTime.trim();
      resetText = trimmed.startsWith('resets') ? trimmed : `resets in ${trimmed}`;
    }

    const quotaLabel = colorize('Quota', palette.text, disableColor);
    const resetStyled = colorize(resetText, palette.dim, disableColor);

    quotaParts.push(quotaLabel);
    quotaParts.push(`${quotaBar} ${remPct}`);
    if (resetStyled) {
      quotaParts.push(resetStyled);
    }
  }

  // Minimal fallback when empty
  if (!modelPart && contextParts.length === 0 && quotaParts.length === 0) {
    return colorize('[AGY]', CONFIG.ansi.gray, disableColor);
  }

  // Multi-line mode
  if (multiline && quotaParts.length > 0) {
    const row1 = [modelPart, ...contextParts].filter(Boolean).join(activeSep);
    const row2 = ['Current', ...quotaParts.slice(1)].filter(Boolean).join(activeSep);
    return `${row1}\n${row2}`;
  }

  // Single-line unified row (Andrewii23 Compact)
  const allSegments = [
    modelPart,
    ...contextParts,
    ...quotaParts,
  ].filter(Boolean);

  const result = allSegments.join(activeSep);
  return sanitizeSingleLine(result);
}

/**
 * Format statusline using Classic Bracketed style.
 */
function formatClassic(parsed, { disableColor, useAscii }) {
  const segments = [];

  // 1. Model Name Segment
  if (parsed?.model) {
    const icon = useAscii ? CONFIG.icons.asciiModel : CONFIG.icons.model;
    const modelText = `[${icon} ${parsed.model}]`;
    segments.push(colorize(modelText, CONFIG.ansi.cyan + CONFIG.ansi.bold, disableColor));
  }

  // 2. Agent State Segment
  if (parsed?.state) {
    const stateLabel = CONFIG.stateAscii[parsed.state] || parsed.state;
    const stateText = `[Agent: ${stateLabel}]`;
    segments.push(colorize(stateText, CONFIG.ansi.gray, disableColor));
  }

  // 3. Context Usage Segment
  if (parsed?.context) {
    const ctx = parsed.context;
    const parts = [];

    const dot = useAscii ? CONFIG.icons.asciiDot : CONFIG.icons.middleDot;
    if (ctx.totalTokens !== null && ctx.windowSize !== null && ctx.remainingTokens !== null) {
      const usedStr = `${formatTokenNumber(ctx.totalTokens)}/${formatTokenNumber(ctx.windowSize)} used`;
      const leftStr = `${formatTokenNumber(ctx.remainingTokens)} left`;
      parts.push(`${usedStr} ${dot} ${leftStr}`);
    } else if (ctx.totalTokens !== null && ctx.windowSize !== null) {
      parts.push(`${formatTokenNumber(ctx.totalTokens)}/${formatTokenNumber(ctx.windowSize)}`);
    } else if (ctx.totalTokens !== null) {
      parts.push(`${formatTokenNumber(ctx.totalTokens)}`);
    }

    if (ctx.usedPercentage !== null) {
      let barColor = CONFIG.ansi.green;
      if (ctx.usedPercentage >= CONFIG.thresholds.context.danger) {
        barColor = CONFIG.ansi.red;
      } else if (ctx.usedPercentage >= CONFIG.thresholds.context.warning) {
        barColor = CONFIG.ansi.yellow;
      }

      parts.push(`(${ctx.usedPercentage}%)`);

      const bar = renderProgressBar(ctx.usedPercentage, useAscii, disableColor, 'classic');
      parts.push(colorize(bar, barColor, disableColor));
    }

    if (parts.length > 0) {
      const ctxLabel = colorize('Context:', CONFIG.ansi.bold, disableColor);
      segments.push(`[${ctxLabel} ${parts.join(' ')}]`);
    }
  }

  // 4. Quota Segment
  if (parsed?.quota && parsed.quota.percentage !== null) {
    const q = parsed.quota;
    const quotaParts = [];

    let quotaColor = CONFIG.ansi.green;
    if (q.percentage <= CONFIG.thresholds.quota.danger) {
      quotaColor = CONFIG.ansi.red;
    } else if (q.percentage <= CONFIG.thresholds.quota.warning) {
      quotaColor = CONFIG.ansi.yellow;
    }

    const remText = colorize(`${q.percentage}% left`, quotaColor, disableColor);
    quotaParts.push(remText);

    const usedPercentage = Math.round((100 - q.percentage) * 10) / 10;
    quotaParts.push(`Used ${usedPercentage}%`);

    if (q.resetInSeconds !== null) {
      const durationText = formatDuration(q.resetInSeconds);
      quotaParts.push(colorize(durationText, CONFIG.ansi.gray, disableColor));
    } else if (typeof q.resetTime === 'string' && q.resetTime.trim().length > 0) {
      const trimmed = q.resetTime.trim();
      const resetText = trimmed.startsWith('resets') ? trimmed : `resets in ${trimmed}`;
      quotaParts.push(colorize(resetText, CONFIG.ansi.gray, disableColor));
    }

    const dot = useAscii ? CONFIG.icons.asciiDot : CONFIG.icons.middleDot;
    const quotaLabel = colorize('Quota:', CONFIG.ansi.bold, disableColor);
    segments.push(`[${quotaLabel} ${quotaParts.join(` ${dot} `)}]`);
  }

  if (segments.length === 0) {
    return colorize('[AGY]', CONFIG.ansi.gray, disableColor);
  }

  const separator = colorize(CONFIG.separator, CONFIG.ansi.gray, disableColor);
  const result = segments.join(separator);
  return sanitizeSingleLine(result);
}

/**
 * Apply ANSI color if not disabled.
 */
function colorize(text, ansiCode, disableColor) {
  if (disableColor || !text) {
    return text;
  }
  return `${ansiCode}${text}${CONFIG.ansi.reset}`;
}

/**
 * Render visual progress bar.
 */
export function renderProgressBar(percentage, useAscii = false, disableColor = false, theme = 'white') {
  const len = CONFIG.progressBar.length;
  const pct = Math.max(0, Math.min(100, percentage));
  let filledCount = Math.round((pct / 100) * len);
  if (pct > 0 && filledCount === 0) {
    filledCount = 1;
  }
  const emptyCount = Math.max(0, len - filledCount);

  if (useAscii) {
    return `${CONFIG.progressBar.asciiFilledGlyph.repeat(filledCount)}${CONFIG.progressBar.asciiEmptyGlyph.repeat(emptyCount)}`;
  }

  if (disableColor) {
    const filledChar = theme === 'classic' ? '▰' : '▆';
    const emptyChar = '░';
    return `${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}`;
  }

  if (theme === 'classic') {
    return `${'▰'.repeat(filledCount)}${'░'.repeat(emptyCount)}`;
  }

  const palette = CONFIG.themes?.[theme] || CONFIG.themes?.white || {
    barFilled: '\x1b[38;2;255;255;255m',
    barEmpty: '\x1b[38;2;75;75;75m',
  };

  const filledPart = `${palette.barFilled}${'▆'.repeat(filledCount)}`;
  const emptyPart = `${palette.barEmpty}${'▆'.repeat(emptyCount)}`;
  return `${filledPart}${emptyPart}${CONFIG.ansi.reset}`;
}

/**
 * Format raw numbers into compact readable representations (e.g. 14250 -> 14.3k, 1033806 -> 1.03M, 1000000 -> 1.0M).
 */
export function formatTokenNumber(num) {
  if (typeof num !== 'number' || !Number.isFinite(num) || num <= 0) {
    return '0';
  }

  if (num >= 1000000000) {
    const val = num / 1000000000;
    const fixed2 = val.toFixed(2);
    if (fixed2.endsWith('.00') || fixed2.endsWith('0')) {
      return `${val.toFixed(1)}B`;
    }
    return `${fixed2}B`;
  }

  if (num >= 1000000) {
    const val = num / 1000000;
    const fixed2 = val.toFixed(2);
    if (fixed2.endsWith('.00') || fixed2.endsWith('0')) {
      return `${val.toFixed(1)}M`;
    }
    return `${fixed2}M`;
  }

  if (num >= 1000) {
    const val = num / 1000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}k`;
  }

  return `${Math.round(num)}`;
}

/**
 * Format duration in seconds to compact human-readable string.
 */
export function formatDuration(seconds) {
  if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `resets in ${hours}h`;
  }
  if (seconds >= 60) {
    const mins = Math.round(seconds / 60);
    return `resets in ${mins}m`;
  }
  return `resets in ${seconds}s`;
}

/**
 * Sanitize output to guarantee it never wraps or outputs multiple lines.
 */
function sanitizeSingleLine(str) {
  return str.replace(/[\r\n]+/g, ' ').trim();
}
