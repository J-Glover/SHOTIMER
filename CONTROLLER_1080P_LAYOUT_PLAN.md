# Controller layout plan for 1080p

Status: implemented locally on 29 October 2026. The findings and proposal below record the reasoning; implementation and measured checks are recorded at the end. No production deployment was performed.

## Findings from the signed-in Stagetimer experiment (29 October 2026)

The user subsequently authorized exploration of their free Stagetimer account. Inspected its empty and populated team dashboard, created one room named **Layout review - test room**, added timers up to the free three-timer limit and renamed the first segment **Opening and welcome**. Inspected timer settings, Live Connections, Outputs, the Operator output and the room menu. Returned to the dashboard with browser zoom restored to 100%. The new room remains in the account with three stopped 10-minute timers and its initial blank message. No subscription, billing, account-security or sharing settings were changed. No stage message was successfully entered or shown, and no playback was started.

The live UI adds useful evidence beyond the marketing screenshots:

- **Room organisation is a separate screen.** Before room creation, the dashboard presents a clear first-room action. After creation, the room entry shows a thumbnail, name, Open action, timezone, timer/message/output counts and last-updated date. Search, sorting and list/grid controls are there, outside the controller.
- **The controller can switch work panels.** At 125% zoom, the connection dialog reported an actual 2048×1022 CSS viewport and the controller displayed three areas. At 150% zoom, the main work area switched between Timers and Messages through a narrow side selector while the monitor/transport remained visible. A later observation also showed the compact switcher in a smaller native window. This is a design tradeoff: the inactive work panel is hidden. Do not claim that the entire rundown stays visible while composing in that mode.
- **Connections are a short entry point, not an expanded dashboard card.** The count opens a full panel with device details. Its count includes the controller itself; Shotimer's observed-screen count should retain clear terminology rather than adopting that number's meaning accidentally.
- **Editing is contextual.** In the rundown, title, start and duration are compact clickable values; detailed settings open in a dialog. The room menu groups Settings, API, Outputs, Live Connections, Import, Export, Logs, Shortcuts and Documentation. Many advanced controls therefore do not need permanent space.
- **Outputs has a single hub.** Role thumbnails, preview, relevant options and launch/sharing actions are grouped. The Operator view is a distinct screen with Previous/Current/Next and large controls, not merely a scaled controller. It also has substantial controls/help, so copying it wholesale would not guarantee a simpler Shotimer screen.
- **The initial message is a small cue card.** The visible editor contains a short field, a few formatting actions and Show; more messages are added explicitly. Shotimer's richer formatting should remain available, but the normal composer need not display its full preset library, instructions and options simultaneously.

### Proposed addition to the earlier plan

Add a small **Your rooms** dashboard, using existing room slots and current free limits. Each room needs a name, timer count, trustworthy playback state when known, and a clear Open controller action. Include last-used/updated information only when its meaning is available. A first-use explanation can guide the user to open a room and share a stage display; any sample rundown must be labelled as a sample. Preserve all current rooms and content. Room preparation/account navigation belongs here; live playback remains inside the controller. Folders, team administration and billing interfaces are not needed for this MVP refinement.

The implementation proposal now has two related parts: a lightweight room home and a compact controller. Prototype the narrower controller treatment before choosing between a Messages drawer (which can preserve the rundown behind it) and Timers/Messages tabs (which provide more editing width but hide the inactive panel). Use visible text labels and a persistent live-message indicator/Clear action in either case. Keep the wide three-pane layout where space permits.

The experiment supports the earlier space-saving plan, but it does not constitute browser QA of Shotimer or a complete 1080p certification of Stagetimer. No Shotimer application code was changed during the experiment.

## Goal

Keep the existing monitor / rundown / messaging workspace, visual style, readable text and familiar playback controls. The everyday show controls and screen-connection summary should remain visible on a 1080p desktop with normal browser chrome. Additional features should have a defined home without extending the main page vertically.

## Review evidence

Reference: https://stagetimer.io/features/

Inspected the annotated controller screenshot (`controller-interface-v3.3.png`) and transport screenshot (`transport-controls-timing-v2.webp`) linked by that page. The annotated image shows a compact Live Connections row opening further detail, a short transport row with dropdowns for adjustments, and contextual controls around the rundown. The page also describes output-link, room-menu and connection popups. These are useful interaction patterns; the screenshots alone do not prove how the current competitor app fits every viewport.

Reviewed Shotimer's `App.tsx`, `ControllerView.tsx`, `controller.css`, `LiveMonitorPreview`, `MessagesPanel`, `MessageEditor`, `ConnectionsPanel` and `SyncStatus`. This review is based on the current source and downloaded reference images; it does not claim new measured browser screenshots of Shotimer.

The main pressure points are:

