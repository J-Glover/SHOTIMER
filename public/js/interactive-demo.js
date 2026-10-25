// ==========================================================================
// Shotimer — Interactive Hero Stage Demo
// Simulates live director controller, confidence monitor, agenda & OBS overlay
// Includes procedural Web Audio API chimes (0 external audio downloads)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const clockEl = document.getElementById('demo-clock');
  const obsClockEl = document.getElementById('demo-obs-clock');
  const agendaClockEl = document.getElementById('demo-agenda-clock');
  const progressFillEl = document.getElementById('demo-progress-fill');
  const playToggleBtn = document.getElementById('demo-play-btn');
  const resetBtn = document.getElementById('demo-reset-btn');
  const add1mBtn = document.getElementById('demo-add-1m');
  const sub1mBtn = document.getElementById('demo-sub-1m');
  const msgInput = document.getElementById('demo-msg-input');
  const sendMsgBtn = document.getElementById('demo-send-msg-btn');
  const flashBanner = document.getElementById('demo-flash-banner');
  const flashText = document.getElementById('demo-flash-text');
  const tabBtns = document.querySelectorAll('.stage-demo-tab');

  // Screens
  const screenConfidence = document.getElementById('demo-screen-confidence');
  const screenAgenda = document.getElementById('demo-screen-agenda');
  const screenObs = document.getElementById('demo-screen-obs');

  // Audio Audition Buttons
  const btnBell = document.getElementById('audition-bell');
  const btnMarimba = document.getElementById('audition-marimba');
  const btnGong = document.getElementById('audition-gong');

  // Initial State: 14m 35s (875s) of 20m slot (1200s)
  let totalDuration = 1200;
  let remainingSeconds = 875;
  let isRunning = true;
  let timerInterval = null;
  let flashTimeout = null;

  // ========================================================================
  // PROCEDURAL WEB AUDIO SYNTHESIZER (Mathematical Oscillators)
  // ========================================================================
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSoftBell() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.35, now);
      master.connect(ctx.destination);

      [587.33, 880].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 1.8);
      });
    } catch (e) {
      console.warn('Audio play restricted:', e);
    }
  }

  function playMarimba() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 rising triad

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.4, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.85);
      });
    } catch (e) {
      console.warn('Audio play restricted:', e);
    }
  }

  function playGong() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.45, now);
      master.connect(ctx.destination);

      [130.81, 261.63, 392.00, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(1 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 3.0);
      });
    } catch (e) {
      console.warn('Audio play restricted:', e);
    }
  }

  function pulseButton(btn) {
    if (!btn) return;
    btn.classList.add('playing');
    setTimeout(() => btn.classList.remove('playing'), 600);
  }

  if (btnBell) {
    btnBell.addEventListener('click', () => {
      pulseButton(btnBell);
      playSoftBell();
    });
  }

  if (btnMarimba) {
    btnMarimba.addEventListener('click', () => {
      pulseButton(btnMarimba);
      playMarimba();
    });
  }

  if (btnGong) {
    btnGong.addEventListener('click', () => {
      pulseButton(btnGong);
      playGong();
    });
  }

  // ========================================================================
  // TIMER DISPLAY & TIMING ENGINE
  // ========================================================================
  function formatTime(seconds) {
    const isNegative = seconds < 0;
    const absSec = Math.abs(seconds);
    const m = Math.floor(absSec / 60);
    const s = absSec % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return isNegative ? `-${formatted}` : formatted;
  }

  function updateDisplay() {
    const timeStr = formatTime(remainingSeconds);

    if (clockEl) clockEl.textContent = timeStr;
    if (obsClockEl) obsClockEl.textContent = timeStr;
    if (agendaClockEl) agendaClockEl.textContent = timeStr;

    // Color Thresholds: Green (> 120s), Amber (30s-120s), Red (< 30s)
    let activeColor = 'var(--emerald-live)';
    let activeGlow = '0 0 20px rgba(16, 185, 129, 0.35)';

    if (remainingSeconds <= 30) {
      activeColor = 'var(--signal-red)';
      activeGlow = '0 0 20px rgba(239, 68, 68, 0.4)';
    } else if (remainingSeconds <= 120) {
      activeColor = 'var(--amber-tally)';
      activeGlow = '0 0 20px rgba(245, 158, 11, 0.35)';
    }

    if (clockEl) {
      clockEl.style.color = activeColor;
      clockEl.style.textShadow = activeGlow;
    }
    if (obsClockEl) {
      obsClockEl.style.color = activeColor;
    }
    if (progressFillEl) {
      progressFillEl.style.backgroundColor = activeColor;
      const pct = Math.max(0, Math.min(100, (remainingSeconds / totalDuration) * 100));
      progressFillEl.style.width = `${pct}%`;
    }
  }

  function tick() {
    if (!isRunning) return;
    remainingSeconds -= 1;
    updateDisplay();

    // Trigger subtle chime alert at exactly 2m and 30s
    if (remainingSeconds === 120) playSoftBell();
    if (remainingSeconds === 0) playGong();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    isRunning = true;
    timerInterval = setInterval(tick, 1000);
    if (playToggleBtn) {
      playToggleBtn.classList.remove('primary-toggle');
      playToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
        </svg>
        <span>Pause</span>
      `;
    }
  }

  function pauseTimer() {
    isRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    if (playToggleBtn) {
      playToggleBtn.classList.add('primary-toggle');
      playToggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Start</span>
      `;
    }
  }

  // Controls
  if (playToggleBtn) {
    playToggleBtn.addEventListener('click', () => {
      if (isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      pauseTimer();
      remainingSeconds = 1200;
      updateDisplay();
    });
  }

  if (add1mBtn) {
    add1mBtn.addEventListener('click', () => {
      remainingSeconds += 60;
      totalDuration = Math.max(totalDuration, remainingSeconds);
      updateDisplay();
    });
  }

  if (sub1mBtn) {
    sub1mBtn.addEventListener('click', () => {
      remainingSeconds = Math.max(0, remainingSeconds - 60);
      updateDisplay();
    });
  }

  // Flash Message Cue
  function triggerFlashMessage(text) {
    if (!text || !flashBanner || !flashText) return;
    flashText.textContent = text;
    flashBanner.style.display = 'block';

    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => {
      flashBanner.style.display = 'none';
    }, 5000);
  }

  if (sendMsgBtn && msgInput) {
    sendMsgBtn.addEventListener('click', () => {
      const val = msgInput.value.trim();
      if (val) {
        triggerFlashMessage(val);
        msgInput.value = '';
      }
    });

    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = msgInput.value.trim();
        if (val) {
          triggerFlashMessage(val);
          msgInput.value = '';
        }
      }
    });
  }

  // Multi-Mode Screen Tab Switching (Confidence vs Agenda vs OBS Overlay)
  tabBtns.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabBtns.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.getAttribute('data-mode');

      // Hide all screens first
      if (screenConfidence) screenConfidence.style.display = 'none';
      if (screenAgenda) screenAgenda.style.display = 'none';
      if (screenObs) screenObs.style.display = 'none';

      // Show selected screen
      if (mode === 'viewer') {
        if (screenConfidence) screenConfidence.style.display = 'block';
      } else if (mode === 'agenda') {
        if (screenAgenda) screenAgenda.style.display = 'block';
      } else if (mode === 'overlay') {
        if (screenObs) screenObs.style.display = 'flex';
      }

      updateDisplay();
    });
  });

  // Start initially
  updateDisplay();
  startTimer();
});
