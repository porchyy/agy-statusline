/**
 * Zero-dependency automated test runner for agy-statusline.
 * Tests unit parsing, visual formatting, edge cases, and stdin CLI execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePayload } from '../src/parser.js';
import { formatStatusline } from '../src/formatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const INDEX_PATH = path.join(__dirname, '..', 'src', 'index.js');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    failedCount++;
  }
}

console.log('\n========================================');
console.log(' Running agy-statusline Test Suite');
console.log('========================================\n');

// ----------------------------------------------------
// Test Group 1: Unit Parser Tests
// ----------------------------------------------------
console.log('📁 Group 1: Parser Tests');

// 1.1 Full Payload
const fullRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'full-payload.json'), 'utf8'));
const fullParsed = parsePayload(fullRaw);
assert(fullParsed.model === 'Gemini 3.8 Flash (High)', '1.1 Parse model display name');
assert(fullParsed.state === 'working', '1.2 Parse valid agent state');
assert(fullParsed.context?.usedPercentage === 1.41, '1.3 Parse context used percentage');
assert(fullParsed.context?.totalTokens === 14770, '1.4 Calculate total tokens (input + output)');
assert(fullParsed.quota?.percentage === 85.0, '1.5 Parse quota fraction to percentage');
assert(fullParsed.quota?.resetInSeconds === 7200, '1.6 Parse quota reset timer');

// 1.2 No Quota (Dynamic Collapse)
const noQuotaRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'no-quota.json'), 'utf8'));
const noQuotaParsed = parsePayload(noQuotaRaw);
assert(noQuotaParsed.model === 'Claude Sonnet 5.5 (High)', '1.7 Parse fallback model');
assert(noQuotaParsed.quota === null, '1.8 Quota is null when absent');

// 1.3 Out-of-Range Handling
const outOfRangeRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'out-of-range.json'), 'utf8'));
const outOfRangeParsed = parsePayload(outOfRangeRaw);
assert(outOfRangeParsed.context?.usedPercentage === 100, '1.9 Clamp context percentage > 100% to 100%');
assert(outOfRangeParsed.quota === null, '1.10 Invalidate negative quota fraction');

// 1.4 Unrecognized Quota Format
const unrecQuotaRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'unrecognized-quota.json'), 'utf8'));
const unrecQuotaParsed = parsePayload(unrecQuotaRaw);
assert(unrecQuotaParsed.quota === null, '1.11 Non-object quota string gracefully handled as null');

// 1.5 Null and Empty Payloads
const nullParsed = parsePayload(JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'null-fields.json'), 'utf8')));
assert(nullParsed.model === null && nullParsed.context === null && nullParsed.quota === null, '1.12 Null fields payload returns all nulls');
const emptyParsed = parsePayload({});
assert(emptyParsed.model === null, '1.13 Empty object returns safe state');
const nonObjParsed = parsePayload(null);
assert(nonObjParsed.model === null, '1.14 Primitive null returns safe state');

// 1.6 Context Window Fallback Calculations & Priority
// Test Case A: input_tokens=14000, output_tokens=600, window_size=200000 without used_percentage or percentage
const fallbackCalcParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    input_tokens: 14000,
    output_tokens: 600,
    context_window_size: 200000,
  },
});
assert(fallbackCalcParsed.context?.totalTokens === 14600, '1.15 Fallback calculates total tokens (14000 + 600 = 14600)');
assert(fallbackCalcParsed.context?.windowSize === 200000, '1.16 Fallback preserves context window size');
assert(fallbackCalcParsed.context?.usedPercentage === 7.3, '1.17 Fallback calculates correct percentage ((14600 / 200000) * 100 = 7.3%)');

// Test Case B: total tokens is 0 and window_size > 0
const zeroTokensParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    input_tokens: 0,
    output_tokens: 0,
    context_window_size: 200000,
  },
});
assert(zeroTokensParsed.context?.totalTokens === 0, '1.18 Zero tokens totalTokens is 0');
assert(zeroTokensParsed.context?.usedPercentage === 0, '1.19 Zero tokens calculation yields 0%');

// Test Case C: window_size is 0 or missing (prevents division by zero)
const zeroWindowParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    input_tokens: 14000,
    output_tokens: 600,
    context_window_size: 0,
  },
});
assert(zeroWindowParsed.context?.windowSize === null, '1.20 Context window size 0 is treated as null');
assert(zeroWindowParsed.context?.usedPercentage === null, '1.21 Cannot calculate percentage when window size is 0 (prevents division by zero)');
assert(zeroWindowParsed.context?.totalTokens === 14600, '1.22 Total tokens preserved even when window size is 0');

const missingWindowParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    input_tokens: 14000,
    output_tokens: 600,
  },
});
assert(missingWindowParsed.context?.windowSize === null, '1.23 Missing context window size is null');
assert(missingWindowParsed.context?.usedPercentage === null, '1.24 Cannot calculate percentage when window size is missing');

// Test Case D: Valid used_percentage must be prioritized over calculated value
const priorityUsedPctParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    used_percentage: 12.5,
    input_tokens: 14000,
    output_tokens: 600,
    context_window_size: 200000,
  },
});
assert(priorityUsedPctParsed.context?.usedPercentage === 12.5, '1.25 Explicit used_percentage (12.5%) prioritized over calculated value (7.3%)');

// Test Case E: Valid percentage fallback prioritized over calculated value when used_percentage is missing
const priorityPctParsed = parsePayload({
  model: { display_name: 'Test Model' },
  context_window: {
    percentage: 15.0,
    input_tokens: 14000,
    output_tokens: 600,
    context_window_size: 200000,
  },
});
assert(priorityPctParsed.context?.usedPercentage === 15.0, '1.26 percentage (15.0%) prioritized over calculated value (7.3%) when used_percentage is absent');

// ----------------------------------------------------
// Test Group 2: Formatter Tests
// ----------------------------------------------------
console.log('\n🎨 Group 2: Formatter Tests');

// 2.1 Full Payload Formatter
const fullOutput = formatStatusline(fullParsed, { noColor: true });
assert(fullOutput.includes('[Gemini 3.8 Flash (High)]'), '2.1 Formatter includes model name');
assert(fullOutput.includes('working'), '2.2 Formatter includes agent state');
assert(fullOutput.includes('Ctx:'), '2.3 Formatter includes context label');
assert(fullOutput.includes('Quota: 85%'), '2.4 Formatter includes quota percentage');
assert(fullOutput.includes('resets in 2h'), '2.5 Formatter includes formatted reset time');

// 2.2 Dynamic Collapse (No Quota)
const noQuotaOutput = formatStatusline(noQuotaParsed, { noColor: true });
assert(!noQuotaOutput.includes('Quota:'), '2.6 Quota segment completely omitted when quota is null');

// 2.3 Single-line Guarantee
assert(!fullOutput.includes('\n') && !fullOutput.includes('\r'), '2.7 Full output contains no internal newlines');
assert(!noQuotaOutput.includes('\n') && !noQuotaOutput.includes('\r'), '2.8 No-quota output contains no internal newlines');

// 2.4 Color vs NO_COLOR
const colorOutput = formatStatusline(fullParsed, { noColor: false });
assert(colorOutput.includes('\x1b['), '2.9 ANSI color codes present when color is enabled');
const plainOutput = formatStatusline(fullParsed, { noColor: true });
assert(!plainOutput.includes('\x1b['), '2.10 NO_COLOR strips all ANSI escape sequences');

// 2.5 Minimal Fallback when data is empty
const fallbackOutput = formatStatusline(emptyParsed, { noColor: true });
assert(fallbackOutput === '[AGY]', '2.11 Formatter outputs minimal [AGY] fallback for empty payload');

// ----------------------------------------------------
// Test Group 3: CLI Subprocess Integration (Piped stdin)
// ----------------------------------------------------
console.log('\n⚡ Group 3: Piped CLI Subprocess Tests');

function runCLIWithStdin(inputString, envOverrides = {}) {
  return execSync(`node "${INDEX_PATH}"`, {
    input: inputString,
    encoding: 'utf8',
    env: { ...process.env, ...envOverrides },
  });
}

// 3.1 Piped full payload
const pipeFullOut = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'full-payload.json'), 'utf8'), { NO_COLOR: '1' });
assert(pipeFullOut.trim().includes('[Gemini 3.8 Flash (High)]'), '3.1 CLI processes full payload via stdin');

// 3.2 Piped empty input
const pipeEmptyOut = runCLIWithStdin('', { NO_COLOR: '1' });
assert(pipeEmptyOut === '', '3.2 CLI exits cleanly with 0 output on empty stdin');

// 3.3 Piped malformed JSON
const pipeMalformedOut = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'malformed.txt'), 'utf8'), { NO_COLOR: '1' });
assert(pipeMalformedOut.trim() === '[AGY]', '3.3 CLI handles malformed JSON without crashing, outputs [AGY]');

// 3.4 Piped NO_COLOR environment variable test
const pipeNoColorOut = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'full-payload.json'), 'utf8'), { NO_COLOR: '1' });
assert(!pipeNoColorOut.includes('\x1b['), '3.4 CLI honors process.env.NO_COLOR');

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n========================================');
console.log(` Test Summary: ${passedCount} Passed, ${failedCount} Failed`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
