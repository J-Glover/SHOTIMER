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
   - Pro features: CSV export/import, custom output appearance (including black backgrounds), and top-left stage logo upload.
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
4. **Custom Sponsor / Client Logo Upload:** Implemented as a Pro stage-monitor option (see section 7).

---

## 6. Controller Refinement (October 2026)
- The free version is a taster for a future Pro plan. Preserve the existing three-room / three-timer limits, account flows, and Pro feature gates.
- Controller retains monitor / rundown / messaging panes, with output launch links and QR sharing consolidated under **Outputs**. Account, Pro and chime audition options are under the header's options menu.
- Responsive workspace uses three columns on large screens, two columns on laptops, and stacked panels on small screens. Rundown density follows the actual panel width via ResizeObserver; secondary timer actions live in each row's menu.
- Ready / Running / Paused labels describe playback. Show ETA and drift live beside transport; the rundown footer shows total and remaining time.
- **Lock editing** protects rundown edits on this console only; it does not lock other controllers or stop playback. Deleting an inactive timer offers a 15-second Undo, preserving subsequent edits and respecting the free timer cap. Running and paused active timers cannot be deleted through the controller.
- Message presets populate a draft; operators explicitly choose **Show on stage**. Custom message presets and named timer presets are saved in this browser (up to 20 each).
- Connected-screen presence uses a separate local BroadcastChannel and a broadcast event on the existing Supabase room channel. Presence is observational, not proof of delivery or synchronization. It expires silent peers after 45 seconds and uses a worker heartbeat for background tabs.
- Operator shortcuts only run on the Controller, ignore interactive fields, modifiers and repeated keys, and pause while menus or dialogs are open. Dialogs trap focus, support Escape and restore focus when closed.
- Verification: `npm test` runs isolated regression checks without connecting to live rooms. `npm run build` and `npm run lint` remain the standard checks.

## 7. Stage Display Refinement (October 2026)
- This section supersedes the earlier stage display/customizer descriptions. `StageDisplay` is shared by the actual monitor, controller preview and customizer. Its header, central timer/message area and footer have reserved space so content does not overlap.
- Default stage content: segment title, secondary speaker name, dominant fitted timer and thin progress bar. Speaker notes, playback status, wall clock and Up next are off by default. Notes remain in the controller/moderator. Untouched legacy layouts migrate; deliberate saved visibility/order edits are preserved. **Preview defaults for this output**, then **Apply**, restores the clean defaults for a customized room.
- Messages use large plain text with a smaller timer above. **Message only** hides timer, header, footer and logo. Messages remain until cleared; optional flashing pulses three times, then stays steady. Blackout hides all content. Older messages default to timer + message.
- Fullscreen changes browser/app chrome only. **Timer only** is a separate, per-room preference stored on the receiving device; it hides details and branding but still receives stage cues.
- **Pro logo:** Customize output → Stage monitor → Top-left logo. Upload/replace, visibility, Small/Medium/Large sizes and Remove all remain draft changes until Apply. Logos preserve aspect ratio, use a dedicated header area, and hide during blackout, timer-only and message-only modes. Upload controls and all store editing paths gate new branding changes to Pro; connected displays render authorized room branding without needing their own Pro licence.
- Uploads accept PNG/JPEG/WebP up to 2 MB and 16 megapixels. The browser decodes and re-encodes a bounded raster (up to 640×240), retaining transparency where supported. Inline logo data is capped at 64 KiB of encoded text. External URLs/SVG are rejected. Output settings are saved per room in browser storage and included in the existing room sync/snapshot; no storage-bucket deployment is needed. JSON rundown exports do not include branding.
- Output customization is draft-first with explicit Apply/Cancel and conflict detection. Supported visibility switches are free; appearance/branding is Pro preview. OBS remains disabled as Coming soon, including direct URLs. Paid subscriptions and hardware integrations are not yet available.
- Regression checks cover output defaults, messages, blackout, timer-only, legacy migration, logo gating/sync/sanitization and timer readouts. For isolated visual checks while Vite runs, open `/tests/fixtures/stage-display.html`; it renders the actual component without accessing rooms or the cloud and includes portrait sizing, sample-logo preparation, long messages and an overflow/overlap check.

