# Shotimer — Master Design System & Style Guide
**Authoritative Styling & Component Constitution for Human Developers & AI Assistants (OpenAI Codex, Google Antigravity, Claude, etc.)**

> **Mandatory Rule for All AI Assistants:**  
> Before generating or editing ANY CSS, HTML, JSX, or Tailwind styling in this repository, you **MUST** consult and follow this Style Guide.  
> **DO NOT** invent new arbitrary hex colors, **DO NOT** create redundant CSS classes, and **DO NOT** write arbitrary inline Tailwind utilities (e.g. `bg-[#1a2333]`) when established design tokens, classes, or patterns already exist.

---

## 1. Dual-System Architectural Separation

Shotimer consists of two deliberately distinct design systems. Never cross-contaminate their styles:

| System | Target Surface | Core Aesthetic | Tech Stack | Root Stylesheet |
| :--- | :--- | :--- | :--- | :--- |
| **System A: App Console & Stage Displays** | `/app/`, Director Console, Stage Monitors, Agenda, Moderator, OBS | **Tactile Broadcast Darkroom** (Matte dark slates, high-contrast tallies, tabular typography, hardware console feel, Stagetimer.io parity) | React 19, Tailwind CSS v4 `@theme`, Structured Vanilla CSS classes | `src/index.css`, `src/styles/*.css` |
| **System B: Public Marketing & Coming Soon** | `/`, `/pricing.html`, `/features.html`, `website/`, `website_coming_soon/` | **Warm Neutral Editorial Studio** (Warm Linen `#FAF8F5`, Obsidian Slate `#18181B`, Stage Amber `#F59E0B`, Emerald `#10B981`) | Semantic HTML5, Vanilla CSS | `website/css/website.css`, `website_coming_soon/css/` |

---

## 2. System A: App Console & Stage Monitors (`src/`, `/app/`)

### 2.1 Color Tokens & Palette

The console and displays use a strict dark matte palette calibrated for dimly lit broadcast control rooms, AV switcher racks, and high-brightness stage confidence monitors.

#### Dark Surfaces & Canvas
```css
/* Canvas & Panels */
--color-stage-bg:            #07090E;  /* Tailwind theme base canvas */
--app-canvas:                #141414;  /* Console workspace backdrop */
--header-bg:                 #1b1b1b;  /* Console sticky top bar */
--panel-bg:                  #1c1c1c;  /* Standard card/panel background */
--input-bg:                  #171717;  /* Form inputs, select dropdowns */
--button-bg:                 #252525;  /* Default secondary button face */
--button-bg-hover:           #343434;  /* Button hover state */
--row-hover:                 #222222;  /* Rundown row hover */
--row-selected-bg:           #242b28;  /* Active/selected timer row */
--blackout-bg:               #000000;  /* Stage Blackout mode / OLED pure black */
```

#### Borders & Dividers
```css
--border-subtle:             #303030;  /* Panel internal dividers, row borders */
--border-panel:              #363636;  /* Panel containers, card perimeter */
--border-control:            #414141;  /* Buttons, inputs, dropdown triggers */
--border-control-hover:      #525252;  /* Hovered input or row editable borders */
--border-focus:              #34d399;  /* Accessible focus outline */
```

