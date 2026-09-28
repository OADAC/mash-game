// Audio sintetizado: música generativa con un estilo por edad y efectos.
//  Baby → caja de música · Kids → aventura · Young → synth-hop · Adult → jazz ambiental
window.M = window.M || {};

M.Audio = (() => {
  let ctx = null, master, musicBus, sfxBus, verbIn, delayIn, noiseBuf;
  let muted = false;
  try { muted = localStorage.getItem("mm_muted") === "1"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10];

  function impulse(sec, decay) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.008; comp.release.value = 0.22;
    master.connect(comp); comp.connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(3, 2.6);
    const vOut = ctx.createGain(); vOut.gain.value = 0.4; verbIn = ctx.createGain(); verbIn.connect(verb); verb.connect(vOut); vOut.connect(master);
    const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.3; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    delayIn = ctx.createGain(); delayIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    const dOut = ctx.createGain(); dOut.gain.value = 0.28; lp.connect(dOut); dOut.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75;
    musicBus.connect(master); sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // ——— instrumentos ———
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function send(node, dry, verb = 0.3, dly = 0) {
    node.connect(dry);
    if (verb) { const s = ctx.createGain(); s.gain.value = verb; node.connect(s); s.connect(verbIn); }
    if (dly) { const s = ctx.createGain(); s.gain.value = dly; node.connect(s); s.connect(delayIn); }
  }
  function osc(type, f, t, dur) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + dur + 0.05); return o; }
  const I = {
    // caja de música: senos puros con brillo metálico
    musicbox(bus, t, f, v = 0.12, d = 1.6) { const g = ctx.createGain(); env(g, t, 0.003, v, d); osc("sine", f, t, d).connect(g);
      const g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.35, 0.25); osc("sine", f * 5.02, t, 0.3).connect(g2); g2.connect(g); send(g, bus, 0.55, 0.25); },
    // marimba de plastilina
    bell(bus, t, f, v = 0.13, d = 1.1) { const g = ctx.createGain(); env(g, t, 0.004, v, d); osc("sine", f, t, d).connect(g);
      const g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.4, 0.12); osc("sine", f * 3.99, t, 0.2).connect(g2); g2.connect(g);
      const g3 = ctx.createGain(); g3.gain.value = 0.12; osc("triangle", f * 2, t, d).connect(g3); g3.connect(g); send(g, bus, 0.35, 0.18); },
    pluck(bus, t, f, v = 0.08, d = 0.45, cut = 2600) { const g = ctx.createGain(); env(g, t, 0.004, v, d);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(350, t + d);
      osc("triangle", f, t, d).connect(lp); const g2 = ctx.createGain(); g2.gain.value = 0.2; osc("sawtooth", f * 1.003, t, d).connect(g2); g2.connect(lp); lp.connect(g); send(g, bus, 0.25, 0.2); },
    // lead cuadrado con filtro (synth-hop)
    lead(bus, t, f, v = 0.07, d = 0.35) { const g = ctx.createGain(); env(g, t, 0.01, v, d);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 6; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + d);
      osc("square", f, t, d).connect(lp); const g2 = ctx.createGain(); g2.gain.value = 0.5; const o2 = osc("sawtooth", f * 2.004, t, d); o2.connect(g2); g2.connect(lp); lp.connect(g); send(g, bus, 0.2, 0.3); },
    // piano eléctrico FM (jazz)
    ep(bus, t, f, v = 0.06, d = 1.8) { const g = ctx.createGain(); env(g, t, 0.006, v, d);
      const car = osc("sine", f, t, d), mod = osc("sine", f * 1, t, d), mg = ctx.createGain();
      mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.6);
      mod.connect(mg); mg.connect(car.frequency); car.connect(g);
      const trem = osc("sine", 4.5, t, d), tg = ctx.createGain(); tg.gain.value = 0.12; trem.connect(tg); tg.connect(g.gain);
      send(g, bus, 0.45, 0.08); },
    vibes(bus, t, f, v = 0.08, d = 2) { const g = ctx.createGain(); env(g, t, 0.004, v, d); osc("sine", f, t, d).connect(g);
      const g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.3, 0.3); osc("sine", f * 4, t, 0.4).connect(g2); g2.connect(g);
      const trem = osc("sine", 5.5, t, d), tg = ctx.createGain(); tg.gain.value = 0.3; trem.connect(tg); tg.connect(g.gain); send(g, bus, 0.55, 0.2); },
    pad(bus, t, freqs, dur, v = 0.035, bright = 900, type = "sawtooth") { const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(v, t + dur * 0.35); out.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bright; lp.connect(out);
      freqs.forEach((f) => [-7, 7].forEach((det) => { const o = osc(type, f, t, dur * 1.1); o.detune.value = det; o.connect(lp); })); send(out, bus, 0.6); },
    bass(bus, t, f, d, v = 0.22, type = "sine") { const g = ctx.createGain(); env(g, t, 0.012, v, d); osc(type, f, t, d).connect(g);
      const g2 = ctx.createGain(); g2.gain.value = 0.15; osc("triangle", f * 2, t, d).connect(g2); g2.connect(g); g.connect(bus); },
    sub(bus, t, f, d, v = 0.3) { const g = ctx.createGain(); env(g, t, 0.01, v, d); const o = osc("sine", f, t, d); o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); o.connect(g); g.connect(bus); },
    noise(bus, t, d, v, type = "highpass", freq = 7000, q = 0.8, verb = 0.1) { const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); env(g, t, 0.002, v, d);
      src.connect(f); f.connect(g); send(g, bus, verb); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05); },
    kick(bus, t, v = 0.3, punch = 1) { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(130 * punch, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      const g = ctx.createGain(); env(g, t, 0.003, v, 0.3); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.4); },
    snare(bus, t, v = 0.12) { I.noise(bus, t, 0.16, v, "bandpass", 1900, 0.9, 0.35); const g = ctx.createGain(); env(g, t, 0.002, v * 0.8, 0.09);
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.15); },
  };

  // ——— estilos por edad ———
  // prog: grados de la escala (0 = I); cada bioma transporta la tonalidad
  const STYLES = {
    cajita:  { bpm: 76,  scale: MAJOR, prog: [0, 3, 4, 0, 5, 3, 1, 4], root: 72, swing: 0, dens: 0.45, name: "Caja de música" },
    aventura:{ bpm: 104, scale: MAJOR, prog: [0, 4, 5, 3], root: 62, swing: 0, dens: 0.6, name: "Aventura" },
    synth:   { bpm: 116, scale: MINOR, prog: [5, 3, 0, 4], root: 57, swing: 0.08, dens: 0.55, name: "Synth-hop" },
    jazz:    { bpm: 74,  scale: DORIAN, prog: [1, 4, 0, 5], root: 60, swing: 0.34, dens: 0.35, name: "Jazz ambiental" },
  };
  const BIOME_SHIFT = [0, 2, -3, 5, -1];
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function chord(st, deg, oct = 0, ext = 3) {
    const out = [];
    for (let k = 0; k < ext; k++) { const i = deg + k * 2; out.push(st.root + st.shift + st.scale[i % 7] + 12 * Math.floor(i / 7) + oct); }
    return out;
  }
  function scaleNote(st, i) { return st.root + st.shift + st.scale[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7); }
  function makeMelody(st, seed) {
    const r = rng(seed * 13 + 7), bars = [];
    let idx = 7;
    for (let b = 0; b < 4; b++) {
      const steps = [];
      for (let s = 0; s < 16; s += (st === STYLES.synth ? 1 : 2)) {
        const strong = s % 8 === 0, p = (strong ? 0.8 : s % 4 === 0 ? 0.5 : 0.22) * st.dens * 1.6;
        if (r() < p) { idx += Math.round((r() - 0.5) * (st === STYLES.cajita ? 2.2 : 4)); idx = Math.max(4, Math.min(13, idx)); steps.push({ s, i: idx, len: r() < 0.3 ? 2 : 1 }); }
      }
      bars.push(steps);
    }
    return bars;
  }

  let cur = null, pending = null, timer = null, next = 0, step = 0, bar = 0, cycle = 0;
  function play(styleId, biome = 0, boss = false) {
    if (!ctx) return;
    const st = Object.assign({}, STYLES[styleId] || STYLES.aventura);
    st.id = styleId; st.shift = BIOME_SHIFT[biome % BIOME_SHIFT.length]; st.boss = boss;
    if (boss) { st.bpm *= 1.12; st.scale = MINOR; st.dens *= 1.2; }
    st.mel = makeMelody(st, biome * 31 + (boss ? 99 : 0) + styleId.length);
    const key = styleId + biome + boss;
    if (cur && cur.key === key) return;
    st.key = key;
    if (!timer) { cur = st; next = ctx.currentTime + 0.1; step = bar = cycle = 0; timer = setInterval(tick, 25); }
    else pending = st;
  }
  function stop() { clearInterval(timer); timer = null; cur = null; }
  function tick() {
    while (next < ctx.currentTime + 0.15) {
      if (step % 16 === 0 && pending && bar % 2 === 0) { cur = pending; pending = null; bar = cycle = 0; }
      const st = cur, s = step % 16, six = 60 / st.bpm / 4;
      const swingOff = s % 2 === 1 ? st.swing * six : 0, t = next + swingOff;
      const deg = st.prog[bar % st.prog.length];
      schedule(st, s, t, deg, six);
      next += six; step++;
      if (step % 16 === 0) { bar++; if (bar % st.prog.length === 0) cycle++; }
    }
  }
  function schedule(st, s, t, deg, six) {
    const B = musicBus, c3 = chord(st, deg), c4 = chord(st, deg, 0, 4), mel = st.mel[bar % 4].find((m) => m.s === s);
    const melOn = cycle % 3 !== 2 || st.boss;
    switch (st.id) {
      case "cajita":
        if (s === 0) { I.pad(B, t, c3.map((n) => mtof(n - 12)), six * 16, 0.02, 700, "triangle"); I.bass(B, t, mtof(c3[0] - 24), six * 10, 0.14); }
        if (s % 4 === 2) I.musicbox(B, t, mtof(c3[(s / 4 + bar) % 3 | 0] + 12), 0.045, 1.2);
        if (mel && melOn) I.musicbox(B, t, mtof(scaleNote(st, mel.i) + 12), 0.1, 1.8);
        if (s % 8 === 4) I.noise(B, t, 0.06, 0.018, "highpass", 9000);
        break;
      case "aventura":
        if (s === 0) { I.pad(B, t, c3.map(mtof), six * 16, 0.03, 1000); }
        if (s % 4 === 0) I.bass(B, t, mtof(c3[s % 8 === 0 ? 0 : 2] - 24), six * 3, 0.2);
        if (s % 2 === 0) I.pluck(B, t, mtof(c4[(s / 2) % 4] + 12), 0.06, six * 3);
        if (mel && melOn) I.bell(B, t, mtof(scaleNote(st, mel.i) + 12), 0.12, six * 6 * mel.len);
        if (s === 0 || s === 8) I.kick(B, t, 0.22);
        if (s === 4 || s === 12) I.noise(B, t, 0.1, 0.07, "bandpass", 1600, 1, 0.3);
        if (s % 2 === 0) I.noise(B, t, 0.04, 0.03, "highpass", 8500);
        break;
      case "synth":
        if (s === 0) I.pad(B, t, c3.map(mtof), six * 16, 0.028, 1400);
        if ([0, 3, 6, 10, 11].includes(s)) I.sub(B, t, mtof(c3[0] - 24), six * (s === 0 ? 3 : 1.6), 0.28);
        if (s % 2 === 0 || s % 3 === 0) I.pluck(B, t, mtof(c4[s % 4] + 12 + (s % 8 > 5 ? 12 : 0)), 0.045, six * 1.6, 4200);
        if (mel && melOn) I.lead(B, t, mtof(scaleNote(st, mel.i) + 12), 0.055, six * 2 * mel.len);
        if (s === 0 || s === 7 || s === 10) I.kick(B, t, 0.32, 1.2);
        if (s === 4 || s === 12) I.snare(B, t, 0.13);
        I.noise(B, t, s % 2 ? 0.03 : 0.05, s % 4 === 2 ? 0.05 : 0.025, "highpass", 9500);
        if (st.boss && s % 4 === 0) I.kick(B, t, 0.22, 0.8);
        break;
      case "jazz":
        if (s === 0 || s === 10) c4.forEach((n, k) => I.ep(B, t + k * 0.012, mtof(n + (k === 3 ? 2 : 0)), 0.045, six * 10)); // voicing 7ª/9ª
        if (s % 4 === 0) { const walk = [c3[0], c3[1], c3[2], c3[1] + 1][s / 4]; I.bass(B, t, mtof(walk - 24), six * 3.4, 0.2, "triangle"); }
        if (mel && melOn && s % 2 === 0) I.vibes(B, t, mtof(scaleNote(st, mel.i) + 12), 0.06, six * 8);
        if (s % 4 === 0 || s % 4 === 3) I.noise(B, t, 0.08, s % 4 === 0 ? 0.03 : 0.018, "highpass", 6500, 0.6, 0.3); // ride
        if (s === 4 || s === 12) I.noise(B, t, 0.22, 0.025, "bandpass", 1200, 0.5, 0.4); // escobillas
        break;
    }
  }

  // ——— efectos ———
  const T = () => ctx.currentTime;
  let vac = null;
  const S = {
    jump() { const t = T(), g = ctx.createGain(); env(g, t, 0.005, 0.2, 0.16); const o = osc("sine", 320, t, 0.2); o.frequency.exponentialRampToValueAtTime(760, t + 0.12); o.connect(g); send(g, sfxBus, 0.1); },
    djump() { const t = T(); [0, 0.05, 0.1].forEach((d, i) => I.musicbox(sfxBus, t + d, mtof(84 + [0, 4, 7][i]), 0.07, 0.4)); I.noise(sfxBus, t, 0.18, 0.07, "bandpass", 2500, 0.8, 0.2); },
    land(v = 1) { const t = T(); I.noise(sfxBus, t, 0.09, 0.11 * v, "lowpass", 500, 0.8, 0); const g = ctx.createGain(); env(g, t, 0.003, 0.13 * v, 0.12); const o = osc("sine", 180, t, 0.15); o.frequency.exponentialRampToValueAtTime(70, t + 0.1); o.connect(g); g.connect(sfxBus); },
    absorb(n = 0) { I.musicbox(sfxBus, T(), mtof(79 + [0, 2, 4, 7, 9, 12, 14, 16, 19][Math.min(8, n)]), 0.09, 0.35); },
    spark(n = 0) { I.bell(sfxBus, T(), mtof(84 + [0, 4, 7, 12, 16][Math.min(4, n)]), 0.1, 0.5); },
    pop() { const t = T(); I.musicbox(sfxBus, t, mtof(91), 0.07, 0.2); I.noise(sfxBus, t, 0.04, 0.05, "bandpass", 3000, 2, 0); },
    squish() { const t = T(), g = ctx.createGain(); env(g, t, 0.004, 0.14, 0.2); const o = osc("square", 520, t, 0.25); o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1300; o.connect(lp); lp.connect(g); send(g, sfxBus, 0.15); },
    boing() { const t = T(), g = ctx.createGain(); env(g, t, 0.005, 0.22, 0.4); const o = osc("sine", 180, t, 0.45); o.frequency.exponentialRampToValueAtTime(820, t + 0.3);
      const l = osc("sine", 28, t, 0.45), lg = ctx.createGain(); lg.gain.value = 40; l.connect(lg); lg.connect(o.frequency); o.connect(g); send(g, sfxBus, 0.2); },
    hurt() { const t = T(), g = ctx.createGain(); env(g, t, 0.005, 0.2, 0.5); const o = osc("triangle", 500, t, 0.55); o.frequency.exponentialRampToValueAtTime(160, t + 0.45); o.connect(g); send(g, sfxBus, 0.2); },
    check() { const t = T(); [72, 79, 84, 88].forEach((n, i) => I.bell(sfxBus, t + i * 0.09, mtof(n), 0.1, 1.2)); },
    friend() { const t = T(); [72, 76, 79, 83, 84, 88, 91, 96].forEach((n, i) => I.bell(sfxBus, t + i * 0.07, mtof(n), 0.1, 1.4)); I.pad(sfxBus, t, [60, 64, 67, 71].map(mtof), 3, 0.045, 1600); },
    fire() { const t = T(); I.noise(sfxBus, t, 0.35, 0.14, "bandpass", 700, 0.7, 0.2); const g = ctx.createGain(); env(g, t, 0.01, 0.1, 0.3); const o = osc("sawtooth", 220, t, 0.3); o.frequency.exponentialRampToValueAtTime(90, t + 0.3); const lp = ctx.createBiquadFilter(); lp.frequency.value = 900; o.connect(lp); lp.connect(g); g.connect(sfxBus); },
    power() { const t = T(); [0, 4, 7, 11, 14].forEach((d, i) => I.pluck(sfxBus, t + i * 0.04, mtof(72 + d), 0.08, 0.3, 4000)); },
    giant() { const t = T(), g = ctx.createGain(); env(g, t, 0.02, 0.3, 0.9); const o = osc("sine", 60, t, 1); o.frequency.exponentialRampToValueAtTime(140, t + 0.6); o.connect(g); send(g, sfxBus, 0.4); I.noise(sfxBus, t, 0.6, 0.08, "lowpass", 400, 1, 0.3); },
    sugar() { const t = T(); for (let i = 0; i < 6; i++) I.musicbox(sfxBus, t + i * 0.05, mtof(96 + (i % 3) * 3), 0.04, 0.3); },
    crumble() { I.noise(sfxBus, T(), 0.4, 0.14, "lowpass", 1200, 0.7, 0.2); },
    roar() { const t = T(), g = ctx.createGain(); env(g, t, 0.05, 0.3, 1.2); const o = osc("sawtooth", 90, t, 1.3); o.frequency.exponentialRampToValueAtTime(55, t + 1.2);
      const lp = ctx.createBiquadFilter(); lp.frequency.value = 600; o.connect(lp); lp.connect(g); send(g, sfxBus, 0.5); I.noise(sfxBus, t, 1, 0.1, "lowpass", 300, 1, 0.3); },
    whoosh() { I.noise(sfxBus, T(), 0.45, 0.1, "bandpass", 900, 0.6, 0.4); },
    fanfare() { const t = T(); [[72, 0], [76, 0.15], [79, 0.3], [84, 0.45], [79, 0.75], [84, 0.9], [88, 1.05], [91, 1.35], [96, 1.6]].forEach(([n, d]) => { I.bell(sfxBus, t + d, mtof(n), 0.13, 1.2); I.pluck(sfxBus, t + d, mtof(n - 12), 0.08, 0.4); });
      I.pad(sfxBus, t + 1.35, [65, 69, 72, 76].map(mtof), 4, 0.05, 2000); },
  };
  // aspiración continua (se enciende y apaga)
  function vacuum(on) {
    if (!ctx || muted) return;
    if (on && !vac) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 1.2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, T()); g.gain.exponentialRampToValueAtTime(0.09, T() + 0.15);
      f.frequency.exponentialRampToValueAtTime(1500, T() + 0.6);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(); vac = { src, g };
    } else if (!on && vac) { const v = vac; vac = null; v.g.gain.setTargetAtTime(0.0001, T(), 0.05); setTimeout(() => v.src.stop(), 300); }
  }
  function duck(on) { if (ctx) musicBus.gain.setTargetAtTime(on ? 0.15 : 0.5, ctx.currentTime, 0.3); }

  return {
    init, get ready() { return !!ctx; }, play, stop, duck, vacuum, STYLES,
    sfx(name, arg) { if (ctx && !muted && S[name]) S[name](arg); },
    toggleMute() { muted = !muted; try { localStorage.setItem("mm_muted", muted ? "1" : "0"); } catch (e) {} if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05); if (muted) vacuum(false); return muted; },
    get muted() { return muted; },
  };
})();
