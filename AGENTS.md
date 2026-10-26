# Shotimer — Project Memory & Session Context

> **Note for AI Assistant:** This file is automatically loaded at the start of any new Antigravity session in this workspace. Always read this file to understand the current state, technical decisions, and pending roadmap for Shotimer.

---

## 1. Project Overview & Reference
- **Project Name:** Shotimer (Broadcast-Grade Stage Timer & Event Rundown System)
- **Official Domain:** `shotimer.io` (Public Coming Soon & Waitlist) / `app.shotimer.io` (Broadcast App Console)
- **Reference Application:** [Stagetimer.io](https://stagetimer.io/)
- **Core Purpose:** High-precision, remote-controlled countdown timer, confidence monitor, and event rundown tool for live productions, conferences, and broadcasts.
- **Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Zustand, Lucide Icons, Web Audio API, Web Workers.


---

## 2. Key Architecture & Technical Decisions
1. **Unthrottled Timing Engine (`src/workers/timerWorker.ts`):**
   - Bypasses browser tab throttling when minimized using an inline Web Worker that ticks every 50ms via `performance.now()`.
2. **Procedural Web Audio API (`src/audio/soundSynthesizer.ts`):**
   - Zero external `.mp3` or `.wav` downloads. Synthesizes Soft Bell, Marimba, Deep Gong, and 3-2-1 Alert Beeps directly on the sound card using math oscillators.
3. **Hybrid Real-Time Sync Engine (`src/store/useTimerStore.ts` & `src/services/dbService.ts`):**
   - **Local Tab/Window Sync:** Uses `BroadcastChannel('shotimer-sync-bus')` with epoch timestamps (`Date.now()`) for $< 1\text{ms}$ latency across tabs on the same device.
   - **Internet Cloud Broadcast & Handshake (`src/services/dbService.ts`):** Uses Supabase Realtime WebSockets (`room:${roomId}`) with sub-10ms broadcast latency. Employs a bidirectional handshake (`ping_sync` -> `state_update`), outgoing message queuing until channel subscription is confirmed (`status === 'SUBSCRIBED'`), and debounced PostgreSQL snapshot storage in `live_sessions`.
   - **Zero-Friction Mobile QR Connectivity:** [ShareModal.tsx](file:///c:/Users/aero1/Desktop/AI%20PROJECTS/SHOTIMER/src/components/common/ShareModal.tsx) strictly encodes `&room=${roomId}&view=${role}` and features an automatic Local Wi-Fi IP helper (`192.168.0.151:5173`) so phone cameras scanning QR codes in local development connect instantly without looping back to the phone's localhost.
4. **Supabase Cloud Backend (`src/lib/supabase.ts`, `src/services/`):**
   - Pure cloud SaaS architecture using `@supabase/supabase-js`.
   - **Authentication (`authService.ts`):** Supabase GoTrue Auth with Email/Password registration & sign-in, Google OAuth popup sign-in, and password reset.
   - **Database (`dbService.ts`):** PostgreSQL database with Row Level Security (RLS) policies for user profiles (`user_profiles`), saved custom rooms/rundowns (`rooms`), and live sessions (`live_sessions`). Schema saved in `supabase_schema.sql`.
5. **Screen Wake Lock API (`src/hooks/useWakeLock.ts`):**
   - Uses `navigator.wakeLock` to prevent confidence monitors and stage laptops from going to sleep.
6. **Rundown Export / Import (`src/utils/exportImport.ts`):**
   - Supports `.json` full backups and `.csv` Excel / Google Sheets schedule imports.
7. **Pro Paywall Architecture (`src/components/common/ProPaywallModal.tsx`):**
   - Gating mechanism separating Free Tier vs Pro Membership (TBA).
   - Pro features: CSV export/import, True OLED Pitch Black theme (`#000000`), custom themes.
   - Demo license unlock key: `PRO-STAGE-2026`.
8. **Free Tier MVP Parity (Matching Stagetimer.io Free Specifications):**
   - **Multi-Mode Engine:** Native support for `countdown` (target to 0), `countup` (0 to target), and `clock` (real-time wall clock mode).
   - **Auto-Advance (Timer Linking):** Auto-starts timer $N+1$ immediately when timer $N$ finishes, with visual chain connector tags in Controller and Stage Monitor.
   - **Scheduled Start Triggers:** Scheduled wall-clock auto-triggers (`HH:MM`) checked every 1000ms.
   - **3-Room Starter Management:** Supports 3 default rooms (`Main Auditorium`, `Breakout Hall`, `Workshop Studio`) plus authenticated custom room creation.
   - **Free Plan Enforcement:** Capped at 3 timers per room with clean counter badge (`Free Tier: 3/3 Timers`).
9. **Broadcast-Grade Security Architecture:**
   - **Server Confinement (`server.js`):** Strict canonical path confinement preventing directory traversal (`/..%2f`), 16KB payload limits preventing memory DoS, sliding-window IP rate limiting (5 req / 10 min) on `/api/waitlist`, and broadcast HTTP security headers (`nosniff`, `Referrer-Policy`, and scoped `X-Frame-Options` allowing OBS overlay embedding).
   - **Database RLS & Privilege Protection (`supabase_schema.sql`):** PostgreSQL `claim_pro_license` security definer RPC with transaction-local bypass preventing client-side `is_pro` elevation, and hardened `live_sessions` policies preventing unauthenticated deletion of active show telemetry.
   - **Data Sanitization & Injection Defense (`src/utils/exportImport.ts`):** Neutralizes CSV formula injection (CWE-1236) by escaping `=,+,-,@` triggers on export, enforces 200-item rundown caps, validates item schemas, and whitelists broadcast state properties to eliminate prototype pollution.
10. **Multi-Domain Virtual Host & Stealth Studio Protection (`server.js` & `src/components/common/StealthGate.tsx`):**
    - **Public Coming Soon:** Requests to `shotimer.io` or `www.shotimer.io` resolve exclusively to the Coming Soon pre-launch site (`website_coming_soon`), collecting VIP waitlist emails with rate limiting and DoS defense.
    - **Live App Subdomain (`app.shotimer.io`):** Resolves directly to the full broadcast timer application.
    - **Anti-Crawler Blackout:** Dynamically emits `X-Robots-Tag: noindex, nofollow, noarchive` and `Disallow: /` on `app.shotimer.io` to ensure Google and web bots never index the hidden app.
    - **Stealth Passkey Gate (`StealthGate.tsx`):** Unlocks via master production passkey (`SHOTIMER-ALPHA-2026`) or URL token (`?access=...`), persisting in localStorage for the operator's devices. Scanned mobile QR codes automatically carry the access token so mobile phones pair seamlessly without login prompts. Automatically bypassed in localhost and LAN environments.
11. **Google Sheets Live Waitlist Integration (`website_coming_soon/js/waitlist.js`):**
    - Pre-launch email captures connect directly to the user's private Google Sheet via Google Apps Script Web App (`https://script.google.com/macros/s/AKfycbxW1-kCU44D6w40coDYwnVU4ASKuS1nVjYt7GL24rwi6z1EekCofHdTvq06BWvxFTnYDQ/exec`).
    - Zero database, RLS, or hosting dependencies; updates live in the operator's Google Drive in real-time, accompanied by local server JSON backup.


---

## 3. Implemented Views & URL Routing
- **Public Marketing Website (`/`):**
  - Warm neutral design system (Warm Linen `#FAF8F5`, Obsidian Slate `#18181B`, Stage Amber Tally `#F59E0B`, Broadcast Emerald `#10B981`).
  - Interactive live hero mini-demo with multi-mode screen preview (Confidence Monitor, Agenda Rundown, OBS Overlay), procedural Web Audio chime auditions (Soft Bell, Marimba, Gong), full pricing comparison, FAQ accordion, and license activator modal (`PRO-STAGE-2026`).
  - Sub-pages: `/pricing.html`, `/features.html`, `/login.html`.
  - Automatic query forwarding: requests with `?view=` or `?room=` automatically redirect to `/app/?...`.
- **Application Console & Stage Monitors (`/app/`):**
  - **3-Pane Full-Width Edge-to-Edge AV Director Console (`/app/` or `/app/?view=controller`):**
    - **Layout Architecture:** Full 100% viewport width (`w-full px-4 sm:px-6`) with symmetrical equal-width flanks (`xl:grid-cols-[minmax(380px,22%)_1fr_minmax(380px,22%)] 2xl:grid-cols-[minmax(480px,24%)_1fr_minmax(480px,24%)]`).
    - **Left Pane (~22-24% Symmetrical Flank):** Live Confidence Monitor Preview with Stagetimer.io-parity header (`PREVIEW: [ Stage Monitor ▾ ] [ 🖌️ ] [ ↗ ]` + `• ON AIR / STANDBY` chip), Launch Stage Monitor shortcut, Precision Timeline Bar with dynamic minute tick intervals (e.g., `0m`, `5m`, `10m`...) and progress fill, ergonomic transport controls (`|<`, `-1m`, `► START` / `❚❚ PAUSE`, `+1m`, `+5m`, `>|`, `Reset`), **Production Schedule Math & Over/Under Drift Card** with interactive breakdown popover (`🔴 OVER` / `🟢 UNDER` / `⚪ ON TIME` and live Show ETA), and live timezone wall clock status (`Europe/London`).
    - **Customize Output Studio Modal (`src/components/controller/CustomizeOutputModal.tsx`):** Complete Stagetimer.io parity output customizer triggered via the `[ 🖌️ ]` button on the controller preview. Features role switcher tabs (`Stage Monitor`, `Agenda`, `Moderator`, `OBS Overlay`), interactive 16:9 canvas with alignment dot grid (`+ + + +`), responsive aspect ratio chassis (`16:9`, `4:3`, `9:16`, `21:9`), element reordering/toggling (`Timer Digits`, `Progress Bar`, `Time of Day`, `Segment Title`, `Speaker Name`, `Speaker Notes`, `Up Next`, `On Air Indicator`, `Image / Logo`, `Custom Text`), background color, blackout color, and typography font picker (`JetBrains Mono`, `Inter`, `Roboto Mono`, `Outfit`, `Space Grotesk`, `Plus Jakarta Sans`, `Cinzel`). Real-time synced to connected monitors and stored per room.
    - **Middle Pane (~52-56%, 1fr Expansive):** **Resolution-Aware Adaptive Rundown Rows** (automatically renders in spacious **Two-Tier Comfort Mode** on 1080p to guarantee zero title/speaker truncation, and sleek **Single-Line Broadcast Mode** on 1440p+ displays, with `[Auto] [1-Row] [2-Tier]` header override switcher), row play/pause buttons, inline title/speaker edits, compact speaker cue pill, mode dropdowns (`countdown`, `countup`, `clock`), scheduled start time inputs (`HH:MM`) with dynamic **Projected Start Badges** (`Now`, `Est 20:23`), auto-advance link toggles (`↳ Linked`), duration inputs, **Dedicated Timer Settings Modal** (`Sliders` trigger on each row for granular Yellow/Red alert thresholds, "Finish At" wall-clock calculator, chime auditions, and speaker cues), Free Plan 3-timer limit counter, and bottom **Show Timing Summary Bar** (Total Show, Remaining Time, Projected Finish).
    - **Right Pane (~22-24% Symmetrical Flank):** Equal width to the Left Pane. Quick preset alert triggers (`5 MIN LEFT`, `2 MIN - WRAP UP`, etc.), custom speaker note textarea, severity pills (`info`, `warning`, `danger`), strobe flash toggle, and Direct Role Links card launching secondary views (`Stage Monitor`, `Agenda`, `Moderator`, `OBS Overlay`) in new browser tabs with active room sync (`&room=${roomId}`).
    - **Top View Switcher Dock:** Controller tab remains active in current tab; secondary tabs (`Stage Monitor ↗`, `Agenda ↗`, `Moderator ↗`, `OBS Overlay ↗`) launch in new tabs with active room sync so the Controller console is never interrupted.
  - **Stage Monitor (`/app/?view=viewer`):** Giant edge-to-edge tabular numbers (up to `24vw`), segment title, speaker name, dynamic progress bar (green $\to$ amber at 2m $\to$ red at 30s $\to$ overtime pulse), flash message banner, auto-advance badge, scheduled start timestamp, time of day, and "Up Next" preview.
  - **Agenda View (`/app/?view=agenda`):** Public/crew event timeline with real-time countdown, timer mode badges, scheduled timestamps, live Schedule Drift badge, and projected start times.
  - **Moderator View (`/app/?view=moderator`):** Lightweight stage cueing and notes portal with live remaining/elapsed time and linked timer cues.
  - **OBS Broadcast Lower-Third (`/app/?view=overlay`):** Transparent background overlay for OBS Studio and vMix.
- **Coming Soon Landing Page (`website_coming_soon/`):**
  - Standalone pre-launch waitlist page with clean email capture, visual interface mockup, 6-pillar feature showcase, and pre-launch FAQ.
  - Strict compliance with user preferences: zero countdown timer, zero promotional discount claims.

---

## 4. Master Plan Artifacts
- Master Free Tier MVP Plan: `shotimer_free_mvp_plan.md` in the conversation artifact directory.
- Master Security Hardening Plan: `shotimer_security_hardening_plan.md` in the conversation artifact directory.

---

## 5. Upcoming Feature Roadmap
1. **Google OAuth Client Credentials in Supabase (User Reminder):** Enter Google Cloud Web Client ID & Client Secret in Supabase Auth Providers (`https://yodcnmzgmjcjgxizcowm.supabase.co/auth/v1/callback`) to enable one-click Google Sign-In alongside active Email/Password auth.
2. **Audience Q&A Submission Portal (`/?view=ask`):** Mobile audience question form routing into the Moderator approval queue.
3. **Stream Deck & Bitfocus Companion Local REST API:** Local HTTP endpoints in `server.js` for physical button control.
4. **Custom Sponsor / Client Logo Upload:** Render custom logos on confidence monitors.
