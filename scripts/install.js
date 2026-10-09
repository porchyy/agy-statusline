#!/usr/bin/env node
/**
 * Zero-dependency automated installer for agy-statusline.
 * Automatically backs up ~/.gemini/antigravity-cli/settings.json before applying configuration.
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
const entryPoint = path.resolve(__dirname, '..', 'bin', 'agy-statusline.js').replace(/\\/g, '/');

const isDryRun = process.argv.includes('--dry-run');

console.log('\n========================================');
console.log(' 🚀 agy-statusline Installer');
console.log('========================================\n');

try {
  // Ensure target configuration directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // 1. Mandatory Pre-installation Backup Protocol
  if (fs.existsSync(settingsFile)) {
    if (!isDryRun) {
      fs.copyFileSync(settingsFile, backupFile);
    }
    console.log(`📦 Backup created: ${backupFile}`);
  }

  // 2. Load existing settings or initialize empty configuration
  let settings = {};
  if (fs.existsSync(settingsFile)) {
    try {
      const raw = fs.readFileSync(settingsFile, 'utf8');
      settings = JSON.parse(raw);
    } catch (_parseErr) {
      console.warn('⚠️  Existing settings.json was malformed, starting with clean configuration.');
      settings = {};
    }
  }

  // 3. Configure statusLine block pointing to bin executable
  settings.statusLine = {
    type: 'command',
    command: `node ${entryPoint}`,
    padding: 0,
    enabled: true,
    stack_with_default: false,
  };

  if (!isDryRun) {
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
  }

  console.log(`✔ Configured settings: ${settingsFile}`);
  console.log(`✔ Executable Command: node ${entryPoint}`);
  console.log('\n🎉 Installation complete! Open your terminal and run:');
  console.log('   agy\n');
} catch (err) {
  console.error('\n✖ Installation failed:', err.message);
  process.exit(1);
}
