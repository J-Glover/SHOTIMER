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

3. **Bit 2 Completed (Production Schedule Math & Over/Under Drift Tracking):**
   - Created `src/utils/scheduleMath.ts`:
     - Calculates live event drift (`driftSeconds`) comparing cumulative running runtime vs planned durations.
     - Classifies status as `over` (🔴 behind schedule), `under` (🟢 ahead of schedule), or `on_time` (⚪).
     - Calculates Projected End Time (`formattedProjectedEnd` ETA) and Planned End Time (`formattedPlannedEnd`).
     - Computes row-by-row projected start times with delay indicators (`isDelayed`, `delaySeconds`).
   - Created `src/components/controller/ScheduleDriftBadge.tsx`:
     - Compact pill for top header dock.
     - Full card in dashboard with expandable "Show Timing Math" popover breakdown.
   - Updated `ControllerView.tsx` and `LiveMonitorPreview.tsx`:
     - Live Over/Under badge in top header and left preview dashboard.
     - Rundown table rows display dynamic projected start badges (`Now`, `Est 20:23`, delayed indicator).
     - Bottom Show Timing Summary Bar displaying Total Show, Remaining Time, and Projected Finish.
   - Updated `AgendaView.tsx`:
     - Displays live Over/Under badge and per-item estimated start times for public/crew viewers.
   - Verified via Playwright browser subagent on `http://localhost:5173/app/?view=controller` (clean build, 0 errors, interactive popover and `+5m` drift adjustment verified).

4. **Bit 3 Completed (Dedicated Timer Wrap-Up & Alert Thresholds Modal):**
   - Created `src/components/controller/TimerSettingsModal.tsx`:
     - **Timing & Mode Tab:** Segment title, speaker name, mode selection (Countdown, Count-up, Wall Clock), duration inputs with quick presets (`5m`, `10m`, `15m`, `20m`, `30m`, `45m`), "Finish At" specific wall-clock calculator, scheduled start time (`HH:MM`), and auto-advance chaining toggle.
     - **Alert Thresholds Tab:** Yellow warning alert slider/presets (`Off`, `1m`, `2m`, `3m`, `5m`), Red critical danger alert presets (`Off`, `15s`, `30s`, `1m`, `2m`), and overtime pulse/blink toggle.
     - **Chimes & Sounds Tab:** Segment sound style (Soft Bell, Marimba, Deep Gong, Alert Beep), sound triggers for Yellow, Red, and Finish, volume slider, and interactive "Audition Chime" Web Audio testing.
     - **Speaker Cues Tab:** Rich prompt/notes textarea transmitted live to Stage Confidence Monitor and Moderator view.
     - **Row & Modal Actions:** Duplicate Timer (with Free Tier limit enforcement), Delete Timer, and Save & Apply.
   - Enhanced `src/store/useTimerStore.ts` with `duplicateTimer(id)`.
   - Updated `ControllerView.tsx` with Sliders edit trigger on every rundown row, speaker cues indicator, and modal integration.
   - Updated `ViewerView.tsx` and `ModeratorView.tsx` to display live speaker cue notes.
   - Verified via Playwright browser subagent on `http://localhost:5173/app/?view=controller` (0 errors, 4 tabs tested, audition chime tested, notes applied).

5. **UI Polish: Two-Tier Rundown Cue Card Layout:**
   - Redesigned rundown table rows from a cramped 1-line layout (which squashed titles into `Openin...`) into a spacious, broadcast-grade **Two-Tier Cue Card**:
     - **Top Tier:** Play/pause button, `#1` order badge, full-width title & speaker (zero truncation), full notes preview, duration input, and quick actions (`🎚️`, `↑`, `↓`, `🗑️`).
     - **Bottom Tier:** Timer mode dropdown, scheduled start time input, projected start time badge, auto-advance link toggle, and live warning/chime indicators.
   - Tested and verified in browser: all segment titles and notes are now completely legible with plenty of breathing room.

