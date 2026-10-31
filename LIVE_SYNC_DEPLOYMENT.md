# Protected live sharing

The existing Node server now enforces live room permissions. Supabase still handles accounts, licences and saved rundowns. No service-role secret is required for live sharing.

## Deploy

The production reference configuration is `compose.production.yml` plus
`deploy/nginx-shotimer.conf.example`. The public origin must reach the Node
process for the entire site; uploading only `website_coming_soon` produces a
working interface with a permanently disconnected live relay. After deployment,
`GET /api/health` must return `{"status":"ok","service":"shotimer-relay"}`.

1. Deploy the full checkout, including `server.js`, `liveRelay.mjs`, `appManifest.mjs` and the built `dist` directory. Build with `npm run build`; run with `npm start`. Vite (`npm run dev`) and preview mount the same relay for development.
2. Mount persistent private disk storage at `SHOTIMER_LIVE_DATA_DIR`, or preserve the default `data/live-rooms` directory across restarts/deployments. Keep it outside public web roots. Never commit or expose it. Back it up privately; it contains show state and token hashes.
3. Run **one relay process**. Multiple processes or replicas need a shared authoritative implementation; a shared directory alone does not provide synchronization. Use HTTPS publicly. Allow `/api/live/` GET/POST requests and forward Authorization headers. Disable proxy buffering/caching for event streams and allow long-lived responses. Heartbeats arrive every five seconds. Do not log Authorization headers or request bodies.
4. Apply `migrations/20261029_retire_public_live_sessions.sql` in the Supabase SQL editor during the coordinated rollout. It retires public reads/writes to the old snapshots without deleting rows. It has not been applied automatically. Refresh old app tabs; old public Supabase broadcasts are no longer consumed by this app. The baseline schema also retires those policies for fresh setups.
5. Open the manager console, then use **Outputs → Share links & QR codes** to copy fresh protected links. Old room/view-only links intentionally no longer connect to live shows. Local names, rundowns, output settings and account flows remain available.

For a local-only venue, the controller and displays must reach the **same Node/Vite server**. Local live sharing works without Internet once the app has loaded. Supabase account and cloud-save operations still need Internet. This is not an offline-installable PWA.

## Access and recovery

- The originating browser stores the private management capability. Operator links control the show but cannot mint/revoke role links. Moderator links can only send/clear messages. Viewer links read the stage/agenda and cannot change the show. Changing `view` never changes server permissions.
- Links are bearer credentials: anyone holding one can use that role. Tokens travel in URL fragments and Authorization headers; the relay stores hashes only. Browser storage retains capabilities for reload and installed shortcuts, scoped separately from management. Do not share a manager browser profile.
- **Outputs → Share links & QR codes → Replace all sharing links…** invalidates operator/moderator/viewer credentials and closes those streams. The manager remains connected. Re-share links to reconnect screens. This deliberately affects all role links together.
- Management is browser-local, not recovered by signing in on another device. Clearing browser storage loses management access to that live show. A JSON rundown backup preserves content, not capabilities/branding; restore it into a new show and re-share links if access is lost. A browser profile backup contains sensitive management credentials.
- Server confirmation means the connection is exchanging live snapshots/heartbeats. Presence is observational and does not prove that a monitor rendered a cue. Screens warn after connection loss or 15 seconds without confirmation, fetch a fresh snapshot on reconnect and do not replay offline commands. Playback controls are disabled while disconnected. An already-running readout continues from its last start timestamp. Auto-advance/scheduled starts require a connected controller; displays cannot advance the shared show themselves.
- A stale competing edit is rejected and the authoritative snapshot is restored. The console reports that the show changed so the operator can review and retry. Actions already accepted by the server before a connection interruption may appear in the recovered snapshot.

## Finish behaviour

In each timer's **Settings → Timing → At the target duration**, choose **Continue into overtime** or **Hold at 00:00** (countdown) / **Hold at target duration** (count-up). Existing timers default to overtime. Reset a running/paused timer before changing this setting. A linked following timer starts first; a final segment follows its finish setting. Time-of-day mode is unchanged. Start on a held finished timer begins it again from zero elapsed time.

## Verification performed

`npm test` includes actual HTTP relay and streaming-client integration tests against isolated temporary storage, without accessing Supabase or live shows. It checks role enforcement, cross-room denial, revocation, persistence/reconnect, revision conflicts, no offline replay and timer behaviour. `npm run build` and `npm run lint` are the standard checks. Visual browser verification remains outstanding because Computer Use could not confidently identify the active browser URL and stopped.
