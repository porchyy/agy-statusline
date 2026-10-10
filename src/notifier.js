/**
 * Completion notification engine for agy-statusline.
 * Automatically notifies user when AI transitions from active (thinking/working/tool_use) to idle.
 * Zero external dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { CONFIG } from './config.js';

export const ACTIVE_STATES = ['thinking', 'working', 'tool_use'];
export const DEFAULT_STATE_FILE = path.join(os.tmpdir(), '.agy-statusline-state.json');

/**
 * Determine if notification is enabled based on CLI flags, environment, and config.
 */
export function isNotificationEnabled(args = process.argv, env = process.env) {
  if (args.includes('--no-notify') || env.AGY_NOTIFY === '0' || env.AGY_NOTIFY === 'false') {
    return false;
  }
  if (args.includes('--notify') || env.AGY_NOTIFY === '1' || env.AGY_NOTIFY === 'true') {
    return true;
  }
  return Boolean(CONFIG.notifications?.enabled);
}

/**
 * Determine if state transition indicates that the agent just completed its task.
 */
export function shouldTriggerNotification(prevState, currentState) {
  if (!currentState || currentState !== 'idle') {
    return false;
  }
  if (!prevState || !ACTIVE_STATES.includes(prevState)) {
    return false;
  }
  return true;
}

/**
 * Safely escape string for XML attribute / content.
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Trigger native OS desktop notification in the background without blocking.
 */
export function triggerDesktopNotification(
  title = CONFIG.notifications?.title || 'Antigravity (AGY)',
  message = CONFIG.notifications?.message || 'AI ทำงานเสร็จเรียบร้อยแล้ว!',
  sound = Boolean(CONFIG.notifications?.sound)
) {
  // If in automated test mode and not explicitly testing desktop trigger, skip spawning
  if (process.env.AGY_TEST === '1' && process.env.AGY_TEST_TRIGGER !== '1') {
    return false;
  }

  const platform = process.platform;
  const safeTitle = escapeXml(title);
  const safeMessage = escapeXml(message);

  try {
    if (platform === 'win32') {
      const audioTag = sound
        ? '<audio src="ms-winsoundevent:Notification.Default"/>'
        : '<audio silent="true"/>';
      const xml = `<toast><visual><binding template="ToastGeneric"><text>${safeTitle}</text><text>${safeMessage}</text></binding></visual>${audioTag}</toast>`;
      const escapedXml = xml.replace(/'/g, "''");

      const psScript = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; $xml = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]::new(); $xml.LoadXml('${escapedXml}'); $toast = [Windows.UI.Notifications.ToastNotification]::new($xml); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($toast)`;

      const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      return true;
    } else if (platform === 'darwin') {
      const soundOpt = sound ? ' sound name "default"' : '';
      const child = spawn('osascript', ['-e', `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"${soundOpt}`], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    } else {
      // Linux
      const child = spawn('notify-send', [title, message], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    }
  } catch (_err) {
    return false;
  }
}

/**
 * Check state transition, persist current state, and fire notification if agent completed work.
 * @param {string|null} currentState
 * @param {object} [options]
 * @returns {boolean} Whether notification was fired
 */
export function checkAndNotify(currentState, options = {}) {
  const enabled = options.enabled !== undefined ? options.enabled : isNotificationEnabled();
  const stateFile = options.stateFile || DEFAULT_STATE_FILE;
  const triggerFn = options.triggerFn || triggerDesktopNotification;

  if (!currentState) {
    return false;
  }

  // 1. Read previous state
  let prevState = null;
  try {
    if (fs.existsSync(stateFile)) {
      const raw = fs.readFileSync(stateFile, 'utf8');
      const data = JSON.parse(raw);
      prevState = data.lastState || null;
    }
  } catch (_readErr) {
    prevState = null;
  }

  // 2. Persist current state immediately
  try {
    fs.writeFileSync(stateFile, JSON.stringify({ lastState: currentState, updatedAt: Date.now() }), 'utf8');
  } catch (_writeErr) {
    // Non-fatal if state file cannot be written
  }

  // 3. Evaluate transition
  if (!enabled) {
    return false;
  }

  const shouldTrigger = shouldTriggerNotification(prevState, currentState);
  if (shouldTrigger) {
    triggerFn(
      options.title || CONFIG.notifications?.title,
      options.message || CONFIG.notifications?.message,
      options.sound !== undefined ? options.sound : CONFIG.notifications?.sound
    );
    return true;
  }

  return false;
}