#### Signal Accents & Playback Status
```css
/* Live / Running / Connected */
--signal-green:              #10b981;  /* Tailwind green / stage progress */
--signal-green-bright:       #34d399;  /* Active text, focus ring, connected dot */
--signal-green-btn:          #087f5b;  /* Primary Play/Action button */
--signal-green-btn-hover:    #09966a;  /* Primary Play hover */
--signal-green-tint:         #22372c;  /* Green indicator badge tint */

/* Warning / Paused / Unconfirmed */
--signal-amber:              #f59e0b;  /* Stage warning threshold */
--signal-amber-bright:       #fbbf24;  /* Paused indicator dot, sync warning */
--signal-amber-text:         #fcd34d;  /* Warning text badge */
--signal-amber-tint:         #332d20;  /* Warning box / banner tint */
--signal-amber-border:       #6d5a2f;  /* Warning perimeter */

/* Danger / Overtime / Error */
--signal-red:                #ef4444;  /* Overtime digits, danger progress */
--signal-red-bright:         #f87171;  /* Danger text badges */
--signal-red-stage:          #ff0000;  /* Stage message pure red primary */
--signal-red-tint:           #4b2424;  /* Danger active button background */
--signal-red-border:         #b34747;  /* Danger active button border */

/* Info / Cyan Accent */
--signal-cyan:               #06b6d4;  /* Information cues, highlights */
--signal-cyan-glow:          rgba(6, 182, 212, 0.25);
```

#### Text Hierarchy
```css
--text-primary:              #fafafa;  /* Headings, live timer digits */
--text-standard:             #e5e5e5;  /* Main labels, input text */
--text-secondary:            #d4d4d4;  /* Button text, secondary descriptors */
--text-subtle:               #bfbfbf;  /* Speaker notes, auxiliary info */
--text-muted:                #a3a3a3;  /* Eyebrows, timestamps, shortcuts */
--text-dimmed:               #737373;  /* Disabled elements, placeholders */
```

---

### 2.2 Typography & Tabular Numerics

1. **Tabular Numerics (MANDATORY FOR ALL TIMERS & CLOCKS):**
   - **Font:** `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
   - **CSS Properties:**
     ```css
     font-family: var(--font-mono);
     font-variant-numeric: tabular-nums;
     font-feature-settings: "tnum" 1, "zero" 1;
     letter-spacing: -0.02em;
     ```
   - **Class:** `.tabular-numbers` or `.stage-digits`
   - **Reason:** Prevents digits from shifting and jittering horizontally as numbers change (e.g., `1` vs `0`). **Never use variable-width sans fonts for timers without `tabular-nums`.**

2. **UI & Control Labels:**
   - **Font:** `'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
   - **Font Weights:**
     - `400` / Regular: Speaker cues, secondary descriptions, body text.
     - `500`–`550` / Medium: Button text, table labels, active values.
     - `600`–`650` / Semibold: Panel titles, segment titles, modal headers.
     - `750`–`800` / Bold: Brand mark (`Shotimer`), major status tallies.

---

### 2.3 Component Class Standard (Console Components)

When creating or modifying components in `src/components/controller/`, `src/components/common/`, and `src/views/`, **always reuse the established CSS classes from `src/styles/controller.css` and `src/styles/controllerWorkspace.css`**.

#### Buttons & Controls
- `.console-button`: Standard button (`min-height: 36px`, `padding: 7px 11px`, `border: 1px solid #414141`, `background: #252525`).
- `.console-button.primary`: Emerald action button (`background: #087f5b`, `border-color: #16966f`, `color: white`).
- `.console-button.danger-active`: Red active/danger button (`background: #4b2424`, `border-color: #b34747`).
- `.console-button.lock-active`: Yellow locked state button (`background: #332d20`, `border-color: #6d5a2f`).
- `.console-icon`: Square icon button (`width: 36px`, `min-height: 36px`, `padding: 7px`).
- Focus rings: `:focus-visible { outline: 2px solid #34d399; outline-offset: 3px; }`

#### Inputs & Forms
- `.console-input`: Standard dark input (`background: #171717`, `border: 1px solid #424242`, `border-radius: 5px`, `padding: 8px 10px`, `color-scheme: dark`).
- `.form-label`: Vertical stack label (`display: flex; flex-direction: column; gap: 7px; font-size: 12px; color: #b2b2b2`).
- `.room-picker`: Header room select dropdown (`max-width: 210px`, `min-height: 38px`, `font-weight: 600`).
- `.density-picker`: Rundown density dropdown (`comfortable` vs single-line).