## 8. Room and Section Resets (October 2026)
- Monitor **⋯** offers **Reset show timing…** and **Reset stage appearance…**. The existing transport reset is explicitly **Reset current timer** and preserves the show baseline. Timing reset stops/restores the selected timer and clears the room run baseline, preserving scheduled times and content.
- Rundown **⋯** offers **Restart rundown…** (first segment, content kept) and **Clear rundown…** (empty room). Message **⋯** offers **Clear stage messages…**, clearing live cues and message drafts across connected consoles while retaining browser-saved presets. Event settings contains **Reset this room…**, clearing playback, rundown, messages/drafts and blackout; room identity, links, accounts, licence, presets and other rooms are retained.
- Shared `ResetDialog` names the room, describes scope, offers a JSON rundown backup before deletion and defaults to preserving appearance/branding. Full-room appearance removal is opt-in. Stage appearance reset preserves the logo unless removal is explicitly selected. It is also available from the output customizer when there are no pending drafts.
- Store reset actions reject changed room/content/cue/appearance/revision compared with the confirmation snapshot, save before replacing live state, stop the worker for timing resets, and publish one complete state update. Browser writes roll back on failure. A monotonically increasing reset revision prevents older snapshots from restoring cleared content. Output and rundown reset changes persist per room; signed-in rundown resets also update the saved room.
- Scheduled starts are controller-only. Timing, rundown, import and room resets disarm them; disarmed state survives reload/room switches and syncs to other consoles. **Resume scheduled starts** explicitly re-arms them. A date/segment/minute key prevents duplicate triggers within the same minute. Starting a timer manually remains available.
- Empty rundowns persist and render empty states rather than restoring demo content or fictitious 10-minute timers. Playback/adjust controls are disabled; adding the first timer selects it. JSON export/import supports an explicitly empty rundown.
- Show timing uses a room baseline independent of the selected timer. Before the first start, or after a timing/restart/clear reset, the badge reads **Not started**, with zero drift. Clock-mode segments reserve their configured schedule duration. Future scheduled starts inform pre-run ETA, and hour-scale drift uses readable hours/minutes. Show timing and empty states also apply to Agenda/Moderator.

## 9. Message Text Formatting (October 2026)
- Message draft now uses a compact selection-based editor. The toolbar below it offers Bold, Normal weight, uppercase/lowercase, White/Red/Green/Blue/Yellow colours, Clear formatting, Select all and Undo/Redo. Message colours use solid RGB primaries (`#ffffff`, `#ff0000`, `#00ff00`, `#0000ff`, `#ffff00`). Legacy saved/broadcast amber runs normalize to yellow without dropping presets. Keyboard Ctrl/Cmd+B, Z, Shift+Z/Y and A work inside the editor; operator playback shortcuts remain blocked while editing.
- Colour-pot formatting applies to selected words only. Normal weight is distinct from lowercase. Clicking **Info**, **Warning** or **Danger** replaces all word colours throughout the draft with inherited white/yellow/red, even when that severity is already selected. Bold, normal weight, case and text are preserved; the editor's colour reset uses its existing undo history. Operators can then apply word colours again. Toolbar interactions retain the text selection. Editing never updates the live message until **Show on stage**.
- `MessageTextRun` contains text and optional boolean bold / palette colour only. `FlashMessage.text` remains the plain-text fallback; optional `richText` runs must exactly match it. `messageFormatting.ts` normalizes, bounds and trims the text/runs together, drops unsupported styles and mismatches, preserves Unicode case expansion offsets, and never stores raw HTML.
- Formatted content is retained in saved message presets, the on-stage cue summary, local/cloud room broadcasts and shared stage previews. Existing plain-text messages and presets remain compatible. `FittedText` measures again on formatting changes so heavier text fits both message layouts.
- The editor keeps bounded undo/redo snapshots, defers DOM normalization during IME composition, and enforces the 500-character limit without dropping existing suffix text during paste. Paste inserts plain text; external HTML, images and layouts are not imported. Resetting message drafts remounts the editor/history without deleting saved presets.
- Local isolated browser checks are at `/tests/fixtures/message-editor.html` while Vite is running. The fixture uses the real editor and stage component without the store or cloud, and checks selection, bold/case/colour, undo/redo and fitted output.
- Colour controls use a separate always-visible row of paint-pot swatches with names/tooltips, selected ticks/outlines, a mixed-selection indicator and keyboard focus. **Default** removes selected word colours while retaining bold/normal weight and inheriting the current Info/Warning/Danger colour. Select all appears first in the formatting row; no-selection hints explain why formatting controls are disabled. Colour pots preserve selection on pointer clicks, wrap on narrow panels and have larger touch targets.
