#!/usr/bin/env node
/**
 * Zero-dependency script to toggle task completion notifications on or off in src/config.js.
 * Usage:
 *   node scripts/toggle-notify.js [on|off|status]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configFile = path.resolve(__dirname, '..', 'src', 'config.js');

try {
  let content = fs.readFileSync(configFile, 'utf8');
  const match = content.match(/notifications:\s*\{\s*enabled:\s*(true|false)/);

  if (!match) {
    console.error('❌ Could not locate notifications.enabled in src/config.js');
    process.exit(1);
  }

  const currentStatus = match[1] === 'true';
  const arg = (process.argv[2] || '').toLowerCase().trim();

  let targetStatus;
  if (arg === 'on' || arg === 'enable' || arg === 'true' || arg === '1') {
    targetStatus = true;
  } else if (arg === 'off' || arg === 'disable' || arg === 'false' || arg === '0') {
    targetStatus = false;
  } else if (arg === 'status') {
    console.log(`\n🔔 Notifications are currently: ${currentStatus ? 'ENABLED (เปิด)' : 'DISABLED (ปิด)'}\n`);
    process.exit(0);
  } else {
    // Toggle
    targetStatus = !currentStatus;
  }

  const updatedContent = content.replace(
    /(notifications:\s*\{\s*enabled:\s*)(true|false)/,
    `$1${targetStatus}`
  );

  fs.writeFileSync(configFile, updatedContent, 'utf8');

  console.log('\n========================================');
  console.log(` 🔔 Completion Notifications: ${targetStatus ? 'ENABLED (เปิดใช้งาน ✅)' : 'DISABLED (ปิดใช้งาน ❌)'}`);
  console.log('========================================\n');
} catch (err) {
  console.error('❌ Error updating notification setting:', err.message);
  process.exit(1);
}