- Connected screens follows the entire message composer, including saved presets, text tools, colour pots, layout options, help copy and the current on-stage message. Its position becomes progressively lower as those sections grow.
- The Controller has an app navigation strip, a persistent verbose sync-status strip and a separate main header. Healthy sync is also reported in the header and connection card.
- Below 1500 CSS pixels wide, messages move beneath the monitor. A physical 1920×1080 screen can reach this layout through OS scaling/browser zoom; monitor resolution is not the available browser viewport.
- The preview grows in height with its column width; the monitor card then adds multiple transport/status rows and generous gaps.
- Saved message lists can grow to 20 items. They currently expand the everyday messaging panel.
- The desktop page has no bounded workspace with independently scrolling long lists.

## Proposed layout

One main header above the existing three areas:

| Area | Keep visible | Open on demand |
| --- | --- | --- |
| Header | Shotimer / room, live connection state, Screens count, Outputs, Blackout, fullscreen | Screen list/details, connection diagnostics, sharing, event settings, account/audio/help |
| Monitor | Faithful stage preview, timer readout, Start/Pause, previous/next, reset, ±1 minute, drift and ETA | Other time adjustments, detailed timing breakdown, display customization, resets |
| Rundown | Title/speaker, duration, planned/projected start, current/linked state, row play and actions, Add timer | Timer settings, density preference, presets and other list-management controls |
| Messages | Small preset chooser, draft, selection/weight tools, always-visible colour pots, severity, Show on stage, current cue and Clear | Full preset library/management, extra case/formatting tools, flash and layout options |

### 1. Put screen status in the header

Replace the tall Connected screens card with a labelled **Screens** button showing the observed count and an amber state when existing reports are stale/unconfirmed. Open its full list in an anchored panel or drawer that fits within the viewport. Keep live-server health separate from observed screen presence; do not imply that either proves a cue has rendered.

Keep a discoverable explanation and detailed status in that panel. Connection loss must still produce a visible warning without opening it. Do not introduce reload/disconnect-device actions as part of this layout work.

### 2. Consolidate the top chrome

For the Controller, fold Home/help/shortcut discovery into the main header/options menu. Replace the normal full-width healthy-sync explanation with a compact live-status indicator; move last contact and diagnostics into its popover. Show a concise persistent warning when offline/recovering, with the reconnect action available. Keep permission enforcement and disconnected-control disabling intact.

This removes duplicated status text and two normal-operation strips. Exact reclaimed height must be measured in the browser rather than promised from source estimates.

### 3. Make messages compact without removing useful formatting

Use a preset dropdown/searchable library instead of expanding every saved preset in the panel. A small set of frequently used preset shortcuts may remain if space permits. Keep presets draft-first: choosing one never sends it.

Retain the message editor's separate visible colour-pot row, selection preservation, Select all, Bold/Normal, undo history and severity behaviour. Move occasional case/clear-formatting commands into a labelled More text tools control if necessary; do not hide the colour pots behind it.

Put layout and Flash 3 times in Message options, with a small visible summary of non-default options. Replace repeated instructional paragraphs with contextual help. Show a bounded current-cue summary with an always-visible Clear action, and allow expansion for long text.

Keep Show on stage accessible within the panel without scrolling past a preset library or long cue. Bound the text-editing area; long text can scroll inside it. Preserve draft/selection/history when opening drawers or changing available space. Layout changes must never send, clear or reformat a cue.

### 4. Tighten the monitor controls

Keep the stage preview's correct aspect ratio and content; constrain its size on shorter desktops instead of cropping it. Keep the dominant timer and essential buttons readable.

Consolidate transport spacing and put uncommon adjustment amounts such as +5 minutes into an adjustment menu. Keep ±1 minute directly available. Retain a compact drift/ETA summary and the existing timing-details popover. Combine wall-clock/timezone presentation with that status area rather than using a separate full row. Essential reset/playback actions remain directly discoverable.

### 5. Fit the workspace to available height

On desktop, size the operating workspace from the actual viewport after the header/warning, with no page scroll for the default three-timer show. Keep the transport and rundown summary visible. Long rundowns and long secondary lists scroll inside their own areas; opening a menu must not push content down or be clipped by those areas.

Choose short-screen treatment using available height as well as width. At narrower desktop sizes, keep monitor/transport and rundown visible and open Messages in a labelled side drawer instead of placing it below the monitor. The drawer button must show when a message is live, and Clear must remain easy to reach. Preserve the existing stacked mobile fallback where fitting all panes would sacrifice readability.

Do not force single-line rundown rows just to fit more content. Keep the existing width-aware comfortable layout when titles need room. Use the existing timer settings/menu for occasional edits; consider presenting start times as compact editable labels rather than permanent large inputs, only after the first layout pass is measured.

## Implementation order

