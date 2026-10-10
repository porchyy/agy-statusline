#!/usr/bin/env node
/**
 * Entry point for agy-statusline.
 * Reads JSON payload from AGY CLI via stdin, formats a single-line statusline,
 * and prints to stdout with guaranteed zero unhandled exceptions.
 * Zero external dependencies.
 */

import fs from 'node:fs';
import { parsePayload } from './parser.js';
import { formatStatusline } from './formatter.js';
import { checkAndNotify } from './notifier.js';

export function runStatusline() {
  let rawInput = '';

  // 1. Read stdin until EOF
  try {
    rawInput = fs.readFileSync(0, 'utf8');
  } catch (_readErr) {
    // If stdin cannot be read (e.g. closed pipe or empty stream), exit cleanly
    process.exit(0);
  }

  // 2. Handle empty or whitespace-only input
  if (!rawInput || rawInput.trim().length === 0) {
    process.exit(0);
  }

  // 3. Parse JSON with comprehensive error handling
  let parsed = null;
  try {
    const rawJson = JSON.parse(rawInput);
    parsed = parsePayload(rawJson);
  } catch (_jsonErr) {
    // On malformed JSON, provide safe minimal fallback without crashing
    process.stdout.write('[AGY]\n');
    process.exit(0);
  }

  // 4. Trigger completion notification if AI just finished
  try {
    checkAndNotify(parsed.state);
  } catch (_notifyErr) {
    // Non-fatal: notification error never crashes statusline
  }

  // 5. Format and print output
  try {
    const statusline = formatStatusline(parsed);
    process.stdout.write(statusline + '\n');
  } catch (_formatErr) {
    // If formatting fails for any unexpected reason, output safe fallback
    process.stdout.write('[AGY]\n');
  }

  process.exit(0);
}

// Execute when invoked as entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runStatusline();
} else {
  // Direct CLI invocation
  runStatusline();
}
