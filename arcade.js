/*
 * Alisha Arcade — shared helpers used by every page.
 * Included as <script src="[../]arcade.js"></script> (before the page script).
 *
 * Exposes window.Arcade:
 *   getCoins()                     -> current global coin balance
 *   addCoins(n)                    -> add earned points to the wallet
 *   getHigh(key)                   -> a game's stored high score
 *   maybeUpdateHigh(key, v)        -> raise-only high-score write
 *   initInfoMenu(hsKey)            -> wire the shared ⓘ Info modal
 *   sound.*                        -> shared Web Audio sound effects (no files):
 *                                     presets roll/step/up/down/chime/buzz/
 *                                     coin/click/win/lose, primitives tone/
 *                                     burst/seq, and an arcade-wide mute
 *                                     (ensure/isMuted/setMuted/toggle).
 *
 * All of it is localStorage-backed and never clears user data.
 */
(function (global) {
  var COINS_KEY = 'arcade-coins';
  var NAME_KEY = 'arcade-player-name';
  var OWNED_KEY = 'arcade-owned';
  var MUTED_KEY = 'arcade-muted';

  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  var Arcade = {
    // Player's chosen name (set on the arcade landing page). '' if unset.
    getName: function () {
      try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch (e) { return ''; }
    },
    setName: function (v) {
      v = (v || '').trim().slice(0, 20);
      try {
        if (v) localStorage.setItem(NAME_KEY, v);
        else localStorage.removeItem(NAME_KEY);
      } catch (e) { /* ignore */ }
    },
    getCoins: function () {
      try { return num(localStorage.getItem(COINS_KEY)); } catch (e) { return 0; }
    },
    // Earned points accumulate across all games (spendable in the Shop).
    addCoins: function (n) {
      n = Math.round(n) || 0;
      if (n <= 0) return;
      try { localStorage.setItem(COINS_KEY, String(Arcade.getCoins() + n)); } catch (e) { /* ignore */ }
    },
    // Spend from the wallet (clamped at 0).
    spendCoins: function (n) {
      n = Math.round(n) || 0;
      if (n <= 0) return;
      try { localStorage.setItem(COINS_KEY, String(Math.max(0, Arcade.getCoins() - n))); } catch (e) { /* ignore */ }
    },
    // Owned shop items (accessories), stored as a JSON array of item ids.
    getOwned: function () {
      try { var v = JSON.parse(localStorage.getItem(OWNED_KEY)); return Array.isArray(v) ? v : []; }
      catch (e) { return []; }
    },
    owns: function (id) { return Arcade.getOwned().indexOf(id) !== -1; },
    // Attempt a purchase. Returns 'ok' | 'owned' | 'insufficient'.
    buy: function (id, cost) {
      if (Arcade.owns(id)) return 'owned';
      if (Arcade.getCoins() < cost) return 'insufficient';
      Arcade.spendCoins(cost);
      var owned = Arcade.getOwned();
      owned.push(id);
      try { localStorage.setItem(OWNED_KEY, JSON.stringify(owned)); } catch (e) { /* ignore */ }
      return 'ok';
    },
    getHigh: function (key) {
      try { return num(localStorage.getItem(key)); } catch (e) { return 0; }
    },
    // Raise-only: never lowers or resets a stored best.
    maybeUpdateHigh: function (key, v) {
      if (v > Arcade.getHigh(key)) {
        try { localStorage.setItem(key, String(v)); } catch (e) { /* ignore */ }
      }
    },
    // Wire the shared Info modal (expects #infoBtn, #infoModal, #infoClose,
    // #highScore in the page). Shows the game's high score when opened.
    initInfoMenu: function (hsKey) {
      var infoBtn = document.getElementById('infoBtn');
      var infoModal = document.getElementById('infoModal');
      var infoClose = document.getElementById('infoClose');
      var highScoreEl = document.getElementById('highScore');
      if (!infoBtn || !infoModal) return;
      infoBtn.addEventListener('click', function () {
        if (highScoreEl) highScoreEl.textContent = Arcade.getHigh(hsKey);
        infoModal.classList.add('show');
      });
      if (infoClose) infoClose.addEventListener('click', function () { infoModal.classList.remove('show'); });
      infoModal.addEventListener('click', function (e) {
        if (e.target === infoModal) infoModal.classList.remove('show');
      });
    }
  };

  // --- Shared sound engine (Web Audio; all tones/noise generated on the fly,
  // no audio files, so it works offline). Every game can reuse these. Sounds
  // are safe no-ops when muted or when Web Audio is unavailable. ---
  var _actx = null;
  var _master = null;
  var _muted = false;
  try { _muted = localStorage.getItem(MUTED_KEY) === '1'; } catch (e) {}

  // Create/resume the AudioContext. Call from a user gesture (tap/click) so
  // mobile browsers allow playback. Everything routes through a master gain so
  // mute can silence even ongoing sounds (e.g. the racing engine).
  function _ctx() {
    if (!_actx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { _actx = new AC(); } catch (e) { return null; }
      _master = _actx.createGain();
      _master.gain.value = _muted ? 0 : 1;
      _master.connect(_actx.destination);
    }
    if (_actx.state === 'suspended') { try { _actx.resume(); } catch (e) {} }
    return _actx;
  }
  function _out() { return _master || (_actx && _actx.destination); }
  function _live() { return _muted ? null : _ctx(); }

  // One oscillator note with an attack/decay envelope (optional pitch glide).
  function _note(c, freq, t0, dur, type, vol, glideTo) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(_out());
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // A short filtered-noise burst (rattles, hisses, impacts).
  function _noise(c, t0, dur, vol, freq, q) {
    var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = c.createBufferSource(); src.buffer = buf;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = freq || 1200; bp.Q.value = q || 0.8;
    var g = c.createGain(); g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(_out());
    src.start(t0); src.stop(t0 + dur);
  }

  var sound = {
    // Mute control (shared across the whole arcade).
    ensure: function () { return _ctx(); },
    isMuted: function () { return _muted; },
    setMuted: function (v) {
      _muted = !!v;
      try { localStorage.setItem(MUTED_KEY, _muted ? '1' : '0'); } catch (e) {}
      if (_master && _actx) { try { _master.gain.setTargetAtTime(_muted ? 0 : 1, _actx.currentTime, 0.02); } catch (e) { _master.gain.value = _muted ? 0 : 1; } }
    },
    toggle: function () { sound.setMuted(!_muted); return _muted; },

    // Primitives — build any custom sound. opts.delay offsets from "now".
    tone: function (o) {
      var c = _live(); if (!c) return; o = o || {};
      _note(c, o.freq || 440, c.currentTime + (o.delay || 0), o.dur || 0.15, o.type || 'sine', o.vol == null ? 0.18 : o.vol, o.glideTo);
    },
    burst: function (o) {
      var c = _live(); if (!c) return; o = o || {};
      _noise(c, c.currentTime + (o.delay || 0), o.dur || 0.1, o.vol == null ? 0.12 : o.vol, o.freq || 1200, o.q || 0.8);
    },
    seq: function (freqs, o) {
      var c = _live(); if (!c) return; o = o || {}; var gap = o.gap || 0.1, t = c.currentTime;
      for (var i = 0; i < freqs.length; i++) _note(c, freqs[i], t + i * gap, o.dur || 0.16, o.type || 'triangle', o.vol == null ? 0.18 : o.vol);
    },

    // Reusable named effects any game can call.
    click: function () { sound.tone({ freq: 660, dur: 0.05, type: 'square', vol: 0.1 }); },
    step: function () { sound.tone({ freq: 680, dur: 0.07, vol: 0.1 }); },
    roll: function () { var c = _live(); if (!c) return; var t = c.currentTime; for (var i = 0; i < 5; i++) _noise(c, t + i * 0.075, 0.06, 0.14, 500 + Math.random() * 900, 1.2); },
    coin: function () { var c = _live(); if (!c) return; var t = c.currentTime; _note(c, 988, t, 0.09, 'square', 0.14); _note(c, 1319, t + 0.08, 0.14, 'square', 0.14); },
    chime: function () { var c = _live(); if (!c) return; var t = c.currentTime; _note(c, 784, t, 0.12, 'square', 0.14); _note(c, 1175, t + 0.1, 0.16, 'square', 0.14); },
    buzz: function () { sound.tone({ freq: 200, dur: 0.45, type: 'sawtooth', vol: 0.16, glideTo: 90 }); },
    pop: function () { sound.tone({ freq: 880, dur: 0.08, type: 'triangle', vol: 0.14 }); },
    zap: function () { var c = _live(); if (!c) return; _note(c, 1200, c.currentTime, 0.14, 'square', 0.12, 300); },
    drop: function () { var c = _live(); if (!c) return; var t = c.currentTime; _note(c, 300, t, 0.14, 'triangle', 0.16, 120); _note(c, 150, t + 0.02, 0.16, 'sine', 0.12); },
    up: function () { sound.seq([523, 659, 784, 1047], { gap: 0.09, dur: 0.16, type: 'triangle', vol: 0.16 }); },
    // Scary snake bite / damage: a detuned downward growl + low sub + hiss + thud.
    down: function () {
      var c = _live(); if (!c) return; var t = c.currentTime;
      _note(c, 480, t, 0.6, 'sawtooth', 0.16, 70);      // growl voice 1
      _note(c, 507, t, 0.6, 'sawtooth', 0.12, 66);      // detuned voice 2 (beating)
      _note(c, 140, t + 0.04, 0.55, 'sine', 0.16, 52);  // ominous sub
      _noise(c, t, 0.6, 0.09, 2200, 0.5);               // hiss
      _note(c, 85, t + 0.5, 0.2, 'sine', 0.22);         // final thud
    },
    // Exciting win: a rising run into a held major chord with a sparkle on top.
    win: function () {
      var c = _live(); if (!c) return; var t = c.currentTime;
      [523, 659, 784, 1047].forEach(function (f, i) { _note(c, f, t + i * 0.09, 0.2, 'triangle', 0.18); });
      var ct = t + 4 * 0.09;
      [523, 659, 784, 1047].forEach(function (f) { _note(c, f, ct, 0.75, 'triangle', 0.14); });   // chord
      [1568, 2093, 1568, 2637].forEach(function (f, i) { _note(c, f, ct + 0.18 + i * 0.1, 0.16, 'sine', 0.1); }); // sparkle
    },
    lose: function () { sound.seq([392, 330, 262], { gap: 0.16, dur: 0.3, type: 'triangle', vol: 0.18 }); },

    // Car crash: low crunch + glass/debris + a downward metallic clang + thud.
    crash: function () {
      var c = _live(); if (!c) return; var t = c.currentTime;
      _noise(c, t, 0.4, 0.22, 500, 0.4);
      _noise(c, t, 0.22, 0.14, 3000, 0.7);
      _note(c, 300, t, 0.35, 'square', 0.18, 60);
      _note(c, 90, t + 0.02, 0.4, 'sine', 0.2);
    },

    // A continuous engine hum. Returns a controller: setSpeed(0..1) revs it,
    // stop() fades it out. No-op controller when muted / unsupported.
    engine: function () {
      var c = _live();
      if (!c) return { setSpeed: function () {}, stop: function () {} };
      var t = c.currentTime;
      var o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 70;
      var o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 72;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      var g = c.createGain(); g.gain.value = 0.0001;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(_out());
      o1.start(t); o2.start(t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.3);   // fade in
      var stopped = false;
      return {
        setSpeed: function (frac) {
          if (stopped) return;
          frac = frac < 0 ? 0 : frac > 1 ? 1 : frac;
          var now = c.currentTime, f = 55 + frac * 130;
          o1.frequency.setTargetAtTime(f, now, 0.06);
          o2.frequency.setTargetAtTime(f * 1.03, now, 0.06);
          lp.frequency.setTargetAtTime(500 + frac * 1600, now, 0.06);
          g.gain.setTargetAtTime(0.035 + frac * 0.05, now, 0.06);
        },
        stop: function () {
          if (stopped) return; stopped = true;
          var now = c.currentTime;
          g.gain.setTargetAtTime(0.0001, now, 0.06);
          try { o1.stop(now + 0.4); o2.stop(now + 0.4); } catch (e) {}
        }
      };
    }
  };
  Arcade.sound = sound;

  global.Arcade = Arcade;
})(window);
