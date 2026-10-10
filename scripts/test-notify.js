#!/usr/bin/env node
/**
 * Zero-dependency test script to trigger a sample completion notification.
 * Usage:
 *   node scripts/test-notify.js
 */

import { triggerDesktopNotification } from '../src/notifier.js';
import { CONFIG } from '../src/config.js';

console.log('\n========================================');
console.log(' 🔔 Testing agy-statusline Notification');
console.log('========================================\n');

const title = CONFIG.notifications?.title || 'Antigravity (AGY)';
const message = 'ทดสอบระบบแจ้งเตือน: AI ทำงานเสร็จเรียบร้อยแล้ว! 🎉';
const sound = CONFIG.notifications?.sound !== false;

const success = triggerDesktopNotification(title, message, sound);

if (success) {
  console.log(`✔ Sent test notification!`);
  console.log(`  Title:   ${title}`);
  console.log(`  Message: ${message}`);
  console.log(`  Sound:   ${sound ? 'ON 🔊' : 'OFF 🔇'}`);
  console.log('\n👉 กรุณาตรวจเช็คที่มุมขวาล่างของหน้าจอ Windows (Action Center / Notification Center)\n');
} else {
  console.error('❌ Could not trigger desktop notification on this platform.');
  process.exit(1);
}
