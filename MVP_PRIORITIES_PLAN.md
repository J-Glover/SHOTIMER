# First three MVP priorities

## Scope and decisions

1. **Protected sharing.** Replace anonymous room broadcasts and public snapshots with an authoritative Node relay mounted in the existing production server and Vite development server. Each local room receives an unguessable live ID and separate management, operator, moderator and viewer capabilities. Store only token hashes on the server; links carry tokens in URL fragments. Viewer credentials cannot publish, moderator credentials can change only stage messages, and operator credentials can control the show but cannot generate/revoke other credentials. Management stays in the originating browser. Revocation closes existing streams. Existing local room/rundown data remains intact; old unprotected links require replacement.
2. **Connection health and recovery.** Server events carry revisions, snapshots and regular heartbeats. Show connection state and last confirmed contact; distinguish transport health from display presence. Continue a running readout from its timestamp during outages, warn that cues may be stale, and retrieve authoritative state on reconnect. Do not replay controls queued during an outage. Use revision checks to reject competing stale edits. Keep warnings visible even with hidden viewer controls, except during deliberate blackout/message-only output.
3. **Finish behaviour.** Per timer, choose Continue into overtime (legacy default) or Hold at target (00:00 for countdown, configured duration for count-up). Linked next timers take priority; the final linked timer follows its finish setting. Clock mode is unchanged. Persist/sanitize this setting through presets, room storage, JSON and sync.

## Delivery and verification

- Add isolated HTTP integration checks for permissions, invalid credentials, cross-room access, revocation, persistence, presence, stale revisions and stream recovery; add actual-store timer regression checks.
- Run `npm test`, `npm run build`, `npm run lint` and inspect the changed UI where tooling permits.
- Preserve free room/timer limits, Pro gates, reset semantics and the OBS Coming soon state.
- Update project memory and provide deployment instructions. This task changes the local checkout; production deployment is a separate action.

## Hosting requirements

The Node relay is a single-instance service with durable, private `data/live-rooms` storage (override with `SHOTIMER_LIVE_DATA_DIR`). Reverse proxies must allow streaming `/api/live/` responses without buffering. Static-only hosting is insufficient. Supabase continues to handle accounts and saved rundowns; live state and tokens are never published to its old public channels/tables. A SQL migration closes legacy public snapshot policies. Multi-instance hosting needs a shared authoritative relay before scaling out.
