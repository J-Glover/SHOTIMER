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

---

### Session Date: October 21, 2026
**Conversation ID:** `ae75061a-8de8-4420-b9a3-0f69417ef4eb`  
**Model:** Gemini 3.8 Flash (High)  
**Task:** Website Rework & Cloud-First Architecture (Phase 1 Completed)

1. **Architecture Pivot:**
   - Removed air-gapped / offline LAN server requirement to focus exclusively on an internet-based, cloud-synchronized SaaS platform using Firebase.
2. **Website Front Door (`/`):**
   - Configured Vite and `server.js` multi-page routing so that `/` serves the reworked front-facing marketing website.
   - The React stage timer console and views (`viewer`, `agenda`, `moderator`, `overlay`) live cleanly under `/app/` (`app/index.html`).
   - Added instant client-side query redirect (`?view=` or `?room=`) on `/index.html` to automatically forward shared links to `/app/?...`.
   - Updated all navigation and CTA buttons (`Launch Console`, `Try Free`, auth forms) across `index.html`, `pricing.html`, `features.html`, and `login.html` to route to `/app/`.
   - Added `← Shotimer Home` navigation link in the Controller top header dock.
   - Verified both `/` and `/app/` compile cleanly (`npm run build`, `npm run lint`) and return HTTP 200 on the live Vite server.
3. **Phase 2 Completed (Website Reworked to Cloud-First Messaging):**
   - Scrubbed all "air-gapped venue Wi-Fi", "offline LAN server", and "zero internet needed" claims across `index.html`, `pricing.html`, `features.html`, and `login.html`.
   - Replaced Feature 4 with **"Real-Time Cloud Sync: Instant Multi-Screen Control"**, demonstrating global cloud stream pipelines and sub-100ms multi-device updates.
   - Updated house-of-worship and broadcast persona cards to highlight instant link sharing and real-time multi-screen sync.
   - Updated `pricing.html` comparison table and Pro tier cards to feature **"Cloud Account Sync & Multi-Room Management"**.
   - Replaced FAQ item with an explanation of real-time cloud multi-device sync pipelines.
   - Build validated (`npm run build` in 473ms, 0 errors, 0 warnings on page files).

4. **Phase 3 Completed (Firebase SDK & Cloud Data Layer):**
   - Installed `firebase` (^13.1.0) SDK.
   - Configured project `shotimer-af089` credentials in `.env.local` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`).
   - Built `src/lib/firebase.ts` with safe environment detection and conditional Firebase Analytics initialization (`isSupported()`).
   - Implemented `src/services/authService.ts`:
     - Email & password registration with profile names.
     - Email & password authentication.
     - Google OAuth popup sign-in.
     - Password reset triggers.
     - Real-time `onAuthStateChanged` session listener.
   - Implemented `src/services/dbService.ts`:
     - User cloud profiles under `users/{uid}`.
     - Per-user custom rooms and rundowns under `users/{uid}/rooms/{roomId}`.
     - Live stage broadcast sessions under `live_sessions/{roomId}`.
     - Real-time Firestore `onSnapshot` subscription for cross-device telemetry.
     - 120ms debounced Firestore write buffering to protect Spark tier limits.

5. **Phase 4 Completed (Accounts UI & Cloud Synchronization):**
   - Built `src/components/auth/AuthModal.tsx`:
     - Clean dark-mode dialog with tabs for Sign In, Sign Up, and Forgot Password.
     - Google OAuth one-click sign in.
     - Immediate feedback toasts and error handling.
   - Built `src/components/account/AccountSettingsModal.tsx`:
     - Profile tab displaying subscription plan (`Free Starter` vs `Shotimer Pro`), license key status, and sign-out.
     - Rooms tab allowing creation of named custom rooms, switching active stage, and room deletion.
     - Chimes & Display tab with interactive procedural audio preview (Soft Bell, Marimba, Gong), volume slider, and true OLED black toggles.
   - Integrated into `src/views/ControllerView.tsx`:
     - Header account dock displaying active user avatar/email and quick Cloud Sign In trigger.
     - Query parameter listener (`?auth=login` or `?auth=signup`) automatically opens the authentication modal from external marketing links or redirects.
   - Browser subagent verified live on `http://localhost:5173/` and `http://localhost:5173/app/?auth=login`.

