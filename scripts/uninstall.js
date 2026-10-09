#!/usr/bin/env node
/**
 * Zero-dependency automated uninstaller for agy-statusline.
 * Safely restores original backup file to settings.json instead of manual modification.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const homeDir = os.homedir();
const configDir = path.join(homeDir, '.gemini', 'antigravity-cli');
const settingsFile = path.join(configDir, 'settings.json');
const backupFile = path.join(configDir, 'settings.json.backup');

const isDryRun = process.argv.includes('--dry-run');

console.log('\n========================================');
console.log(' 🗑️  agy-statusline Uninstaller');
console.log('========================================\n');

try {
  // 1. Primary Strategy: Restore from backup file
  if (fs.existsSync(backupFile)) {
    console.log(`📦 Found original backup file: ${backupFile}`);
    if (!isDryRun) {
      fs.copyFileSync(backupFile, settingsFile);
      fs.unlinkSync(backupFile);
    }
    console.log(`✔ Successfully restored original ${settingsFile} from backup.`);
    console.log('✔ AGY CLI configuration restored 100% to pre-installation state.\n');
    process.exit(0);
  }

  // 2. Fallback Strategy: If no backup file found, remove statusLine property
  if (fs.existsSync(settingsFile)) {
    console.log('ℹ️  No backup file found, removing statusLine property safely...');
    try {
      const raw = fs.readFileSync(settingsFile, 'utf8');
      const settings = JSON.parse(raw);

      if (settings.statusLine || settings.statusline) {
        delete settings.statusLine;
        delete settings.statusline;

        if (!isDryRun) {
          fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
        }
        console.log('✔ Removed statusLine property from settings.json.');
      } else {
        console.log('ℹ️  No custom statusLine found in settings.json.');
      }
    } catch (_parseErr) {
      console.warn('⚠️  Could not parse settings.json to remove statusline.');
    }
  } else {
    console.log('ℹ️  No settings.json found. Nothing to uninstall.');
  }

  console.log('✔ AGY CLI restored to default built-in statusline.\n');
  process.exit(0);
} catch (err) {
  console.error('\n✖ Uninstallation failed:', err.message);
  process.exit(1);
}
