#!/usr/bin/env node
/**
 * Zero-dependency automated installer for agy-statusline.
 * Automatically configures ~/.gemini/antigravity-cli/settings.json with backup and rollback support.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target configuration file paths
const homeDir = os.homedir();
const configDir = path.join(homeDir, '.gemini', 'antigravity-cli');
const settingsFile = path.join(configDir, 'settings.json');
const backupFile = path.join(configDir, 'settings.json.backup');
const entryPoint = path.resolve(__dirname, '..', 'src', 'index.js').replace(/\\/g, '/');

const isUninstall = process.argv.includes('--uninstall');
const isDryRun = process.argv.includes('--dry-run');

console.log('\n========================================');
console.log(isUninstall ? ' 🗑️  agy-statusline Uninstaller' : ' 🚀 agy-statusline Installer');
console.log('========================================\n');

try {
  // Ensure target directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Load existing settings or initialize empty object
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, 'utf8');
      settings = JSON.parse(raw);
    } catch (_parseErr) {
      console.warn('⚠️  Existing settings.json was malformed, creating fresh configuration.');
      settings = {};
    }
  }

  if (isUninstall) {
    if (settings.statusLine || settings.statusline) {
      delete settings.statusLine;
      delete settings.statusline;

      if (!isDryRun) {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
      }
      console.log('✔ Successfully removed custom statusline from settings.json.');
      console.log('✔ Restored AGY CLI to default built-in statusline.\n');
    } else {
      console.log('ℹ️  No custom statusline found in settings.json. Nothing to remove.\n');
    }
    process.exit(0);
  }

  // 1. Create backup if settings file exists
  if (fs.existsSync(settingsFile) && !isDryRun) {
    fs.copyFileSync(settingsFile, backupFile);
    console.log(`📦 Backup created: ${backupFile}`);
  }

  // 2. Configure statusLine block
  settings.statusLine = {
    type: 'command',
    command: `node "${entryPoint}"`,
    padding: 0,
    enabled: true,
    stack_with_default: false,
  };

  if (!isDryRun) {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
  }

  console.log(`✔ Configured settings: ${settingsFile}`);
  console.log(`✔ Command: node "${entryPoint}"`);
  console.log('\n🎉 Installation complete! Open your terminal and run:');
  console.log('   agy\n');
} catch (err) {
  console.error('\n✖ Installation failed:', err.message);
  process.exit(1);
}
