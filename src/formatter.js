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

    // Tokens string (e.g. 250k/1.0M used · 750k left, or fallback to 14.8k/1.0M / 14.8k)
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

    // Percentage string (e.g. 1.41%) and progress bar
    if (ctx.usedPercentage !== null) {
      let barColor = CONFIG.ansi.green;
      if (ctx.usedPercentage >= CONFIG.thresholds.context.danger) {
        barColor = CONFIG.ansi.red;
      } else if (ctx.usedPercentage >= CONFIG.thresholds.context.warning) {
        barColor = CONFIG.ansi.yellow;
      }

      parts.push(`(${ctx.usedPercentage}%)`);

      // Progress bar without extra outer brackets
      const bar = renderProgressBar(ctx.usedPercentage, useAscii);
      parts.push(colorize(bar, barColor, disableColor));
    }

    if (parts.length > 0) {
      const ctxLabel = colorize('Context:', CONFIG.ansi.bold, disableColor);
      segments.push(`[${ctxLabel} ${parts.join(' ')}]`);
    }
  }

  // 4. Quota Segment (Dynamic Collapse: ONLY rendered if quota data is present)
  if (parsed?.quota && parsed.quota.percentage !== null) {
    const q = parsed.quota;
    const quotaParts = [];

    let quotaColor = CONFIG.ansi.green;
    if (q.percentage <= CONFIG.thresholds.quota.danger) {
      quotaColor = CONFIG.ansi.red;
    } else if (q.percentage <= CONFIG.thresholds.quota.warning) {
      quotaColor = CONFIG.ansi.yellow;
    }

    // Remaining percentage
    const remText = colorize(`${q.percentage}% left`, quotaColor, disableColor);
    quotaParts.push(remText);

    // Used percentage: 100 - remaining
    const usedPercentage = Math.round((100 - q.percentage) * 10) / 10;
    quotaParts.push(`Used ${usedPercentage}%`);

    // Reset duration/time
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

  // If no segments could be formed, return minimal fallback
  if (segments.length === 0) {
    return colorize('[AGY]', CONFIG.ansi.gray, disableColor);
  }

  // Join segments with separator
  const separator = colorize(CONFIG.separator, CONFIG.ansi.gray, disableColor);
  const result = segments.join(separator);

  // Guarantee strictly single-line output (strip newline characters)
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
function renderProgressBar(percentage, useAscii) {
  const len = CONFIG.progressBar.length;
  const pct = Math.max(0, Math.min(100, percentage));
  let filledCount = Math.round((pct / 100) * len);
  if (pct > 0 && filledCount === 0) {
    filledCount = 1;
  }
  const emptyCount = Math.max(0, len - filledCount);

  const filledChar = useAscii ? CONFIG.progressBar.asciiFilledGlyph : CONFIG.progressBar.filledGlyph;
  const emptyChar = useAscii ? CONFIG.progressBar.asciiEmptyGlyph : CONFIG.progressBar.emptyGlyph;

  return `${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}`;
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