#### Panels & Workspaces
- `.controller-console`: Outer workspace root (`background: #141414`, `color: #e5e5e5`).
- `.console-header`: Sticky top bar (`min-height: 64px`, `background: #1b1b1b`, `border-bottom: 1px solid #303030`).
- `.console-panel`: Standard dark container card (`background: #1c1c1c`, `border: 1px solid #363636`, `border-radius: 7px`).
- `.panel-heading`: Card header bar (`padding: 16px`, `border-bottom: 1px solid #303030`, `font-size: 13px`, `font-weight: 600`).
- `.panel-body`: Card content area (`padding: 16px`).

#### Rundown Table & Rows
- `.rundown-panel`: Main timer rundown container (`container-type: inline-size`).
- `.rundown-column-head`: Table column header bar (`color: #858585`, `font-size: 10px`, uppercase).
- `.rundown-row`: Timer row grid (`border-bottom: 1px solid #303030`, `border-left: 3px solid transparent`).
- `.rundown-row.is-selected`: Active segment highlight (`background: #242b28`, `border-left-color: #34d399`).
- `.row-play`: Row start/pause icon trigger (`background: #292929`).
- `.row-play.is-running`: Green active row play indicator (`background: #315d4e`, `border-color: #3f856d`).
- `.playback-badge`: Playback status indicator dot (`running` -> emerald, `paused` -> amber, `stopped` -> grey).

#### Modals & Menus
- `.screen-dialog-backdrop`: Accessible modal overlay (`position: fixed; inset: 0; background: #000b; z-index: 80`).
- `.screen-dialog`: Modal container (`max-width: 640px`, `background: #1c1c1c`, `border: 1px solid #494949`, `border-radius: 10px`).
- `.console-dropdown`: Native `<details>` dropdown container.
- `.console-menu`: Anchored popup menu (`background: #232323`, `border: 1px solid #494949`, `border-radius: 7px`, `box-shadow: 0 10px 25px #0007`).

---

### 2.4 Responsive Layout Contracts (1080p Desktop Fit)

The Controller layout is strictly bounded to fit within a standard 1080p display viewport without vertical page scrolling:

```
+-----------------------------------------------------------------------------------------+
| CONSOLE HEADER: [Shotimer Logo] [Room Picker] [Screens] [Outputs] [Blackout] [Settings] |
+-----------------------------------------------------------------------------------------+
|                                    CONSOLE WORKSPACE                                    |
|                                                                                         |
|   LEFT COLUMN (24%)         CENTER COLUMN (1fr)              RIGHT COLUMN (23%)         |
|   +-----------------------+ +------------------------------+ +------------------------+ |
|   | Live Monitor Preview  | | Rundown Playlist             | | Stage Message Composer | |
|   | - 16:9 Aspect Video   | | - Segment Title & Speaker    | | - Message Draft Field  | |
|   | - Dominant Digits     | | - Duration & Start Time      | | - Colour-Pot Palette   | |
|   | - Transport Bar       | | - Play / Pause per Row       | | - Severity & Flash     | |
|   |   (|< -1m ▶ +1m >|)   | | - Auto-Advance Link Tags     | | - [ Show on Stage ]    | |
|   | - Schedule Drift & ETA| | - Summary Bar (Total / Rem)  | | - Current Live Cue     | |
|   +-----------------------+ +------------------------------+ +------------------------+ |
+-----------------------------------------------------------------------------------------+
```

#### Breakpoint Rules:
1. **Wide Desktop (`>= 1600px`):** Full 3-pane layout (`grid-template-columns: minmax(310px, 24%) minmax(0, 1fr) minmax(330px, 23%)`).
2. **Medium Desktop / 1080p (`901px – 1599px`):** 2-column workspace (`minmax(300px, 30%) minmax(0, 1fr)`). The Messages column transforms into a slide-out drawer triggered by the header, keeping the rundown and monitor uncompromised.
3. **Mobile / Tablet (`<= 900px`):** Stacked vertical scroll layout (`display: flex; flex-direction: column`).
4. **Short Viewports (`max-height: 700px`):** Tighter padding (`padding: 10px`, gap `10px`), compact message editor input.

