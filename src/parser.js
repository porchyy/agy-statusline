/**
 * Defensive payload parser for agy-statusline.
 * Handles missing fields, nulls, incorrect types, and out-of-range values.
 * Zero external dependencies.
 */

/**
 * Safely parse and normalize the raw JSON payload from AGY CLI.
 * @param {unknown} raw - Raw parsed JSON object
 * @returns {ParsedStatus} Normalized status data
 */
export function parsePayload(raw) {
  // If raw input is not a non-null object, return an empty/safe state
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      model: null,
      state: null,
      context: null,
      quota: null,
    };
  }

  return {
    model: parseModel(raw.model),
    state: parseAgentState(raw.agent_state),
    context: parseContextWindow(raw.context_window),
    quota: parseQuota(raw.quota),
  };
}

/**
 * Parse Model information.
 * Prioritizes display_name, fallbacks to id.
 */
function parseModel(model) {
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    return null;
  }

  if (typeof model.display_name === 'string' && model.display_name.trim().length > 0) {
    return model.display_name.trim();
  }

  if (typeof model.id === 'string' && model.id.trim().length > 0) {
    return model.id.trim();
  }

  return null;
}

/**
 * Parse Agent State.
 * Validates known enum values, returns null if unknown or malformed.
 */
function parseAgentState(state) {
  if (typeof state !== 'string') {
    return null;
  }

  const normalized = state.trim().toLowerCase();
  const knownStates = ['idle', 'thinking', 'working', 'tool_use', 'initializing'];

  if (knownStates.includes(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Parse Context Window usage.
 * Explicitly guards against confusing total_input_tokens with total usage.
 */
function parseContextWindow(contextWindow) {
  if (!contextWindow || typeof contextWindow !== 'object' || Array.isArray(contextWindow)) {
    return null;
  }

  // 1. Context window size limit
  let windowSize = null;
  if (typeof contextWindow.context_window_size === 'number' && Number.isFinite(contextWindow.context_window_size) && contextWindow.context_window_size > 0) {
    windowSize = Math.round(contextWindow.context_window_size);
  }

  // 2. Tokens: calculate total tokens (input + output) without conflating input tokens with total usage
  let inputTokens = 0;
  let hasInput = false;
  if (typeof contextWindow.total_input_tokens === 'number' && Number.isFinite(contextWindow.total_input_tokens) && contextWindow.total_input_tokens >= 0) {
    inputTokens = Math.round(contextWindow.total_input_tokens);
    hasInput = true;
  } else if (typeof contextWindow.input_tokens === 'number' && Number.isFinite(contextWindow.input_tokens) && contextWindow.input_tokens >= 0) {
    inputTokens = Math.round(contextWindow.input_tokens);
    hasInput = true;
  }

  let outputTokens = 0;
  let hasOutput = false;
  if (typeof contextWindow.total_output_tokens === 'number' && Number.isFinite(contextWindow.total_output_tokens) && contextWindow.total_output_tokens >= 0) {
    outputTokens = Math.round(contextWindow.total_output_tokens);
    hasOutput = true;
  } else if (typeof contextWindow.output_tokens === 'number' && Number.isFinite(contextWindow.output_tokens) && contextWindow.output_tokens >= 0) {
    outputTokens = Math.round(contextWindow.output_tokens);
    hasOutput = true;
  }

  let totalTokens = null;
  if (hasInput || hasOutput) {
    totalTokens = inputTokens + outputTokens;
  } else if (typeof contextWindow.total_tokens === 'number' && Number.isFinite(contextWindow.total_tokens) && contextWindow.total_tokens >= 0) {
    totalTokens = Math.round(contextWindow.total_tokens);
  }

  // 3. Used Percentage calculation or direct extraction
  let usedPercentage = null;

  if (typeof contextWindow.used_percentage === 'number' && Number.isFinite(contextWindow.used_percentage)) {
    usedPercentage = contextWindow.used_percentage;
  } else if (typeof contextWindow.percentage === 'number' && Number.isFinite(contextWindow.percentage)) {
    usedPercentage = contextWindow.percentage;
  } else if (totalTokens !== null && windowSize !== null && windowSize > 0) {
    usedPercentage = (totalTokens / windowSize) * 100;
  }

  // If percentage is out of range or not a number, clamp or invalidate
  if (usedPercentage !== null) {
    if (usedPercentage < 0 || usedPercentage > 100) {
      // Out of range percentages indicate abnormal data; clamp safely
      usedPercentage = Math.max(0, Math.min(100, usedPercentage));
    }
  }

  // If we have neither percentage nor token counts, context data is unusable
  if (usedPercentage === null && totalTokens === null) {
    return null;
  }

  return {
    usedPercentage: usedPercentage !== null ? Number(usedPercentage.toFixed(2)) : null,
    totalTokens,
    windowSize,
  };
}

/**
 * Parse Quota information.
 * Does NOT assume a fixed single structure; inspects both flat and nested bucket layouts.
 * Rejects invalid types, strings, and out-of-range fractions.
 */
function parseQuota(quota) {
  if (!quota || typeof quota !== 'object' || Array.isArray(quota)) {
    return null;
  }

  // Identify candidate bucket: either quota itself or the first nested object
  let candidate = null;

  if (hasQuotaFields(quota)) {
    candidate = quota;
  } else {
    // Check if quota is a dictionary keyed by model or bucket IDs
    const values = Object.values(quota);
    for (const val of values) {
      if (val && typeof val === 'object' && !Array.isArray(val) && hasQuotaFields(val)) {
        candidate = val;
        break;
      }
    }
  }

  if (!candidate) {
    return null;
  }

  // Extract remaining fraction or percentage
  let remainingPercentage = null;

  if (typeof candidate.remaining_fraction === 'number' && Number.isFinite(candidate.remaining_fraction)) {
    const fraction = candidate.remaining_fraction;
    if (fraction >= 0.0 && fraction <= 1.0) {
      remainingPercentage = fraction * 100;
    } else if (fraction > 1.0 && fraction <= 100.0) {
      // Treated as already in 0-100 range
      remainingPercentage = fraction;
    } else {
      // Outside valid bounds
      return null;
    }
  } else if (typeof candidate.percentage === 'number' && Number.isFinite(candidate.percentage)) {
    if (candidate.percentage >= 0.0 && candidate.percentage <= 100.0) {
      remainingPercentage = candidate.percentage;
    } else {
      return null;
    }
  } else if (typeof candidate.remaining_percentage === 'number' && Number.isFinite(candidate.remaining_percentage)) {
    if (candidate.remaining_percentage >= 0.0 && candidate.remaining_percentage <= 100.0) {
      remainingPercentage = candidate.remaining_percentage;
    } else {
      return null;
    }
  }

  if (remainingPercentage === null) {
    return null;
  }

  // Extract optional reset timer
  let resetInSeconds = null;
  if (typeof candidate.reset_in_seconds === 'number' && Number.isFinite(candidate.reset_in_seconds) && candidate.reset_in_seconds >= 0) {
    resetInSeconds = Math.round(candidate.reset_in_seconds);
  }

  let resetTime = null;
  if (typeof candidate.reset_time === 'string' && candidate.reset_time.trim().length > 0) {
    resetTime = candidate.reset_time.trim();
  }

  return {
    percentage: Number(remainingPercentage.toFixed(1)),
    resetInSeconds,
    resetTime,
  };
}

/**
 * Helper to check if an object contains recognized quota fields.
 */
function hasQuotaFields(obj) {
  return (
    'remaining_fraction' in obj ||
    'reset_time' in obj ||
    'reset_in_seconds' in obj ||
    'remaining_percentage' in obj
  );
}
