import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Load the real store without a browser or cloud configuration. No live rooms are touched.
const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('disabled-for-tests') },
});
after(() => vite.close());
const { useTimerStore: store } = await vite.ssrLoadModule('/src/store/useTimerStore.ts');
const { parseTimerDuration, formatTimerDuration, canUseOperatorShortcut } = await vite.ssrLoadModule('/src/utils/operatorControls.ts');
const { DEFAULT_OUTPUT_CUSTOMIZATION: defaults } = await vite.ssrLoadModule('/src/types/timer.ts');
const { normalizeOutputCustomization, safeLogoSource, flashElapsed } = await vite.ssrLoadModule('/src/utils/stagePresentation.ts');
const { timerReadout } = await vite.ssrLoadModule('/src/utils/outputModel.ts');
const { default: StageDisplay } = await vite.ssrLoadModule('/src/components/outputs/StageDisplay.tsx');
const { calculateScheduleMetrics } = await vite.ssrLoadModule('/src/utils/scheduleMath.ts');
const { default: ResetDialog } = await vite.ssrLoadModule('/src/components/common/ResetDialog.tsx');
const { default: AgendaDisplay } = await vite.ssrLoadModule('/src/components/outputs/AgendaDisplay.tsx');
const { normalizeMessageContent, contentRuns, formatMessageSelection, changeMessageCase, insertMessageText, MESSAGE_COLOURS, MESSAGE_SEVERITY_COLOURS, messageSelectionColour } = await vite.ssrLoadModule('/src/utils/messageFormatting.ts');
const { isMessagePreset } = await vite.ssrLoadModule('/src/hooks/useSavedPresets.ts');
const { roomOverview, initialWorkspace } = await vite.ssrLoadModule('/src/utils/roomOverview.ts');
const { isSampleRundown } = await vite.ssrLoadModule('/src/store/useTimerStore.ts');
const { default: RundownRow } = await vite.ssrLoadModule('/src/components/controller/RundownRow.tsx');
const { default: RoomsDashboard } = await vite.ssrLoadModule('/src/views/RoomsDashboard.tsx');
const baseline = store.getState();
const timers = structuredClone(baseline.rundown);
function reset() { store.setState({ ...baseline, rundown: structuredClone(timers), roomId: 'test-room', status: 'stopped', isProUser: false }); }

test('workspace routing preserves explicit output, shared-room and authentication links', () => {
  assert.equal(initialWorkspace('', false), 'dashboard');
  assert.equal(initialWorkspace('?view=dashboard', false), 'dashboard');
  assert.equal(initialWorkspace('?room=room-2', false), 'controller');
  assert.equal(initialWorkspace('?view=dashboard&room=room-2', false), 'dashboard');
  assert.equal(initialWorkspace('?auth=reset', false), 'controller');
  assert.equal(initialWorkspace('?auth=signup', false), 'dashboard');
  assert.equal(initialWorkspace('?auth=login', false), 'dashboard');
  assert.equal(initialWorkspace('?view=dashboard&auth=signup', false), 'dashboard');
  for (const view of ['controller', 'viewer', 'agenda', 'moderator', 'overlay']) {
    assert.equal(initialWorkspace(`?view=${view}&room=room-2`, false), view);
    assert.equal(initialWorkspace(`?view=${view}&room=room-2`, true), view);
  }
  assert.equal(initialWorkspace('?view=dashboard', true), 'controller');
  assert.equal(initialWorkspace('?view=unknown', true), 'controller');
});

test('room summaries preserve empty rundowns and never infer another room playback', () => {
  const active = { roomId: 'room-1', roomName: 'Live room', rundown: timers, status: 'running' };
  const values = new Map([['shotimer_rundown_room-2', '[]'], ['shotimer_room_name_room-2', 'Empty room'], ['shotimer_room_opened_room-2', '12345']]);
  const read = key => values.get(key) ?? null;
  const before = structuredClone(active);
  const empty = roomOverview({ id: 'room-2', name: 'Fallback' }, active, read);
  assert.equal(empty.timerCount, 0); assert.equal(empty.name, 'Empty room');
  assert.equal(empty.playback, null); assert.equal(empty.current, false); assert.equal(empty.lastOpened, 12345);
  const current = roomOverview({ id: 'room-1', name: 'Old name' }, active, read);
  assert.equal(current.timerCount, timers.length); assert.equal(current.playback, 'running'); assert.equal(current.name, 'Live room');
  assert.equal(roomOverview({ id: 'room-3', name: 'Unknown' }, active, read).timerCount, null);
  assert.deepEqual(active, before);
  for (const readFailure of [() => '{bad json', () => { throw Error('Unavailable'); }]) {
    const result = roomOverview({ id: 'room-2', name: 'Fallback' }, active, readFailure);
    assert.equal(result.timerCount, null); assert.equal(result.playback, null);
  }
});

