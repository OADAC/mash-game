// Sorpresas y vida del mundo en tiempo real (v5 "Vivo"): eventos aleatorios y programados (L.events),
// lógica de los set pieces (persecución, puente, gelatina que sube, oleadas, cueva oscura), clima y paredes falsas.
// API: M.Events.init(G) · step(G, dt) · drawWorld(c, G) · drawFront(c, G) · drawScreen(c, G, VW, VH)
//      trigger(G, tipo) · plan(L, o, r) (lo llama el generador) · summary(G) (para la UI al acabar el mundo)
window.M = window.M || {};

M.Events = (() => {
  const NOOP = () => {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PASTEL = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff", "#ffffff"];
  const RAINBOW = ["#ff9fb6", "#ffc28e", "#ffe98a", "#aef0b8", "#9fd9ff", "#c9b6ff"];
  // efectos: usa M.FX (motor) si existe; si no, no hace nada
  function fx(G) {
    const f = M.FX || {};
    return {
      part: f.part || NOOP, burst: f.burst || NOOP, puff: f.puff || NOOP, spawnMinis: f.spawnMinis || NOOP,
      say: f.say || M.say || NOOP,
      shake: f.shake || ((n) => { if (G && G.cam) G.cam.shake = Math.max(G.cam.shake || 0, n); }),
      sfx: f.sfx || ((n) => { if (M.Audio && M.Audio.sfx) M.Audio.sfx(n); }),
    };
  }
  const banner = (G, title, sub) => { if (G.onEvent) G.onEvent("banner", { title, sub }); };

  // ——— catálogo de sorpresas ———
  const INFO = {
    candyRain: { icon: "🍭", title: "¡Lluvia de caramelos!", sub: "¡Abre bien la boca!", baby: "¡Caramelos del cielo!", dur: 9 },
    quake:     { icon: "🍮", title: "¡Terremoto de gelatina!", sub: "El suelo ondula y todo tiembla", baby: "¡Todo hace blandi-blandi!", dur: 6 },
    windShift: { icon: "🌬️", title: "¡Ráfaga loca!", sub: "El viento cambia de sentido", baby: "¡Sopla el viento!", dur: 8 },
    eclipse:   { icon: "🌑", title: "¡Eclipse!", sub: "Cae la noche unos segundos", baby: "Se hace de noche… ¡qué bonito!", dur: 8 },
    stampede:  { icon: "🐾", title: "¡Estampida!", sub: "Una manada de grumos cruza el camino", baby: "¡Vienen grumos corriendo!", dur: 12 },
    wanderer:  { icon: "👣", title: "Grumo gigante errante", sub: "Te ha olido… ¡salta encima!", baby: "¡Un grumo grandote! Salta encima", dur: 18 },
    rainbow:   { icon: "🌈", title: "¡Arcoíris!", sub: "Se ha vuelto puente… ¡por poco tiempo!", baby: "¡Súbete al arcoíris!", dur: 11 },
    portal:    { icon: "🌀", title: "¡Un portal!", sub: "Lleva a una isla bonus en el cielo", baby: "¡Entra, entra!", dur: 22 },
    wildHelp:  { icon: "🆘", title: "¡Un Mash salvaje pide ayuda!", sub: "Aparta a los grumos que lo rodean", baby: "¡Ayúdale!", dur: 45 },
    merchant:  { icon: "🛒", title: "Mercader de caramelos", sub: "Quédate a su lado: 3 ⭐ = 1 caramelo", baby: "¡Te regala caramelos!", dur: 30 },
  };
  const ZONES = ["chase", "collapse", "flood", "waves", "dark"];

  // pesos de sorpresas según edad, ánimo de la región y lo que ya ha pasado
  function poolFor(L) {
    const bl = (L.mood && L.mood.bloom) || 0, bi = (L.mood && L.mood.bitter) || 0, pc = M.ProcChar ? 1 : 0;
    if (L.age === "baby") return { candyRain: 3, rainbow: 3, portal: 2, merchant: 2, wildHelp: 1.5 * pc, eclipse: 0.6, windShift: 0.5, quake: 0.5 };
    const ch = L.age === "kids" ? 1 : 1.6;
    return { candyRain: 2, rainbow: 1.5 + bl, portal: 1.2, merchant: 1 + bl, wildHelp: (1 + bl * 1.5) * pc, quake: ch + bi, windShift: ch, eclipse: 0.8 * ch + bi,
      stampede: ch + bi * 1.5, wanderer: 0.7 * ch + bi * 1.5 };
  }

  // Plan del generador: sorpresas programadas y ritmo de las aleatorias
  function plan(L, o, r) {
    o = o || {}; r = r || M.rng(L.seed + L.index);
    const pool = poolFor(L);
    const hist = ((o.worldState && o.worldState.events) || []).slice(-6).map((e) => (typeof e === "string" ? e : e.type));
    hist.forEach((t) => { if (pool[t]) pool[t] *= 0.35; });
    const every = { baby: [50, 90], kids: [42, 75], young: [30, 55], adult: [34, 60] }[L.age] || [45, 75];
    const k = L.nodeType === "evento" ? 0.55 : L.boss ? 1.8 : 1;
    L.surprise = { every: [every[0] * k, every[1] * k], pool };
    const spots = L.chunks.filter((c) => (c.beat === "calma" || c.beat === "respiro") && c.x1 > 1200 && c.x2 < L.end - 1800);
    let n = L.boss ? 0 : { baby: 1, kids: r.int(1, 2), young: 2, adult: 2 }[L.age] || 1;
    if (L.nodeType === "evento") n += 2;
    const w = Object.assign({}, pool), out = [];
    if (o.event && INFO[o.event]) { out.push(o.event); w[o.event] = 0; }
    while (out.length < n && Object.values(w).some((v) => v > 0)) { const t = r.weighted(w); out.push(t); w[t] = 0; }
    out.forEach((t, i) => {
      const c = spots.length ? spots[Math.min(spots.length - 1, Math.floor((i + 0.5) * spots.length / Math.max(1, out.length)))] : null;
      L.events.push({ type: t, x1: c ? c.x1 + 80 : 1400 + i * 1500, sched: true });
    });
    L.events.sort((a, b) => a.x1 - b.x1);
  }

  // ——— utilidades ———
  // superficie de suelo (no gelatina) más alta por debajo de fromY en x; null si es un hueco
  function groundAt(L, x, fromY) {
    let best = null;
    for (const s of L.solids) if (s.mat !== "jelly" && !s.low && x > s.x + 4 && x < s.x + s.w - 4 && s.y >= fromY && (best === null || s.y < best)) best = s.y;
    return best;
  }
  const alive = (e) => e.alive && e.state !== "gone" && e.state !== "pop";
  function bump(G, h, dirx, power, fall) {
    if (h.inv > 0) return;
    const AG = h.AG || M.AGES[G.L.age], F = fx(G);
    h.vx = dirx * 520 * (power || 1); h.vy = -900 * (power || 1); h.on = false; h.inv = 1.1;
    if (AG && !AG.assist && typeof h.mass === "number") {
      const loss = Math.min(AG.hitCost * 0.7, Math.max(0, h.mass - (AG.massFloor || 0) - 0.05)); h.mass -= loss;
      if (loss > 0.01) F.spawnMinis(h.x, h.y - 40, Math.max(2, Math.round(loss * 20)));
      if (G.stats) G.stats.hits++;
    }
    F.puff(h.x, h.y, 8); F.sfx("squish"); F.shake(fall ? 4 : 7);
  }
  function enemyAt(L, x, y, type, range, extra) {
    const e = Object.assign({ x, y, x1: x - range, x2: x + range, type, dir: Math.random() < 0.5 ? -1 : 1, t: Math.random() * 6, state: "walk", st: 0, alive: true, hp: type === "gordo" ? 3 : 1, y0: y, ev: true }, extra || {});
    // la zona de paseo, siempre sobre el trozo de suelo en el que aparece
    const s = L.solids.find((q) => q.mat !== "jelly" && Math.abs(q.y - y) < 3 && x >= q.x && x <= q.x + q.w);
    if (s && !e.stampede) { e.x1 = Math.max(e.x1, s.x + 30); e.x2 = Math.min(e.x2, s.x + s.w - 30); if (e.x1 > e.x2) e.x1 = e.x2 = clamp(x, s.x + 30, s.x + s.w - 30); e.x = clamp(e.x, e.x1, e.x2); }
    L.enemies.push(e); return e;
  }
  const env = (a, inT, outT) => Math.max(0, Math.min(1, a.t / (inT || 0.5), a.dur ? (a.dur - a.t) / (outT || 0.8) : 1));
  const candyType = (rng) => rng.pick(Object.keys(M.CANDIES || { volar: 1 }));
  function newCreature(G, seed, rarity) {
    if (!M.ProcChar || !M.ProcChar.generate) return null;
    const L = G.L; return M.ProcChar.generate(seed, { age: L.age, biome: L.biome.base || L.biome.id, rarity });
  }

  // ——— manejadores: start(G, a) → false si no se puede · step(G, a, dt) · end(G, a) · world(c, G, a) · screen(c, G, a, VW, VH) ———
  const H = {};

  H.candyRain = {
    start(G, a) { a.acc = 0; },
    step(G, a, dt) {
      const L = G.L, lead = G.heroes[0], S = G._ev; a.acc += dt;
      const every = L.age === "baby" ? 0.16 : 0.22;
      while (a.acc > every) { a.acc -= every;
        const x = lead.x + S.rng.range(-450, 750); if (x > L.end - 200 || groundAt(L, x, G.cam.y) === null) continue;
        if (S.rng() < (L.age === "baby" ? 0.3 : 0.16)) L.candies.push({ x, y: G.cam.y - 40, type: candyType(S.rng), got: false, t: 0, fall: true });
        else L.sparks.push({ x, y: G.cam.y - 40, got: false, t: 0, fall: true, ev: true });
      }
    },
  };

  H.quake = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], F = fx(G);
      a.pl = L.plats.filter((p) => p.kind !== "crumble" && !p.gone).map((p) => [p, p.y]);
      L.enemies.forEach((e) => { if (e.state === "walk" && Math.abs(e.x - lead.x) < 1000 && G._ev.rng() < 0.6) { e.state = "stun"; e.st = 1.6; } });
      F.shake(10); F.sfx("boing");
    },
    step(G, a, dt) {
      const k = env(a, 0.6, 0.8) * (G.L.age === "baby" ? 0.6 : 1), t = G.t || G._ev.t;
      a.pl.forEach(([p, y]) => { if (!p.gone) p.y = y + Math.sin(t * 11 + p.x * 0.013) * 8 * k; });
      if (G.cam) G.cam.shake = Math.max(G.cam.shake || 0, 3.5 * k);
      G.heroes.forEach((h) => { if (h.on && G._ev.rng() < dt * 1.2 * k) { h.vy = -420; h.on = false; } });
    },
    end(G, a) { a.pl.forEach(([p, y]) => (p.y = y)); },
    world(c, G, a) {
      const k = env(a, 0.6, 0.8), t = G.t || 0, x1 = G.cam.x - 100, x2 = G.cam.x + 2200;
      c.save(); c.strokeStyle = "rgba(255,255,255,0.65)"; c.lineWidth = 3; c.lineCap = "round";
      for (const s of G.L.solids) { if (s.mat === "jelly" || s.x > x2 || s.x + s.w < x1) continue;
        const a0 = Math.max(s.x + 10, x1), a1 = Math.min(s.x + s.w - 10, x2); if (a1 <= a0) continue;
        c.beginPath(); for (let x = a0; x <= a1; x += 24) c.lineTo(x, s.y - 3 + Math.sin(x * 0.03 - t * 12) * 5 * k); c.stroke(); }
      c.restore();
    },
  };

  H.windShift = {
    start(G, a) { a.dir = G._ev.rng() < 0.5 ? -1 : 1; a.flip = 2.6; fx(G).sfx("whoosh"); },
    step(G, a, dt) {
      const F = fx(G), lead = G.heroes[0], k = env(a, 0.5, 0.8) * (G.L.age === "baby" ? 0.5 : 1);
      a.flip -= dt; if (a.flip <= 0) { a.dir *= -1; a.flip = 2.2 + G._ev.rng() * 1.4; F.say(lead.x, lead.y - 160, a.dir > 0 ? "¡Ahora hacia allá! →" : "← ¡Al revés!", "#6aa0d0"); F.sfx("whoosh"); }
      G.heroes.forEach((h) => { h.vx = clamp(h.vx + a.dir * (h.on ? 520 : 820) * dt * k, -700, 700); });
    },
    screen(c, G, a, VW, VH) {
      const k = env(a, 0.5, 0.8), t = G._ev.t; c.save(); c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 2.5; c.lineCap = "round";
      for (let i = 0; i < 34; i++) { const y = (i * 137) % VH, sp = 700 + (i % 5) * 160, x = ((i * 251 + a.dir * t * sp) % (VW + 300) + VW + 300) % (VW + 300) - 150;
        c.globalAlpha = 0.5 * k; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - a.dir * 50, y - 8, x - a.dir * 110, y); c.stroke(); }
      c.restore();
    },
  };

  H.eclipse = {
    start(G, a) { const L = G.L; if (L.tod === "night") return false; a.prev = L.tod; L.tod = L.age === "baby" ? "dusk" : "night"; fx(G).sfx("whoosh"); },
    end(G, a) { G.L.tod = a.prev; fx(G).sfx("check"); },
    screen(c, G, a, VW, VH) {
      const p = clamp(a.t / a.dur, 0, 1), cx = VW * 0.82, cy = VH * 0.16, R = 46;
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.5;
      const g = c.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.4); g.addColorStop(0, "rgba(255,230,160,0.9)"); g.addColorStop(1, "rgba(255,230,160,0)"); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 2.4, 0, 7); c.fill();
      c.restore(); c.save(); c.fillStyle = "#ffe08a"; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.fillStyle = "#3b3160"; c.beginPath(); c.arc(cx + (1 - p * 2) * R * 2.1, cy - 4, R * 1.02, 0, 7); c.fill(); c.restore();
    },
  };

  H.stampede = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], S = G._ev, n = L.age === "baby" ? 3 : 5 + Math.round(L.d * 6);
      a.list = [];
      for (let i = 0; i < n; i++) { const x = lead.x + 1150 + i * 90 + S.rng() * 40; if (x > L.end - 300) break;
        const y = groundAt(L, x, lead.y - 420); if (y === null) continue;
        const type = L.age === "baby" ? "plastilina" : S.rng.pick(["plastilina", "plastilina", "moco", "chicle"]);
        a.list.push(enemyAt(L, x, y, type, 0, { x1: lead.x - 2600, x2: x + 60, dir: -1, spd: 150 + S.rng() * 90, stampede: true })); }
      if (!a.list.length) return false;
      fx(G).sfx("roar");
    },
    step(G, a, dt) {
      const L = G.L;
      for (const e of a.list) { if (!alive(e) || e.state !== "walk") continue;
        e.x -= e.spd * dt; e.dir = -1; const gy = groundAt(L, e.x, e.y - 200); if (gy !== null && gy < e.y + 300) { e.y = gy; e.y0 = gy; }
        if (G._ev.rng() < dt * 3) fx(G).puff(e.x + 30, e.y, 1, 0.7); }
      if (G.cam) G.cam.shake = Math.max(G.cam.shake || 0, 1.5);
    },
    end(G, a) { const lead = G.heroes[0];
      a.list.forEach((e) => { if (!alive(e)) return; if (Math.abs(e.x - lead.x) > 900) { e.alive = false; e.state = "gone"; } else { e.x1 = e.x - 120; e.x2 = e.x + 120; } }); },
  };

  // grumo gigante (errante o perseguidor): lo dibujamos nosotros, no es un grumo normal
  function drawBig(c, G, g, scale, run) {
    const im = M.IMG && M.IMG.chars && M.IMG.chars.grumo; if (!im) return;
    const t = G.t || G._ev.t, h = 88 * scale, w = h * im.width / im.height, bob = run ? Math.abs(Math.sin(t * 9)) * 10 : Math.abs(Math.sin(t * 4)) * 5;
    c.save(); c.fillStyle = "rgba(50,25,45,0.28)"; c.beginPath(); c.ellipse(g.x, g.y + 2, w * 0.45, 14, 0, 0, 7); c.fill();
    if (g.variant && M.ProcChar && M.ProcChar.drawGrumoVariant) M.ProcChar.drawGrumoVariant(c, g.variant, g.x, g.y - bob, h, t, "back", g.face || 1);
    c.translate(g.x, g.y - bob); const sq = g.sq || 0; c.scale((1 + sq * 0.25) * (g.face < 0 ? -1 : 1), 1 - sq * 0.3);
    if (g.flash > 0 && Math.floor(t * 20) % 2) c.filter = "brightness(1.8)";
    c.drawImage(im, -w / 2, -h, w, h); c.filter = "none"; c.restore();
    if (g.variant && M.ProcChar && M.ProcChar.drawGrumoVariant) M.ProcChar.drawGrumoVariant(c, g.variant, g.x, g.y - bob, h, t, "front", g.face || 1);
    g.h = h; g.w = w;
  }

  H.wanderer = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], S = G._ev;
      for (const dx of [-750, 900, -1000, 1200]) { const x = lead.x + dx, y = groundAt(L, x, lead.y - 420);
        if (y !== null && x > 200 && x < L.end - 600) { a.g = { x, y, hp: L.age === "baby" ? 1 : 3, flash: 0, sq: 0, face: dx < 0 ? 1 : -1, variant: L.mood && L.mood.bitter > 0.3 && M.ProcChar && M.ProcChar.grumoVariant ? M.ProcChar.grumoVariant(L.seed + S.t | 0) : null }; break; } }
      if (!a.g) return false; fx(G).sfx("roar");
    },
    step(G, a, dt) {
      const L = G.L, g = a.g, lead = G.heroes[0], F = fx(G);
      g.flash = Math.max(0, g.flash - dt); g.sq = Math.max(0, g.sq - dt * 3);
      const dx = lead.x - g.x, dir = Math.sign(dx) || 1, spd = { baby: 90, kids: 170, young: 210, adult: 220 }[L.age] || 170;
      g.face = dir;
      if (Math.abs(dx) > 30) { const ny = groundAt(L, g.x + dir * 90, g.y - 260);
        if (ny !== null && ny < g.y + 150) { g.x += dir * spd * dt; const gy = groundAt(L, g.x, g.y - 260); if (gy !== null) g.y += (gy - g.y) * Math.min(1, dt * 10); } }
      const top = g.y - (g.h || 190) * 0.92, half = (g.w || 200) * 0.36;
      for (const h of G.heroes) {
        if (Math.abs(h.x - g.x) > half + h.w / 2 || h.y < top || h.y - h.h > g.y) continue;
        if (h.vy > 60 && h.y - h.vy * dt <= top + 30) { h.vy = -1150; h.on = false; g.hp--; g.flash = 0.4; g.sq = 1; F.burst(g.x, top, 14, PASTEL, "star", 320); F.sfx("squish"); F.shake(6);
          if (g.hp <= 0) { a.win = true; a.done = true; } }
        else bump(G, h, Math.sign(h.x - g.x) || 1);
      }
    },
    end(G, a) { const g = a.g, F = fx(G);
      if (a.win) { F.spawnMinis(g.x, g.y - 100, 10); F.burst(g.x, g.y - 120, 30, PASTEL, "heart", 420); F.say(g.x, g.y - 240, "¡Plof! Era todo blandito", "#ff6f91", true); F.sfx("friend"); if (G.stats) G.stats.stomps++; }
      else { F.puff(g.x, g.y, 14, 2); F.say(g.x, g.y - 200, "Zzz… se fue a dormir", "#8a6aa0"); } },
    world(c, G, a) { drawBig(c, G, a.g, 2.2, false); },
  };

  H.rainbow = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], x0 = lead.x + 140, N = 8;
      if (x0 + N * 130 > L.end - 900 || !lead.on) return false;
      a.list = []; const base = lead.y - 40;
      for (let i = 0; i < N; i++) { const t = i / (N - 1), px = x0 + i * 130, py = Math.round(base - Math.sin(t * Math.PI) * 230);
        const p = { x: px, y: py, w: 110, h: 36, kind: "rainbow", y0: py, sink: 0, t: 0, fall: 0, gone: 0, ev: true, hue: i };
        L.plats.push(p); a.list.push(p); L.sparks.push({ x: px + 55, y: py - 60, got: false, t: i, ev: true }); }
      a.x0 = x0; a.base = base; fx(G).sfx("power");
    },
    step(G, a) { if (!a.warned && a.t > a.dur - 2.5) { a.warned = true; const lead = G.heroes[0]; fx(G).say(lead.x, lead.y - 150, "¡Se desvanece!", "#c46be0"); } },
    end(G, a) { const L = G.L; a.list.forEach((p) => { p.gone = 1; fx(G).puff(p.x + p.w / 2, p.y, 3); }); L.plats = L.plats.filter((p) => !a.list.includes(p)); },
    world(c, G, a) {
      const k = env(a, 0.6, 0.6), cx = a.x0 + 455, R = 470, fade = a.t > a.dur - 2.5 ? 0.5 + Math.sin(a.t * 18) * 0.3 : 1;
      c.save(); c.globalAlpha = 0.28 * k * fade; c.lineWidth = 16;
      RAINBOW.forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.ellipse(cx, a.base + 40, R - i * 14, 270 - i * 14, 0, Math.PI, 0); c.stroke(); });
      c.restore();
    },
  };

  H.portal = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], S = G._ev;
      for (let dx = 500; dx <= 1500; dx += 100) {
        const X = lead.x + dx; if (X + 950 > L.end - 1200) break;
        const g0 = groundAt(L, X, lead.y - 420); if (g0 === null) continue;
        if ([X - 150, X + 250, X + 650, X + 760].some((q) => groundAt(L, q, g0 - 300) === null)) continue;
        const iy = Math.max(-420, g0 - 560);
        const s = { x: X - 150, y: iy, w: 800, h: 150, mat: "normal", float: true, under: true, bloom: 2, ev: true };
        if (M.dressSolid) M.dressSolid(s, L, L.seed + X); else { s.drips = []; s.back = []; s.front = []; s.balls = []; }
        L.solids.push(s);
        for (let i = 0; i < 7; i++) L.sparks.push({ x: X - 60 + i * 90, y: iy - 70 - Math.sin(i / 6 * Math.PI) * 60, got: false, t: i, ev: true });
        L.sparks.push({ x: X + 250, y: iy - 170, got: false, t: 0, big: true, ev: true });
        L.candies.push({ x: X + 470, y: iy - 80, type: candyType(S.rng), got: false, t: 0, rare: S.rng() < 0.35 });
        a.p = { x: X, y: g0 }; a.b = { x: X + 600, y: iy, tx: X + 760, ty: groundAt(L, X + 760, g0 - 300) }; a.isl = s; return;
      }
      return false;
    },
    step(G, a) {
      const F = fx(G), near = (h, p) => Math.abs(h.x - p.x) < 55 && Math.abs(h.y - p.y) < 50;
      if (a.t < a.dur && G.heroes.some((h) => near(h, a.p))) {
        G.heroes.forEach((h, i) => { F.puff(h.x, h.y - 30, 10); h.x = a.isl.x + 90 + i * 50; h.y = a.isl.y - 2; h.vx = 0; h.vy = 0; F.burst(h.x, h.y - 40, 16, PASTEL, "star", 300); });
        F.sfx("power"); F.say(a.isl.x + 200, a.isl.y - 160, "¡Isla bonus!", "#c46be0", true); a.used = true; }
      else if (a.b.ty !== null && G.heroes.some((h) => near(h, a.b))) {
        G.heroes.forEach((h, i) => { F.puff(h.x, h.y - 30, 10); h.x = a.b.tx + i * 50; h.y = a.b.ty - 2; h.vx = 0; h.vy = 0; }); F.sfx("pop"); }
      const onIsl = G.heroes.some((h) => h.y < a.isl.y + 30 && h.x > a.isl.x - 100 && h.x < a.isl.x + a.isl.w + 100);
      a.done = a.t > a.dur && !onIsl;
    },
    world(c, G, a) {
      const t = G._ev.t;
      if (a.t < a.dur) drawPortal(c, a.p.x, a.p.y, t, Math.min(1, a.t * 2, (a.dur - a.t) * 2));
      if (a.used || a.t < a.dur) drawPortal(c, a.b.x, a.b.y, t, 0.8);
    },
  };
  function drawPortal(c, x, y, t, k) {
    if (k <= 0) return;
    c.save(); c.translate(x, y - 95); c.scale(k, k);
    for (let i = 0; i < 6; i++) { c.strokeStyle = RAINBOW[i]; c.lineWidth = 7; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(0, 0, 48 - i * 7, 88 - i * 12, 0, t * (2 + i * 0.5), t * (2 + i * 0.5) + 4.6); c.stroke(); }
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 60); g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(200,160,255,0)"); c.fillStyle = g; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(0, 0, 44, 80, 0, 0, 7); c.fill();
    c.restore();
  }

  H.wildHelp = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0], S = G._ev;
      let X = null, y = null; for (const dx of [800, 950, 1100, 700]) { const q = lead.x + dx; if (q > L.end - 1300) continue; const gy = groundAt(L, q, lead.y - 420); if (gy !== null && groundAt(L, q - 180, gy - 60) !== null && groundAt(L, q + 180, gy - 60) !== null) { X = q; y = gy; break; } }
      if (X === null) return false;
      const seed = (L.seed * 7 + L.index * 131 + Math.round(X)) % 2147483000, cr = newCreature(G, seed, S.rng() < 0.2 ? "raro" : "comun");
      if (!cr) return false;
      a.w = { x: X, y, creature: cr, met: false, seed, rarity: cr.rarity, friendly: true, help: true, ev: true }; L.wild.push(a.w);
      a.list = []; const n = L.age === "baby" ? 2 : 3;
      for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, ex = X + side * (120 + Math.floor(i / 2) * 70); a.list.push(enemyAt(L, ex, groundAt(L, ex, y - 60) || y, L.age === "baby" ? "plastilina" : S.rng.pick(["plastilina", "moco"]), 45, { guard: true })); }
    },
    step(G, a) {
      if (a.w.met) { a.done = true; return; }
      if (a.w.help && !a.list.some(alive)) { const F = fx(G); a.w.help = false; a.saved = true; G._ev.saved++;
        F.burst(a.w.x, a.w.y - 120, 26, ["#ff8fab", "#ffd98e", "#ffffff"], "heart", 380); F.sfx("friend");
        F.say(a.w.x, a.w.y - (a.w.creature.h || 150) - 30, "¡Gracias! 💖", "#ff6f91", true);
        banner(G, "💖 ¡Lo has salvado!", a.w.creature.name + " quiere conocerte"); a.done = true; }
    },
    world(c, G, a) { if (!a.w.help) return; const t = G._ev.t, y = a.w.y - (a.w.creature.h || 150) - 30 + Math.sin(t * 5) * 5;
      c.save(); c.font = "700 20px Fredoka, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; const txt = "¡Socorro! 😣", w = c.measureText(txt).width + 26;
      c.fillStyle = "rgba(255,255,255,0.95)"; M.rr ? (M.rr(c, a.w.x - w / 2, y - 18, w, 36, 18), c.fill()) : c.fillRect(a.w.x - w / 2, y - 18, w, 36);
      c.fillStyle = "#d04f7a"; c.fillText(txt, a.w.x, y); c.restore(); },
  };

  H.merchant = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0];
      for (const dx of [650, 800, 950, 500]) { const X = lead.x + dx; if (X > L.end - 1300) continue; const gy = groundAt(L, X, lead.y - 420);
        if (gy !== null && groundAt(L, X - 120, gy - 40) !== null && groundAt(L, X + 120, gy - 40) !== null) {
          a.m = { x: X, y: gy, sold: 0, hold: 0, free: L.age === "baby" ? 2 : 0, cr: newCreature(G, (L.seed * 3 + Math.round(X)) % 2147483000, "comun") }; return; } }
      return false;
    },
    step(G, a, dt) {
      const m = a.m, L = G.L, F = fx(G), S = G._ev;
      const h = G.heroes.find((q) => Math.abs(q.x - m.x) < 95 && Math.abs(q.y - m.y) < 70);
      if (m.hold < 0) m.hold = Math.min(0, m.hold + dt); else if (h) m.hold += dt; else m.hold = Math.max(0, m.hold - dt * 2);
      if (m.hold >= 1) {
        const give = () => { L.candies.push({ x: m.x + 50, y: m.y - 170, type: candyType(S.rng), got: false, t: 0, fall: true }); m.sold++; F.burst(m.x, m.y - 120, 14, PASTEL, "star", 260); F.sfx("pop"); F.say(m.x, m.y - 200, "¡Que aproveche!", "#3f9a7d"); };
        if (m.sold >= 3) { F.say(m.x, m.y - 200, "¡Agotado! Vuelvo otro día", "#8a6a80"); m.hold = -4; }
        else if (m.free > 0) { m.free--; give(); m.hold = -1.5; }
        else if (G.stats && G.stats.sparks >= 3) { G.stats.sparks -= 3; give(); m.hold = -1.5; if (G.onEvent) G.onEvent("hud"); }
        else { F.say(m.x, m.y - 200, "Necesitas 3 ⭐", "#c46be0"); m.hold = -2.5; }
      }
    },
    end(G, a) { fx(G).puff(a.m.x, a.m.y, 14, 1.5); },
    world(c, G, a) {
      const m = a.m, t = G._ev.t, k = Math.min(1, a.t * 2, (a.dur - a.t) * 2); if (k <= 0) return;
      c.save(); c.translate(m.x, m.y); c.scale(k, k);
      c.fillStyle = "rgba(60,30,60,0.2)"; c.beginPath(); c.ellipse(0, 3, 90, 9, 0, 0, 7); c.fill();
      c.fillStyle = "#d9a66b"; (M.rr || rrFallback)(c, -70, -78, 140, 58, 14); c.fill();
      c.fillStyle = "rgba(255,255,255,0.35)"; (M.rr || rrFallback)(c, -62, -72, 124, 10, 5); c.fill();
      c.fillStyle = "#b98a6a"; [-48, 48].forEach((wx) => { c.beginPath(); c.arc(wx, -14, 14, 0, 7); c.fill(); }); c.fillStyle = "#fff3e6"; [-48, 48].forEach((wx) => { c.beginPath(); c.arc(wx, -14, 5, 0, 7); c.fill(); });
      c.strokeStyle = "#f0e2d6"; c.lineWidth = 6; [-64, 64].forEach((px) => { c.beginPath(); c.moveTo(px, -78); c.lineTo(px, -150); c.stroke(); });
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#ffffff" : "#ff9fb6"; c.beginPath(); c.moveTo(-80 + i * 26.6, -150); c.lineTo(-80 + (i + 1) * 26.6, -150); c.lineTo(-80 + (i + 1) * 26.6, -132); c.quadraticCurveTo(-80 + (i + 0.5) * 26.6, -122, -80 + i * 26.6, -132); c.fill(); }
      for (let i = 0; i < 3; i++) { const jx = -40 + i * 40, col = RAINBOW[(i * 2 + Math.floor(t)) % 6]; c.fillStyle = "rgba(255,255,255,0.7)"; (M.rr || rrFallback)(c, jx - 13, -112, 26, 32, 8); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(jx, -92, 7, 0, 7); c.fill(); }
      c.restore();
      if (m.cr && M.ProcChar && M.ProcChar.draw) M.ProcChar.draw(c, m.cr, m.x - 110, m.y, (m.cr.h || 150) * 0.8 * k, { t, mood: m.hold > 0 ? "happy" : "idle", on: true, face: 1, vx: 0, vy: 0 });
      c.save(); c.font = "700 17px Fredoka, system-ui"; c.textAlign = "center"; c.textBaseline = "middle";
      const label = m.sold >= 3 ? "¡Agotado!" : m.free > 0 ? "¡Gratis! 🍬" : "3 ⭐ → 🍬", w = c.measureText(label).width + 24, ly = m.y - 185 + Math.sin(t * 3) * 3;
      c.fillStyle = "rgba(255,255,255,0.95)"; (M.rr || rrFallback)(c, m.x - w / 2, ly - 16, w, 32, 16); c.fill(); c.fillStyle = "#6b4658"; c.fillText(label, m.x, ly);
      if (m.hold > 0) { c.strokeStyle = "#ff6f91"; c.lineWidth = 5; c.beginPath(); c.arc(m.x, ly - 36, 12, -Math.PI / 2, -Math.PI / 2 + m.hold * 6.283); c.stroke(); }
      c.restore();
    },
  };
  function rrFallback(c, x, y, w, h) { c.beginPath(); c.rect(x, y, w, h); }

  // ——— set pieces programados por el generador ———
  H.chase = {
    start(G, a) {
      const L = G.L, lead = G.heroes[0];
      a.g = { x: lead.x - 650, y: groundAt(L, lead.x, lead.y - 300) || lead.y, sq: 0, face: 1, variant: L.mood && L.mood.bitter > 0.3 && M.ProcChar && M.ProcChar.grumoVariant ? M.ProcChar.grumoVariant(L.seed) : null };
      banner(G, "😱 ¡Un grumo gigante!", L.age === "baby" ? "¡Corre, corre!" : "¡Corre hasta el final!"); fx(G).sfx("roar"); fx(G).shake(10);
    },
    step(G, a, dt) {
      const L = G.L, g = a.g, lead = G.heroes[0], AG = M.AGES[L.age], e = a.e;
      if (G.heroes.every((h) => h.x > e.x2)) { a.win = true; a.done = true; return; }
      if (lead.x < g.x - 50 || lead.x < e.x1 - 400) { g.x = Math.min(g.x, lead.x - 650); }   // reapareciste detrás: vuelve a darte ventaja
      g.x += AG.speed * e.speed * dt; if (lead.x - g.x > 850) g.x = lead.x - 850;
      const gy = groundAt(L, g.x, g.y - 260); if (gy !== null && gy < g.y + 260) g.y += (gy - g.y) * Math.min(1, dt * 8);
      for (const h of G.heroes) if (h.x < g.x + 120 && h.x > g.x - 200 && h.y > g.y - 280) { bump(G, h, 1, 1.1); h.x = Math.max(h.x, g.x + 130); fx(G).say(h.x, h.y - 150, L.age === "baby" ? "¡Uy, casi!" : "¡Ñam! ¡Casi!", "#d04f7a"); }
      if (lead.x - g.x < 420 && G.cam) G.cam.shake = Math.max(G.cam.shake || 0, 2);
      if (G._ev.rng() < dt * 6) fx(G).puff(g.x - 60, g.y, 2, 1.4);
    },
    end(G, a) { if (!a.win) return; const g = a.g, F = fx(G);
      F.puff(g.x, g.y - 60, 20, 2.2); F.spawnMinis(g.x, g.y - 120, 8); F.burst(g.x, g.y - 140, 24, PASTEL, "star", 420); F.shake(10); F.sfx("fanfare");
      banner(G, "🎉 ¡Lo has despistado!", "El grumo gigante se ha deshecho en mini mash"); },
    world(c, G, a) { drawBig(c, G, a.g, 3, true); },
  };

  H.collapse = {
    start(G, a) { a.list = G.L.plats.filter((p) => p.bridge === a.e.id && p.kind === "crumble"); if (!a.list.length) return false; },
    step(G, a) {
      const minX = Math.min(...G.heroes.map((h) => h.x)), e = a.e;
      if (minX > e.x2 + 100) { a.done = true; return; }
      if (minX < e.x1 - 50) return;
      for (const p of a.list) if (!p.gone && p.t < 0.56 && p.x + p.w < minX - 70) { p.t = 0.56; fx(G).puff(p.x + p.w / 2, p.y + 10, 4); if (G._ev.rng() < 0.4) fx(G).shake(3); }
    },
  };

  H.flood = {
    start(G, a) { a.y = a.e.y0; },
    step(G, a, dt) {
      const e = a.e, lead = G.heroes[0], L = G.L, F = fx(G);
      const inside = lead.x > e.x1 - 60 && lead.x < e.x2, past = G.heroes.every((h) => h.x > e.x2 + 150), before = lead.x < e.x1 - 300;
      if (inside) a.y = Math.max(e.y1, a.y - e.speed * dt);
      else if (past || before) { a.y = Math.min(e.y0, a.y + 140 * dt); if (past && a.y >= e.y0) a.done = true; }
      if (a.y >= e.y0 - 10) return;
      for (const h of G.heroes) if (h.x > e.x1 && h.x < e.x2 && h.y > a.y + 14) {
        h.y = a.y + 14; h.vy = -1150; h.on = false; F.burst(h.x, a.y, 10, ["#c9f7a8", "#e0b3ff", "#fff"], "dot", 240); F.sfx("boing");
        if (h.inv <= 0) { const AG = h.AG || M.AGES[L.age]; F.say(h.x, h.y - 120, AG.assist ? "¡Boing!" : "¡Gelatina amarga!", "#7a9a3a");
          if (!AG.assist && typeof h.mass === "number") { h.mass = Math.max(AG.massFloor || 0, h.mass - AG.hitCost * 0.5); if (G.stats) G.stats.hits++; } h.inv = 1; }
      }
    },
    world(c, G, a) {
      const e = a.e; if (a.y >= e.y0 - 2) return; const t = G._ev.t, x1 = Math.max(e.x1, G.cam.x - 50), x2 = Math.min(e.x2, G.cam.x + 2200); if (x2 <= x1) return;
      c.save(); const wob = (x) => Math.sin(x * 0.02 + t * 3) * 6;
      c.beginPath(); c.moveTo(x1, e.y0 + 700); for (let x = x1; x <= x2; x += 16) c.lineTo(x, a.y + wob(x)); c.lineTo(x2, e.y0 + 700); c.closePath();
      const g = c.createLinearGradient(0, a.y, 0, a.y + 300); g.addColorStop(0, "rgba(185,240,150,0.78)"); g.addColorStop(1, "rgba(170,130,230,0.65)"); c.fillStyle = g; c.fill();
      c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 4; c.beginPath(); for (let x = x1; x <= x2; x += 16) c.lineTo(x, a.y + 6 + wob(x)); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.5)"; for (let x = Math.ceil(x1 / 80) * 80; x < x2; x += 80) { c.beginPath(); c.arc(x + Math.sin(x) * 12, a.y + 40 + ((x * 7) % 90) - ((t * 25 + x) % 50), 3 + (x % 5), 0, 7); c.fill(); }
      c.restore();
    },
  };

  H.waves = {
    start(G, a) { a.i = -1; a.list = []; a.tw = 99; banner(G, "⚔️ ¡Arena de grumos!", a.e.waves.length + " oleadas · premio al final"); },
    step(G, a, dt) {
      const e = a.e, L = G.L, lead = G.heroes[0], S = G._ev, F = fx(G);
      if (lead.x > e.x2 + 350) { a.done = true; return; }
      a.tw += dt;
      if (a.list.some(alive) && a.tw < 16) return;
      if (a.tw < 1.2 && a.i >= 0) return;   // un respiro entre oleadas
      a.i++;
      if (a.i >= e.waves.length) { a.win = true; a.done = true; return; }
      a.list = []; a.tw = 0;
      const n = e.waves[a.i], last = a.i === e.waves.length - 1;
      for (let j = 0; j < n; j++) { const side = j % 2 ? 1 : -1, x = clamp(lead.x + side * S.rng.range(350, 650), e.x1, e.x2), y = groundAt(L, x, e.y - 200) || e.y;
        const type = L.age === "baby" ? "plastilina" : last && j === 0 && e.gordo ? "gordo" : S.rng.pick(["plastilina", "moco", "chicle", L.index >= 3 ? "volador" : "plastilina"]);
        const en = enemyAt(L, x, y, type, 150); if (type === "volador") { en.y = y - 190; en.y0 = en.y; } a.list.push(en); F.puff(x, y, 8); }
      F.say(lead.x, lead.y - 170, "Oleada " + (a.i + 1) + "/" + e.waves.length, "#b0406a", true); F.sfx("roar");
    },
    end(G, a) { if (!a.win) return; const e = a.e, L = G.L, F = fx(G);
      L.candies.push({ x: e.rx, y: e.ry, type: candyType(G._ev.rng), got: false, t: 0, rare: true });
      for (let i = 0; i < 6; i++) L.sparks.push({ x: e.rx - 150 + i * 60, y: e.ry - 60 - Math.sin(i / 5 * Math.PI) * 60, got: false, t: i, ev: true });
      F.burst(e.rx, e.ry, 30, PASTEL, "star", 420); F.sfx("fanfare"); banner(G, "🏆 ¡Arena limpia!", "Premio: un caramelo raro"); },
  };

  H.dark = {
    start() {},
    step(G, a) { const lead = G.heroes[0], e = a.e; if (lead.x > e.x1 && lead.x < e.x2) G._ev.darkT = Math.max(G._ev.darkT, e.k); },
  };

  // ——— ciclo ———
  function start(G, type, e, sched) {
    const S = G._ev, h = H[type]; if (!S || !h) return null;
    const info = INFO[type], a = { type, t: 0, dur: info ? info.dur : 0, e: e || {}, sched: !!sched };
    if (h.start && h.start(G, a) === false) return null;
    S.active.push(a); S.log.push(type);
    if (info) banner(G, info.icon + " " + info.title, G.L.age === "baby" && info.baby ? info.baby : info.sub);
    return a;
  }

  function init(G) {
    const L = G.L; if (!L) return;
    L.events = L.events || []; L.wild = L.wild || []; L.fakes = L.fakes || [];
    const rng = M.rng((L.seed || 1) * 17 + (L.index || 1) * 101 + 5), sp = L.surprise;
    G._ev = { t: 0, active: [], sched: L.events.map((e) => ({ e, st: 0 })), next: sp ? rng.range(sp.every[0], sp.every[1]) * 0.6 + 10 : 1e9, rng, log: [], saved: 0,
      dark: 0, darkT: 0, front: false, cl: [] };
    const cl = L.climate; if (cl) { const n = Math.round((cl.type === "fog" ? 6 : cl.type === "rain" ? 90 : 60) * (cl.k || 1));
      for (let i = 0; i < n; i++) G._ev.cl.push({ x: rng(), y: rng(), z: rng.range(0.4, 1.3), s: rng.range(0.6, 1.4), ph: rng.range(0, 6.28) }); }
  }

  function step(G, dt) {
    const S = G._ev, L = G.L; if (!S || !L || !G.heroes || !G.heroes.length) return;
    S.t += dt; S.darkT = 0;
    const lead = G.heroes[0];
    for (const q of S.sched) if (q.st === 0 && lead.x > q.e.x1) { q.st = 1; start(G, q.e.type, q.e, true); }
    // sorpresas aleatorias: nunca durante un set piece, cerca del final o con el jefe despierto
    if (L.surprise) {
      S.next -= dt;
      if (S.next <= 0) {
        S.next = S.rng.range(L.surprise.every[0], L.surprise.every[1]);
        const busy = S.active.some((a) => ZONES.includes(a.type) && a.type !== "dark" || INFO[a.type]) || lead.x < 900 || lead.x > L.end - 1700 || (G.boss && G.boss.state !== "sleep");
        if (!busy) { const w = Object.assign({}, L.surprise.pool); S.log.slice(-3).forEach((t) => { if (w[t]) w[t] *= 0.2; });
          for (let tries = 0; tries < 3; tries++) { const t = S.rng.weighted(w); if (start(G, t, { x1: lead.x }, false)) break; w[t] = 0; } }
      }
    }
    for (let i = S.active.length - 1; i >= 0; i--) {
      const a = S.active[i], h = H[a.type]; a.t += dt;
      if (h.step) h.step(G, a, dt);
      if (a.done || (a.dur && a.t > a.dur && a.type !== "portal")) { if (h.end) h.end(G, a); S.active.splice(i, 1); }
    }
    S.dark += (S.darkT - S.dark) * Math.min(1, dt * 2.5);
    // paredes falsas: se vuelven transparentes cuando estás dentro
    for (const f of L.fakes) { const inside = G.heroes.some((h) => h.x > f.x - 10 && h.x < f.x + f.w + 10 && h.y > f.y && h.y - h.h < f.y + f.h);
      if (inside && !f.found) { f.found = true; S.fakes = (S.fakes || 0) + 1; fx(G).say(f.x + f.w / 2, f.y - 30, "¡Un escondite!", "#e0a020", true); fx(G).sfx("spark", 4); }
      f.a += ((inside ? 0.22 : 1) - f.a) * Math.min(1, dt * 6); }
  }

  function drawFakes(c, G) {
    const L = G.L; if (!L.fakes || !L.fakes.length || !M.drawFake) return;
    for (const f of L.fakes) if (f.x < G.cam.x + 2400 && f.x + f.w > G.cam.x - 200) M.drawFake(c, f, L, G._ev ? G._ev.t : 0);
  }
  function drawWorld(c, G) {
    const S = G._ev; if (!S) return;
    for (const a of S.active) { const h = H[a.type]; if (h.world) h.world(c, G, a); }
    // (los Mash salvajes de L.wild los dibuja y anima el motor)
    if (!S.front) drawFakes(c, G);
  }
  function drawFront(c, G) { if (!G._ev) return; G._ev.front = true; drawFakes(c, G); }

  // ——— pantalla: clima, oscuridad de cueva, avisos de sorpresas ———
  let darkCv = null;
  function drawScreen(c, G, VW, VH) {
    const S = G._ev, L = G.L; if (!S || !L) return;
    const cam = G.cam, t = S.t, cl = L.climate;
    if (cl && S.cl.length) {
      c.save();
      if (cl.type === "rain") { c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 2; c.lineCap = "round";
        for (const p of S.cl) { const x = ((p.x * (VW + 200) - cam.x * p.z * 0.7 - t * 120 * p.z) % (VW + 200) + VW + 200) % (VW + 200) - 100, y = ((p.y * VH + t * 620 * p.z - cam.y * 0.3) % (VH + 60) + VH + 60) % (VH + 60) - 30;
          c.globalAlpha = 0.35 + p.z * 0.3; c.strokeStyle = p.ph > 4 ? "rgba(255,190,215,0.8)" : "rgba(255,255,255,0.75)"; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6 * p.z, y + 18 * p.z); c.stroke(); } }
      else if (cl.type === "snow") { c.fillStyle = "#fffdf6";
        for (const p of S.cl) { const x = ((p.x * (VW + 100) - cam.x * p.z * 0.6 + Math.sin(t * 0.8 + p.ph) * 30) % (VW + 100) + VW + 100) % (VW + 100) - 50, y = ((p.y * VH + t * 55 * p.z - cam.y * 0.3) % VH + VH) % VH;
          c.globalAlpha = 0.55 + p.z * 0.3; c.beginPath(); c.arc(x, y, 2.2 * p.s * p.z + 1, 0, 7); c.fill(); } }
      else if (cl.type === "fog") {
        c.fillStyle = `rgba(255,248,238,${0.1 * (cl.k || 1)})`; c.fillRect(0, 0, VW, VH);
        for (const p of S.cl) { const x = ((p.x * (VW + 800) - cam.x * 0.2 * p.z + t * 14 * p.z) % (VW + 800) + VW + 800) % (VW + 800) - 400, y = VH * (0.3 + p.y * 0.6), R = 260 * p.s;
          const g = c.createRadialGradient(x, y, 10, x, y, R); g.addColorStop(0, "rgba(255,250,242,0.42)"); g.addColorStop(1, "rgba(255,250,242,0)"); c.fillStyle = g; c.fillRect(x - R, y - R, R * 2, R * 2); } }
      else if (cl.type === "fireflies" && L.tod !== "night") { c.globalCompositeOperation = "lighter"; const glow = M.IMG && M.IMG.glow && M.IMG.glow.warm;
        for (const p of S.cl) { const x = ((p.x * (VW + 100) - cam.x * p.z * 0.7 + Math.sin(t * 0.7 + p.ph) * 40) % (VW + 100) + VW + 100) % (VW + 100) - 50, y = ((p.y * VH - cam.y * p.z * 0.4 + Math.cos(t * 0.5 + p.ph) * 30) % VH + VH) % VH;
          c.globalAlpha = 0.25 + Math.sin(t * 3 + p.ph * 3) * 0.25; if (glow) c.drawImage(glow, x - 12, y - 12, 24, 24); else { c.fillStyle = "#fff3a0"; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } } }
      else if (cl.type === "petals") { for (const p of S.cl) { const x = ((p.x * (VW + 100) - cam.x * p.z * 0.6 + Math.sin(t + p.ph) * 40 - t * 30) % (VW + 100) + VW + 100) % (VW + 100) - 50, y = ((p.y * VH + t * 40 * p.z) % VH + VH) % VH;
          c.save(); c.translate(x, y); c.rotate(t * 1.5 + p.ph); c.globalAlpha = 0.75; c.fillStyle = p.ph > 3 ? "#ffc2d6" : "#fff0f5"; c.beginPath(); c.ellipse(0, 0, 5 * p.s, 3 * p.s, 0, 0, 7); c.fill(); c.restore(); } }
      c.restore();
    }
    // región amarga: un velo violeta muy suave
    const bi = (L.mood && L.mood.bitter) || 0; if (bi > 0.35) { c.fillStyle = `rgba(90,70,110,${(bi - 0.3) * 0.12})`; c.fillRect(0, 0, VW, VH); }
    // oscuridad de cueva con luz alrededor de héroes, setas-farol y chispas
    if (S.dark > 0.02 && M.canvas) {
      if (!darkCv || darkCv.width !== Math.ceil(VW) || darkCv.height !== Math.ceil(VH)) darkCv = M.canvas(Math.ceil(VW), Math.ceil(VH));
      const d = darkCv.getContext("2d"); d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, darkCv.width, darkCv.height);
      d.fillStyle = `rgba(18,10,42,${S.dark})`; d.fillRect(0, 0, VW, VH); d.globalCompositeOperation = "destination-out";
      const ox = -cam.x, oy = -cam.y, x1 = cam.x - 100, x2 = cam.x + VW + 100;
      const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill(); };
      G.heroes.forEach((h) => hole(h.x + ox, h.y - (h.h || 80) / 2 + oy, 260 + (h.mass || 0.5) * 80));
      if (G.comp) hole(G.comp.x + ox, G.comp.y - 50 + oy, 140);
      L.shrooms.forEach((s) => { if (s.x > x1 && s.x < x2) hole(s.x + ox, s.y - 90 + oy, 150); });
      L.solids.forEach((s) => { if (s.x < x2 && s.x + s.w > x1 && s.back) s.back.forEach((f) => { if (f.kind === "farol" && f.x > x1 && f.x < x2) hole(f.x + ox, s.y - 30 + oy, 120); }); });
      L.sparks.forEach((s) => { if (!s.got && s.x > x1 && s.x < x2) hole(s.x + ox, s.y + oy, 60); });
      L.candies.forEach((k) => { if (!k.got && k.x > x1 && k.x < x2) hole(k.x + ox, k.y + oy, 100); });
      L.checks.forEach((k) => { if (k.on && k.x > x1 && k.x < x2) hole(k.x + ox, k.y - 104 + oy, 200); });
      c.drawImage(darkCv, 0, 0, VW, VH);
    }
    for (const a of S.active) { const h = H[a.type]; if (h.screen) h.screen(c, G, a, VW, VH); }
  }

  function trigger(G, type, opts) { if (!G._ev) init(G); const lead = G.heroes[0]; return start(G, type, Object.assign({ x1: lead ? lead.x : 0 }, opts || {}), false); }
  // para la UI al terminar el mundo: qué sorpresas hubo, a cuántos salvajes salvaste, escondites encontrados
  function summary(G) { const S = G._ev || { log: [], saved: 0 }; return { events: S.log.slice(), wildSaved: S.saved || 0, fakesFound: S.fakes || 0 }; }

  return { init, step, drawWorld, drawFront, drawScreen, trigger, plan, summary, poolFor, groundAt, INFO, TYPES: Object.keys(INFO), ZONES, _H: H };
})();