---

### 2.5 Stage Output Displays (`StageDisplay.tsx`, `ViewerView.tsx`)

Stage monitors use **Container Query Units** (`cqw`, `cqh`) and viewport units to scale dynamically across phones, tablets, stage laptops, and 85-inch confidence TVs.

- **Root Container:** `.stage-output` (`container-type: size; overflow: hidden; background: #181818`).
- **Aspect Ratio Chassis:** Default 16:9 landscape (`.output-preview.landscape`); portrait 9:16 supported (`.output-preview.portrait`).
- **Fitted Text (`FittedText.tsx`):** Automatically computes font size using DOM bounding measurements to guarantee zero text overflow and zero unwanted line wrapping.
- **Display Modes:**
  1. **Normal Mode:** Header (Title + Speaker) $\to$ Central Fitted Digits $\to$ Progress Bar $\to$ Footer (Clock + Up Next).
  2. **Message-Only Mode:** Hides timer, header, footer, and branding. Displays full-screen stage message in large plain or formatted text.
  3. **Timer-Only Mode:** Device-level toggle (`.viewer-screen.timer-only`). Hides all metadata and branding; maximizes timer digits up to `29vw` / `68dvh`.
  4. **Blackout Mode:** Entire screen renders pure OLED `#000000`, silencing all output immediately until toggled off.

---

### 2.6 Stage Cues & Message Color Palette

Stage messages sent from the controller to stage displays use solid primary RGB colors for maximum visibility and legibility across long venue distances:

| Name | Hex Code | Role |
| :--- | :--- | :--- |
| **White** (Default) | `#ffffff` | Standard stage messages, informational cues |
| **Yellow** | `#ffff00` | Warning, wrap up, time approaching |
| **Red** | `#ff0000` | Overtime, urgent stop, stage emergency |
| **Green** | `#00ff00` | Cue to speak, start, good to go |
| **Blue** | `#0000ff` | Technical cue, audio/lighting notice |

- **Draft-First Rule:** Editing text or clicking color swatches in the Message Editor updates the local draft ONLY. It **NEVER** broadcasts to stage displays until the operator explicitly clicks **[ Show on stage ]**.

---

## 3. System B: Public Marketing & Coming Soon (`website/`, `website_coming_soon/`)

The public-facing website uses an editorial, warm-neutral tactile aesthetic to stand out against generic SaaS landing pages:

### 3.1 Color Tokens
```css
/* Warm Neutrals */
--bg-canvas:         #FAF8F5;  /* Warm Linen base page background */
--bg-canvas-subtle:  #F4F1EA;  /* Light contrast sections */
--bg-card:            #FFFFFF;  /* Content cards */
--bg-card-hover:      #FBF9F6;  /* Card hover state */
--bg-dark:            #18181B;  /* Obsidian Slate contrast sections & footer */
--bg-dark-surface:    #27272A;  /* Elevated dark elements */

/* Text & Ink */
--text-primary:       #18181B;  /* Obsidian deep ink body & headlines */
--text-secondary:     #52525B;  /* Secondary descriptions */
--text-muted:         #71717A;  /* Captions, footnotes */
--text-inverse:       #FAF8F5;  /* Light text on dark backgrounds */

/* Signal Accents */
--amber-tally:        #F59E0B;  /* Stage amber CTA buttons & accents */
--amber-tally-hover:  #D97706;  /* Hover state */
--amber-tally-subtle: #FEF3C7;  /* Subtle pill badge background */
--amber-tally-text:   #92400E;  /* Dark text on subtle amber pill */
--emerald-live:       #10B981;  /* Live tally dot & success highlights */
```