test('dashboard shows session loading then sign-in, and shows account identity only after login', () => {
  const previousWindow = globalThis.window;
  const initialState = store.getInitialState();
  const previousAuth = { isAuthLoading: initialState.isAuthLoading, currentUser: initialState.currentUser, userProfile: initialState.userProfile };
  try {
    // Server rendering reads Zustand's initial snapshot. Set this isolated
    // snapshot to exercise each restored-session outcome without a browser.
    globalThis.window = { location: { search: '?view=dashboard&auth=login', hash: '' } };
    Object.assign(initialState, { isAuthLoading: true, currentUser: null, userProfile: null });
    let markup = renderToStaticMarkup(createElement(RoomsDashboard, { onOpen() {} }));
    assert.match(markup, /Checking your account/);
    assert.doesNotMatch(markup, /class="room-card"/);
    Object.assign(initialState, { isAuthLoading: false });
    markup = renderToStaticMarkup(createElement(RoomsDashboard, { onOpen() {} }));
    assert.match(markup, /aria-label="Sign in"/);
    assert.doesNotMatch(markup, /class="room-card"/);
    Object.assign(initialState, { currentUser: { uid: 'isolated-account', id: 'isolated-account', displayName: 'Aero123UK', email: 'operator@example.test' } });
    markup = renderToStaticMarkup(createElement(RoomsDashboard, { onOpen() {} }));
    assert.match(markup, /Aero123UK/);
    assert.match(markup, /operator@example.test/);
    assert.match(markup, /class="room-card"/);
    assert.doesNotMatch(markup, /aria-label="Sign in"/);
  } finally {
    Object.assign(initialState, previousAuth);
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
  }
});

test('only unchanged sample rundowns are labelled as samples', () => {
  assert.equal(isSampleRundown('room-1', timers), true);
  assert.equal(isSampleRundown('room-1', [{ ...timers[0], title: 'My show' }, ...timers.slice(1)]), false);
  assert.equal(isSampleRundown('room-1', []), false);
  assert.equal(isSampleRundown('room-1', [null]), false);
});

