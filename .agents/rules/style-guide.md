# Style Guide Invariant Rule for Shotimer

All AI models (Google Antigravity, OpenAI Codex, Claude, etc.) working on this workspace must strictly follow the rules documented in `STYLE_GUIDE.md`:

1. **Dual-System Separation:** Never mix styles between System A (App Console & Displays in `src/`, darkroom broadcast aesthetic) and System B (Marketing website in `website/`, warm linen editorial aesthetic).
2. **Color Invariants:** Use only the authorized color tokens. Never invent arbitrary hex codes or ad-hoc Tailwind color strings (e.g., `bg-[#131922]`).
3. **Tabular Numbers Mandatory:** Every countdown timer, clock, duration, and time readout must use `font-family: var(--font-mono)` with `tabular-nums` / `.tabular-numbers` to prevent horizontal jitter.
4. **Component Class Reuse:** Use existing `.console-button`, `.console-input`, `.console-panel`, `.panel-heading`, `.rundown-row`, etc., rather than ad-hoc inline utility soup.
5. **Layout Contracts:** Respect the 1080p desktop height containment (3-column on >=1600px, 2-column + message drawer on 901-1599px, stacked on <=900px).
6. **Draft-First Messaging:** Composing stage messages never broadcasts to live screens until the operator clicks "Show on stage".
7. **Free Tier Limits:** Keep the 3-room, 3-timer limit and Pro gating intact.
8. **Verification:** Always verify that `npm test`, `npm run lint`, and `npm run build` pass with 0 errors after any code change.
