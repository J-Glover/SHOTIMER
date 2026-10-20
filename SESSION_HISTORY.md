# Shotimer — Session History & Changelog

### Session Date: October 18–19, 2026
**Conversation ID:** `994fb1c4-6a6f-4a64-9419-bbe9f9e2173a`  
**Model:** Gemini 3.8 Flash (High)  
**Project Workspace:** `C:\Users\aero1\Desktop\AI PROJECTS\SHOTIMER`

---

## What Was Discussed & Built

### 1. Project Inception & Master Plan
- **Goal:** Create a broadcast-grade recreation of [Stagetimer.io](https://stagetimer.io/) named **Shotimer**.
- Created master architectural plan: `stagetimer_recreation_plan.md`.

### 2. Design Realignment to Authentic Stagetimer.io
- Shifted away from generic AI placeholder demo cards to the real, functional, dark-themed Stagetimer interface (`#1C1C1C`, `#141414`, and `#000000`).

### 3. Core Engine Implementation
- **Drift-Free Timing:** Unthrottled Web Worker (`src/workers/timerWorker.ts`) ticking via `performance.now()` to bypass browser tab sleep throttling.
- **Procedural Web Audio API:** Pure mathematical synthesis of Soft Bell, Marimba, Deep Gong, and 3-2-1 Alert Beeps with zero external audio asset downloads.
- **Universal Epoch Synchronization:** Multi-window communication using `BroadcastChannel` and `Date.now()` timestamps for $< 1\text{ms}$ latency.

### 4. Role Views Built
- **Director Controller:** Active timer card, time adjusters (`+1m`, `+5m`, `-1m`), rundown playlist table with row play buttons, stage flash message dock, audio test, blackout toggle, share modal with QR codes, and settings modal.
- **Stage Confidence Monitor:** Giant edge-to-edge tabular numbers (up to `24vw`), segment title, speaker name, dynamic progress bar, flash message banner, time of day, and "Up Next" preview.
- **Agenda View:** Public/crew event timeline with real-time countdown.
- **Moderator View:** Lightweight stage cueing and notes portal.
- **OBS Broadcast Lower-Third:** Transparent background overlay for OBS Studio and vMix.

### 5. Advanced Features & Pro Paywall Gate
- **Screen Wake Lock:** Prevents stage confidence monitors from dimming or going to sleep.
- **Spreadsheet Sync:** JSON and CSV rundown export and import.
- **Pro Licensing Engine:** Gating mechanism for CSV sync, True OLED Black theme, and custom settings. Demo unlock key: `PRO-STAGE-2026`.
- **Offline LAN Server:** Standalone `server.js` (`npm run serve`) for venue Wi-Fi broadcast without internet.

---

## How to Resume Next Time
1. **In Antigravity IDE UI:** Click the **History** icon (clock/calendar icon at top of the chat panel) and select this conversation thread to restore the entire conversation.
2. **In New Chat Sessions:** The newly created [AGENTS.md](file:///c:/Users/aero1/Desktop/AI%20PROJECTS/SHOTIMER/AGENTS.md) file is automatically read by the AI assistant at the start of any new session.