6. **Migration to Supabase (User Directed):**
   - Completely uninstalled `firebase` SDK and purged all Firebase dependencies.
   - Installed `@supabase/supabase-js`. Production bundle dropped from 947 kB down to 368 kB (>60% reduction).
   - Replaced `firebase.ts` with `src/lib/supabase.ts`.
   - Reimplemented `src/services/authService.ts` with Supabase Auth (Email/Pass signup, login, Google OAuth, password reset, session listeners).
   - Reimplemented `src/services/dbService.ts` with Supabase Realtime WebSocket Broadcast channels (`room:${roomId}`) and debounced PostgreSQL persistence.
   - Created PostgreSQL schema with RLS policies in `supabase_schema.sql`.
   - Updated `.env.local` and `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - Verified clean build (`npm run build` in 792ms, 0 errors) and 0 lint errors.
   - **Google OAuth Deferred:** User deferred Google OAuth Client ID & Secret configuration in Supabase to a future session; Email/Password is currently the primary live authentication method. Recorded in `AGENTS.md` roadmap.

---

### Session Date: October 21, 2026 (Evening)
**Conversation ID:** `03e4cc71-a033-46bf-a884-7697d1f6cb5d`  
**Model:** Gemini 3.8 Flash (High)  
**Task:** Stagetimer.io In-Depth Competitor Analysis & Bit 1 Implementation

1. **Live Browser Exploration of Stagetimer.io:**
   - Launched a free room on `https://stagetimer.io/` via browser subagent.
   - Captured screenshots and analyzed:
     - The 3-pane director console (Left: Dashboard with mini monitor & transport; Middle: Timers rundown playlist; Right: Stage messages).
     - The granular timer settings modal (custom Yellow/Red wrap-up alert times, flash counters, chime options).
     - The Outputs hub (live previews, mirror flip for teleprompters, broadcast SDI delay slider, QR codes).
     - Real-time telemetry (WebSocket ping latency, connected client counter).

2. **Actioned "Bit 1" (Live Monitor Preview & Precision Timeline Bar):**
   - Created `src/components/controller/LiveMonitorPreview.tsx`:
     - **16:9 Confidence Monitor Screen:** High-contrast stage replica with live tabular digits, stage amber tally, active segment and speaker metadata, dynamic color thresholds (green → amber → red → overtime pulse), flash message banner overlay, and true stage blackout simulation.
     - **Precision Minute Tick Timeline Bar:** Dynamic minute interval markers (`0m`, `5m`, `10m`...), filled progress bar, `ON AIR` pulsing badge, and broadcast status.
     - **Integrated Director Transport Controls:** Previous timer, `-1m`, primary large `START` / `PAUSE` button, `+1m`, `+5m`, next timer, and reset.
     - **Live Local Timezone Wall Clock:** Displays local timezone and ticking director clock.
   - Re-architected `src/views/ControllerView.tsx` into a 3-pane layout (`xl:grid-cols-12`):
     - Column 1: Live Monitor Preview & Transport Dashboard (`xl:col-span-4`)
     - Column 2: Event Rundown Playlist (`xl:col-span-5`)
     - Column 3: Stage Flash Messages & Cues (`xl:col-span-3`)
   - Tested and visually verified via Playwright subagent on `http://localhost:3000/app/?view=controller`. Both static state and live running playback verified.

3. **Next Steps (Scheduled for Tomorrow):**
   - **Bit 2:** Production Schedule Math (Over/Under drift vs scheduled times & End-of-Show calculations).
   - **Bit 3:** Dedicated Timer Wrap-Up & Alert Thresholds modal.
   - **Bit 4:** Outputs Suite with Teleprompter Mirroring (`scaleX(-1)`) and SDI Delay.
