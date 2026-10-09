/**
 * Zero-dependency automated test runner for agy-statusline.
 * Tests unit parsing, visual formatting, edge cases, and stdin CLI execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePayload } from '../src/parser.js';
import { formatStatusline, formatTokenNumber, renderProgressBar } from '../src/formatter.js';

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
assert(fullParsed.context?.remainingTokens === 1033806, '1.4b Calculate remaining tokens (1048576 - 14770 = 1033806)');
assert(fullParsed.quota?.percentage === 85.0, '1.5 Parse quota fraction to percentage');
assert(fullParsed.quota?.resetInSeconds === 7200, '1.6 Parse quota reset timer');

// 1.2 No Quota (Dynamic Collapse)
const noQuotaRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'no-quota.json'), 'utf8'));
const noQuotaParsed = parsePayload(noQuotaRaw);
assert(noQuotaParsed.model === 'Claude Sonnet 5.5 (High)', '1.7 Parse fallback model');
assert(noQuotaParsed.quota === null, '1.8 Quota is null when absent');

// 1.2b Dynamic Model Fallback & Resolution
const modelIdOnlyParsed = parsePayload({ model: { id: 'claude-3-5-sonnet' } });
assert(modelIdOnlyParsed.model === 'claude-3-5-sonnet', '1.7b Parse model when display_name is missing, falling back to id');

const modelWhitespaceParsed = parsePayload({ model: { display_name: '   ', id: 'gemini-2.5-pro' } });
assert(modelWhitespaceParsed.model === 'gemini-2.5-pro', '1.7c Parse model when display_name is whitespace, falling back to id');

const modelEmptyParsed = parsePayload({ model: {} });
assert(modelEmptyParsed.model === null, '1.7d Parse model as null when neither display_name nor id exists');

// 1.2c Dynamic Model Switching (Consecutive Payloads Simulation)
const switchedModel1 = parsePayload({ model: { display_name: 'Gemini 3.8 Flash' } });
const switchedModel2 = parsePayload({ model: { id: 'gpt-4o' } });
const switchedModel3 = parsePayload({ model: null });
assert(switchedModel1.model === 'Gemini 3.8 Flash', '1.7e Dynamic switch 1: returns Gemini');
assert(switchedModel2.model === 'gpt-4o', '1.7f Dynamic switch 2: updates to gpt-4o');
assert(switchedModel3.model === null, '1.7g Dynamic switch 3: updates to null');

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

// Test Case F: Remaining tokens clamped to 0 when used exceeds window size
const overCapacityParsed = parsePayload({
  context_window: { total_tokens: 250000, context_window_size: 200000 },
});
assert(overCapacityParsed.context?.remainingTokens === 0, '1.27 Remaining tokens clamped to 0 when used exceeds window');

// Test Case G: Fallback used tokens and remaining tokens from used_percentage and window_size
const fallbackTokensParsed = parsePayload({
  context_window: { used_percentage: 25, context_window_size: 1000000 },
});
assert(fallbackTokensParsed.context?.totalTokens === 250000, '1.28 Fallback used tokens calculated from percentage (250000)');
assert(fallbackTokensParsed.context?.remainingTokens === 750000, '1.29 Fallback remaining tokens calculated correctly (750000)');

// Test Case H: External remaining_tokens clamped to window_size if exceeding window
const extRemainingClamp = parsePayload({
  context_window: { remaining_tokens: 300000, context_window_size: 200000 },
});
assert(extRemainingClamp.context?.remainingTokens === 200000, '1.30 External remaining_tokens clamped to window_size');

// ----------------------------------------------------
// Test Group 2: Formatter Tests (Classic Bracketed Theme)
// ----------------------------------------------------
console.log('\n🎨 Group 2: Formatter Tests (Classic Theme)');
const formatClassic = (p, opts = {}) => formatStatusline(p, { theme: 'classic', ...opts });

// 2.1 Full Payload Formatter
const fullOutput = formatClassic(fullParsed, { noColor: true });
assert(fullOutput.includes('[✦ Gemini 3.8 Flash (High)]'), '2.1 Formatter includes model name with icon');
assert(fullOutput.includes('[Agent: working]'), '2.2 Formatter includes agent state segment');
assert(fullOutput.includes('[Context: 14.8k/1.05M used · 1.03M left (1.41%) ▰░░░░░░░░░]'), '2.3 Formatter includes context usage segment and bar with used and left tokens');

// 2.1b Exact Target UI format match
const targetPayload = {
  model: { display_name: 'Gemini 3.8 Flash (High)' },
  agent_state: 'idle',
  context_window: {
    total_tokens: 250000,
    context_window_size: 1000000,
    used_percentage: 25,
  },
  quota: {
    remaining_percentage: 85,
  },
};
const targetParsed = parsePayload(targetPayload);
const targetOutput = formatClassic(targetParsed, { noColor: true });
assert(
  targetOutput === '[✦ Gemini 3.8 Flash (High)] | [Agent: idle] | [Context: 250k/1.0M used · 750k left (25%) ▰▰▰░░░░░░░] | [Quota: 85% left · Used 15%]',
  '2.3b Exact Target UI format match'
);

// 2.1c Zero remaining tokens formatted as 0 left
const zeroLeftPayload = {
  context_window: {
    total_tokens: 200000,
    context_window_size: 200000,
    used_percentage: 100,
  },
};
const zeroLeftParsed = parsePayload(zeroLeftPayload);
const zeroLeftOutput = formatClassic(zeroLeftParsed, { noColor: true });
assert(zeroLeftOutput.includes('200k/200k used · 0 left'), '2.3c Zero remaining tokens formatted as 0 left');

assert(fullOutput.includes('[Quota: 85% left · Used 15% · resets in 2h]'), '2.4 Formatter includes full quota segment');
assert(fullOutput.includes('resets in 2h'), '2.5 Formatter includes formatted reset time');

// 2.2 Dynamic Collapse (No Quota)
const noQuotaOutput = formatClassic(noQuotaParsed, { noColor: true });
assert(!noQuotaOutput.includes('Quota:'), '2.6 Quota segment completely omitted when quota is null');
assert(!noQuotaOutput.endsWith(' | ') && !noQuotaOutput.includes(' |  | '), '2.7 No-quota output has no trailing or duplicate separator');

// 2.3 Dynamic Collapse (No Context)
const noContextRaw = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'no-context.json'), 'utf8'));
const noContextParsed = parsePayload(noContextRaw);
const noContextOutput = formatClassic(noContextParsed, { noColor: true });
assert(!noContextOutput.includes('Context:'), '2.8 Context segment completely omitted when context is null');
assert(!noContextOutput.includes(' |  | '), '2.9 No-context output has no duplicate separator');
assert(noContextOutput.includes('[Quota: 100% left · Used 0% · resets in 4h]'), '2.10 No-context output preserves quota segment');

// 2.4 Missing Segments (Model / Status)
const noModelParsed = { model: null, state: 'working', context: { totalTokens: 5000, windowSize: 100000, usedPercentage: 5.0 }, quota: null };
const noModelOutput = formatClassic(noModelParsed, { noColor: true });
assert(!noModelOutput.startsWith(' | '), '2.11 Missing model does not leave leading separator');
assert(noModelOutput.startsWith('[Agent: working]'), '2.12 Missing model starts cleanly with agent state');

const noStateParsed = { model: 'Gemini Pro', state: null, context: null, quota: null };
const noStateOutput = formatClassic(noStateParsed, { noColor: true });
assert(noStateOutput === '[✦ Gemini Pro]', '2.13 Missing state leaves only model without trailing separator');

const modelIdOnlyOutput = formatClassic(modelIdOnlyParsed, { noColor: true });
assert(modelIdOnlyOutput === '[✦ claude-3-5-sonnet]', '2.13b Formatter formats model with id fallback cleanly');

// 2.5 Quota Edge Cases (remaining_fraction = 0, 0.5, 1)
const qZeroParsed = parsePayload({ quota: { remaining_fraction: 0.0 } });
const qZeroOutput = formatClassic(qZeroParsed, { noColor: true });
assert(qZeroOutput.includes('[Quota: 0% left · Used 100%]'), '2.14 remaining_fraction = 0 formats as 0% left · Used 100%');

const qHalfParsed = parsePayload({ quota: { remaining_fraction: 0.5 } });
const qHalfOutput = formatClassic(qHalfParsed, { noColor: true });
assert(qHalfOutput.includes('[Quota: 50% left · Used 50%]'), '2.15 remaining_fraction = 0.5 formats as 50% left · Used 50%');

const qFullParsed = parsePayload({ quota: { remaining_fraction: 1.0 } });
const qFullOutput = formatClassic(qFullParsed, { noColor: true });
assert(qFullOutput.includes('[Quota: 100% left · Used 0%]'), '2.16 remaining_fraction = 1.0 formats as 100% left · Used 0%');

// 2.6 Quota Reset Time (Missing & Invalid)
const qNoResetParsed = parsePayload({ quota: { remaining_fraction: 0.85 } });
const qNoResetOutput = formatClassic(qNoResetParsed, { noColor: true });
assert(qNoResetOutput === '[Quota: 85% left · Used 15%]', '2.17 Missing reset time omits reset without trailing dot');

const qInvalidResetParsed = parsePayload({ quota: { remaining_fraction: 0.85, reset_in_seconds: -10 } });
const qInvalidResetOutput = formatClassic(qInvalidResetParsed, { noColor: true });
assert(qInvalidResetOutput === '[Quota: 85% left · Used 15%]', '2.18 Negative reset time is ignored safely');

// 2.7 Context Window = 0 and Invalid Numerics
const ctxZeroWinParsed = parsePayload({ context_window: { input_tokens: 14000, output_tokens: 600, context_window_size: 0 } });
const ctxZeroWinOutput = formatClassic(ctxZeroWinParsed, { noColor: true });
assert(ctxZeroWinOutput.includes('[Context: 14.6k]'), '2.19 context_window_size = 0 displays token count without division by zero');
assert(!ctxZeroWinOutput.includes('NaN') && !ctxZeroWinOutput.includes('Infinity'), '2.20 context_window_size = 0 output contains no NaN or Infinity');

const ctxInvalidNumParsed = parsePayload({ context_window: { used_percentage: NaN, total_input_tokens: Infinity } });
const ctxInvalidNumOutput = formatClassic(ctxInvalidNumParsed, { noColor: true });
assert(ctxInvalidNumOutput === '[AGY]', '2.21 Invalid numeric context payload safely falls back to [AGY]');

// 2.8 Single-line Guarantee
assert(!fullOutput.includes('\n') && !fullOutput.includes('\r'), '2.22 Full output contains no internal newlines');
assert(!noQuotaOutput.includes('\n') && !noQuotaOutput.includes('\r'), '2.23 No-quota output contains no internal newlines');

// 2.9 Color vs NO_COLOR
const colorOutput = formatClassic(fullParsed, { noColor: false });
assert(colorOutput.includes('\x1b['), '2.24 ANSI color codes present when color is enabled');
const plainOutput = formatClassic(fullParsed, { noColor: true });
assert(!plainOutput.includes('\x1b['), '2.25 NO_COLOR strips all ANSI escape sequences');

// 2.10 Minimal Fallback when data is empty
const fallbackOutput = formatClassic(emptyParsed, { noColor: true });
assert(fallbackOutput === '[AGY]', '2.26 Formatter outputs minimal [AGY] fallback for empty payload');

// 2.11 Long Model Name Single-Line Safety
const longModel = 'Very-Long-Model-Name-For-Experimental-Enterprise-Testing-v99.9';
const longModelParsed = { model: longModel, state: 'idle', context: null, quota: null };
const longModelOutput = formatClassic(longModelParsed, { noColor: true });
assert(!longModelOutput.includes('\n') && !longModelOutput.includes('\r'), '2.27 Long model name remains strictly single-line');
assert(longModelOutput.includes(longModel), '2.28 Long model name formatted properly');

// 2.12 Token Number Formatting, Precision, and Rounding
assert(formatTokenNumber(1033806) === '1.03M', '2.29 1,033,806 formats as 1.03M (not misleading 1.0M)');
assert(formatTokenNumber(1048576) === '1.05M', '2.30 1,048,576 formats as 1.05M');
assert(formatTokenNumber(1000000) === '1.0M', '2.31 1,000,000 formats as 1.0M');
assert(formatTokenNumber(2500000) === '2.5M', '2.32 2,500,000 formats as 2.5M');
assert(formatTokenNumber(1250000) === '1.25M', '2.33 1,250,000 formats as 1.25M');
assert(formatTokenNumber(1234567890) === '1.23B', '2.34 1,234,567,890 formats as 1.23B (billions support)');
assert(formatTokenNumber(2000000000) === '2.0B', '2.35 2,000,000,000 formats as 2.0B');
assert(formatTokenNumber(985200) === '985.2k', '2.36 985,200 formats as 985.2k');
assert(formatTokenNumber(985000) === '985k', '2.37 985,000 formats as 985k');
assert(formatTokenNumber(0) === '0', '2.38 0 tokens formats as 0');
assert(formatTokenNumber(-100) === '0', '2.39 Negative tokens safely clamped to 0');
assert(formatTokenNumber(NaN) === '0', '2.40 NaN safely formats as 0');
assert(formatTokenNumber(Infinity) === '0', '2.41 Infinity safely formats as 0');

// ----------------------------------------------------
// Test Group 2b: Formatter Tests (Andrewii23 Coral Minimal Theme)
// ----------------------------------------------------
console.log('\n🎨 Group 2b: Formatter Tests (Andrewii23 Coral Theme)');

// 2b.1 Single-line Andrewii23 output
const andrewFullOut = formatStatusline(fullParsed, { noColor: true, theme: 'andrewii23' });
assert(andrewFullOut.includes('✦ Gemini 3.8 Flash (High) [working]'), '2b.1 Andrewii23 includes model name with active state');
assert(andrewFullOut.includes('1.41%') && andrewFullOut.includes('14.8k/1.05M · 1.03M left'), '2b.2 Andrewii23 includes context bar and token counts');
assert(andrewFullOut.includes('Quota') && andrewFullOut.includes('85% left'), '2b.3 Andrewii23 includes quota bar and percentage');
assert(andrewFullOut.includes('resets in 2h'), '2b.4 Andrewii23 includes reset duration');
assert(!andrewFullOut.includes('\n'), '2b.5 Andrewii23 single-line output contains no internal newlines');

// 2b.2 Andrewii23 Multi-line Output
const andrewMultiOut = formatStatusline(fullParsed, { noColor: true, theme: 'andrewii23', multiline: true });
assert(andrewMultiOut.includes('\n'), '2b.6 Andrewii23 multi-line outputs separated rows');
assert(andrewMultiOut.startsWith('✦ Gemini 3.8 Flash (High) [working]'), '2b.7 Row 1 starts with model');
assert(andrewMultiOut.includes('Current | '), '2b.8 Row 2 starts with Current quota row');

// 2b.3 Dynamic collapse in Andrewii23
const andrewNoQuotaOut = formatStatusline(noQuotaParsed, { noColor: true, theme: 'andrewii23' });
assert(!andrewNoQuotaOut.includes('Quota'), '2b.9 Andrewii23 omits quota segment when absent');

// 2b.4 White Theme Tests
const whiteFullOut = formatStatusline(fullParsed, { noColor: false, theme: 'white' });
assert(whiteFullOut.includes('\x1b[38;2;255;255;255m'), '2b.10 White theme includes Truecolor pure white ANSI sequence');
const whiteBar = renderProgressBar(50, false, false, 'white');
assert(whiteBar.includes('\x1b[38;2;255;255;255m') && whiteBar.includes('\x1b[38;2;75;75;75m'), '2b.11 White progress bar renders pure white filled and charcoal empty blocks');

// ----------------------------------------------------
// Test Group 3: CLI Subprocess Integration (Piped stdin)
// ----------------------------------------------------
console.log('\n⚡ Group 3: Piped CLI Subprocess Tests');

function runCLIWithStdin(inputString, envOverrides = {}) {
  const res = spawnSync('node', [INDEX_PATH], {
    input: inputString,
    encoding: 'utf8',
    env: { ...process.env, ...envOverrides },
  });
  return {
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    status: res.status,
  };
}

// 3.1 Piped full payload
const pipeFull = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'full-payload.json'), 'utf8'), { NO_COLOR: '1' });
assert(pipeFull.stdout.trim().includes('Gemini 3.8 Flash (High)'), '3.1 CLI processes full payload via stdin');
assert(pipeFull.status === 0, '3.1b Full payload CLI exits with code 0');
assert(pipeFull.stderr === '', '3.1c Full payload CLI produces 0 stderr output');
assert(!pipeFull.stdout.trim().includes('\n'), '3.1d Full payload CLI stdout is strictly a single line');

// 3.2 Piped empty input
const pipeEmpty = runCLIWithStdin('', { NO_COLOR: '1' });
assert(pipeEmpty.stdout === '', '3.2 CLI exits cleanly with 0 output on empty stdin');
assert(pipeEmpty.status === 0, '3.2b Empty stdin CLI exits with code 0');
assert(pipeEmpty.stderr === '', '3.2c Empty stdin CLI produces 0 stderr output');

// 3.3 Piped malformed JSON
const pipeMalformed = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'malformed.txt'), 'utf8'), { NO_COLOR: '1' });
assert(pipeMalformed.stdout.trim() === '[AGY]', '3.3 CLI handles malformed JSON without crashing, outputs [AGY]');
assert(pipeMalformed.status === 0, '3.3b Malformed JSON CLI exits with code 0');
assert(pipeMalformed.stderr === '', '3.3c Malformed JSON CLI produces 0 stderr output');

// 3.4 Piped NO_COLOR environment variable test
const pipeNoColor = runCLIWithStdin(fs.readFileSync(path.join(FIXTURES_DIR, 'full-payload.json'), 'utf8'), { NO_COLOR: '1' });
assert(!pipeNoColor.stdout.includes('\x1b['), '3.4 CLI honors process.env.NO_COLOR');
assert(pipeNoColor.status === 0, '3.4b NO_COLOR CLI exits with code 0');
assert(pipeNoColor.stderr === '', '3.4c NO_COLOR CLI produces 0 stderr output');

// 3.5 Piped long model name via subprocess
const longModelPayload = JSON.stringify({ model: { display_name: longModel } });
const pipeLongModel = runCLIWithStdin(longModelPayload, { NO_COLOR: '1' });
assert(pipeLongModel.stdout.trim().includes(longModel), '3.5 CLI processes long model name cleanly');
assert(pipeLongModel.status === 0, '3.5b Long model name CLI exits with code 0');
assert(pipeLongModel.stderr === '', '3.5c Long model name CLI produces 0 stderr output');
assert(!pipeLongModel.stdout.trim().includes('\n'), '3.5d Long model name CLI output is strictly single-line');

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
