# Shotimer — Project Memory & Session Context

> **Note for AI Assistant:** This file is automatically loaded at the start of any new Antigravity session in this workspace. Always read this file to understand the current state, technical decisions, and pending roadmap for Shotimer.

---

## 1. Project Overview & Reference
- **Project Name:** Shotimer (Broadcast-Grade Stage Timer & Event Rundown System)
- **Reference Application:** [Stagetimer.io](https://stagetimer.io/)
- **Core Purpose:** High-precision, remote-controlled countdown timer, confidence monitor, and event rundown tool for live productions, conferences, and broadcasts.
- **Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Zustand, Lucide Icons, Web Audio API, Web Workers.

---

## 2. Key Architecture & Technical Decisions
1. **Unthrottled Timing Engine (`src/workers/timerWorker.ts`):**
   - Bypasses browser tab throttling when minimized using an inline Web Worker that ticks every 50ms via `performance.now()`.
2. **Procedural Web Audio API (`src/audio/soundSynthesizer.ts`):**
   - Zero external `.mp3` or `.wav` downloads. Synthesizes Soft Bell, Marimba, Deep Gong, and 3-2-1 Alert Beeps directly on the sound card using math oscillators.
3. **Cross-Window Real-Time Sync (`src/store/useTimerStore.ts`):**
   - Uses `BroadcastChannel('shotimer-sync-bus')` with epoch timestamps (`Date.now()`). When Controller triggers Play/Pause or Time Adjust, the Stage Monitor syncs with $< 1\text{ms}$ latency.
4. **Offline Venue LAN Server (`server.js`):**
   - Standalone Node.js server (`npm run serve`) that binds to `0.0.0.0:3000` for venue Wi-Fi control without internet. Displays local IP for mobile pairing.
5. **Screen Wake Lock API (`src/hooks/useWakeLock.ts`):**
   - Uses `navigator.wakeLock` to prevent confidence monitors and stage laptops from going to sleep.
6. **Rundown Export / Import (`src/utils/exportImport.ts`):**
   - Supports `.json` full backups and `.csv` Excel / Google Sheets schedule imports.
7. **Pro Paywall Architecture (`src/components/common/ProPaywallModal.tsx`):**
   - Gating mechanism separating Free Tier vs Pro Membership ($14.99/mo).
   - Pro features: CSV export/import, True OLED Pitch Black theme (`#000000`), custom themes.
   - Demo license unlock key: `PRO-STAGE-2026`.
8. **Free Tier MVP Parity (Matching Stagetimer.io Free Specifications):**
   - **Multi-Mode Engine:** Native support for `countdown` (target to 0), `countup` (0 to target), and `clock` (real-time wall clock mode).
   - **Auto-Advance (Timer Linking):** Auto-starts timer $N+1$ immediately when timer $N$ finishes, with visual chain connector tags in Controller and Stage Monitor.
   - **Scheduled Start Triggers:** Scheduled wall-clock auto-triggers (`HH:MM`) checked every 1000ms.
   - **3-Room Management:** Supports 3 independent rooms (`Main Auditorium`, `Breakout Hall`, `Workshop Studio`) with separate rundowns stored in `localStorage` and BroadcastChannel room filtering.
   - **Free Plan Enforcement:** Capped at 3 timers per room with clean counter badge (`Free Tier: 3/3 Timers`).

---

## 3. Implemented Views & URL Routing
- **Controller Dashboard (`/` or `/?view=controller`):** AV director console with active timer card, time adjusters (`+1m`, `+5m`, `-1m`), rundown playlist table with row play buttons, mode dropdowns, scheduled time inputs, auto-advance link toggles, stage flash message dock, audio test, blackout toggle, share modal with QR codes, and settings modal.
- **Stage Monitor (`/?view=viewer`):** Giant edge-to-edge tabular numbers (up to `24vw`), segment title, speaker name, dynamic progress bar (green $\to$ amber at 2m $\to$ red at 30s $\to$ overtime pulse), flash message banner, auto-advance badge, scheduled start timestamp, time of day, and "Up Next" preview.
- **Agenda View (`/?view=agenda`):** Public/crew event timeline with real-time countdown, timer mode badges, and scheduled timestamps.
- **Moderator View (`/?view=moderator`):** Lightweight stage cueing and notes portal with live remaining/elapsed time and linked timer cues.
- **OBS Broadcast Lower-Third (`/?view=overlay`):** Transparent background overlay for OBS Studio and vMix.
- **Isolated Public Marketing Website (`website/` or `http://localhost:3000/website/`):**
  - Standalone decoupled folder containing `index.html`, `pricing.html`, `features.html`, `login.html`, `css/website.css`, and `js/interactive-demo.js`.
  - Anti-AI warm neutral design system (Warm Linen `#FAF8F5`, Obsidian Slate `#18181B`, Stage Amber Tally `#F59E0B`, Broadcast Emerald `#10B981`).
  - Interactive live hero mini-demo with multi-mode screen preview (Confidence Monitor, Agenda Rundown, OBS Overlay), procedural Web Audio chime auditions (Soft Bell, Marimba, Gong), full pricing comparison, FAQ accordion, and license activator modal (`PRO-STAGE-2026`).
- **Coming Soon Landing Page (`website_coming_soon/` or `http://localhost:3000/website_coming_soon/`):**
  - Standalone pre-launch waitlist page with clean email capture, visual interface mockup, 6-pillar feature showcase, and pre-launch FAQ.
  - Strict compliance with user preferences: zero countdown timer, zero promotional discount claims.

---

## 4. Master Plan Artifacts
- Master Free Tier MVP Plan: `shotimer_free_mvp_plan.md` in the conversation artifact directory.

---

## 5. Upcoming Feature Roadmap
1. **Audience Q&A Submission Portal (`/?view=ask`):** Mobile audience question form routing into the Moderator approval queue.
2. **Stream Deck & Bitfocus Companion Local REST API:** Local HTTP endpoints in `server.js` for physical button control.
3. **Custom Sponsor / Client Logo Upload:** Render custom logos on confidence monitors.
