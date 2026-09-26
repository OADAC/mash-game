// Música generativa y efectos de sonido, todo sintetizado con WebAudio.
window.M = window.M || {};

M.Audio = (() => {
  let ctx = null, master, musicBus, sfxBus, verbIn, delayIn;
  let muted = false;
  try { muted = localStorage.getItem("mm_muted") === "1"; } catch (e) {}

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const PENTA = [0, 2, 4, 7, 9];

  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  let noiseBuf;
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);

    const verb = ctx.createConvolver(); verb.buffer = impulse(3.2, 2.6);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.42;
    verbIn = ctx.createGain(); verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);

    const delay = ctx.createDelay(1.5); delay.delayTime.value = (60 / 92) * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    delayIn = ctx.createGain();
    delayIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.3; lp.connect(dOut); dOut.connect(master); dOut.connect(verbIn);

    musicBus = ctx.createGain(); musicBus.gain.value = 0.55;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75;
    musicBus.connect(master); sfxBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ——— instrumentos ———
  function env(g, t, a, peak, d, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  function send(node, dry, verb = 0.3, dly = 0) {
    node.connect(dry);
    if (verb) { const s = ctx.createGain(); s.gain.value = verb; node.connect(s); s.connect(verbIn); }
    if (dly) { const s = ctx.createGain(); s.gain.value = dly; node.connect(s); s.connect(delayIn); }
  }
  // marimba / campanita de plastilina
  function bell(bus, t, f, vel = 0.3, dur = 1.2, verb = 0.35, dly = 0.2) {
    const out = ctx.createGain(); env(out, t, 0.004, vel, dur);
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 3.99;
    const g2 = ctx.createGain(); env(g2, t, 0.002, 0.35, 0.12);
    const o3 = ctx.createOscillator(); o3.type = "triangle"; o3.frequency.value = f * 2;
    const g3 = ctx.createGain(); g3.gain.value = 0.12;
    o1.connect(out); o2.connect(g2); g2.connect(out); o3.connect(g3); g3.connect(out);
    send(out, bus, verb, dly);
    [o1, o2, o3].forEach((o) => { o.start(t); o.stop(t + dur + 0.1); });
  }
  function pluck(bus, t, f, vel = 0.15, dur = 0.5, cut = 2400) {
    const out = ctx.createGain(); env(out, t, 0.005, vel, dur);
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = f * 1.003;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(out);
    send(out, bus, 0.25, 0.25);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function pad(bus, t, freqs, dur, vel = 0.05, bright = 900) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vel, t + dur * 0.35);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bright; lp.Q.value = 0.7;
    lp.connect(out);
    freqs.forEach((f) => {
      [-6, 6].forEach((det) => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(t + dur * 1.1);
      });
    });
    send(out, bus, 0.6, 0);
  }
  function bass(bus, t, f, dur, vel = 0.22) {
    const out = ctx.createGain(); env(out, t, 0.02, vel, dur);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    o.connect(out); o2.connect(g2); g2.connect(out); out.connect(bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  function noise(bus, t, dur, vel, type = "highpass", freq = 7000, q = 0.8, verb = 0.1) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.002, vel, dur);
    src.connect(f); f.connect(g); send(g, bus, verb, 0);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    return f;
  }
  function kick(bus, t, vel = 0.35) {
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain(); env(g, t, 0.003, vel, 0.28);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.35);
  }

  // ——— compositor ———
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  const THEMES = [
    { root: 60, bpm: 92, prog: [0, 5, 3, 4], seed: 11, drums: 1, arp: [0, 2, 1, 2, 0, 2, 1, 2], bright: 1000 }, // Pradera
    { root: 62, bpm: 96, prog: [0, 3, 5, 4], seed: 23, drums: 1, arp: [0, 1, 2, 1, 0, 1, 2, 3], bright: 1200 }, // Setas
    { root: 57, bpm: 88, prog: [5, 3, 0, 4], seed: 37, drums: 1, arp: [2, 1, 0, 1, 2, 1, 0, 3], bright: 900 },  // Aldea (la menor → relativa)
    { root: 64, bpm: 76, prog: [0, 2, 5, 3], seed: 51, drums: 0, arp: [0, 2, 3, 2, 1, 2, 3, 2], bright: 700 },  // Valle nocturno
    { root: 65, bpm: 112, prog: [0, 4, 5, 3], seed: 73, drums: 2, arp: [0, 1, 2, 3, 2, 1, 2, 3], bright: 1500 }, // Fiesta
    { root: 60, bpm: 84, prog: [0, 3, 5, 4], seed: 91, drums: 0, arp: [0, 2, 1, 2, 3, 2, 1, 2], bright: 800 },  // Título
  ];
  function chordNotes(theme, deg, oct = 0) {
    return [0, 2, 4, 6].map((k) => {
      const i = deg + k;
      return theme.root + MAJOR[i % 7] + 12 * Math.floor(i / 7) + oct;
    });
  }
  function makeMelody(theme) {
    const r = rng(theme.seed), bars = [];
    let idx = 7;
    for (let b = 0; b < 4; b++) {
      const steps = [];
      for (let s = 0; s < 8; s++) {
        const strong = s % 4 === 0, p = strong ? 0.85 : s % 2 === 0 ? 0.5 : 0.25;
        if (r() < p) {
          idx += Math.round((r() - 0.5) * 4);
          idx = Math.max(3, Math.min(12, idx));
          steps.push({ s, i: idx, len: r() < 0.3 ? 2 : 1 });
        }
      }
      bars.push(steps);
    }
    return bars;
  }
  const penta = (theme, i) => theme.root + 12 + PENTA[i % 5] + 12 * Math.floor(i / 5) - 12;

  let seqTimer = null, current = -1, pending = -1, nextTime = 0, step = 0, melody = null, bar = 0, cycle = 0;
  function startMusic(themeIdx) {
    if (!ctx) return;
    pending = themeIdx;
    if (!seqTimer) {
      current = themeIdx; pending = -1; melody = makeMelody(THEMES[current]);
      nextTime = ctx.currentTime + 0.1; step = 0; bar = 0; cycle = 0;
      seqTimer = setInterval(tick, 25);
    }
  }
  function stopMusic() { if (seqTimer) clearInterval(seqTimer); seqTimer = null; current = -1; }
  function tick() {
    const th = THEMES[current], eighth = 60 / th.bpm / 2;
    while (nextTime < ctx.currentTime + 0.15) {
      const s = step % 8;
      if (s === 0) {
        if (pending >= 0 && pending !== current && bar % 2 === 0) {
          current = pending; pending = -1; melody = makeMelody(THEMES[current]); bar = 0; cycle = 0;
          return tick();
        }
        const deg = th.prog[bar % 4], ch = chordNotes(th, deg);
        pad(musicBus, nextTime, ch.slice(0, 3).map(mtof), eighth * 8, current === 3 ? 0.045 : 0.035, th.bright);
        bass(musicBus, nextTime, mtof(ch[0] - 24), eighth * 3.5);
      }
      const deg = th.prog[bar % 4], ch = chordNotes(th, deg);
      if (s === 4) bass(musicBus, nextTime, mtof(ch[s === 4 && bar % 2 ? 2 : 0] - 24), eighth * 3);
      // arpegio
      if (cycle > 0 || bar > 0 || s > 0) {
        const n = ch[th.arp[s] % 4] + 12;
        pluck(musicBus, nextTime, mtof(n), current === 3 ? 0.07 : 0.085, eighth * 2.5, th.bright * 2.4);
      }
      // melodía (entra en el segundo ciclo para dar respiro)
      if (cycle % 3 !== 0 || current === 4) {
        const m = melody[bar % 4].find((x) => x.s === s);
        if (m) {
          let note = penta(th, m.i);
          if (bar % 4 === 3 && s === 6 && cycle % 2 === 1) note = th.root + 12;
          bell(musicBus, nextTime, mtof(note), current === 3 ? 0.16 : 0.13, eighth * 4 * m.len, 0.45, 0.3);
        }
      }
      // percusión suave
      if (th.drums) {
        if (s === 0 || (th.drums === 2 && s === 4)) kick(musicBus, nextTime, 0.22);
        if (s % 2 === 1) noise(musicBus, nextTime, 0.05, 0.035, "highpass", 8000);
        if (th.drums === 2 && s === 4) noise(musicBus, nextTime, 0.12, 0.08, "bandpass", 1800, 1.2, 0.3);
      } else if (s % 4 === 2) {
        // campanillas brillantes en el valle nocturno
        bell(musicBus, nextTime, mtof(ch[(bar + s) % 4] + 24), 0.035, 2.2, 0.8, 0.4);
      }
      nextTime += eighth;
      step++;
      if (step % 8 === 0) { bar++; if (bar % 4 === 0) cycle++; }
    }
  }

  let duckT = null;
  function duck(on) {
    if (!ctx) return;
    const g = musicBus.gain; g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(on ? 0.16 : 0.55, ctx.currentTime, 0.3);
  }

  // ——— efectos ———
  const T = () => ctx.currentTime;
  const S = {
    jump() {
      const t = T(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(760, t + 0.12);
      env(g, t, 0.005, 0.22, 0.16); o.connect(g); send(g, sfxBus, 0.1); o.start(t); o.stop(t + 0.2);
    },
    djump() {
      const t = T();
      [0, 0.05, 0.1].forEach((d, i) => bell(sfxBus, t + d, mtof(84 + [0, 4, 7][i]), 0.08, 0.4, 0.3, 0));
      noise(sfxBus, t, 0.18, 0.08, "bandpass", 2500, 0.8, 0.2);
    },
    land(v = 1) {
      const t = T();
      noise(sfxBus, t, 0.09, 0.12 * v, "lowpass", 500, 0.8, 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
      env(g, t, 0.003, 0.14 * v, 0.12); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.15);
    },
    spark(combo = 0) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const n = 79 + scale[Math.min(combo, scale.length - 1)];
      bell(sfxBus, T(), mtof(n), 0.14, 0.6, 0.35, 0.25);
    },
    boing() {
      const t = T(), o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.3);
      lfo.frequency.value = 28; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.005, 0.25, 0.4); o.connect(g); send(g, sfxBus, 0.2); o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45);
    },
    stomp() {
      const t = T(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
      env(g, t, 0.004, 0.14, 0.2); o.connect(lp); lp.connect(g); send(g, sfxBus, 0.15); o.start(t); o.stop(t + 0.25);
      [0.08, 0.14, 0.2].forEach((d, i) => bell(sfxBus, t + d, mtof(88 + i * 4), 0.07, 0.5, 0.4, 0.2));
    },
    hurt() {
      const t = T(), o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.45);
      lfo.frequency.value = 14; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency);
      env(g, t, 0.005, 0.22, 0.5); o.connect(g); send(g, sfxBus, 0.2); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55);
    },
    check() { const t = T(); [72, 79, 84, 88].forEach((n, i) => bell(sfxBus, t + i * 0.09, mtof(n), 0.12, 1.2, 0.5, 0.3)); },
    friend() {
      const t = T();
      [72, 76, 79, 83, 84, 88, 91, 96].forEach((n, i) => bell(sfxBus, t + i * 0.07, mtof(n), 0.11, 1.4, 0.55, 0.3));
      pad(sfxBus, t, [60, 64, 67, 71].map(mtof), 3, 0.05, 1600);
    },
    pop() { const t = T(); bell(sfxBus, t, mtof(91), 0.08, 0.2, 0.1, 0); noise(sfxBus, t, 0.04, 0.05, "bandpass", 3000, 2, 0); },
    whoosh() { noise(sfxBus, T(), 0.5, 0.1, "bandpass", 900, 0.6, 0.4); },
    fanfare() {
      const t = T(), seq = [[72, 0], [76, 0.15], [79, 0.3], [84, 0.45], [79, 0.75], [84, 0.9], [88, 1.05], [91, 1.35], [96, 1.6]];
      seq.forEach(([n, d]) => { bell(sfxBus, t + d, mtof(n), 0.15, 1.2, 0.5, 0.3); pluck(sfxBus, t + d, mtof(n - 12), 0.1, 0.4); });
      pad(sfxBus, t + 1.35, [65, 69, 72, 76].map(mtof), 4, 0.06, 2000);
    },
  };

  return {
    init,
    get ready() { return !!ctx; },
    startMusic, stopMusic, duck,
    play(name, arg) { if (ctx && !muted && S[name]) S[name](arg); },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem("mm_muted", muted ? "1" : "0"); } catch (e) {}
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() { return muted; },
  };
})();