1. **Largest space savings:** header consolidation, Screens button/panel, saved-message library and compact message options. Measure before changing rundown rows.
2. **Viewport fit:** monitor height/spacing, bounded desktop workspace, stable transport/actions/summary and the narrower-desktop message drawer.
3. **Interaction and visual checks:** keyboard/focus behaviour, editor selection/history, open-menu placement, live cue visibility, offline/recovery warnings and responsive fallback.

No new timer, network, account, paid-plan or hardware features are part of this change. Existing three-room/three-timer limits, gates and OBS Coming soon remain.

## Acceptance checks

- Test a physical 1920×1080 desktop with browser chrome at 100% and 125% scaling/zoom combinations, recording the actual CSS viewport. Also test representative 1536×760 and 1366×768 viewports, a 1440p desktop, and mobile. Verify the narrower fallback rather than promising three permanently open panes at every scale.
- With the default three timers, no body scrolling is needed to reach Start/Pause, next/previous, Blackout, Outputs, screen count, drift/ETA, Show on stage and Clear. In the narrower mode, Messages is reachable in one action while its live-cue state stays visible.
- Test 20 saved messages, a long active cue, a long rundown in an isolated Pro fixture, scheduled-start warnings, and disconnected/recovering states. These must not push essential controls off screen.
- Open Screens, Outputs, row menus, timing details and message options near viewport edges. Panels must stay reachable, close with Escape, restore focus and preserve existing dialog/shortcut safeguards.
- Keep readable type, suitable pointer/touch targets and keyboard navigation. Normal browser zoom must remain useful; fullscreen is optional rather than a requirement for fitting the controls.
- Run the existing regression suite, build and lint after implementation. Add targeted interaction/layout checks for any changed behaviour. Complete browser visual QA before claiming the layout fits.

## Rule for future features

Live actions and live state may earn permanent space. Setup, customization, diagnostics and libraries belong in an existing menu, popover or drawer. New features should not add another permanent card below the operating controls by default.

## Implemented and verified

- **Your rooms** is the normal app entry. Existing room slots, accounts and free limits remain. Cards distinguish the currently confirmed playback from unmonitored rooms, preserve empty rundowns, show locally recorded open dates and label unchanged sample content. Output, authentication and shared-room deep links retain their destinations. Browser Back/Forward switches rooms without pushing a replacement history entry.
- A single controller header contains compact live health, **Screens** and **Outputs**. Screen presence remains observational. The screen list opens in a focus-trapped dialog. Shared access restrictions and disconnected control disabling remain in force.
- The desktop workspace is bounded by viewport height. Rundowns scroll internally with persistent totals; monitor controls use compact spacing and a menu for additional adjustments. Timing details and console menus use the browser top layer and flip upward when needed.
- Messages keep the draft, selection/weight actions, undo/redo and separate colour pots visible. Presets use a chooser and bounded library; extra formatting and message options open on demand. At 901–1599 CSS pixels, Messages uses a modal drawer while the monitor/rundown remain behind it. A live indicator and Clear cue remain in the header. The editor stays mounted across drawer opening/closing and responsive changes.

Browser review used the real components in Brave on a separate localhost origin, with temporary relay storage and Supabase disabled (`npm run preview:controller`). Measurements refer to **CSS viewports**, not claimed physical monitor resolutions:

| Viewport | Observed result |
| --- | --- |
| Wide desktop (2560-wide native window) | Three panes; dashboard and controller visually inspected. |
| 1884 × 905 | Body exactly matches viewport; header, transport, rundown footer, message send and Screens fit without page scrolling. |
| 1536 × 734 | Body exactly matches viewport; monitor/rundown fit; open Messages drawer keeps Show on stage visible. |
| 1440 × 688 | Body exactly matches viewport; essential controller controls and timing popover fit. |
| 1371 × 655 | Body exactly matches viewport; essential controller controls and rundown totals fit; final-row menu flips upward within the viewport. |
| 471 × 226 (400% zoom) | Stacked fallback with normal vertical page scrolling; page width 465 CSS pixels (scrollbar allowance), no horizontal overflow; message Clear and Show controls reachable at the end. This was a breakpoint/zoom check, not a physical phone test. |

Also reviewed a 40-segment isolated Pro rundown, a long live message, 20 saved messages, Screens/Escape, selection/Bold/red/uppercase and undo after closing/reopening the drawer. Long lists stay bounded. Native window resizing did not provide every exact proposed device size; these results are measured viewport coverage, not certification of all devices, OS scale factors or browsers.

`npm test`: **62 passing**. `npm run build`: passes with existing marketing-script/CSS and bundle-size warnings. `npm run lint`: passes with the existing StealthGate effect warning. No new lint warnings. Regression additions cover dashboard/deep-link routing, honest room summaries and empty storage, sample labels, disconnected playback vs editing lock, and history navigation.
