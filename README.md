# ⚡ agy-statusline

> **แถบแสดงสถานะ (Custom Statusline) สไตล์ White Minimal สำหรับ Google Antigravity CLI (AGY)**  
> สวยงาม มินิมอล สีขาวคมชัด เบาเครื่อง และไม่มี Dependency ภายนอกแม้แต่ตัวเดียว (Zero Dependencies)

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-131%2F131%20Passed-success.svg)](tests/run-tests.js)
[![Theme](https://img.shields.io/badge/Theme-White%20Minimal-white.svg)](src/config.js)

---

## 📸 ภาพตัวอย่างหน้าตา (Preview)

### 🎨 สไตล์หลัก: White Minimal (ค่าเริ่มต้น)
ดีไซน์สีขาวสะอาดตา คมชัดระดับ Truecolor Pure White เน้นเฉพาะข้อมูลสำคัญ (ไม่แสดงชื่อโมเดลและสถานะซ้ำซ้อน เพราะแถบด้านบนของ AGY มีบอกอยู่แล้ว):

```text
▆▆▆▆▆▆▆▆▆▆ 1.41% | 14.8k/1.05M · 1.03M left | Quota | ▆▆▆▆▆▆▆▆▆▆ 85% left | resets in 2h
```

```
[ หลอด Context ] % | [ Tokens ที่ใช้ / ขีดจำกัด · เหลือ ] | [ โควต้า ] | [ หลอด Quota ] % | [ เวลารีเซ็ต ]
```

---

## 🇹🇭 คำอธิบายและคู่มือภาษาไทย

### ❓ agy-statusline คืออะไร?
เมื่อใช้งาน **Google Antigravity CLI (`agy`)** ปกติหน้าจอเทอร์มินัลด้านบนจะบอกชื่อโมเดลและสถานะอยู่แล้ว แต่จะไม่แสดงสถิติการใช้งาน Token และโควต้า  
**`agy-statusline`** จึงเข้ามาเติมเต็มเฉพาะข้อมูลสำคัญที่คุณต้องรู้ขณะทำงาน:
1. **หลอด Context Window:** แสดงแถบระดับความจำที่ใช้ไป พร้อมคำนวณ Token ที่ใช้แล้ว และจำนวนที่เหลืออยู่อย่างละเอียด (เช่น `1.03M left`)
2. **โควต้าที่เหลือ (Quota):** แสดงเปอร์เซ็นต์โควต้าที่เหลือ พร้อมหลอดสี และเวลานับถอยหลังก่อนรีเซ็ต (เช่น `resets in 2h`) ซ่อนอัตโนมัติถ้าโมเดลนั้นไม่มีโควต้าจำกัด

---

### 🚀 วิธีติดตั้ง (ง่ายที่สุดใน 1 นาที)

#### ขั้นตอนที่ 1: ดาวน์โหลดโปรเจกต์
เปิด Terminal (PowerShell หรือ Command Prompt) แล้วรันคำสั่ง:
```bash
git clone https://github.com/porchyy/agy-statusline.git
cd agy-statusline
```

#### ขั้นตอนที่ 2: รันคำสั่งติดตั้งอัตโนมัติ
รันคำสั่งเพียงคำสั่งเดียว:
```powershell
npm run setup
```
*(หรือจะรันผ่าน Node โดยตรง: `node scripts/install.js`)*

> ✨ **ตัวติดตั้งจะทำงานให้อัตโนมัติทุกอย่าง:**
> - ค้นหาไฟล์ตั้งค่า `settings.json` ของ AGY ในเครื่องของคุณ
> - สร้างไฟล์สำรอง `settings.json.backup` ไว้ให้เสมอเพื่อความปลอดภัย
> - ผูกคำสั่งเปิดใช้งาน statusline ให้ทันทีโดยไม่ต้องก็อปปี้โค้ดเอง

#### ขั้นตอนที่ 3: เปิดใช้งาน
เปิดเทอร์มินัลใหม่ แล้วพิมพ์:
```powershell
agy
```
คุณจะเห็นแถบสถานะสีขาวสะอาดตาสวยงามขึ้นมาที่ด้านล่างทันที! 🎉

---

### ⚙️ การตั้งค่าและเปลี่ยนธีม (Customization)

คุณสามารถปรับแต่งหน้าตาได้ง่ายๆ ที่ไฟล์ [`src/config.js`](src/config.js):

```javascript
export const CONFIG = {
  // สลับธีมได้ระหว่าง:
  // 'white'      -> ธีม White Minimal สีขาวคมชัดโมเดิร์น (ค่าเริ่มต้น)
  // 'andrewii23' -> ธีม Coral Minimal โทนส้มคอรัลสไตล์ Andrewii23
  // 'classic'    -> ธีม Classic Bracketed แบบดั้งเดิม [Model] | [Context]
  theme: 'white',

  // เปิด/ปิด การแสดงชื่อโมเดล และสถานะทำงาน (ค่าเริ่มต้น: false ไม่แสดงซ้ำซ้อน)
  showModel: false,
  showState: false,

  // แยกการแสดงผลเป็น 2 บรรทัด (true / false)
  // บรรทัดที่ 1: ข้อมูลโมเดลและ Context
  // บรรทัดที่ 2: ข้อมูล Quota
  multiline: false,

  // ความยาวของหลอดสถานะ (จำนวนบล็อก)
  contextBarLength: 10,
  quotaBarLength: 10,
};
```

---

### 🔔 ระบบแจ้งเตือนเมื่อ AI ทำงานเสร็จ (Completion Notification)
แจ้งเตือนผ่าน Desktop Toast และเสียงแจ้งเตือนอัตโนมัติเมื่อ AI ประมวลผลเสร็จสิ้น (เปลี่ยนสถานะจากกำลังคิด/ทำงานเป็นพร้อมรับคำสั่งถัดไป):

- **ทดสอบแจ้งเตือนทันที:**
  ```powershell
  npm run notify:test
  ```
- **เปิดใช้งานการแจ้งเตือน:**
  ```powershell
  npm run notify:on
  ```
- **ปิดการแจ้งเตือน:**
  ```powershell
  npm run notify:off
  ```
- **สลับเปิด/ปิด:**
  ```powershell
  npm run notify:toggle
  ```
*(หรือปรับที่ `notifications: { enabled: true/false }` ใน `src/config.js` หรือส่ง flag `--no-notify`)*

---

### 🗑️ วิธียกเลิกการติดตั้ง (คืนค่าเดิม)
หากต้องการยกเลิกและคืนค่าเดิมของ AGY สามารถรัน:
```powershell
npm run uninstall
```
*(หรือ `node scripts/uninstall.js`)* ระบบจะนำไฟล์สำรอง (`settings.json.backup`) กลับมาวางคืนที่เดิม 100% ทันทีโดยไม่ต้องแก้ไฟล์เอง

---

<br/>

## 🌐 English Documentation

### 💡 Overview
**`agy-statusline`** is a high-reliability, zero-dependency custom statusline plugin tailored for **Google Antigravity CLI (AGY) v1.3.2+** across Windows, macOS, and Linux.

It provides real-time visibility into AI context window consumption and token quotas without bloating your terminal or installing hefty `node_modules`.

### 🌟 Key Features
- **Zero External Dependencies**: Built entirely with Node.js standard libraries (`fs`, `child_process`). Instant execution, zero bundle overhead.
- **Crash-Resilient (Fail-Safe)**: Always exits with status code `0`. Safely handles missing, null, or malformed JSON payloads, preventing AGY from auto-disabling the statusline.
- **Prompt-Safe Single-Line Rendering**: Enforces strict single-line output sanitization to eliminate prompt flicker or unwanted line wraps.
- **Safe Backup & Restore**: Mandatory automatic backup before installation, with 100% exact file restoration upon uninstallation.
- **Granular Token Metrics**: Pre-calculates exact tokens and remaining window capacity (e.g. `1.03M left` instead of rounded approximations).
- **Privacy First**: Zero telemetry, zero external network requests, zero raw data written to disk.

---

### 📦 Installation Guide

#### 1. Automated Setup (Recommended)
Clone the repository and run the setup script:
```bash
git clone https://github.com/porchyy/agy-statusline.git
cd agy-statusline
npm run setup
```

The script automatically detects your AGY configuration file (`~/.gemini/antigravity-cli/settings.json`), backs it up to `settings.json.backup`, and registers the statusline command.

#### 2. Manual Configuration (Optional)
If you prefer manual setup, add the following block to your `~/.gemini/antigravity-cli/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "node <absolute-path-to-agy-statusline>/bin/agy-statusline.js",
    "padding": 0,
    "enabled": true,
    "stack_with_default": false
  }
}
```

---

### 🧪 Testing & Verification

Run the built-in test suite (109 automated unit and integration tests):
```bash
npm test
```

Test manually via piped payload:
```powershell
Get-Content tests/fixtures/full-payload.json | node src/index.js
```

---

### 🛠️ Troubleshooting & FAQ

| Problem / ปัญหา | สาเหตุ (Cause) | วิธีแก้ไข (Fix) |
| :--- | :--- | :--- |
| **Statusline ไม่แสดง** | เครื่องยังไม่ได้ลง Node.js หรือไม่ได้อยู่ใน PATH | ตรวจสอบว่าคำสั่ง `node -v` ใช้งานได้ใน Terminal |
| **ขึ้น error `Cannot find module`** | มีเครื่องหมายคำพูดซ้อนใน `command` | รัน `npm run setup` อีกครั้ง ตัวติดตั้งเวอร์ชันใหม่จะแก้ path ให้ถูกต้องอัตโนมัติ |
| **ตัวหนังสือขึ้นบรรทัดใหม่เลอะเทอะ** | หน้าต่าง Terminal แคบเกินไป | ปรับขนาดหน้าต่าง Terminal ให้กว้างอย่างน้อย 80 คอลัมน์ หรือตั้งค่า `multiline: true` ใน `config.js` |
| **ไม่เห็นช่อง Quota** | โมเดลที่ใช้งานอยู่เป็น unmetered / ไม่มีโควต้าจำกัด | เป็นพฤติกรรมปกติ ระบบจะซ่อนส่วนที่ไม่จำเป็นอัตโนมัติ |

---

## 📄 License
MIT © 2026 porchyy