6. **Full-Width Edge-to-Edge Console & Sleek Single-Line Rundown Rows:**
   - **Full-Width Viewport:** Removed the `max-w-[1700px]` constraint from `ControllerView.tsx` so the console stretches 100% edge-to-edge across the screen (`w-full px-4 sm:px-6`).
   - **Asymmetric 3-Column Layout:** Implemented `xl:grid-cols-[360px_1fr_290px] 2xl:grid-cols-[400px_1fr_310px]`:
     - **Left Column (~20–22% / 360–400px):** 16:9 Stage Monitor Preview, Timeline Bar, Transport Controls, and Schedule Math Card.
     - **Center Column (~60–68% / `1fr`):** Event Rundown Playlist expanding to over **1,200px** on 1080p and **1,800px+** on 2560px.
     - **Right Column (~16–18% / 290–310px):** Stage message presets, custom note textarea, and quick role links.
   - **Reverted Rundown to Sleek Single-Line Rows:**
     - Every segment sits on a single, continuous horizontal row:
       `[ ▶ ] [#1] [ Segment Title ] [ Speaker ] [ 📄 Cue ] [ ⏳ Countdown ▾ ] [ 🕒 --:-- (▶ Active) ] [ ↳ Auto ] [ 05:00 ] [ ⚙ ] [ ▲ ] [ ▼ ] [ 🗑 ]`
     - Segment Title flexes with wide horizontal space (zero squashing).
     - Speaker notes rendered as a compact amber `📄 Cue` icon badge with full tooltip and quick modal click.
     - Settings Sliders button includes an emerald dot indicator when custom alert thresholds or sounds are configured.
   - Verified via browser subagent across 2560x1305 and 1920x1080 viewports (clean build, 0 errors).

7. **Resolution-Aware Adaptive Rundown Layout (1080p vs 1440p):**
   - **Automatic Detection:** Integrated window resize listener detecting screens `< 2100px` (1080p Full HD laptops/booths) vs `≥ 2100px` (1440p 2K/4K stage desks).
   - **1080p Full HD:** Automatically renders in **Two-Tier Comfort Mode**, giving the title ("Workshop Intro & Setup") and speaker ("Lead Instructor") 100% full width with zero cut-off.
   - **1440p / 4K:** Automatically renders in **Single-Line Broadcast Mode**, placing all 12 controls on one sleek horizontal row.
   - **Director Override Pill:** Added an interactive `[Auto] [1-Row] [2-Tier]` switcher in the Event Rundown header for 1-click user override.
   - Verified via Playwright browser subagent on both 1904x985 (1080p) and 2560x1305 (1440p).

8. **Role Links Multi-Window Launching in New Browser Tabs:**
   - **Root Cause & Rationale:** Previously, clicking top navigation dock items swapped views in the active window, navigating away from the active Director Controller. In real live productions (and Stagetimer.io), confidence monitors, agenda displays, and OBS overlays are placed on secondary monitors, TVs, and iPads in separate windows while the Controller remains undisturbed in the main tab.
   - **Top View Switcher Dock (`src/App.tsx`):**
     - Updated `Stage Monitor`, `Agenda`, `Moderator`, and `OBS Overlay` buttons to launch in a new tab (`window.open('/app/?view=' + tab.id + '&room=' + encodeURIComponent(roomId), '_blank')`).
     - Added external link indicator icon (`↗` / `ExternalLink`) next to each secondary view button.
     - Controller tab remains active in the current tab.
   - **Direct Role Links Card (`src/views/ControllerView.tsx`):**
     - Updated all buttons (`Stage Monitor View`, `Agenda Rundown View`, `Moderator View`, `OBS Broadcast Overlay`) to open in new browser tabs with active room sync (`&room=${roomId}`).
     - Cleaned up component props (`onNavigateView` removed from `ControllerView`).
   - Verified via Playwright browser subagent on `http://localhost:5173/app/?view=controller` (clean build, 0 errors, visual external link indicators verified).

9. **Next Steps (On Deck):**
   - **Bit 4:** Outputs Suite with Live Role Previews, Teleprompter Horizontal Mirroring (`scaleX(-1)`), and SDI/Broadcast Delay Offset.



