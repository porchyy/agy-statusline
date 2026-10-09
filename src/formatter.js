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
    const modelText = `${CONFIG.brackets.open}${parsed.model}${CONFIG.brackets.close}`;
    segments.push(colorize(modelText, CONFIG.ansi.cyan + CONFIG.ansi.bold, disableColor));
  }

  // 2. Agent State Segment
  if (parsed?.state) {
    let stateText = '';
    if (useAscii) {
      const label = CONFIG.stateAscii[parsed.state] || parsed.state;
      stateText = `[${label}]`;
    } else {
      const icon = CONFIG.stateIcons[parsed.state] || CONFIG.stateIcons.unknown;
      stateText = `${icon} ${parsed.state}`;
    }
    segments.push(colorize(stateText, CONFIG.ansi.gray, disableColor));
  }

  // 3. Context Usage Segment
  if (parsed?.context) {
    const ctx = parsed.context;
    const parts = [];

    // Tokens string (e.g. 14.2k/1M or 14.2k)
    if (ctx.totalTokens !== null && ctx.windowSize !== null) {
      parts.push(`${formatTokenNumber(ctx.totalTokens)}/${formatTokenNumber(ctx.windowSize)}`);
    } else if (ctx.totalTokens !== null) {
      parts.push(`${formatTokenNumber(ctx.totalTokens)}`);
    }

    // Percentage string (e.g. 1.4%)
    let pctText = '';
    let barColor = CONFIG.ansi.green;

    if (ctx.usedPercentage !== null) {
      pctText = `(${ctx.usedPercentage}%)`;

      // Select color based on warning/danger thresholds
      if (ctx.usedPercentage >= CONFIG.thresholds.context.danger) {
        barColor = CONFIG.ansi.red;
      } else if (ctx.usedPercentage >= CONFIG.thresholds.context.warning) {
        barColor = CONFIG.ansi.yellow;
      }
      parts.push(pctText);
    }

    // Progress bar
    if (ctx.usedPercentage !== null) {
      const bar = renderProgressBar(ctx.usedPercentage, useAscii);
      parts.push(colorize(bar, barColor, disableColor));
    }

    if (parts.length > 0) {
      const ctxLabel = colorize('Ctx:', CONFIG.ansi.bold, disableColor);
      segments.push(`${ctxLabel} ${parts.join(' ')}`);
    }
  }

  // 4. Quota Segment (Dynamic Collapse: ONLY rendered if quota data is present)
  if (parsed?.quota && parsed.quota.percentage !== null) {
    const q = parsed.quota;
    let quotaColor = CONFIG.ansi.green;

    if (q.percentage <= CONFIG.thresholds.quota.danger) {
      quotaColor = CONFIG.ansi.red;
    } else if (q.percentage <= CONFIG.thresholds.quota.warning) {
      quotaColor = CONFIG.ansi.yellow;
    }

    let quotaStr = `${q.percentage}%`;
    quotaStr = colorize(quotaStr, quotaColor, disableColor);

    // Optional reset timer
    let resetStr = '';
    if (q.resetInSeconds !== null) {
      resetStr = colorize(` (${formatDuration(q.resetInSeconds)})`, CONFIG.ansi.gray, disableColor);
    } else if (q.resetTime) {
      resetStr = colorize(` (${q.resetTime})`, CONFIG.ansi.gray, disableColor);
    }

    const quotaLabel = colorize('Quota:', CONFIG.ansi.bold, disableColor);
    segments.push(`${quotaLabel} ${quotaStr}${resetStr}`);
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
  const filledCount = Math.round((pct / 100) * len);
  const emptyCount = Math.max(0, len - filledCount);

  const filledChar = useAscii ? CONFIG.progressBar.asciiFilledGlyph : CONFIG.progressBar.filledGlyph;
  const emptyChar = useAscii ? CONFIG.progressBar.asciiEmptyGlyph : CONFIG.progressBar.emptyGlyph;

  return `[${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}]`;
}

/**
 * Format raw numbers into compact readable representations (e.g. 14250 -> 14.3k, 1048576 -> 1M).
 */
export function formatTokenNumber(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) {
    return '0';
  }

  if (num >= 1000000) {
    const val = num / 1000000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}M`;
  }
  if (num >= 1000) {
    const val = num / 1000;
    return `${val % 1 === 0 ? val : val.toFixed(1)}k`;
  }
  return `${num}`;
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