### 3.2 Typography
- **Headlines & Body:** `'Plus Jakarta Sans'` or `'Manrope'`, `-apple-system, BlinkMacSystemFont, sans-serif`.
- **Accents & Eyebrows:** Uppercase tracking (`letter-spacing: 0.1em; font-size: 11px; font-weight: 700;`).
- **Hero Counters & Badges:** `'JetBrains Mono'`, tabular numbers.

---

## 4. Cross-AI Invariants & Guardrails (Strict Do's & Don'ts)

When any AI assistant (Codex, Antigravity, Claude, etc.) writes code in this project, these 8 inviolable rules apply:

### ❌ What NEVER To Do:
1. **DO NOT invent arbitrary hex colors:** Never introduce colors like `bg-[#0d1117]`, `border-[#2a2a2a]`, or `text-[#8892b0]`. Pick strictly from the token lists in Section 2.1 or 3.1.
2. **DO NOT bypass Tabular Numbers:** Never output a timer digit, clock readout, or duration without `font-family: var(--font-mono)` and `tabular-nums`.
3. **DO NOT create duplicate button/card classes:** Never write raw `<button className="px-4 py-2 rounded bg-neutral-800 text-white ...">` in console components when `.console-button` already implements the design system.
4. **DO NOT break 1080p desktop height containment:** The Controller console workspace must fit within standard 1080p viewports without vertical document scrolling.
5. **DO NOT auto-broadcast message drafts:** Typing in the message editor must remain local until "Show on stage" is pressed.
6. **DO NOT violate Free Tier limits:** Free tier is strictly capped at **3 rooms** and **3 timers per room**. Pro features (e.g., custom stage logos, CSV imports) must stay gated behind `ProPaywallModal`.
7. **DO NOT import heavy external icon or UI libraries:** The project uses `lucide-react` exclusively. Do not install Heroicons, FontAwesome, or Material Icons.
8. **DO NOT introduce unvetted animations:** Overtime pulses and warning flashes must follow the restrained broadcast frequencies specified in `src/index.css` (`@keyframes stage-pulse`).

### ✅ What ALWAYS To Do:
1. **ALWAYS use semantic class names:** Use `.console-button`, `.console-input`, `.console-panel`, `.panel-heading`, `.rundown-row`, etc.
2. **ALWAYS provide accessible focus states:** Use `:focus-visible { outline: 2px solid #34d399; outline-offset: 2px; }`.
3. **ALWAYS preserve draft-first workflows:** For both stage messages and output customizations, keep changes in draft until explicitly applied.
4. **ALWAYS verify with test & build commands:** After modifying code, run:
   - `npm test` (all 62+ regression tests must pass)
   - `npm run lint` (0 errors)
   - `npm run build` (Vite build must succeed)

---

## 5. Quick Reference Cheat Sheet

| Need | Use This Token / Class | Never Use |
| :--- | :--- | :--- |
| Standard Button | `.console-button` | Inline utility soups (`px-3 py-1.5 ...`) |
| Primary Action Button | `.console-button.primary` | `bg-emerald-500`, `bg-blue-600` |
| Text Input / Select | `.console-input` | Default unstyled `<input>` |
| Card / Section Container | `.console-panel` | Raw `div` with ad-hoc border & background |
| Live Timer Display | `font-family: var(--font-mono); font-variant-numeric: tabular-nums;` | Proportional sans serif (`Inter` / Arial) |
| Running Tally Color | `#34d399` (Text/Icon) / `#087f5b` (Button) | Pure neon green `#00ff00` for UI chrome |
| Warning Tally Color | `#fbbf24` (Text/Dot) / `#332d20` (Background) | Generic orange or non-contrast yellows |
| Overtime / Danger Color | `#ef4444` (Text/Bar) / `#4b2424` (Background) | Unchecked reds with poor contrast |
| Stage Display Units | `cqw` and `cqh` in `.stage-content` | Static pixel widths (`width: 800px`) |