test('row playback stays available with editing locked, and disables separately when disconnected', () => {
  const props = { item: timers[0], index: 0, count: 3, active: true, status: 'stopped', locked: true };
  const locked = renderToStaticMarkup(createElement(RundownRow, props));
  const disconnected = renderToStaticMarkup(createElement(RundownRow, { ...props, playbackDisabled: true }));
  assert.ok(!locked.match(/<button[^>]*class="console-icon row-play [^"]*"[^>]*disabled/));
  assert.match(disconnected, /<button[^>]*class="console-icon row-play [^"]*"[^>]*disabled/);
  assert.match(locked, /aria-label="Segment 1 title"[^>]*disabled/);
});

test('hold finishes countdown and count-up exactly once, clamps readouts and can restart', () => {
  for (const type of ['countdown', 'countup']) {
    reset(); const item = { ...timers[0], type, durationSeconds: 5, finishBehavior: 'hold', autoStartNext: false };
    store.setState({ rundown: [item], activeTimerId: item.id, status: 'running', targetDuration: 5, startedAt: Date.now() - 6500, elapsedTime: 4, timeRemaining: 1, isAudioMuted: true });
    store.getState()._tick(); const result = store.getState();
    assert.equal(result.status, 'finished'); assert.equal(result.elapsedTime, 5); assert.equal(result.timeRemaining, 0); assert.equal(result.overtimeSeconds, 0);
    const display = timerReadout(item,result,Date.now()); assert.equal(display.text,type === 'countup' ? '00:05' : '00:00'); assert.equal(display.overtime,false);
    store.getState()._tick(); assert.equal(store.getState().elapsedTime,5);
    store.getState().start(); assert.equal(store.getState().status,'running'); assert.equal(store.getState().elapsedTime,0);
  }
});
test('legacy timers continue overtime and linked next timers take priority over hold', () => {
  reset(); const first={...timers[0],durationSeconds:5,autoStartNext:false};
  store.setState({rundown:[first],activeTimerId:first.id,status:'running',targetDuration:5,startedAt:Date.now()-6500,elapsedTime:4,timeRemaining:1,isAudioMuted:true});
  store.getState()._tick(); assert.equal(store.getState().status,'running'); assert.ok(store.getState().overtimeSeconds>1);
  store.setState({rundown:[{...first,finishBehavior:'hold',autoStartNext:true},timers[1]],elapsedTime:4,timeRemaining:1});
  store.getState()._tick(); assert.equal(store.getState().activeTimerId,timers[1].id); assert.equal(store.getState().status,'running');
  store.setState({rundown:[{...first,finishBehavior:'hold',autoStartNext:true}],activeTimerId:first.id,status:'running',targetDuration:5,startedAt:Date.now()-6500,elapsedTime:4,timeRemaining:1});
  store.getState()._tick(); assert.equal(store.getState().status,'finished');
});
test('hold survives rundown sanitization and never stops clock mode', async () => {
  const {validateAndSanitizeRundown} = await vite.ssrLoadModule('/src/utils/exportImport.ts');
  assert.equal(validateAndSanitizeRundown([{...timers[0],finishBehavior:'hold'}])[0].finishBehavior,'hold');
  assert.equal(validateAndSanitizeRundown([{...timers[0],finishBehavior:'untrusted'}])[0].finishBehavior,'overtime');
  reset(); const clock={...timers[0],type:'clock',finishBehavior:'hold',autoStartNext:true};
  store.setState({rundown:[clock,timers[1]],activeTimerId:clock.id,status:'running',targetDuration:5,startedAt:Date.now()-10000}); store.getState()._tick(); assert.equal(store.getState().status,'running'); assert.equal(store.getState().activeTimerId,clock.id);
});

test('time nudges apply once and finished timers accept new durations without carrying elapsed time', () => {
  reset(); const item={...timers[0],durationSeconds:60};
  const startedAt=Date.now()-10000;
  store.setState({rundown:[item],activeTimerId:item.id,status:'running',targetDuration:60,startedAt,elapsedTime:10,timeRemaining:50,isAudioMuted:true});
  store.getState().adjustTime(60); assert.equal(store.getState().startedAt,startedAt);
  store.getState()._tick(); assert.ok(Math.abs(store.getState().timeRemaining-110)<0.2);
  store.setState({status:'finished',elapsedTime:120,timeRemaining:0});
  store.getState().updateTimer(item.id,{durationSeconds:30});
  assert.equal(store.getState().status,'stopped'); assert.equal(store.getState().targetDuration,30); assert.equal(store.getState().elapsedTime,0);
});

test('undo preserves later edits and running timer state', () => {
  reset();
  const removed = structuredClone(store.getState().rundown[1]);
  store.getState().deleteTimer(removed.id);
  store.getState().updateTimer(timers[0].id, { title: 'Edited after deletion' });
  store.setState({ status: 'running', elapsedTime: 42, timeRemaining: 558, startedAt: 1234 });
  assert.equal(store.getState().restoreTimer(removed, 1, 'test-room'), true);
  const result = store.getState();
  assert.equal(result.rundown[0].title, 'Edited after deletion');
  assert.equal(result.rundown[1].id, removed.id);
  assert.equal(result.status, 'running');
  assert.equal(result.timeRemaining, 558);
  assert.equal(result.startedAt, 1234);
  assert.deepEqual(result.rundown.map(item => item.order), [0, 1, 2]);
});

test('undo cannot exceed free limit, duplicate a timer or restore into another room', () => {
  reset();
  const removed = structuredClone(store.getState().rundown[1]);
  assert.equal(store.getState().restoreTimer(removed, 1, 'test-room'), false);
  store.getState().deleteTimer(removed.id);
  assert.equal(store.getState().restoreTimer(removed, 1, 'different-room'), false);
  assert.equal(store.getState().duplicateTimer(timers[0].id), true);
  assert.equal(store.getState().restoreTimer(removed, 1, 'test-room'), false);
  assert.equal(store.getState().rundown.length, 3);
});

test('add and duplicate still enforce the free plan cap', () => {
  reset();
  const { id, order: _order, ...item } = timers[0];
  assert.equal(store.getState().addTimer(item), false);
  assert.equal(store.getState().duplicateTimer(id), false);
  assert.equal(store.getState().rundown.length, 3);
});

test('duration entry accepts complete values and rejects ambiguous or invalid edits', () => {
  assert.equal(parseTimerDuration('10:30'), 630);
  assert.equal(parseTimerDuration('1:02:03'), 3723);
  assert.equal(parseTimerDuration('30'), 30);
  for (const value of ['', '10:', '-1', '1:99', '0:00', '24:00:01', 'NaN', '10abc']) assert.equal(parseTimerDuration(value), null, value);
  assert.equal(formatTimerDuration(3723), '1:02:03');
});

test('operator shortcuts are blocked outside the controller and while typing, in menus or dialogs', () => {
  const OriginalElement = globalThis.Element;
  class TestElement { constructor(interactive) { this.interactive = interactive; } closest() { return this.interactive ? this : null; } }
  globalThis.Element = TestElement;
  try {
    const event = { target: new TestElement(false) };
    assert.equal(canUseOperatorShortcut(event, 'controller', false), true);
    for (const view of ['viewer', 'agenda', 'moderator', 'overlay']) assert.equal(canUseOperatorShortcut(event, view, false), false);
    assert.equal(canUseOperatorShortcut(event, 'controller', true), false);
    assert.equal(canUseOperatorShortcut({ target: new TestElement(true) }, 'controller', false), false);
    for (const flag of ['defaultPrevented', 'repeat', 'isComposing', 'ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      assert.equal(canUseOperatorShortcut({ ...event, [flag]: true }, 'controller', false), false, flag);
    }
  } finally { globalThis.Element = OriginalElement; }
});

const logoSource = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';
function brandedConfig() {
  const config = structuredClone(defaults.viewer);
  Object.assign(config.elements.find(element => element.type === 'logo'), { visible: true, customValue: logoSource, customProps: { name: 'Example event', size: 'medium' } });
  return config;
}
function renderStage(overrides = {}, config = defaults.viewer, clean = false) {
  return renderToStaticMarkup(createElement(StageDisplay, { state: { ...baseline, ...overrides }, now: 10000, config, clean }));
}

test('stage defaults prioritise the timer and keep production notes off stage', () => {
  const html = renderStage();
  assert.match(html, /Opening &amp; Welcome/);
  assert.match(html, /10:00/);
  for (const text of ['Welcome sponsors', 'Auto next', 'Up next', 'stage-clock', 'stage-state']) assert.ok(!html.includes(text), text);
  assert.match(html, /Segment progress/);
});

test('messages have separate space, message-only hides timer and branding, blackout hides all', () => {
  const message = { id: 'cue', text: 'HELLO', severity: 'info', visible: true, isFlashing: true, createdAt: 9000, displayMode: 'with-timer' };
  let html = renderStage({ activeMessage: message }, brandedConfig());
  assert.match(html, /HELLO/); assert.match(html, /10:00/); assert.match(html, /Example event/);
  assert.match(html, /animation-delay:-1000ms/);
  html = renderStage({ activeMessage: { ...message, displayMode: 'message-only' } }, brandedConfig());
  assert.match(html, /HELLO/); assert.ok(!html.includes('10:00')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('Opening'));
  html = renderStage({ blackout: true, activeMessage: message }, brandedConfig());
  assert.ok(!html.includes('HELLO')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('10:00'));
});

test('timer-only hides details and logos while retaining operator messages', () => {
  const html = renderStage({ activeMessage: { id: 'cue', text: 'WRAP UP', severity: 'warning', visible: true, isFlashing: false, createdAt: 9000 } }, brandedConfig(), true);
  assert.match(html, /10:00/); assert.match(html, /WRAP UP/);
  assert.ok(!html.includes('Opening')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('stage-header'));
  assert.ok(!html.includes('message-flashing'));
});

test('legacy defaults become clean while deliberate display choices survive reload', () => {
  const legacy = structuredClone(defaults);
  delete legacy.viewer.stageLayoutVersion;
  legacy.viewer.elements.forEach(element => { if (['speakerNotes', 'onAirIndicator', 'timeOfDay', 'upNext'].includes(element.type)) element.visible = true; if (element.type === 'onAirIndicator') element.label = 'On Air Indicator'; });
  assert.equal(normalizeOutputCustomization(legacy).viewer.elements.find(element => element.type === 'speakerNotes').visible, false);
  legacy.viewer.elements.find(element => element.type === 'progressBar').visible = false;
  const result = normalizeOutputCustomization(legacy);
  assert.equal(result.viewer.elements.find(element => element.type === 'speakerNotes').visible, true);
  assert.equal(result.viewer.elements.find(element => element.type === 'progressBar').visible, false);
  assert.deepEqual(normalizeOutputCustomization(result), result);
});

test('logo uploads are gated at every editing entry point and sync to display devices without a local Pro licence', () => {
  reset();
  const before = store.getState().outputCustomization;
  assert.throws(() => store.getState().applyOutputConfigs({ viewer: brandedConfig() }), /require Pro/);
  assert.throws(() => store.getState().updateOutputElement('viewer', 'el-logo', { visible: true, customValue: logoSource }), /require Pro/);
  assert.equal(store.getState().outputCustomization, before);
  store.setState({ isProUser: true });
  store.getState().applyOutputConfigs({ viewer: brandedConfig() });
  assert.equal(store.getState().outputCustomization.viewer.elements.find(element => element.type === 'logo').customValue, logoSource);
  const remote = structuredClone(store.getState().outputCustomization);
  reset();
  store.getState()._applyExternalState({ outputCustomization: remote });
  assert.equal(store.getState().isProUser, false);
  assert.equal(store.getState().outputCustomization.viewer.elements.find(element => element.type === 'logo').visible, true);
  assert.match(renderStage({ outputCustomization: store.getState().outputCustomization }, store.getState().outputCustomization.viewer), /Example event/);
});

test('remote logo data rejects external URLs, SVG and oversized payloads', () => {
  for (const source of ['https://example.com/logo.png', 'data:image/svg+xml;base64,AAAA', 'javascript:alert(1)', `data:image/png;base64,${'a'.repeat(70000)}`]) {
    assert.equal(safeLogoSource(source), false);
    const map = structuredClone(defaults); map.viewer = brandedConfig(); map.viewer.elements.find(element => element.type === 'logo').customValue = source;
    assert.equal(normalizeOutputCustomization(map).viewer.elements.find(element => element.type === 'logo').customValue, '');
  }
  assert.equal(safeLogoSource(logoSource), true);
});

test('message presentation roundtrips without changing playback and old messages retain the timer', () => {
  reset(); store.setState({ status: 'paused', elapsedTime: 42, timeRemaining: 558 });
  store.getState().setMessage('Hello', 'info', true, 'message-only');
  const message = structuredClone(store.getState().activeMessage);
  store.getState()._applyExternalState({ activeMessage: message });
  assert.equal(store.getState().activeMessage.displayMode, 'message-only');
  assert.equal(store.getState().status, 'paused'); assert.equal(store.getState().timeRemaining, 558);
  delete message.displayMode; store.getState()._applyExternalState({ activeMessage: message });
  assert.equal(store.getState().activeMessage.displayMode, 'with-timer');
  assert.equal(flashElapsed(1000, 3400), 2400); assert.equal(flashElapsed(1000, 20000), 2400);
});

test('countup, overtime and paused outputs use correct readouts and configured pulse settings', () => {
  const item = structuredClone(timers[0]); item.type = 'countup'; item.thresholds.overtimeBlink = false;
  const reading = timerReadout(item, { ...baseline, targetDuration: 600, elapsedTime: 615.8, timeRemaining: 0, status: 'paused' }, 10000);
  assert.equal(reading.text, '10:15'); assert.equal(reading.overtime, true); assert.equal(reading.blink, false); assert.equal(reading.status, 'Paused');
  const countdown = timerReadout({ ...item, type: 'countdown' }, { ...baseline, timeRemaining: -15.8, status: 'running' }, 10000);
  assert.equal(countdown.text, '+00:15'); assert.equal(countdown.blink, false);
});

test('unstarted schedules do not bank phantom time and clock segments retain their schedule budget', () => {
  reset();
  const list = structuredClone(timers);
  list[0].type = 'clock'; list[0].scheduledStartTime = '12:00';
  const metrics = calculateScheduleMetrics({ ...baseline, rundown: list, targetDuration: 600, elapsedTime: 0, timeRemaining: 0, startedAt: null, showStartedAt: null, status: 'stopped', referenceTime: new Date(2026, 9, 28, 10, 0) });
  assert.equal(metrics.driftStatus, 'not_started'); assert.equal(metrics.driftSeconds, 0);
  assert.equal(metrics.totalRemainingSeconds, 3600);
  assert.equal(metrics.projectedEndTime.getHours(), 13);
});

test('show timing baseline survives segment selection and real late starts still show drift', () => {
  reset();
  const began = new Date(2026, 9, 28, 10, 0).getTime();
  store.setState({ showStartedAt: began, status: 'paused', elapsedTime: 600, timeRemaining: 0 });
  store.getState().selectTimer(timers[1].id);
  assert.equal(store.getState().showStartedAt, began);
  const metrics = calculateScheduleMetrics({ ...store.getState(), referenceTime: new Date(2026, 9, 28, 10, 12) });
  assert.equal(metrics.hasStarted, true); assert.equal(metrics.driftSeconds, 120);
  const list = structuredClone(timers); list[0].scheduledStartTime = '10:00';
  const late = calculateScheduleMetrics({ ...baseline, rundown: list, showStartedAt: new Date(2026, 9, 28, 10, 5).getTime(), status: 'running', elapsedTime: 300, timeRemaining: 300, referenceTime: new Date(2026, 9, 28, 10, 10) });
  assert.equal(late.driftSeconds, 300); assert.equal(late.driftStatus, 'over');
});

test('timing reset keeps planned starts and stage content; restart returns to first segment', () => {
  reset();
  store.getState().updateTimer(timers[1].id, { scheduledStartTime: '12:30' });
  store.getState().selectTimer(timers[1].id);
  store.setState({ status: 'paused', showStartedAt: 1234, elapsedTime: 90, timeRemaining: 2010, blackout: true });
  store.getState().setMessage('Hold', 'info');
  const message = store.getState().activeMessage;
  store.getState().resetRoomSection('timing', { roomId: 'test-room' });
  let state = store.getState();
  assert.equal(state.activeTimerId, timers[1].id); assert.equal(state.timeRemaining, 2100);
  assert.equal(state.showStartedAt, null); assert.equal(state.rundown[1].scheduledStartTime, '12:30');
  assert.equal(state.activeMessage, message); assert.equal(state.blackout, true); assert.equal(state.scheduledStartsArmed, false);
  state.resetRoomSection('restart', { roomId: 'test-room' });
  state = store.getState();
  assert.equal(state.activeTimerId, timers[0].id); assert.equal(state.timeRemaining, 600); assert.equal(state.rundown.length, 3);
});

test('clearing messages changes live cue and draft version without touching playback or saved schedules', () => {
  reset(); store.setState({ status: 'running', elapsedTime: 45, timeRemaining: 555, startedAt: 1000, showStartedAt: 1000 });
  store.getState().setMessage('Test cue');
  const rundown = store.getState().rundown;
  store.getState().resetRoomSection('messages', { roomId: 'test-room' });
  const result = store.getState();
  assert.equal(result.activeMessage, null); assert.ok(result.messageDraftVersion);
  assert.equal(result.status, 'running'); assert.equal(result.timeRemaining, 555); assert.equal(result.startedAt, 1000);
  assert.equal(result.rundown, rundown); assert.equal(result.scheduledStartsArmed, true);
});

test('full room reset is one state change, keeps room identity and branding unless explicitly requested', () => {
  reset(); store.setState({ isProUser: true, licenseKey: 'evaluation', outputCustomization: { ...structuredClone(defaults), viewer: brandedConfig() }, blackout: true });
  store.getState().setMessage('Live');
  const outputs = store.getState().outputCustomization;
  let changes = 0; const unsubscribe = store.subscribe(() => changes++);
  store.getState().resetRoomSection('room', { roomId: 'test-room' }); unsubscribe();
  let state = store.getState();
  assert.equal(changes, 1); assert.deepEqual(state.rundown, []); assert.equal(state.activeTimerId, null);
  assert.equal(state.targetDuration, 0); assert.equal(state.timeRemaining, 0); assert.equal(state.activeMessage, null);
  assert.equal(state.blackout, false); assert.equal(state.roomId, 'test-room'); assert.equal(state.roomName, baseline.roomName);
  assert.equal(state.isProUser, true); assert.equal(state.licenseKey, 'evaluation'); assert.equal(state.outputCustomization, outputs);
  state.resetRoomSection('room', { roomId: 'test-room', resetAppearance: true });
  assert.deepEqual(store.getState().outputCustomization, defaults);
});

test('appearance reset preserves the logo unless removal is selected and never stops playback', () => {
  reset(); store.setState({ status: 'running', outputCustomization: { ...structuredClone(defaults), viewer: { ...brandedConfig(), backgroundColor: '#123456' } } });
  store.getState().resetRoomSection('appearance', { roomId: 'test-room' });
  assert.equal(store.getState().status, 'running');
  assert.equal(store.getState().outputCustomization.viewer.backgroundColor, defaults.viewer.backgroundColor);
  assert.equal(store.getState().outputCustomization.viewer.elements.find(element => element.type === 'logo').customValue, logoSource);
  store.getState().resetRoomSection('appearance', { roomId: 'test-room', removeLogo: true });
  assert.equal(store.getState().outputCustomization.viewer.elements.find(element => element.type === 'logo').customValue, '');
});

test('reset rejects another room, changed content and a replacement stage cue', () => {
  reset();
  assert.throws(() => store.getState().resetRoomSection('room', { roomId: 'another-room' }), /room changed/);
  assert.throws(() => store.getState().resetRoomSection('rundown', { roomId: 'test-room', expectedRundown: '[]' }), /rundown changed/);
  store.getState().setMessage('New live cue');
  assert.throws(() => store.getState().resetRoomSection('messages', { roomId: 'test-room', expectedMessageId: null }), /different message/);
  assert.equal(store.getState().rundown.length, 3); assert.equal(store.getState().activeMessage.text, 'New live cue');
});

test('older sync snapshots cannot undo a reset and current reset snapshots clear remote content', () => {
  reset();
  const old = { rundown: structuredClone(timers), status: 'running', resetRevision: 0 };
  store.getState().resetRoomSection('room', { roomId: 'test-room' });
  const revision = store.getState().resetRevision;
  store.getState()._applyExternalState(old);
  assert.deepEqual(store.getState().rundown, []); assert.equal(store.getState().status, 'stopped');
  reset();
  store.getState()._applyExternalState({ resetRevision: revision, rundown: [], activeTimerId: null, status: 'stopped', targetDuration: 0, timeRemaining: 0, showStartedAt: null, scheduledStartsArmed: false, messageDraftVersion: String(revision), activeMessage: null });
  assert.deepEqual(store.getState().rundown, []); assert.equal(store.getState().scheduledStartsArmed, false);
  assert.equal(store.getState().messageDraftVersion, String(revision));
});

function withBrowserStorage(run) {
  const oldWindow = globalThis.window; const oldStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  globalThis.window = { location: { search: '', href: 'http://localhost:5173/app/' }, history: { pushState() {} } };
  try { run(values); } finally { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow; if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
}

test('empty rundown and disarmed starts survive leaving and reopening the room without affecting another room', () => {
  reset();
  withBrowserStorage(values => {
    values.set('shotimer_rundown_room-2', JSON.stringify([timers[1]]));
    store.getState().resetRoomSection('room', { roomId: 'test-room' });
    store.getState().switchRoom('room-2');
    assert.equal(store.getState().rundown.length, 1); assert.equal(store.getState().rundown[0].id, timers[1].id);
    store.getState().switchRoom('test-room');
    assert.deepEqual(store.getState().rundown, []); assert.equal(store.getState().activeTimerId, null);
    assert.equal(store.getState().scheduledStartsArmed, false);
    store.getState().start(); store.getState().adjustTime(60);
    assert.equal(store.getState().status, 'stopped'); assert.equal(store.getState().timeRemaining, 0);
    const { id: _id, order: _order, ...item } = timers[0];
    assert.equal(store.getState().addTimer(item), true);
    assert.equal(store.getState().activeTimerId, store.getState().rundown[0].id); assert.equal(store.getState().timeRemaining, 600);
  });
});

test('history navigation switches rooms without adding another browser history entry', () => {
  reset();
  withBrowserStorage(values => {
    values.set('shotimer_rundown_room-2', '[]');
    let entries = 0;
    window.history.pushState = () => { entries += 1; };
    store.getState().switchRoom('room-2', false);
    assert.equal(store.getState().roomId, 'room-2'); assert.equal(entries, 0);
    assert.deepEqual(store.getState().rundown, []);
    store.getState().switchRoom('test-room'); assert.equal(entries, 1);
  });
});

test('scheduled starts cannot fire after either reset until explicitly rearmed', () => {
  reset();
  withBrowserStorage(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    store.getState().updateTimer(timers[0].id, { scheduledStartTime: hhmm });
    store.setState({ isAudioMuted: true });
    store.getState().resetRoomSection('timing', { roomId: 'test-room' });
    store.getState()._checkScheduledStart(now.getTime()); assert.equal(store.getState().status, 'stopped');
    store.getState().armScheduledStarts(); store.getState()._checkScheduledStart(now.getTime()); assert.equal(store.getState().status, 'running');
    store.getState().reset(); store.getState()._checkScheduledStart(now.getTime()); assert.equal(store.getState().status, 'stopped');
    store.getState().armScheduledStarts(); store.getState()._checkScheduledStart(now.getTime()); assert.equal(store.getState().status, 'stopped'); // same cue/minute never fires twice
  });
});

test('cleared outputs show an empty room and reset confirmations explain deletion with appearance opt-in', () => {
  reset(); store.getState().resetRoomSection('room', { roomId: 'test-room' });
  const html = renderToStaticMarkup(createElement(StageDisplay, { state: store.getState(), now: 10000 }));
  assert.match(html, /Waiting for a timer/); assert.ok(!html.includes('00:00')); assert.ok(!html.includes('stage-timer'));
  const agenda = renderToStaticMarkup(createElement(AgendaDisplay, { state: store.getState(), now: 10000 }));
  assert.match(agenda, /No segments have been added/); assert.ok(!agenda.includes('ahead'));
  const confirm = renderToStaticMarkup(createElement(ResetDialog, { scope: 'room', onClose() {} }));
  assert.match(confirm, /Download rundown backup/); assert.match(confirm, /Also reset all output appearance/);
  assert.ok(!confirm.includes('checked=""')); assert.match(confirm, /account, plan/);
});

test('failed reset persistence restores previous saved content and leaves the live room untouched', () => {
  reset(); store.setState({ status: 'running', timeRemaining: 555 });
  withBrowserStorage(values => {
    const before = JSON.stringify(timers);
    values.set('shotimer_rundown_test-room', before);
    const write = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = (key, value) => { if (key === 'shotimer_room_controls_test-room') throw Error('Storage unavailable'); write(key, value); };
    assert.throws(() => store.getState().resetRoomSection('room', { roomId: 'test-room' }), /could not save/);
    assert.equal(values.get('shotimer_rundown_test-room'), before);
    assert.equal(store.getState().rundown.length, 3); assert.equal(store.getState().status, 'running'); assert.equal(store.getState().timeRemaining, 555);
  });
});

test('display tabs never fire scheduled starts', () => {
  reset();
  withBrowserStorage(() => {
    const now = new Date();
    store.getState().updateTimer(timers[0].id, { scheduledStartTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` });
    window.location.search = '?view=viewer';
    store.getState()._checkScheduledStart(now.getTime());
    assert.equal(store.getState().status, 'stopped'); assert.equal(store.getState().showStartedAt, null);
  });
});

test('formatting a selection preserves the surrounding text and keeps styles independent', () => {
  const plain = { text: 'Please STOP now' };
  const bold = formatMessageSelection(plain, { start: 7, end: 11 }, { bold: true });
  const coloured = formatMessageSelection(bold, { start: 7, end: 11 }, { colour: 'red' });
  assert.deepEqual(coloured.richText, [{ text: 'Please ' }, { text: 'STOP', bold: true, colour: 'red' }, { text: ' now' }]);
  const normal = formatMessageSelection(coloured, { start: 7, end: 11 }, { bold: false });
  assert.deepEqual(normal.richText[1], { text: 'STOP', bold: false, colour: 'red' });
  const cleared = formatMessageSelection(normal, { start: 7, end: 11 }, { clear: true });
  assert.deepEqual(cleared, plain);
  assert.deepEqual(plain, { text: 'Please STOP now' }); // transforms never mutate undo snapshots
});

test('case changes update selected text and selection offsets, including expanding Unicode letters', () => {
  const content = { text: 'Go straße now', richText: [{ text: 'Go ' }, { text: 'straße', bold: true, colour: 'blue' }, { text: ' now' }] };
  const next = changeMessageCase(content, { start: 3, end: 9 }, 'upper');
  assert.equal(next.content.text, 'Go STRASSE now');
  assert.deepEqual(next.selection, { start: 3, end: 10 });
  assert.deepEqual(next.content.richText[1], { text: 'STRASSE', bold: true, colour: 'blue' });
  assert.equal(changeMessageCase(next.content, next.selection, 'lower').content.text, 'Go strasse now');
  assert.throws(() => changeMessageCase({ text: 'ß'.repeat(500) }, { start: 0, end: 500 }, 'upper'), /500-character limit/);
});

test('plain-text paste preserves suffix and insertion style within the message limit', () => {
  const content = { text: 'STOP here', richText: [{ text: 'STOP', bold: true, colour: 'green' }, { text: ' here' }] };
  const inserted = insertMessageText(content, { start: 2, end: 4 }, 'and');
  assert.equal(inserted.content.text, 'STand here');
  assert.deepEqual(inserted.selection, { start: 5, end: 5 });
  assert.equal(inserted.content.richText[0].colour, 'green');
  const full = insertMessageText({ text: 'a'.repeat(498) + 'XY' }, { start: 498, end: 499 }, '123');
  assert.equal(full.content.text, 'a'.repeat(498) + '1Y');
  assert.equal(normalizeMessageContent('x'.repeat(499) + '😀').text, 'x'.repeat(499));
});

test('normalization trims text and formatting together and keeps legacy plain messages plain', () => {
  assert.deepEqual(normalizeMessageContent('  hi  ', [{ text: '  ' }, { text: 'hi', bold: true, colour: 'amber' }, { text: '  ' }], true), { text: 'hi', richText: [{ text: 'hi', bold: true, colour: 'yellow' }] });
  assert.deepEqual(normalizeMessageContent('Legacy cue'), { text: 'Legacy cue' });
  assert.deepEqual(normalizeMessageContent('Actual text', [{ text: 'Different', bold: true }]), { text: 'Actual text' });
  assert.deepEqual(normalizeMessageContent('   ', [{ text: '   ', bold: true }], true), { text: '' });
});

test('formatting accepts only supported styles and renders user markup as literal text', () => {
  const text = '<img src=x onerror=alert(1)> STOP';
  const richText = [{ text, bold: true, colour: 'url(javascript:alert(1))', style: 'position:fixed', html: '<script>bad()</script>' }];
  const safe = normalizeMessageContent(text, richText);
  assert.deepEqual(safe.richText, [{ text, bold: true }]);
  assert.doesNotThrow(() => normalizeMessageContent('Hello', [{ text: 'Hello', colour: { toString: null, valueOf: null } }]));
  const html = renderStage({ activeMessage: { id: 'safe', text, richText: safe.richText, severity: 'info', visible: true, isFlashing: false, createdAt: 0 } });
  assert.match(html, /&lt;img/); assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('position:fixed'));
});

test('formatted messages roundtrip through store, remote sync and saved presets without altering playback', () => {
  reset(); store.setState({ status: 'paused', elapsedTime: 42, timeRemaining: 558 });
  const content = formatMessageSelection({ text: 'Please STOP' }, { start: 7, end: 11 }, { bold: true, colour: 'red' });
  const preset = JSON.parse(JSON.stringify({ ...content, severity: 'warning', isFlashing: false, displayMode: 'with-timer' }));
  assert.equal(isMessagePreset(preset), true);
  store.getState().setMessage(preset.text, preset.severity, false, preset.displayMode, preset.richText);
  const sent = structuredClone(store.getState().activeMessage);
  assert.deepEqual(sent.richText, content.richText);
  reset(); store.getState()._applyExternalState({ activeMessage: sent });
  assert.deepEqual(store.getState().activeMessage.richText, content.richText);
  const html = renderStage({ activeMessage: sent });
  assert.match(html, /font-weight:700/); assert.match(html, /color:#ff0000/); assert.match(html, /STOP/);
  for (const colour of Object.keys(MESSAGE_COLOURS)) assert.equal(contentRuns(formatMessageSelection({ text: 'Cue' }, { start: 0, end: 3 }, { colour }))[0].colour, colour);
});

test('Default colour removes only selected word colours and retains weight and surrounding formatting', () => {
  const content = { text: 'STOP now', richText: [{ text: 'STOP', bold: true, colour: 'red' }, { text: ' now', bold: false, colour: 'blue' }] };
  const result = formatMessageSelection(content, { start: 0, end: 4 }, { colour: null });
  assert.deepEqual(result.richText, [{ text: 'STOP', bold: true }, { text: ' now', bold: false, colour: 'blue' }]);
  assert.deepEqual(content.richText[0], { text: 'STOP', bold: true, colour: 'red' });
  assert.equal(messageSelectionColour(result, { start: 0, end: 4 }), 'default');
  assert.deepEqual(formatMessageSelection({ text: 'Plain cue' }, { start: 0, end: 9 }, { colour: null }), { text: 'Plain cue' });
});

test('colour controls distinguish no selection, inherited default and mixed word colours', () => {
  const content = { text: 'Red plain blue', richText: [{ text: 'Red', colour: 'red', bold: true }, { text: ' plain ' }, { text: 'blue', colour: 'blue' }] };
  assert.equal(messageSelectionColour(content, { start: 0, end: 0 }), null);
  assert.equal(messageSelectionColour(content, { start: 0, end: 3 }), 'red');
  assert.equal(messageSelectionColour(content, { start: 4, end: 9 }), 'default');
  assert.equal(messageSelectionColour(content, { start: 0, end: 14 }), 'mixed');
  const allWhite = formatMessageSelection(content, { start: 0, end: 14 }, { colour: 'white' });
  assert.equal(messageSelectionColour(allWhite, { start: 0, end: 14 }), 'white');
  assert.equal(contentRuns(allWhite)[0].bold, true);
});

test('whole-message severity override clears every word colour while preserving weight and text', () => {
  const original = { text: 'STOP now please', richText: [{ text: 'STOP', bold: true, colour: 'red' }, { text: ' now', bold: false, colour: 'blue' }, { text: ' please', colour: 'yellow' }] };
  const overridden = formatMessageSelection(original, { start: 0, end: original.text.length }, { colour: null });
  assert.deepEqual(overridden.richText, [{ text: 'STOP', bold: true }, { text: ' now', bold: false }, { text: ' please' }]);
  for (const severity of ['info', 'warning', 'danger']) {
    const html = renderStage({ activeMessage: { ...overridden, severity, id: 'override', visible: true, isFlashing: false, createdAt: 0 } });
    assert.ok(html.includes(`color:${MESSAGE_SEVERITY_COLOURS[severity]}`));
    assert.match(html, /font-weight:700/); assert.match(html, /font-weight:400/);
    assert.ok(!html.includes('color:#0000ff'));
  }
  const blueAgain = formatMessageSelection(overridden, { start: 5, end: 8 }, { colour: 'blue' });
  assert.equal(messageSelectionColour(blueAgain, { start: 5, end: 8 }), 'blue');
});

test('primary palette is consistent and legacy amber presets survive as yellow', () => {
  assert.deepEqual(MESSAGE_COLOURS, { white: '#ffffff', red: '#ff0000', green: '#00ff00', blue: '#0000ff', yellow: '#ffff00' });
  const legacy = { text: 'Warning', richText: [{ text: 'Warning', bold: true, colour: 'amber' }], severity: 'warning', isFlashing: false };
  assert.equal(isMessagePreset(legacy), true);
  const content = normalizeMessageContent(legacy.text, legacy.richText);
  assert.deepEqual(content.richText, [{ text: 'Warning', bold: true, colour: 'yellow' }]);
  assert.equal(isMessagePreset({ ...legacy, ...content }), true);
  reset();
  store.getState()._applyExternalState({ activeMessage: { ...legacy, id: 'legacy', visible: true, createdAt: 0 } });
  assert.deepEqual(store.getState().activeMessage.richText, content.richText);
});
