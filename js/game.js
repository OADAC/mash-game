// Motor v3: masa, aspirar, poderes-transformación, cuerpo blando, grumos, jefe, mundo 2,5D.
(function () {
  const A = M.Audio, I = M.Input, { clamp, lerp, rand } = M;
  const cv = M.$("game"); let c = cv.getContext("2d");
  const GRAV = 2700, BOUNCE = 1560, STOMP = 800, STEP = 1 / 120;
  let DPR = 1, SCALE = 1, VW = 1280, VH = 720, vignette = null, darkCv = null;
  function resize() {
    if (!innerWidth || !innerHeight) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
    const base = innerHeight < 560 ? 600 : 720;
    SCALE = Math.min(cv.height / base, cv.width / (base * 1.25));
    VW = cv.width / SCALE; VH = cv.height / SCALE; vignette = null; darkCv = null;
  }
  addEventListener("resize", resize); resize();

  const G = M.G = { state: "idle", t: 0, L: null, heroes: [], comp: null, cam: { x: 0, y: 100, shake: 0, look: 0 },
    parts: [], texts: [], puddles: [], shots: [], clays: [], auras: [], minis: [], falling: [], boss: null,
    stats: null, combo: { n: 0, t: 0, best: 0 }, check: null, rescued: false, onEvent: () => {} };
  const ev = (n, d) => G.onEvent(n, d);
  const PASTEL = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff", "#ffffff"];
  const MINICOL = ["#ffffff", "#fff0f5", "#fff6e0", "#eefcf6", "#f3efff", "#ffeef0"];

  // ——— partículas ———
  function part(o) { G.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, size: 6, rot: 0, vr: 0, drag: 0, color: "#fff", type: "dot" }, o)); }
  function burst(x, y, n, colors, type = "star", speed = 320) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(speed * 0.35, speed);
    part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, g: 500, life: rand(0.5, 1.1), size: rand(5, 11), color: colors[i % colors.length], type, vr: rand(-8, 8), drag: 1.8 }); } }
  function puff(x, y, n = 6, s = 1) { for (let i = 0; i < n; i++) part({ x: x + rand(-16, 16) * s, y: y - rand(0, 8), vx: rand(-80, 80), vy: rand(-90, -20), life: rand(0.35, 0.6), size: rand(8, 16) * s, color: "rgba(255,255,255,0.9)", type: "puff", drag: 3 }); }
  function say(x, y, text, color = "#ff6f91", big = false) { G.texts.push({ x, y, text, color, life: big ? 2.6 : 1.5, big }); }
  M.say = say;

  // ——— cuerpo blando (muelles) ———
  function softNew() { return { jx: 0, jv: 0, sq: 0, sqv: 0, walk: 0, prevVx: 0 }; }
  function softStep(s, vx, on, dt, maxv, idleT) {
    const acc = (vx - s.prevVx) / dt; s.prevVx = vx;
    const leanT = clamp(vx / maxv, -1.2, 1.2) * 0.13;
    s.jv += (-160 * (s.jx - leanT) - 11 * s.jv - clamp(acc, -8000, 8000) * 0.00009) * dt; s.jx += s.jv * dt;
    const sqT = on ? Math.sin(idleT * 2.2) * 0.018 : 0;
    s.sqv += (-190 * (s.sq - sqT) - 12 * s.sqv) * dt; s.sq += s.sqv * dt;
    s.sq = clamp(s.sq, -0.45, 0.5); s.jx = clamp(s.jx, -0.5, 0.5);
    if (on && Math.abs(vx) > 30) s.walk += dt * Math.abs(vx) * 0.04;
  }
  // dibuja un sprite en tiras: la parte de arriba se inclina y bambolea, abajo queda pegada al suelo
  function drawSoft(im, w, h, s, flip, extra = 0) {
    const N = 12, sy = 1 + s.sq, sx = 1 - s.sq * 0.55, bob = Math.abs(Math.sin(s.walk)) * 0.05;
    const H = h * sy * (1 - bob * 0.4), sh = im.height / N;
    c.save(); if (flip) c.scale(-1, 1);
    const lean = (flip ? -1 : 1) * (s.jx + extra);
    for (let i = 0; i < N; i++) {
      const tt = i / N, off = lean * Math.pow(1 - tt, 1.3) * h * 0.55, bul = 1 + Math.sin(tt * Math.PI) * s.sq * 0.25;
      const dw = w * sx * bul, dy = -H + tt * H - bob * h * 0.3 * (1 - tt);
      c.drawImage(im, 0, i * sh, im.width, sh + 0.8, -dw / 2 + off, dy, dw, H / N + 0.8);
    }
    c.restore();
  }

  // ——— héroes ———
  function makeHero(id, pi, age, x, y, mass) {
    const def = M.CAST[id], AG = M.AGES[age];
    return { pi, id, def, age, AG, x, y, w: 44, h: 60, vx: 0, vy: 0, on: false, coyote: 0, buf: 0, dbl: true, face: 1, inv: 0, blink: 2,
      mass: mass ?? AG.startMass, soft: softNew(), idleT: 0, rot: 0, spin: 0, mover: null, onPlat: null, onMat: null, slip: false, bounced: false,
      giant: 0, bubble: 0, flying: false, turbo: false, sugar: false, vac: false, fireCd: 0, wall: 0, candy: null, low: 0,
      spd: 0.8 + def.stats[0] * 0.07, jmp: 0.86 + def.stats[1] * 0.045, heavy: def.stats[2] >= 4 };
  }
  const scaleOf = (h) => (0.86 + 0.38 * h.mass) * (h.giant > 0 ? 1.6 : 1);
  function sizeHero(h) { const k = scaleOf(h), ph = h.def.procedural ? 58 : h.def.ph * 0.9; h.k = k; h.w = 46 * k; h.h = ph * k; }
  function makeComp(id, hero) { return { id, def: M.CAST[id], x: hero.x - 70, y: hero.y, face: 1, t: 0, trail: [], hop: 0, soft: softNew(), vx: 0 }; }

  G.start = function (cfg) {
    G.cfg = cfg; G.L = cfg.L; G.fusion = !!cfg.fusion;
    G.parts = []; G.texts = []; G.puddles = []; G.shots = []; G.clays = []; G.auras = []; G.minis = []; G.falling = [];
    G.stats = { falls: 0, hits: 0, stomps: 0, ability: 0, eats: 0, sparks: 0, time: 0, big: 0, minis: 0, melts: 0, style: 0 };
    G.combo = { n: 0, t: 0, best: 0 }; G.rescued = false; G.done = false; G.check = { x: 120, y: 600 };
    G.heroes = cfg.players.map((p, i) => { const h = makeHero(p.leader, i, p.age, 120 - i * 60, 600); sizeHero(h); return h; });
    G.comp = !G.fusion && cfg.players[0].companion ? makeComp(cfg.players[0].companion, G.heroes[0]) : null;
    G.bonds = cfg.players[0].profile ? cfg.players[0].profile.bonds || {} : {};
    G.boss = G.L.bossData ? Object.assign({ vx: 0, vy: 0, flash: 0, soft: softNew(), dir: -1, wave: null }, G.L.bossData) : null;
    G.age = cfg.players[0].age; G.cam.x = -VW * 0.3; G.cam.y = 100; G.state = "play"; G.t = 0;
    I.setFusion(G.fusion);
    A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, false);
    ev("hud");
  };
  // cambiar de compañero en plena partida (sin reiniciar el mundo)
  G.setCompanion = function (id) {
    const h = G.heroes[0]; if (G.fusion || !h || !id || id === h.id || (G.comp && G.comp.id === id)) return false;
    if (G.comp) { puff(G.comp.x, G.comp.y - 40, 10); burst(G.comp.x, G.comp.y - 50, 8, PASTEL, "star", 200); }
    G.comp = makeComp(id, h); G.comp.x = h.x - h.face * 60; G.comp.y = h.y; G.comp.hop = 0.5;
    puff(G.comp.x, G.comp.y - 40, 12); burst(G.comp.x, G.comp.y - 60, 14, PASTEL, "heart", 260);
    const ab = G.comp.def.ability;
    G.texts = G.texts.filter((t) => t.tag !== "comp");
    say(h.x, h.y - h.h - 50, "¡" + M.CAST[id].name + "!" + (ab ? " " + M.ABILITIES[ab].icon + " " + M.abilityName(ab, h.age) : ""), "#3f9a7d", true);
    G.texts[G.texts.length - 1].tag = "comp";
    A.sfx("power"); ev("hud"); return true;
  };
  G.swapLeader = function () {
    const h = G.heroes[0]; if (!G.comp || !h.on) return;
    const old = h.id, nh = makeHero(G.comp.id, 0, h.age, G.comp.x, h.y, h.mass); nh.face = h.face; nh.candy = h.candy; sizeHero(nh);
    G.heroes[0] = nh; G.comp = makeComp(old, nh); G.comp.x = h.x; puff(nh.x, nh.y, 8); A.sfx("pop"); ev("hud");
  };

  // ——— colisiones ———
  const overlap = (p, s) => p.x + p.w / 2 > s.x && p.x - p.w / 2 < s.x + s.w && p.y > s.y + 0.01 && p.y - p.h < s.y + s.h;
  function solidList(h) {
    const L = G.L, arr = L.solids.filter((s) => s.mat !== "jelly" || true).filter((s) => s.x < G.cam.x + VW + 700 && s.x + s.w > G.cam.x - 700);
    L.walls.forEach((w) => { if (w.alive && !(h && h.sugar && w.type === "azucar")) arr.push(w); });
    L.giants.forEach((g) => { if (!g.awake) { const lw = g.lw || 240, lh = Math.max(60, (g.lh || 110) - 10); arr.push({ x: g.x - lw / 2, y: g.y - lh, w: lw, h: lh }); } });
    L.enemies.forEach((e) => { if (e.state === "ice") arr.push({ x: e.x - 46, y: e.y - 84, w: 92, h: 84 }); });
    return arr;
  }
  function platList() { const a = []; G.L.plats.forEach((p) => { if (!p.gone) a.push(p); }); G.L.movers.forEach((m) => a.push(m)); G.clays.forEach((p) => a.push(p)); return a; }
  const inPuddle = (x, y) => G.puddles.some((p) => x > p.x1 && x < p.x2 && Math.abs(y - p.y) < 6);
  function groundBelow(x, y) { let best = 5000; for (const s of G.L.solids) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y; for (const s of platList()) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y; return best; }

  // ——— masa ———
  function addMass(h, v) { h.mass = clamp(h.mass + v, 0, 1); }
  function spend(h, cost) {
    const AG = h.AG, c2 = cost * AG.abilityCost;
    if (h.mass - c2 < 0.1 + AG.massFloor * 0.5) { if (h.low <= 0) { say(h.x, h.y - h.h - 30, M.T("lowMass", h.age), "#c46be0"); h.low = 1.5; } return false; }
    h.mass -= c2; return true;
  }
  function spawnMinis(x, y, n, fromHero) {
    for (let i = 0; i < n; i++) G.minis.push({ x: x + rand(-15, 15), y: y - rand(10, 30), vx: rand(-260, 260), vy: rand(-620, -300), t: rand(0, 6), size: rand(10, 15),
      col: MINICOL[(Math.random() * MINICOL.length) | 0], on: false, life: fromHero ? 4 : 30, wait: fromHero ? 0.8 : 0.25, lost: !!fromHero });
  }

  // ——— HÉROE ———
  function stepHero(h, dt) {
    const pi = h.pi, held = (k) => I.held(pi, k), AG = h.AG;
    if (h.stick > 0) { h.stick -= dt; if (h.stick <= 0) { h.vy = -1350; h.spin = 1; A.sfx("boing"); } return; }
    sizeHero(h);
    const dir = (held("R") ? 1 : 0) - (held("L") ? 1 : 0);
    if (dir && !h.turbo) h.face = dir;
    // poderes: C = el tuyo (o el del compañero si tu líder no tiene), V = el del compañero,
    // caramelo = extra automático y temporal que se suma a los dos
    const ownAb = h.def.ability, compAb = pi === 0 && G.comp ? G.comp.def.ability : null;
    const bAb = ownAb || compAb, bSrc = ownAb ? "lead" : "comp";
    const cand = h.candy ? h.candy.type : null;
    const holdPow = (ab, key) => { const on = ab && M.ABILITIES[ab].kind === "hold" && held(key); return on ? spend(h, M.ABILITIES[ab].cost * dt) : false; };
    const useB = holdPow(bAb, "B"), useC = holdPow(compAb, "C");
    const candyOn = (ab) => cand === ab && (ab === "volar" ? held("J") && !h.on : ab === "turbo" ? dir !== 0 : ab === "azucar");
    const want = (ab) => (useB && bAb === ab) || (useC && compAb === ab) || candyOn(ab);
    h.flying = want("volar") && !h.on;
    h.turbo = want("turbo");
    h.sugar = want("azucar");
    const superVac = want("aspiradora");
    h.vac = held("A") || superVac;
    if (h.flying || h.turbo || h.sugar || superVac) G.stats.ability += dt * 0.5;
    if (I.consume(pi, "B") && bAb && M.ABILITIES[bAb].kind === "tap") { tapPower(bSrc === "comp" ? G.comp : h, bAb, h, bSrc); if (bSrc === "comp") G.comp.hop = 0.5; }
    if (pi === 0 && G.comp && I.consume(0, "C") && compAb && M.ABILITIES[compAb].kind === "tap") { tapPower(G.comp, compAb, h, "comp"); G.comp.hop = 0.5; }
    if ((useB && bSrc === "comp") || useC) { if (G.comp && Math.random() < 0.3) part({ x: G.comp.x, y: G.comp.y - 60, vy: -80, life: 0.5, size: 5, color: "#9ff0d4", type: "star", vr: 5 }); }
    if (pi === 0 && G.comp && I.consume(0, "S")) G.swapLeader();
    if (G.L.hardAge === "young" && !h.on && !findNear(h) && I.consume(pi, "E")) { h.trick = 1; h.tricks = (h.tricks || 0) + 1; A.sfx("djump"); }
    if (h.trick > 0) { h.trick -= dt * 2.6; h.rot = (1 - Math.max(0, h.trick)) * Math.PI * 2 * h.face; if (h.trick <= 0) { h.trick = 0; h.rot = 0; } }
    // caramelo de fuego: dispara solo cuando hay grumos delante
    if (cand === "fuego") { h.candyFire = (h.candyFire || 0) - dt;
      if (h.candyFire <= 0 && G.L.enemies.some((e) => e.alive && e.state !== "gone" && (e.x - h.x) * h.face > 0 && Math.abs(e.x - h.x) < 520 && Math.abs(e.y - h.y) < 200)) { tapPower(h, "fuego", h, "candy"); h.candyFire = 0.45; } }
    if (h.candy) { h.candy.t -= dt; if (h.candy.t <= 0) { h.candy = null; say(h.x, h.y - h.h - 30, "¡Se acabó el caramelo!", "#8a6a80"); ev("hud"); } }
    h.fireCd -= dt; h.low -= dt;
    if (h.giant > 0) { h.giant -= dt; if (h.giant <= 0) { puff(h.x, h.y, 14, 1.4); A.sfx("pop"); } }

    const axis = I.players[pi].axis || 0;   // joystick analógico del móvil
    let MAXV = AG.speed * h.spd * (h.turbo ? 2.1 : 1) * (h.vac ? 0.55 : 1) * (h.giant > 0 ? 0.85 : 1) * (axis && !h.turbo ? Math.abs(axis) : 1);
    const grip = h.def.mat === "musgo";
    h.slip = !grip && h.on && (h.onMat === "hielo" || inPuddle(h.x, h.y));
    let acc = h.on ? (dir ? (h.turbo ? 5200 : 3600) : 3000) : 2200;
    if (h.slip) acc = dir ? 700 : 150;
    if (h.bubble > 0) acc = 1400;
    const target = dir * MAXV;
    if (h.vx < target) h.vx = Math.min(target, h.vx + acc * dt); else if (h.vx > target) h.vx = Math.max(target, h.vx - acc * dt);
    if (h.mover) { h.x += h.mover.vx * dt; h.y += h.mover.vy * dt; }
    // viento
    for (const wz of G.L.winds) if (h.x > wz.x1 && h.x < wz.x2 && h.y > wz.y1 && h.y < wz.y2) { h.vx += 900 * dt * (h.vx < 380 ? 1 : 0); if (!h.on) h.vy = lerp(h.vy, -170, dt * 3.2); }

    // salto (con salto en pared)
    if (I.consume(pi, "J")) h.buf = 0.14;
    h.buf -= dt; h.coyote -= dt;
    const softBoost = h.onPlat && (h.onPlat.kind === "soft" || h.onPlat.kind === "raft") ? 1.12 : 1;
    if (h.buf > 0 && (h.on || h.coyote > 0) && h.bubble <= 0) {
      h.vy = -AG.jump * h.jmp * softBoost * (h.giant > 0 ? 1.1 : 1); h.on = false; h.coyote = 0; h.buf = 0; h.mover = null; h.bounced = false;
      h.soft.sqv += 5; A.sfx("jump"); puff(h.x, h.y, 5, h.k);
    } else if (h.buf > 0 && h.wall && !h.on) {
      h.vy = -AG.jump * 0.92; h.vx = -h.wall * 520; h.face = -h.wall; h.buf = 0; h.dbl = true; h.soft.sqv += 4; A.sfx("jump"); puff(h.x + h.wall * 20, h.y - h.h / 2, 6);
    } else if (h.buf > 0 && h.dbl && !h.on && h.bubble <= 0 && !h.flying) {
      h.vy = -AG.djump * h.jmp; h.dbl = false; h.buf = 0; h.spin = 1; h.bounced = false; h.soft.sqv += 4; A.sfx("djump");
      for (let i = 0; i < 8; i++) part({ x: h.x + rand(-20, 20), y: h.y - 10, vx: rand(-120, 120), vy: rand(40, 160), life: 0.5, size: rand(8, 14), color: "rgba(255,255,255,0.95)", type: "puff", drag: 3 });
    }
    // gravedad y estados
    let g = GRAV;
    if (h.vy < 0 && !held("J") && !h.bounced) g *= 2.3;
    if (h.vy > 0) g *= h.def.mat === "lana" ? 0.9 : 1.12;
    if (h.bubble > 0) { h.bubble -= dt; h.vy = lerp(h.vy, -200, dt * 5); g = 0; if (h.bubble <= 0) { burst(h.x, h.y - h.h / 2, 12, ["#ffb3d9", "#fff"], "dot", 200); A.sfx("pop"); } }
    if (h.flying) { h.vy = lerp(h.vy, -330, dt * 6); g = 0; if (Math.random() < 0.5) part({ x: h.x + rand(-h.w, h.w), y: h.y - h.h * 0.5, vx: rand(-60, 60), vy: 120, life: 0.4, size: rand(5, 9), color: "rgba(255,255,255,0.9)", type: "puff", drag: 2 }); }
    h.vy = Math.min(h.vy + g * dt, 1500);
    if (h.wall && h.vy > 0) h.vy = Math.min(h.vy, h.wallChicle ? 40 : 170);

    // X
    const solids = solidList(h);
    h.x += h.vx * dt; h.wall = 0; h.wallChicle = false;
    for (const s of solids) if (overlap(h, s)) {
      if ((h.turbo || h.giant > 0) && s.type === "galleta" && s.alive) { breakWall(s); continue; }
      const side = h.x < s.x + s.w / 2 ? 1 : -1;
      h.x = side > 0 ? s.x - h.w / 2 : s.x + s.w + h.w / 2; h.vx = 0;
      if (!h.on && dir === side) { h.wall = side; h.wallChicle = s.mat === "chicle"; }
    }
    // Y
    const prevY = h.y, wasOn = h.on, impact = h.vy;
    h.y += h.vy * dt; h.on = false; h.mover = null; h.onPlat = null; h.onMat = null;
    for (const s of solids) if (overlap(h, s)) {
      if (h.vy > 0 && prevY <= s.y + 2 + h.vy * dt) {
        if (s.mat === "jelly") { h.y = s.y; h.vy = -1150; h.bounced = true; h.dbl = true; h.soft.sqv -= 5; A.sfx("boing"); say(h.x, h.y - 110, "¡Boing!", "#c46be0"); burst(h.x, h.y, 10, ["#ffb3d9", "#e0b3ff", "#fff"], "dot", 260); continue; }
        h.y = s.y; h.vy = 0; h.on = true; h.onMat = s.mat;
      } else if (h.vy < 0) { h.y = s.y + s.h + h.h; h.vy = 0; } else h.y = s.y;
    }
    if (h.vy >= 0) for (const p of platList()) {
      const py = p.y + (p.sink || 0);
      if (h.x + h.w / 2 > p.x + 6 && h.x - h.w / 2 < p.x + p.w - 6 && prevY <= py + 3 + (p.vy ? Math.abs(p.vy) * dt + 2 : 0) && h.y >= py) { h.y = py; h.vy = 0; h.on = true; h.onPlat = p; if (p.vx !== undefined) h.mover = p; }
    }
    if (h.on && h.tricks) {
      if (h.trick > 0.28) { say(h.x, h.y - h.h - 30, "¡Plof!", "#8a6a80"); h.soft.sqv -= 9; ev("fx", "fail"); }
      else { const pts = 100 * h.tricks * h.tricks; G.stats.style += pts; say(h.x, h.y - h.h - 40, (h.tricks > 1 ? "MORTAL x" + h.tricks : "¡MORTAL!") + " +" + pts, "#9c6bff", true); A.sfx("power"); ev("fx", "trick"); ev("hud"); }
      h.tricks = 0; h.trick = 0; h.rot = 0;
    }
    if (h.on) {
      h.coyote = AG.coyote; h.dbl = true; h.bounced = false;
      if (!wasOn && impact > 250) {
        const v = clamp(impact / 1200, 0.3, 1.2); h.soft.sqv -= v * 7; A.sfx("land", v); puff(h.x, h.y, 4 + (v * 6) | 0, h.k);
        if (h.giant > 0 && impact > 500) giantStomp(h); else if (h.heavy && impact > 900) G.cam.shake = 6;
      }
      const p = h.onPlat;
      if (p && p.kind === "crumble") p.t += dt;
      if (p && (p.kind === "soft" || p.kind === "raft")) p.sink = lerp(p.sink, p.kind === "raft" ? 70 : 16, dt * (p.kind === "raft" ? 1.2 : 10));
      if (h.slip && Math.abs(h.vx) > 200 && Math.random() < dt * 20) part({ x: h.x - h.face * 12, y: h.y - 2, vx: -h.vx * 0.3, vy: -30, life: 0.3, size: 3, color: "rgba(200,240,255,0.9)" });
    }
    for (const s of G.L.shrooms) bounceCheck(h, s.x, s.y - 98 * (s.big ? 1.3 : 1), 66 * (s.big ? 1.3 : 1), prevY, s.big ? 1.25 : 1, () => { s.squash = 1; burst(s.x, s.y - 98, 12, PASTEL, "star", 380); });
    for (const gi of G.L.giants) if (gi.awake && gi.wake > 1) bounceCheck(h, gi.x, gi.y - gi.hh + 30, 80, prevY, 1, () => { gi.squash = 1; A.sfx("pop"); });

    // efectos visuales de poderes
    if (h.turbo && h.on && Math.random() < 0.9) { part({ x: h.x - h.face * h.w * 0.5, y: h.y - rand(4, h.h * 0.6), vx: -h.face * rand(40, 160), vy: rand(-80, 20), g: 600, life: 0.5, size: rand(2.5, 5), color: M.CAST[h.id].mat === "malvavisco" ? "#fff3e6" : "#f6e3d6", type: "dot" }); }
    if (h.sugar && Math.random() < 0.6) part({ x: h.x + rand(-h.w, h.w) * 0.6, y: h.y - rand(0, h.h), vy: -40, life: 0.6, size: rand(2, 4), color: PASTEL[(Math.random() * 5) | 0], type: "star", vr: 6 });
    if (h.vac) vacuumStep(h, superVac ? 2 : 1);

    softStep(h.soft, h.vx, h.on, dt, AG.speed * h.spd, h.idleT);
    if (h.spin > 0) { h.spin -= dt * 2.6; h.rot = (1 - Math.max(0, h.spin)) * Math.PI * 2 * h.face; if (h.spin <= 0) h.rot = 0; }
    if (h.on && Math.abs(h.vx) > 30 && Math.random() < dt * 8 && !h.slip) puff(h.x - h.face * 14, h.y, 1, h.k);
    h.inv -= dt; h.blink -= dt; if (h.blink < -0.12) h.blink = rand(2, 4.5);
    h.idleT += dt;
    h.x = clamp(h.x, -400, G.L.end);
    if (G.boss && G.boss.state !== "sleep" && G.boss.state !== "gone") h.x = clamp(h.x, G.boss.arena[0], G.boss.arena[1]);
    if (h.y > 1300) { G.stats.falls++; hurt(h, true); }
  }
  function bounceCheck(h, x, top, half, prevY, mul, fx) {
    if (h.vy > 0 && Math.abs(h.x - x) < half && h.y >= top && prevY <= top + 26) { h.y = top; h.vy = -BOUNCE * mul; h.bounced = true; h.dbl = true; h.on = false; h.soft.sqv += 7; h.spin = 1; A.sfx("boing"); fx(); }
  }
  function hurt(h, fell) {
    if (h.bubble > 0 || h.sugar || h.giant > 0 || (h.turbo && !fell)) { if (!fell) return; }
    const AG = h.AG; G.cam.shake = 8;
    if (!fell) G.stats.hits++;
    const loss = Math.min(AG.hitCost * (fell ? 0.6 : 1), Math.max(0, h.mass - AG.massFloor));
    h.mass -= loss;
    if (loss > 0.01 && !fell) spawnMinis(h.x, h.y - h.h * 0.5, Math.max(2, Math.round(loss * 22)), true);
    say(h.x, h.y - h.h - 30, M.rng(Date.now()).pick(M.TXT.hurt[h.age] || M.TXT.hurt.kids), "#ff6f91"); ev("fx", fell ? "fall" : "hurt");
    A.sfx(AG.massFloor ? "pop" : "hurt");
    h.soft.sqv -= 6; h.soft.jv += (Math.random() - 0.5) * 8;
    if (h.mass < 0.1 && AG.massFloor === 0) { G.stats.melts++; say(h.x, h.y - h.h - 60, M.T("melted", h.age), "#c46be0", true); h.mass = AG.startMass * 0.8; respawn(h); }
    else if (fell) respawn(h); else h.inv = 1.3;
    ev("hud");
  }
  function respawn(h) {
    h.x = G.check.x - h.pi * 50; h.y = G.check.y; h.vx = h.vy = 0; h.inv = 1.5; h.soft.sqv -= 6;
    h.bubble = h.giant = 0; puff(h.x, h.y, 10); burst(h.x, h.y - 30, 10, PASTEL);
  }

  // ——— ASPIRAR: el verbo central ———
  function vacuumStep(h, power) {
    const dir = h.face, mx = h.x + dir * h.w * 0.55, my = h.y - h.h * 0.5, R = 190 * power * (h.id === "nube" ? 1.15 : 1);
    if (Math.random() < 0.9) { const a = rand(-0.5, 0.5), d = rand(50, R); part({ x: mx + dir * d * Math.cos(a), y: my + d * Math.sin(a), vx: -dir * 520, vy: -Math.sin(a) * 300, life: 0.22, size: rand(2, 3.5), color: "rgba(255,255,255,0.95)" }); }
    const pull = (o, strength, onEat) => {
      const dx = o.x - mx, dy = (o.y - (o.hh || 30)) - my;
      if (Math.sign(dx) !== dir && Math.abs(dx) > 24) return;
      const d = Math.hypot(dx, dy); if (d > R || Math.abs(dy) > 120 * power) return;
      o.x -= dx * strength; o.y -= dy * strength * 0.5; o.pulled = true;
      if (d < 46 * h.k) onEat();
    };
    G.L.enemies.forEach((e) => {
      if (!e.alive || e.state === "gone" || e.state === "pop") return;
      if (e.type === "gordo" && e.state !== "stun" && power < 2) { e.x -= (e.x - mx) * 0.01; return; }
      e.hh = 40; pull(e, 0.09 * power, () => { swallow(h, e); });
    });
    G.minis.forEach((m) => { m.hh = 0; pull(m, 0.25, () => { absorb(h, m); }); });
    if (power > 1) G.L.candies.forEach((k) => { if (!k.got) { k.hh = 0; pull(k, 0.12, () => pickCandy(h, k)); } });
    h.soft.jv += (Math.random() - 0.5) * 0.6;
  }
  function swallow(h, e) {
    e.alive = false; e.state = "gone"; G.stats.eats++;
    A.sfx("squish"); burst(h.x + h.face * 20, h.y - h.h * 0.5, 10, PASTEL, "heart", 220);
    const n = e.type === "gordo" ? 8 : 3;
    for (let i = 0; i < n; i++) { addMass(h, 0.035); G.stats.minis++; }
    say(h.x, h.y - h.h - 40, "+" + n + " mini mash", "#ff7aa0"); ev("fx", "eat");
    h.soft.sqv += 3; reward(e);
  }
  function absorb(h, m) {
    m.dead = true; addMass(h, 0.035); G.stats.minis++;
    G.combo.mini = (G.combo.miniT > 0 ? (G.combo.mini || 0) + 1 : 0); G.combo.miniT = 0.6;
    A.sfx("absorb", G.combo.mini); part({ x: m.x, y: m.y, type: "puff", life: 0.3, size: 8, color: "rgba(255,255,255,0.9)" });
    if (h.mass >= 1) { G.stats.sparks++; }
    ev("hud");
  }
  function pickCandy(h, k) {
    k.got = true; h.candy = { type: k.type, t: M.CANDIES[k.type].secs }; A.sfx("power");
    burst(k.x, k.y, 18, [M.CANDIES[k.type].color, "#fff"], "star", 320);
    const how = { volar: "¡mantén saltar en el aire!", turbo: "¡corre!", azucar: "¡nada te daña!", fuego: "¡fuego automático!" }[k.type];
    say(h.x, h.y - h.h - 40, M.CANDIES[k.type].icon + " " + M.abilityName(k.type, h.age) + ": " + how, "#e0689c", true); ev("hud");
  }

  // ——— PODERES DE PULSACIÓN ———
  function tapPower(actor, ab, h, src) {
    const P = M.ABILITIES[ab];
    if (ab === "fuego" && h.fireCd > 0 && src === "lead") return;
    if (src !== "candy" && !spend(h, P.cost)) return;
    G.stats.ability++; if (Math.random() < 0.4) ev("fx", "power");
    const ax = actor.x, ay = actor.y - (actor.h || 60) * 0.5;
    if (src === "comp") say(actor.x, actor.y - 130, P.icon + " " + M.abilityName(ab, h.age), "#6aa88f");
    switch (ab) {
      case "gigante": h.giant = P.dur; A.sfx("giant"); G.cam.shake = 10; h.soft.sqv += 8; burst(h.x, h.y - 60, 24, PASTEL, "star", 420); break;
      case "fuego": h.fireCd = 0.22;
        G.shots.push({ x: ax + (actor.face || h.face) * 30, y: ay, vx: (actor.face || h.face) * 720, vy: -140, type: "fuego", life: 1.3 }); A.sfx("fire"); break;
      case "burbuja": h.bubble = P.dur; h.vy = -200; A.sfx("djump"); break;
      case "modelar": { const w = 150, px = h.on ? h.x + h.face * 110 - w / 2 : h.x - w / 2, py = h.on ? h.y - 120 : h.y + 6;
        G.clays.push({ x: px, y: py, w, h: 30, kind: "clay", life: 6 }); burst(px + w / 2, py, 14, ["#ffb08a", "#ffd98e", "#fff"], "dot", 220); A.sfx("land", 1); break; }
      case "risa": G.auras.push({ x: ax, y: ay, r: 0, max: 320, t: 0, type: "risa" }); A.sfx("friend");
        G.L.enemies.forEach((e) => { if (e.alive && e.state !== "gone" && Math.hypot(e.x - ax, e.y - 40 - ay) < 340) { e.state = "stun"; e.st = 1.2; e.laugh = true; say(e.x, e.y - 110, "¡Jajaja!", "#ffb000"); } });
        if (G.boss && G.boss.state !== "gone" && Math.abs(G.boss.x - ax) < 380) { G.boss.state = "dizzy"; G.boss.t = 0; }
        break;
    }
    ev("hud");
  }
  function giantStomp(h) {
    G.cam.shake = 14; A.sfx("land", 1.3); G.auras.push({ x: h.x, y: h.y, r: 0, max: 260, t: 0, type: "pum" });
    for (let i = 0; i < 18; i++) part({ x: h.x, y: h.y, vx: rand(-460, 460), vy: rand(-320, -60), g: 900, life: 0.6, size: rand(5, 9), color: PASTEL[i % 5] });
    G.L.enemies.forEach((e) => { if (e.alive && e.state !== "gone" && Math.abs(e.x - h.x) < 260 && Math.abs(e.y - h.y) < 120) defeat(e); });
    G.L.walls.forEach((w) => { if (w.alive && w.type === "galleta" && Math.abs(w.x + 30 - h.x) < 180) breakWall(w); });
    G.L.plats.forEach((p) => { if (p.kind === "crumble" && !p.gone && Math.abs(p.x + p.w / 2 - h.x) < 300 && Math.abs(p.y - h.y) < 240) p.t = 1; });
  }

  // ——— GRUMOS ———
  function defeat(e, silent) {
    if (!e.alive) return;
    e.alive = false; e.state = "pop"; e.st = 0;
    spawnMinis(e.x, e.y - 30, e.type === "gordo" ? 8 : 3);
    burst(e.x, e.y - 40, 12, ["#ff8fab", "#ffd98e", "#ffffff", "#9ff0d4"], "heart", 300);
    if (!silent) say(e.x, e.y - 100, "¡Ablandado!", "#ff7aa0");
    A.sfx("squish"); reward(e);
  }
  function reward(e) {
    G.stats.stomps++; const C = G.combo; C.n = C.t > 0 ? C.n + 1 : 1; C.t = 2.5; C.best = Math.max(C.best, C.n);
    ev("fx", C.n >= 3 ? "combo" : "kill"); if (C.n >= 2) G.stats.style += 25 * C.n;
    if (M.AGES[G.L.hardAge].combo && C.n >= 2) say(e.x, e.y - 140, "x" + C.n + " COMBO", "#9c6bff", true);
    ev("hud");
  }
  function toPuddle(e) { e.alive = false; e.state = "gone"; G.puddles.push({ x1: e.x - 75, x2: e.x + 75, y: e.y, life: 12, type: "moco" }); spawnMinis(e.x, e.y - 20, 2);
    burst(e.x, e.y - 20, 12, ["#8be06a", "#c6f5a8", "#fff"], "dot", 220); A.sfx("land", 0.6); reward(e); }
  function breakWall(w) { if (!w.alive) return; w.alive = false; w.melt = 0.001;
    for (let i = 0; i < 26; i++) part({ x: w.x + rand(0, w.w), y: w.y + w.h - rand(0, Math.min(w.h, 300)), vx: rand(-300, 300), vy: rand(-400, -50), g: 1200, life: 1, size: rand(5, 11), color: i % 3 ? "#d9a66b" : "#6b3b24", type: "confetti", vr: rand(-10, 10) });
    A.sfx("crumble"); G.cam.shake = 8; }
  function meltWall(w) { if (!w.alive) return; w.alive = false; w.melt = 0.001; w.melting = true; A.sfx("whoosh"); }

  function stepEnemies(dt) {
    const L = G.L, AG = M.AGES[L.age];
    for (const e of L.enemies) {
      if (e.state === "gone") continue;
      if (e.state === "pop") { e.st += dt; if (e.st > 0.35) e.state = "gone"; continue; }
      if (Math.abs(e.x - G.cam.x - VW / 2) > VW * 1.6) continue;
      e.t += dt;
      if (e.state === "walk") {
        if (inPuddle(e.x, e.y) && e.type !== "moco" && e.type !== "volador") { e.state = "stun"; e.st = 1.4; }
        const sp = (e.type === "helado" ? 95 : e.type === "chicle" ? 60 : e.type === "gordo" ? 45 : e.type === "volador" ? 90 : 75) * AG.enemySpeed;
        if (!e.pulled) { e.x += e.dir * sp * dt; if (e.x < e.x1) { e.x = e.x1; e.dir = 1; } else if (e.x > e.x2) { e.x = e.x2; e.dir = -1; } }
        if (e.type === "volador" && !e.pulled) e.y = e.y0 + Math.sin(e.t * 2) * 40;
      } else if (e.state === "flat") { e.st -= dt; if (e.st <= 0) { e.state = "reform"; e.st = 0; } }
      else if (e.state === "reform") { e.st += dt; if (e.st > 0.6) { e.state = "walk"; say(e.x, e.y - 110, "¡Me recompongo!", "#e08a4a"); A.sfx("boing"); } }
      else if (e.state === "melt") { e.st += dt / 1.1; if (Math.random() < 0.5) part({ x: e.x + rand(-30, 30), y: e.y - 60 * (1 - e.st), vy: 120, g: 600, life: 0.5, size: rand(3, 6), color: "#bfeaff" });
        if (e.st >= 1) { e.alive = false; e.state = "gone"; G.puddles.push({ x1: e.x - 60, x2: e.x + 60, y: e.y, life: 6, type: "agua" }); spawnMinis(e.x, e.y - 20, 3); reward(e); } }
      else if (e.state === "stun") { e.st -= dt; if (e.st <= 0) { if (e.laugh) defeat(e, true); else e.state = "walk"; } }
      if (e.state === "flash") { e.st -= dt; if (e.st <= 0) e.state = "walk"; }
      e.pulled = false;

      for (const h of G.heroes) {
        const eh = e.type === "gordo" ? 170 : 78, ew = e.type === "gordo" ? 80 : 40, top = e.y - eh;
        const harmful = e.state === "walk" || e.state === "flash", stompable = harmful || (e.state === "flat" && e.st < 2.4) || e.state === "stun";
        if (!stompable) continue;
        if (!(h.x + h.w / 2 > e.x - ew && h.x - h.w / 2 < e.x + ew && h.y > top && h.y - h.h < e.y)) continue;
        if (h.sugar) continue;                               // forma de azúcar: los atraviesas
        if (h.turbo || h.bubble > 0 || h.giant > 0) { if (e.type === "gordo" && h.giant <= 0) { e.hp--; e.state = "flash"; e.st = 0.4; if (e.hp <= 0) defeat(e); h.vx = -h.vx * 0.6; } else defeat(e); continue; }
        if (h.vy > 60 && h.y - h.vy * STEP <= top + 26) {
          if (e.type === "helado" && harmful && h.AG.massFloor === 0 && !h.heavy) { h.vx = (h.x < e.x ? -1 : 1) * 420; h.vy = -420; A.sfx("land", 0.5); say(e.x, top - 30, "¡Resbala!", "#6fb6e0"); continue; }
          if (e.type === "chicle" && harmful) { h.stick = 0.22; h.y = top; h.vy = 0; e.state = "stun"; e.st = 1.6; say(e.x, top - 30, "¡Pegajoso!", "#ff6fb8"); continue; }
          if (e.state === "stun" || e.state === "flat") defeat(e);
          else if (e.type === "plastilina") { e.state = "flat"; e.st = 3; A.sfx("squish"); }
          else if (e.type === "moco") toPuddle(e);
          else if (e.type === "gordo") { e.hp--; e.state = "flash"; e.st = 0.5; A.sfx("squish"); if (e.hp <= 0) defeat(e); }
          else defeat(e);
          h.vy = I.held(h.pi, "J") ? -BOUNCE * 0.72 : -STOMP; h.bounced = I.held(h.pi, "J"); h.dbl = true; h.soft.sqv += 5; G.cam.shake = 4;
        } else if (harmful && h.inv <= 0) { h.vx = (h.x < e.x ? -1 : 1) * 460; h.vy = -560; h.on = false; hurt(h, false); }
      }
    }
    // disparos de fuego de caramelo
    for (let i = G.shots.length - 1; i >= 0; i--) {
      const s = G.shots[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 500 * dt;
      part({ x: s.x, y: s.y, vx: rand(-40, 40), vy: rand(-60, 0), life: 0.35, size: rand(4, 8), color: Math.random() < 0.5 ? "#ffb347" : "#ffe08a", type: "puff", drag: 3 });
      let hit = false;
      for (const e of L.enemies) if (e.alive && e.state !== "gone" && Math.abs(e.x - s.x) < (e.type === "gordo" ? 80 : 44) && s.y > e.y - (e.type === "gordo" ? 170 : 90) && s.y < e.y + 6) {
        if (e.type === "helado") { e.state = "melt"; e.st = 0; } else if (e.type === "gordo") { e.hp--; e.state = "flash"; e.st = 0.4; if (e.hp <= 0) defeat(e); } else defeat(e);
        hit = true; break; }
      L.walls.forEach((w) => { if (w.alive && w.type === "azucar" && s.x > w.x - 10 && s.x < w.x + w.w + 10 && s.y > w.y) { meltWall(w); hit = true; } });
      const B = G.boss; if (B && B.state !== "gone" && B.state !== "sleep" && B.state !== "defeat" && Math.abs(B.x - s.x) < 130 && s.y > B.y - 280) { hit = true; bossHit(B.state === "dizzy" ? 0.45 : 0.18); }
      if (s.y > groundBelow(s.x, s.y - 20) || hit || s.life <= 0) { burst(s.x, s.y, 10, ["#ffb347", "#ffe08a", "#fff"], "dot", 200); G.shots.splice(i, 1); }
    }
  }

  // ——— JEFE: Grumo Mayor ———
  function stepBoss(dt) {
    const B = G.boss; if (!B || B.state === "gone") return;
    const h = G.heroes[0], AG = M.AGES[G.L.age];
    B.t += dt; B.flash = Math.max(0, B.flash - dt);
    softStep(B.soft, B.vx, B.onGround !== false, dt, 200, B.t);
    const onG = () => { B.vy += GRAV * dt; B.y += B.vy * dt; if (B.y >= B.y0) { const land = B.vy > 400; B.y = B.y0; B.vy = 0; return land; } return false; };
    B.y0 = B.y0 || B.y;
    if (B.state === "sleep") { if (G.heroes.some((x) => x.x > B.arena[0] + 260)) { B.state = "intro"; B.t = 0; A.sfx("roar"); G.cam.shake = 12; say(B.x, B.y - 330, M.T("bossIntro", G.age), "#b0406a", true); A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, true); ev("boss"); ev("fx", "boss"); } return; }
    if (B.state === "intro") { if (B.t > 1.6) { B.state = "walk"; B.t = 0; } return; }
    const spd = (70 + (B.maxHp - B.hp) * 20) * AG.enemySpeed;
    if (B.state === "walk") {
      B.dir = h.x < B.x ? -1 : 1; B.vx = B.dir * spd; B.x += B.vx * dt;
      if (B.t > 2.2) { B.state = "crouch"; B.t = 0; B.vx = 0; }
    } else if (B.state === "crouch") { B.soft.sq = -0.25; if (B.t > 0.55) { B.state = "jump"; B.t = 0; B.vy = -1350; B.tx = h.x; A.sfx("whoosh"); } }
    else if (B.state === "jump") {
      B.x = lerp(B.x, B.tx, dt * 1.8);
      if (onG()) { B.state = "dizzy"; B.t = 0; G.cam.shake = 18; A.sfx("land", 1.4); B.soft.sqv -= 8;
        B.wave = { x: B.x, r: 0, t: 0 }; for (let i = 0; i < 26; i++) part({ x: B.x + rand(-120, 120), y: B.y, vx: rand(-500, 500), vy: rand(-400, -80), g: 900, life: 0.8, size: rand(6, 12), color: PASTEL[i % 5] });
        if (B.hp < B.maxHp && Math.random() < 0.7) { G.L.enemies.push({ x: B.x + 160, y: B.y, x1: B.arena[0] + 60, x2: B.arena[1] - 60, type: "plastilina", dir: 1, t: 0, state: "walk", st: 0, alive: true, hp: 1 }); } }
    } else if (B.state === "dizzy") { B.x += 0; if (B.t > 2.4) { B.state = "walk"; B.t = 0; } }
    else if (B.state === "hurt") { if (B.t > 0.7) { B.state = B.hp <= 0 ? "defeat" : "walk"; B.t = 0; } }
    else if (B.state === "defeat") {
      B.soft.sq = Math.sin(B.t * 20) * 0.2;
      if (B.t > 1.4) { B.state = "gone"; A.sfx("friend"); spawnMinis(B.x, B.y - 150, 16); burst(B.x, B.y - 160, 60, PASTEL, "heart", 600); G.cam.shake = 16;
        say(B.x, B.y - 300, M.T("bossWin", G.age), "#ff6f91", true); A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, false);
        G.rescued = true; setTimeout(() => ev("rescue", B.friend), 1200); }
      return;
    }
    B.x = clamp(B.x, B.arena[0] + 150, B.arena[1] - 150);
    // onda expansiva por el suelo: salta para esquivarla
    if (B.wave) { const w = B.wave; w.t += dt; w.r = w.t * 700; if (w.r > 900) B.wave = null;
      else for (const hh of G.heroes) if (hh.on && Math.abs(Math.abs(hh.x - w.x) - w.r) < 30 && hh.inv <= 0) { hh.vx = Math.sign(hh.x - w.x) * 400; hh.vy = -500; hurt(hh, false); } }
    // contacto: pisotón, embestida o daño
    const bw = 130, bh = 270; B.icd = Math.max(0, (B.icd || 0) - dt);
    for (const hh of G.heroes) {
      // aspirar: le arranca masa (mucho más si está mareado)
      if (hh.vac && (B.x - hh.x) * hh.face > 0 && Math.abs(B.x - hh.x) < 330 && B.state !== "hurt") {
        bossHit((B.state === "dizzy" ? 0.55 : 0.1) * dt, true);
        if (Math.random() < dt * (B.state === "dizzy" ? 10 : 3)) G.minis.push({ x: B.x - hh.face * 90, y: B.y - rand(80, 220), vx: -hh.face * 300, vy: -100, t: 0, size: rand(10, 14), col: MINICOL[0], on: false, life: 6, wait: 0, lost: false });
        B.x += hh.face * -12 * dt; B.soft.jv += (Math.random() - 0.5) * 2;
      }
      if (!(hh.x + hh.w / 2 > B.x - bw && hh.x - hh.w / 2 < B.x + bw && hh.y > B.y - bh && hh.y - hh.h < B.y)) continue;
      if (hh.vy > 50 && hh.y - hh.vy * STEP < B.y - bh + 50) { hh.vy = -1200; hh.bounced = true; hh.dbl = true; if (B.icd <= 0) bossHit(B.state === "dizzy" ? 1 : 0.5); continue; }
      if ((hh.turbo || hh.giant > 0) && B.icd <= 0) { bossHit(B.state === "dizzy" ? 1 : 0.6); hh.vx = -Math.sign(hh.vx || hh.face) * 700; hh.vy = -500; continue; }
      if (hh.sugar || hh.inv > 0 || hh.bubble > 0 || B.state === "hurt") continue;
      hh.vx = (hh.x < B.x ? -1 : 1) * 600; hh.vy = -600; hurt(hh, false);
    }
    if (B.state === "dizzy" && Math.random() < 0.1) part({ x: B.x + rand(-60, 60), y: B.y - 290, vx: rand(-40, 40), vy: -30, life: 0.8, size: 8, color: "#ffe27a", type: "star", vr: 5 });
  }
  function bossHit(dmg = 1, silent = false) {
    const B = G.boss; if (!B || B.state === "defeat" || B.state === "gone" || B.state === "sleep" || B.state === "intro") return;
    B.hp -= dmg; B.flash = Math.max(B.flash, silent ? 0.08 : 0.5);
    if (!silent) { B.icd = 0.45; B.soft.sqv -= 7; G.cam.shake = 9; A.sfx("squish"); spawnMinis(B.x, B.y - 200, Math.max(1, Math.round(dmg * 4))); burst(B.x, B.y - 200, 14, PASTEL, "star", 360);
      say(B.x, B.y - 330, "−" + Math.round(dmg * 100 / B.maxHp) + "%", "#ff6f91"); }
    if (!silent) ev("fx", "bossHit");
    if (B.hp <= 0) { B.hp = 0; B.state = "defeat"; B.t = 0; }
    else if (!silent && dmg >= 1) { B.state = "hurt"; B.t = 0; }
    ev("boss");
  }

  // ——— mundo ———
  function stepWorld(dt) {
    const L = G.L, t = G.t;
    L.movers.forEach((m) => { const a = (t / m.period) * Math.PI * 2 + m.phase, nx = m.x0 + Math.sin(a) * m.dx, ny = m.y0 + Math.sin(a) * m.dy; m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny; });
    L.shrooms.forEach((s) => { s.squash = Math.max(0, s.squash - dt * 4); });
    L.plats.forEach((p) => {
      const stood = G.heroes.some((h) => h.onPlat === p);
      if (p.kind === "soft") p.sink = lerp(p.sink, 0, dt * 4);
      if (p.kind === "raft" && !stood) p.sink = lerp(p.sink, 0, dt * 1.5);
      if (p.kind === "crumble") {
        if (p.gone) { p.gone -= dt; if (p.gone <= 0) { p.gone = 0; p.t = 0; p.y = p.y0; p.fall = 0; } return; }
        if (p.t > 0.55) { if (!p.fall) A.sfx("crumble"); p.fall += dt; p.y += p.fall * 600 * dt; if (p.fall > 0.6) p.gone = 4; }
        else if (p.t > 0 && !stood) p.t = Math.max(0, p.t - dt * 0.3);
      }
    });
    for (let i = G.clays.length - 1; i >= 0; i--) { const p = G.clays[i]; p.life -= dt; if (p.life <= 0) { burst(p.x + p.w / 2, p.y, 8, ["#ffb08a"], "dot", 120); G.clays.splice(i, 1); } }
    for (let i = G.puddles.length - 1; i >= 0; i--) { G.puddles[i].life -= dt; if (G.puddles[i].life <= 0) G.puddles.splice(i, 1); }
    for (let i = G.auras.length - 1; i >= 0; i--) { const a = G.auras[i]; a.t += dt; a.r = a.max * Math.min(1, a.t / 0.35); if (a.t > 0.6) G.auras.splice(i, 1); }
    L.walls.forEach((w) => { if (!w.alive && w.melt > 0 && w.melt < 1) w.melt = Math.min(1, w.melt + dt / (w.melting ? 1.2 : 0.35)); });
    // mini mash: saltan, luego vienen a ti
    const lead = G.heroes[0];
    for (let i = G.minis.length - 1; i >= 0; i--) {
      const m = G.minis[i]; if (m.dead) { G.minis.splice(i, 1); continue; }
      m.t += dt; m.wait -= dt; m.life -= dt; if (m.life <= 0) { G.minis.splice(i, 1); continue; }
      let near = null, nd = 1e9; for (const h of G.heroes) { const d = Math.hypot(h.x - m.x, h.y - h.h / 2 - m.y); if (d < nd) { nd = d; near = h; } }
      const magnet = near && m.wait <= 0 && (nd < 170 || (!m.lost && nd < 420 && near.vac));
      if (magnet) { const k = Math.min(1, dt * 7); m.x = lerp(m.x, near.x, k); m.y = lerp(m.y, near.y - near.h * 0.5, k); if (nd < 30) absorb(near, m); }
      else if (!m.pulled) { m.vy += 1800 * dt; m.x += m.vx * dt; m.y += m.vy * dt; const gy = groundBelow(m.x, m.y - 10); if (m.y > gy) { m.y = gy; m.vy = m.on ? -rand(120, 300) : -Math.abs(m.vy) * 0.4; m.vx *= 0.7; m.on = true; } }
      m.pulled = false;
    }
    // caramelos y chispas
    for (const k of L.candies) { if (k.got) continue; k.t += dt; for (const h of G.heroes) if (Math.hypot(k.x - h.x, k.y - (h.y - h.h / 2)) < 50) { pickCandy(h, k); break; } }
    for (const s of L.sparks) { if (s.got) continue; s.t += dt;
      for (const h of G.heroes) { const dx = s.x - h.x, dy = s.y - (h.y - h.h / 2); if (dx * dx + dy * dy < 52 * 52) { s.got = true; G.stats.sparks += s.big ? 5 : 1; if (s.big) { G.stats.big++; say(s.x, s.y - 40, "¡Chispa secreta! +5", "#e0a020", true); }
        A.sfx("spark", s.big ? 4 : (G.stats.sparks % 5)); burst(s.x, s.y, s.big ? 20 : 7, ["#ffe27a", "#ffffff", "#ffb3c7"], "star", s.big ? 360 : 220); ev("hud"); break; } } }
    // lluvia de caramelos
    for (const sp of L.spawners) { if (lead.x < sp.x1 - 300 || lead.x > sp.x2 + 300) continue; sp.t += dt;
      if (sp.t > sp.every) { sp.t = 0; const fx = clamp(lead.x + rand(-500, 700), sp.x1, sp.x2); if (Math.random() < 0.25) L.candies.push({ x: fx, y: G.cam.y - 40, type: M.rng(G.t * 1000).pick(Object.keys(M.CANDIES)), got: false, t: 0, fall: true }); else L.sparks.push({ x: fx, y: G.cam.y - 40, got: false, t: 0, fall: true }); } }
    [L.candies, L.sparks].forEach((arr) => arr.forEach((o) => { if (o.fall && !o.got) { o.y += 260 * dt; const gy = groundBelow(o.x, o.y - 30); if (o.y > gy - 40) { o.y = gy - 40; o.fall = false; } } }));
    // interacciones
    G.near = null;
    for (const h of G.heroes) { const near = findNear(h); if (h.pi === 0) G.near = near; const pressed = I.consume(h.pi, "E"); if (near && pressed) interact(near, h); }
    for (const k of L.checks) if (!k.on && G.heroes.some((h) => h.x > k.x - 20)) { k.on = true; G.check = { x: k.x, y: k.y }; A.sfx("check"); burst(k.x, k.y - 105, 14, ["#ffe27a", "#ffffff", "#ff9fb6"], "star", 260); }
    L.giants.forEach((g) => { g.t += dt; g.squash = Math.max(0, g.squash - dt * 3); if (g.awake) g.wake += dt; });
    L.visitors.forEach((v) => (v.t += dt));
    const cg = L.cage;
    if (cg) { cg.t += cg.open ? dt : 0; cg.wobble = Math.max(0, cg.wobble - dt * 2);
      if (!cg.open && cg.R) for (const h of G.heroes) if (h.vy > 200 && Math.abs(h.x - cg.x) < cg.R * 0.7 && Math.abs(h.y - (cg.cy - cg.R)) < 30) { h.vy = -900; cg.wobble = 1; openCage(); } }
    if (L.exit && G.rescued && !G.done && G.heroes.some((h) => Math.abs(h.x - L.exit.x) < 60 && h.y > L.exit.y - 230)) { G.done = true; A.sfx("fanfare"); ev("worldDone"); }
    if (G.combo.t > 0) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo.n = 0; }
    if (G.combo.miniT > 0) G.combo.miniT -= dt;
    if (G.fusion && G.heroes.length === 2) { const [a, b] = G.heroes; if (Math.abs(a.x - b.x) > VW * 0.85 || Math.abs(a.y - b.y) > VH * 0.9) { const [back, front] = a.x < b.x ? [a, b] : [b, a]; back.x = front.x - 60; back.y = front.y - 40; back.vx = back.vy = 0; back.bubble = 1.2; puff(back.x, back.y, 10); A.sfx("pop"); } }
    // aspiración: sonido continuo
    A.vacuum(G.heroes.some((h) => h.vac));
  }
  function findNear(h) {
    const L = G.L, near = (x, y, r) => Math.abs(x - h.x) < r && Math.abs(y - h.y) < 170;
    for (const s of L.switches) if (!s.on && near(s.x, s.y, s.big ? 110 : 80)) return { kind: "switch", o: s };
    for (const g of L.giants) if (!g.awake && near(g.x, g.y, 240)) return { kind: "giant", o: g };
    for (const v of L.visitors) if (near(v.x, v.y, 140)) return { kind: "visitor", o: v };
    if (L.cage && !L.cage.open && near(L.cage.x, L.cage.y, 170)) return { kind: "cage", o: L.cage };
    return null;
  }
  function interact(n, h) {
    const o = n.o, age = h.age;
    if (n.kind === "switch") { o.on = true; A.sfx("check"); const w = G.L.walls.find((x) => x.id === o.wall); if (w) (w.type === "azucar" ? meltWall : breakWall)(w); burst(o.x, o.y - 40, 16, PASTEL, "star", 300); }
    else if (n.kind === "giant") { o.awake = true; o.wake = 0; A.sfx("friend"); G.cam.shake = 6; const line = M.persona(o.id, age).l; say(o.x, o.y - 260, "«" + line + "»", "#6aa88f", true); M.speak && M.speak(line, age);
      G.heroes.forEach((x) => addMass(x, 0.25)); spawnMinis(o.x, o.y - 120, 6); ev("hud"); }
    else if (n.kind === "visitor" && age === "kids" && M.Dialog && !o.talked) {
      o.talked = true; const gift = M.rng(o.x).pick(Object.keys(M.CANDIES)); G.state = "dialog";
      M.Dialog.show(M.Story.visitor(o.id, gift), () => { G.state = "play"; pickCandy(h, { x: o.x, y: o.y - 100, type: gift }); });
    }
    else if (n.kind === "visitor") { const line = M.persona(o.id, age).l; say(o.x, o.y - M.CAST[o.id].h - 40, "«" + line + "»", "#6aa88f", true); M.speak && M.speak(line, age); o.t = 0; A.sfx("pop");
      if (!o.talked) { o.talked = true; const gift = M.rng(o.x).pick(Object.keys(M.CANDIES)); pickCandy(h, { x: o.x, y: o.y - 100, type: gift }); } }
    else if (n.kind === "cage") openCage();
  }
  function openCage() { const cg = G.L.cage; if (cg.open) return; cg.open = true; cg.t = 0; G.rescued = true; A.sfx("friend"); G.cam.shake = 6;
    burst(cg.x, cg.cy || cg.y - 100, 40, ["#ff8fab", "#ffd98e", "#ffffff", "#b9a3ff", "#9ff0d4"], "heart", 480); setTimeout(() => ev("rescue", cg.friend), 700); }

  // ——— compañero ———
  function stepComp(dt) {
    const cp = G.comp; if (!cp) return;
    const h = G.heroes[0]; cp.t += dt; if (cp.hop > 0) cp.hop -= dt;
    cp.trail.push([h.x, h.y]); if (cp.trail.length > 26) cp.trail.shift();
    const [tx, ty] = cp.trail[0], px = cp.x;
    cp.x = lerp(cp.x, tx - h.face * 30, Math.min(1, dt * 6)); cp.y = lerp(cp.y, ty, Math.min(1, dt * 8));
    if (Math.abs(cp.x - h.x) > 700) { cp.x = h.x - h.face * 80; cp.y = h.y; puff(cp.x, cp.y, 6); }
    cp.vx = (cp.x - px) / dt; if (Math.abs(cp.vx) > 20) cp.face = Math.sign(cp.vx);
    softStep(cp.soft, cp.vx, true, dt, 400, cp.t);
    // Baby: el compañero ayuda solo
    if (h.AG.assist && cp.def.ability && (cp.cd = (cp.cd || 0) - dt) <= 0) {
      const threat = G.L.enemies.some((e) => e.state === "walk" && Math.abs(e.x - h.x) < 230 && Math.abs(e.y - h.y) < 140);
      if (threat && ["risa", "fuego"].includes(cp.def.ability)) { tapPower(cp, cp.def.ability, h, "candy"); cp.cd = 2.5; cp.hop = 0.5; }
    }
  }

  // ——— cámara ———
  function stepCamera(dt) {
    const cam = G.cam; let fx, fy;
    if (G.heroes.length === 2) { fx = (G.heroes[0].x + G.heroes[1].x) / 2; fy = Math.min(G.heroes[0].y, G.heroes[1].y); }
    else { const h = G.heroes[0]; fx = h.x; fy = h.y; cam.look = lerp(cam.look, h.face * 110 + h.vx * 0.15, Math.min(1, dt * 2.2)); }
    let tx = fx - VW * 0.45 + (G.heroes.length === 1 ? cam.look : 0), ty = fy - VH * 0.62;
    const B = G.boss; if (B && B.state !== "sleep" && B.state !== "gone") { tx = clamp((fx + B.x) / 2 - VW / 2, B.arena[0] - 80, B.arena[1] + 80 - VW); ty = Math.min(ty, B.y0 - VH * 0.74); }
    cam.x = lerp(cam.x, tx, 1 - Math.exp(-dt * 5)); cam.y = lerp(cam.y, ty, 1 - Math.exp(-dt * 3.5));
    cam.x = clamp(cam.x, -350, G.L.end + 200 - VW); cam.y = clamp(cam.y, -900, 820 - VH);
    cam.shake = Math.max(0, cam.shake - dt * 30);
  }
  function stepParticles(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt * 0.5); } p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= (t.big ? 18 : 40) * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  }

  // ═════════ RENDER ═════════
  const ambient = []; for (let i = 0; i < 80; i++) ambient.push({ x: Math.random(), y: Math.random(), z: rand(0.3, 1.3), s: rand(1.5, 4), ph: rand(0, 6) });
  function getVignette() { if (vignette && vignette.width === Math.ceil(VW)) return vignette; vignette = M.canvas(Math.ceil(VW), Math.ceil(VH));
    const x = vignette.getContext("2d"), g = x.createRadialGradient(VW / 2, VH * 0.45, VH * 0.35, VW / 2, VH * 0.5, VW * 0.75); g.addColorStop(0, "rgba(60,30,60,0)"); g.addColorStop(1, "rgba(60,30,70,0.34)"); x.fillStyle = g; x.fillRect(0, 0, VW, VH); return vignette; }
  function drawSky() {
    const L = G.L, b = L.biome, g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    const im = M.IMG.bgBlur[L.bg];
    if (im) { const S = Math.max(VW, VH) * 1.3, prog = clamp((G.cam.x + VW / 2) / L.end, 0, 1); c.globalAlpha = 0.9;
      c.drawImage(im, -(S - VW) * prog, clamp(-(S - VH) * 0.55 - G.cam.y * 0.06, -(S - VH), 0), S, S); c.globalAlpha = 1; }
    c.fillStyle = b.tint; c.fillRect(0, 0, VW, VH);
    if (L.tod === "dusk") { const d = c.createLinearGradient(0, 0, 0, VH); d.addColorStop(0, "rgba(255,150,120,0.24)"); d.addColorStop(1, "rgba(160,90,160,0.16)"); c.fillStyle = d; c.fillRect(0, 0, VW, VH); }
    if (L.tod === "night") { c.fillStyle = "rgba(40,30,90,0.3)"; c.fillRect(0, 0, VW, VH); }
  }
  // mezcla un color hex con la bruma del bioma
  function mixCol(hex, fog, k) { const n = parseInt(hex.slice(1), 16), c0 = [n >> 16, (n >> 8) & 255, n & 255]; return `rgb(${c0.map((v, i) => Math.round(v * (1 - k) + fog[i] * k)).join(",")})`; }
  // franja de terreno a una profundidad concreta: su borde queda a la altura de la base de los decorados de esa capa
  function drawBand(par, parY, worldY, amp, col, seed) {
    const ox = G.cam.x * par, top = worldY - G.cam.y * parY;
    const g = c.createLinearGradient(0, top - amp, 0, VH); g.addColorStop(0, col); g.addColorStop(1, "rgba(120,90,120,0.35)");
    c.fillStyle = col; c.beginPath(); c.moveTo(-10, VH + 10);
    for (let x = -10; x <= VW + 20; x += 16) { const wx = (x + ox) * 0.006 + seed; c.lineTo(x, top - (Math.sin(wx) * 0.5 + Math.sin(wx * 2.7 + 1) * 0.3 + 0.2) * amp); }
    c.lineTo(VW + 20, VH + 10); c.closePath(); c.fill();
    c.fillStyle = g; c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 2; c.stroke();
  }
  function drawHills(par, baseY, amp, col, seed) { const ox = G.cam.x * par, oy = G.cam.y * par * 0.5; c.fillStyle = col; c.beginPath(); c.moveTo(0, VH);
    for (let x = 0; x <= VW + 20; x += 20) { const wx = (x + ox) * 0.004 + seed; c.lineTo(x, baseY - oy - (Math.sin(wx) * 0.6 + Math.sin(wx * 2.3 + 1) * 0.3 + Math.sin(wx * 0.5) * 0.5) * amp); } c.lineTo(VW, VH); c.closePath(); c.fill(); }
  function drawProp(p, par, parY, set) {
    const im = set[p.key]; if (!im) return; const man = window.MANIFEST.props[p.key], h = p.h, w = h * man[0] / man[1], pad = (im.pad || 0) * h;
    const sx = p.x - G.cam.x * par, sy = p.y - G.cam.y * parY; if (sx + w < -80 || sx - w > VW + 80) return;
    c.save(); c.translate(sx, sy); if (p.flip) c.scale(-1, 1); c.drawImage(im, -w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2); c.restore();
  }
  // Nube: el malvavisco del primer prototipo (v1), con las físicas blandas de v3
  function drawNube(h) {
    const s = h.soft, walk = h.on && Math.abs(h.vx) > 30 ? s.walk : 0, face = h.face;
    const sy = 1 + s.sq, sx = 1 - s.sq * 0.55, lean = s.jx * 0.9;
    c.scale(sx, sy);
    // piececitos
    const f1 = Math.sin(walk) * 7, f2 = Math.sin(walk + Math.PI) * 7;
    c.fillStyle = "#efe2da";
    c.beginPath(); c.ellipse(-11 + f1, -3 - Math.max(0, Math.cos(walk)) * 4, 9, 6, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(11 + f2, -3 - Math.max(0, Math.cos(walk + Math.PI)) * 4, 9, 6, 0, 0, 7); c.fill();
    c.save(); c.transform(1, 0, -lean, 1, 0, 0);
    const bob = h.on ? Math.abs(Math.sin(walk)) * -3 + Math.sin(G.t * 2.5) * (Math.abs(h.vx) < 5 ? 1.2 : 0) : 0;
    c.translate(0, bob);
    // bracitos
    const arm = h.flying ? Math.sin(G.t * 30) * 1.2 : h.on ? Math.sin(walk) * 0.6 : -0.9;
    [[-1, arm], [1, -arm]].forEach(([sd, a]) => {
      c.save(); c.translate(sd * 24, -30); c.rotate(sd * (0.4 + a * 0.4) + (h.on ? 0 : sd * -0.6));
      c.fillStyle = "#f6ece6"; c.beginPath(); c.ellipse(sd * 5, 6, 6, 10, 0, 0, 7); c.fill(); c.restore();
    });
    // cuerpo de malvavisco
    const body = c.createLinearGradient(0, -62, 0, 0);
    body.addColorStop(0, "#ffffff"); body.addColorStop(0.65, "#fbf5f1"); body.addColorStop(1, "#ecdcd3");
    c.save(); c.shadowColor = "rgba(90,50,80,0.25)"; c.shadowBlur = 8; c.shadowOffsetY = 3;
    c.fillStyle = body; M.rr(c, -26, -62, 52, 58, 19); c.fill(); c.restore();
    c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.ellipse(0, -57, 22, 6, 0, 0, 7); c.fill();
    const side = c.createLinearGradient(-26, 0, 26, 0);
    side.addColorStop(0, "rgba(255,255,255,0)"); side.addColorStop(0.75, "rgba(255,255,255,0)"); side.addColorStop(1, "rgba(200,170,170,0.28)");
    c.fillStyle = side; M.rr(c, -26, -62, 52, 58, 19); c.fill();
    c.fillStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.ellipse(-13, -48, 5, 8, -0.3, 0, 7); c.fill();
    // cara
    const ex = face * 5, blink = h.blink < 0 ? 0.12 : 1;
    c.fillStyle = "#3d2735";
    if (h.vac) { // aspirando: ojos apretados y boca abierta
      c.strokeStyle = "#3d2735"; c.lineWidth = 2.4; c.lineCap = "round";
      [-9, 9].forEach((d) => { c.beginPath(); c.moveTo(ex + d - 4, -36); c.lineTo(ex + d + 4, -33); c.stroke(); });
      c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex + face * 3, -23, 7, 6 + Math.sin(G.t * 30), 0, 0, 7); c.fill();
    } else {
      [-9, 9].forEach((d) => { c.beginPath(); c.ellipse(ex + d, -34, 3.6, 5.2 * blink, 0, 0, 7); c.fill(); });
      if (blink > 0.5) { c.fillStyle = "#fff"; [-9, 9].forEach((d) => { c.beginPath(); c.arc(ex + d + 1.2, -36, 1.4, 0, 7); c.fill(); }); }
    }
    c.fillStyle = "rgba(255,140,170,0.55)";
    c.beginPath(); c.ellipse(ex - 16, -26, 5.5, 3.5, 0, 0, 7); c.ellipse(ex + 16, -26, 5.5, 3.5, 0, 0, 7); c.fill();
    if (!h.vac) {
      c.strokeStyle = "#3d2735"; c.lineWidth = 2; c.lineCap = "round";
      if (!h.on) { c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex, -24, 3, 4, 0, 0, 7); c.fill(); }
      else { c.beginPath(); c.arc(ex - 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.arc(ex + 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.stroke(); }
    }
    c.restore();
    c.restore();
  }
  // retrato de Nube generado con el mismo dibujo del juego (para cartas, diálogos y HUD)
  M.nubePortrait = () => {
    if (M._nubeP) return M._nubeP;
    const pc = M.canvas(240, 240), main = c; c = pc.getContext("2d");
    c.translate(120, 214); c.scale(3, 3);
    drawNube({ soft: { sq: 0, jx: 0, walk: 0 }, on: true, vx: 0, face: 1, blink: 1, vac: false, flying: false });
    c = main; M._nubeP = pc.toDataURL("image/png"); return M._nubeP;
  };
  function drawHero(h) {
    const gy = groundBelow(h.x, h.y), dist = gy - h.y;
    if (dist < 600) { const kk = clamp(1 - dist / 500, 0.2, 1) * h.k; c.fillStyle = `rgba(60,30,60,${0.24 * clamp(1 - dist / 500, 0.2, 1)})`; c.beginPath(); c.ellipse(h.x, gy + 2, 30 * kk, 7 * kk, 0, 0, 7); c.fill(); }
    if (h.inv > 0 && Math.floor(h.inv * 14) % 2 === 0) return;
    if (h.turbo) for (let i = 1; i < 4; i++) { c.globalAlpha = 0.16 * (4 - i); drawBody(h, h.x - h.face * i * 30, h.y); } c.globalAlpha = 1;
    if (h.sugar) { c.save(); c.globalAlpha = 0.55; c.filter = "brightness(1.35) saturate(1.4) hue-rotate(-20deg)"; drawBody(h, h.x, h.y); c.restore(); c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35; c.drawImage(M.IMG.glow.pink, h.x - h.h, h.y - h.h * 1.4, h.h * 2, h.h * 2); c.restore(); }
    else drawBody(h, h.x, h.y);
    if (h.bubble > 0) { c.save(); const R = h.h * 0.8, g = c.createRadialGradient(h.x - R * 0.3, h.y - h.h / 2 - R * 0.3, 4, h.x, h.y - h.h / 2, R); g.addColorStop(0, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,150,210,0.45)"); c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y - h.h / 2, R + Math.sin(G.t * 8) * 3, 0, 7); c.fill(); c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = 3; c.stroke(); c.restore(); }
    if (h.giant > 0 && h.giant < 1.2 && Math.floor(h.giant * 8) % 2) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.3; c.drawImage(M.IMG.glow.white, h.x - h.h, h.y - h.h * 1.5, h.h * 2, h.h * 2); c.restore(); }
    if (h.vac) { c.save(); c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 2; const mx = h.x + h.face * h.w * 0.55, my = h.y - h.h * 0.5;
      for (let i = 0; i < 3; i++) { const r = ((G.t * 300 + i * 60) % 180); c.globalAlpha = 1 - r / 180; c.beginPath(); c.ellipse(mx + h.face * (180 - r), my, 14 + (180 - r) * 0.25, 20 + (180 - r) * 0.35, 0, 0, 7); c.stroke(); } c.restore(); }
    if (G.fusion) { c.font = "700 15px Fredoka, system-ui"; c.textAlign = "center"; c.fillStyle = h.pi ? "#6a8cff" : "#ff6f91"; c.fillText("J" + (h.pi + 1), h.x, h.y - h.h - 30); }
  }
  function drawBody(h, x, y) {
    c.save(); c.translate(x, y);
    c.translate(0, -h.h / 2); c.rotate(h.rot); c.translate(0, h.h / 2);
    if (h.def.procedural) { c.rotate(h.on ? 0 : clamp(h.vx / 2000, -0.12, 0.12)); c.scale(h.k * 0.9, h.k * 0.9); drawNube(h); }
    else { const im = M.IMG.chars[h.id], ph = h.def.ph * 1.0 * h.k, pw = ph * im.width / im.height;
      const flip = h.face !== h.def.nat; drawSoft(im, pw, ph, h.soft, flip, h.flying ? Math.sin(G.t * 20) * 0.04 : 0); }
    c.restore();
  }
  function drawComp(cp) {
    const im = M.IMG.chars[cp.id]; if (!im) return;
    const ph = cp.def.ph * 0.9, pw = ph * im.width / im.height, hop = cp.hop > 0 ? -Math.sin(cp.hop / 0.5 * Math.PI) * 34 : 0;
    c.fillStyle = "rgba(60,30,60,0.16)"; c.beginPath(); c.ellipse(cp.x, cp.y + 2, pw * 0.3, 6, 0, 0, 7); c.fill();
    c.save(); c.translate(cp.x, cp.y + hop); drawSoft(im, pw, ph, cp.soft, cp.face !== cp.def.nat); c.restore();
  }
  function drawEnemy(e) {
    if (e.state === "gone") return;
    const isG = e.type === "gordo";
    const shadowW = isG ? 90 : 42;
    if (e.type !== "volador") { c.fillStyle = "rgba(50,25,45,0.28)"; c.beginPath(); c.ellipse(e.x, e.y + 2, shadowW, 8, 0, 0, 7); c.fill(); }
    else { const gy = groundBelow(e.x, e.y); c.fillStyle = "rgba(50,25,45,0.14)"; c.beginPath(); c.ellipse(e.x, gy + 2, 30, 6, 0, 0, 7); c.fill(); }
    c.save(); c.translate(e.x, e.y);
    const flip = e.dir === -1; // el grumo mira a la derecha en su imagen
    if (e.state === "pop") { const k = e.st / 0.35; c.globalAlpha = 1 - k; c.scale(1 + k, 1 - k * 0.8); }
    else if (e.state === "walk" || e.state === "flash") { const hop = e.type === "volador" ? 0 : Math.abs(Math.sin(e.t * 5)) * 7, sq = 1 + Math.cos(e.t * 10) * 0.05; c.translate(0, -hop); c.scale(2 - sq, sq); }
    else if (e.state === "flat") c.scale(1.5, 0.22 + Math.sin(e.t * 8) * 0.02);
    else if (e.state === "reform") { const k = e.st / 0.6, el = 1 + Math.sin(k * Math.PI * 3) * (1 - k) * 0.4; c.scale(1.5 - 0.5 * k, (0.22 + 0.78 * k) * el); }
    else if (e.state === "melt") { const k = e.st; c.scale(1 + k * 0.5, 1 - k * 0.8); c.globalAlpha = 1 - k * 0.3; }
    else if (e.state === "stun") { c.rotate(Math.sin(e.t * 22) * 0.14); c.scale(1.05, 0.93); }
    if (e.pulledVis) { c.rotate(Math.sin(G.t * 30) * 0.2); c.scale(0.85, 1.1); }
    if (flip) c.scale(-1, 1);
    if (e.state === "flash" && Math.floor(G.t * 20) % 2) c.filter = "brightness(1.8)";
    M.drawGrumoSprite(c, e, G.t);
    c.restore();
    if (e.state === "stun") { c.font = "22px system-ui"; c.textAlign = "center"; c.fillText(e.laugh ? "😂" : "💫", e.x, e.y - (isG ? 190 : 100)); }
    if (isG && e.alive) { c.fillStyle = "rgba(255,255,255,0.8)"; M.rr(c, e.x - 40, e.y - 200, 80, 8, 4); c.fill(); c.fillStyle = "#ff6f91"; M.rr(c, e.x - 40, e.y - 200, 80 * e.hp / 3, 8, 4); c.fill(); }
  }
  function drawBoss() {
    const B = G.boss; if (!B || B.state === "gone") return;
    const im = M.IMG.chars.grumo, h = 300, w = h * im.width / im.height;
    c.fillStyle = "rgba(50,25,45,0.3)"; c.beginPath(); c.ellipse(B.x, B.y0 || B.y, 170 * (1 - Math.min(0.5, ((B.y0 || B.y) - B.y) / 800)), 16, 0, 0, 7); c.fill();
    if (B.wave) { c.strokeStyle = `rgba(255,200,120,${1 - B.wave.r / 900})`; c.lineWidth = 8; [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(B.wave.x + s * B.wave.r, B.y0, 30, 12, 0, Math.PI, 0); c.stroke(); }); }
    c.save(); c.translate(B.x, B.y);
    if (B.state === "sleep") { c.scale(1.05, 0.95 + Math.sin(B.t * 1.5) * 0.02); }
    if (B.state === "defeat") c.globalAlpha = 1 - B.t / 1.4;
    if (B.flash > 0 && Math.floor(G.t * 20) % 2) c.filter = "brightness(1.9)";
    drawSoft(im, w, h, B.soft, B.dir === -1);
    c.filter = "none";
    // corona
    c.fillStyle = "#ffd36b"; c.strokeStyle = "#e0a93c"; c.lineWidth = 3; c.beginPath(); const cy = -h * 0.92 * (1 + B.soft.sq);
    c.moveTo(-60, cy); c.lineTo(-50, cy - 50); c.lineTo(-22, cy - 22); c.lineTo(0, cy - 60); c.lineTo(22, cy - 22); c.lineTo(50, cy - 50); c.lineTo(60, cy); c.closePath(); c.fill(); c.stroke();
    ["#ff6f91", "#9ff0d4", "#b9a3ff"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(-30 + i * 30, cy - 10, 7, 0, 7); c.fill(); });
    c.restore();
    if (B.state === "sleep") { c.font = "700 36px Fredoka"; c.fillStyle = "#8a6aa0"; for (let i = 0; i < 3; i++) { const k = (G.t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText("z", B.x + 120 + k * 50, B.y - 300 - k * 90); } c.globalAlpha = 1; }
  }
  function drawGiant(g) {
    const im = M.IMG.chars[g.id]; if (!im) return; const H = M.CAST[g.id].h * 1.15, W = H * im.width / im.height; g.hh = H;
    c.fillStyle = "rgba(60,30,60,0.2)"; c.beginPath(); c.ellipse(g.x, g.y + 3, 150, 14, 0, 0, 7); c.fill();
    c.save(); c.translate(g.x, g.y);
    if (!g.awake) { const sc = Math.min(240 / im.height, 130 / im.width), Ws = im.width * sc, Hs = im.height * sc; g.lw = Hs; g.lh = Ws;
      c.save(); c.rotate(-Math.PI / 2); c.scale(1 + Math.sin(g.t * 1.6) * 0.035, 1); c.drawImage(im, 0, -Hs / 2, Ws, Hs); c.restore();
      c.font = "700 26px Fredoka"; c.fillStyle = "#8a6aa0"; for (let i = 0; i < 3; i++) { const k = (g.t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText("z", 40 + k * 40, -Ws - 10 - k * 70); } c.globalAlpha = 1; }
    else { const k = Math.min(1, g.wake), sq = g.squash; c.scale(1 + sq * 0.2, (0.3 + 0.7 * k) * (1 - sq * 0.2) * (1 + Math.sin(k * 9) * (1 - k) * 0.2)); c.drawImage(im, -W / 2, -H, W, H); }
    c.restore();
  }
  function drawVisitor(v) { const im = M.IMG.chars[v.id], H = M.CAST[v.id].h, W = H * im.width / im.height;
    c.fillStyle = "rgba(60,30,60,0.18)"; c.beginPath(); c.ellipse(v.x, v.y + 2, W * 0.35, 9, 0, 0, 7); c.fill();
    c.save(); c.translate(v.x, v.y); drawSoft(im, W, H, { jx: Math.sin(v.t * 1.3) * 0.03, sq: Math.sin(v.t * 2) * 0.02, walk: 0 }, (G.heroes[0] && G.heroes[0].x > v.x ? 1 : -1) !== M.CAST[v.id].nat); c.restore();
    if (!v.talked) { c.font = "22px system-ui"; c.textAlign = "center"; c.fillText("💬", v.x, v.y - H - 20 + Math.sin(v.t * 3) * 4); } }
  function drawPrompt(n) {
    if (!n) return; const o = n.o, h = G.heroes[0];
    const label = { switch: o.big ? "¡Pulsa!" : "Tirar", giant: M.T("giant", h.age), visitor: "Charlar", cage: "¡Liberar!" }[n.kind];
    const x = o.x, y = (n.kind === "cage" ? o.cy - o.R : n.kind === "visitor" ? o.y - M.CAST[o.id].h : n.kind === "giant" ? o.y - 150 : o.y - 90) - 40 + Math.sin(G.t * 4) * 4;
    c.save(); c.font = "700 18px Fredoka, system-ui"; const txt = (M.TOUCH ? "👆 " : "E · ") + label, w = c.measureText(txt).width + 30;
    c.shadowColor = "rgba(90,40,80,0.25)"; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = "#fff"; M.rr(c, x - w / 2, y - 21, w, 42, 21); c.fill();
    c.shadowColor = "transparent"; c.fillStyle = "#6b4658"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, x, y); c.restore();
  }
  function drawSpark(s) { const bob = Math.sin(s.t * 3) * 5, r = (s.big ? 22 : 13) + Math.sin(s.t * 5);
    c.drawImage(M.IMG.glow.warm, s.x - r * 2.6, s.y + bob - r * 2.6, r * 5.2, r * 5.2);
    c.save(); c.translate(s.x, s.y + bob); c.rotate(Math.sin(s.t * 2) * 0.3); c.fillStyle = s.big ? "#ff9fd0" : "#ffd65c"; M.star(c, 0, 0, r, -Math.PI / 2); c.fill();
    c.fillStyle = s.big ? "#ffe0f0" : "#fff3b8"; M.star(c, -1, -2, r * 0.55, -Math.PI / 2); c.fill(); c.restore(); }
  function drawParticles() {
    for (const p of G.parts) { c.globalAlpha = Math.min(1, p.life * 3); c.fillStyle = p.color;
      if (p.type === "puff") { c.beginPath(); c.arc(p.x, p.y, Math.max(1, p.size * (1.6 - p.life)), 0, 7); c.fill(); }
      else if (p.type === "star") { M.star(c, p.x, p.y, p.size, p.rot); c.fill(); } else if (p.type === "heart") M.heart(c, p.x, p.y - p.size / 2, p.size * 1.4);
      else if (p.type === "confetti") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); } }
    c.globalAlpha = 1; c.textAlign = "center"; c.textBaseline = "middle";
    for (const t of G.texts) { c.globalAlpha = Math.min(1, t.life * 2); c.font = (t.big ? "700 26px " : "700 22px ") + "Fredoka, system-ui"; const w = c.measureText(t.text).width;
      if (t.big) { c.fillStyle = "rgba(255,255,255,0.94)"; M.rr(c, t.x - w / 2 - 16, t.y - 22, w + 32, 44, 22); c.fill(); } else { c.lineWidth = 6; c.strokeStyle = "rgba(255,255,255,0.95)"; c.strokeText(t.text, t.x, t.y); }
      c.fillStyle = t.color; c.fillText(t.text, t.x, t.y); }
    c.globalAlpha = 1;
  }
  // Oscuridad nocturna con luz alrededor de los personajes y las setas
  function drawDarkness(x1, x2) {
    if (!darkCv || darkCv.width !== Math.ceil(VW)) darkCv = M.canvas(Math.ceil(VW), Math.ceil(VH));
    const d = darkCv.getContext("2d"); d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, darkCv.width, darkCv.height);
    d.fillStyle = "rgba(18,10,42,0.72)"; d.fillRect(0, 0, VW, VH); d.globalCompositeOperation = "destination-out";
    const hole = (x, y, r) => { const g = d.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill(); };
    const ox = -G.cam.x, oy = -G.cam.y;
    G.heroes.forEach((h) => hole(h.x + ox, h.y - h.h / 2 + oy, 300 + h.mass * 80));
    if (G.comp) hole(G.comp.x + ox, G.comp.y - 50 + oy, 150);
    G.L.checks.forEach((k) => { if (k.on) hole(k.x + ox, k.y - 104 + oy, 220); });
    G.L.solids.forEach((s) => { if (s.x < x2 && s.x + s.w > x1 && s.back) s.back.forEach((f) => { if (f.kind === "farol") hole(f.x + ox, s.y - 30 + oy, 130); }); });
    G.L.sparks.forEach((s) => { if (!s.got && s.x > x1 && s.x < x2) hole(s.x + ox, s.y + oy, 70); });
    G.L.candies.forEach((k) => { if (!k.got && k.x > x1 && k.x < x2) hole(k.x + ox, k.y + oy, 110); });
    if (G.L.cage) hole(G.L.cage.x + ox, G.L.cage.y - 100 + oy, 260);
    c.drawImage(darkCv, 0, 0, VW, VH);
  }

  function render() {
    const cam = G.cam, t = G.t, L = G.L, b = L.biome;
    c.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const sh = cam.shake ? { x: rand(-cam.shake, cam.shake), y: rand(-cam.shake, cam.shake) } : { x: 0, y: 0 };
    const night = L.tod === "night";
    drawSky();
    if (!night) { c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) { const x = ((i * 330 - cam.x * 0.08) % (VW + 600) + VW + 600) % (VW + 600) - 300, a = 0.055 + Math.sin(t * 0.4 + i * 2) * 0.025;
        const g = c.createLinearGradient(x, 0, x + 260, VH); g.addColorStop(0, `rgba(255,245,220,${a})`); g.addColorStop(1, "rgba(255,245,220,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x, -10); c.lineTo(x + 110, -10); c.lineTo(x + 440, VH); c.lineTo(x + 210, VH); c.fill(); }
      c.restore(); }
    const fog = b.fog.join(",");
    drawHills(0.15, VH * 0.72, 70, `rgba(${fog},0.5)`, L.seed % 7);
    for (const p of L.props) if (p.layer === "far") drawProp(p, 0.4, 0.28, M.IMG.fog);
    drawBand(0.4, 0.28, 548, 16, mixCol(b.body, b.fog, 0.62), L.seed % 5);      // suelo lejano que tapa las bases
    for (const p of L.props) if (p.layer === "midfar") drawProp(p, 0.65, 0.5, M.IMG.midblur);
    drawBand(0.65, 0.5, 628, 14, mixCol(b.body, b.fog, 0.34), 2 + L.seed % 3);  // suelo medio
    // banda de bruma a media altura
    const fg = c.createLinearGradient(0, VH * 0.45, 0, VH); fg.addColorStop(0, `rgba(${fog},0)`); fg.addColorStop(1, `rgba(${fog},0.35)`); c.fillStyle = fg; c.fillRect(0, VH * 0.45, VW, VH * 0.55);
    for (const a of ambient) { if (a.z > 0.8) continue; const x = ((a.x * (VW + 100) - cam.x * a.z * 0.5 + Math.sin(t * 0.5 + a.ph) * 20) % (VW + 100) + VW + 100) % (VW + 100) - 50;
      const y = ((a.y * VH - cam.y * a.z * 0.3 + (L.weather === "sugar" ? 1 : -1) * t * 12 * a.z) % VH + VH) % VH;
      c.fillStyle = L.weather === "petals" ? "rgba(255,190,210,0.75)" : "rgba(255,255,255,0.55)"; c.beginPath(); c.arc(x, y, a.s * a.z, 0, 7); c.fill(); }

    // ——— mundo ———
    c.save(); c.translate(-Math.round(cam.x) + sh.x, -Math.round(cam.y) + sh.y);
    const x1 = cam.x - 400, x2 = cam.x + VW + 400, lead = G.heroes[0];
    for (const p of L.props) if (p.layer === "back" && p.x > x1 && p.x < x2) { const im = M.IMG.props[p.key]; if (!im) continue; const w = p.h * im.width / im.height; c.save(); c.translate(p.x, p.y); if (p.flip) c.scale(-1, 1); c.drawImage(im, -w / 2, -p.h, w, p.h); c.restore(); }
    // viento: estelas
    for (const wz of L.winds) if (wz.x2 > x1 && wz.x1 < x2) { c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 3; c.lineCap = "round";
      for (let i = 0; i < 14; i++) { const px = wz.x1 + ((i * 97 + t * 260) % (wz.x2 - wz.x1)), py = wz.y2 - ((i * 131 + t * 320) % (wz.y2 - wz.y1)); c.globalAlpha = 0.6; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 20, py - 30, px + 10, py - 60); c.stroke(); } c.globalAlpha = 1; }
    if (L.exit) M.drawExit(c, L.exit, t, G.rescued);
    for (const s of L.solids) if (s.x < x2 && s.x + s.w > x1) M.drawGround(c, s, L, cam, VW, VH, t);
    for (const s of L.solids) if (s.back && s.x < x2 && s.x + s.w > x1) M.drawFlora(c, L, s.back.filter((f) => f.x > x1 && f.x < x2), s.y, t, false);
    for (const p of G.puddles) { c.globalAlpha = Math.min(1, p.life / 1.5); c.fillStyle = p.type === "moco" ? "rgba(140,220,90,0.8)" : "rgba(170,220,255,0.75)"; c.beginPath(); c.ellipse((p.x1 + p.x2) / 2, p.y + 2, (p.x2 - p.x1) / 2, 8, 0, 0, 7); c.fill(); c.globalAlpha = 1; }
    for (const s of L.plats) if (!s.gone && s.x < x2 && s.x + s.w > x1) { const shk = s.kind === "crumble" && s.t > 0.2 ? rand(-2, 2) : 0; c.drawImage(M.platSprite(s.w, s.h, L, s.kind), s.x - 30 + shk, s.y - 30 + (s.sink || 0)); }
    for (const s of L.movers) if (s.x < x2 && s.x + s.w > x1) c.drawImage(M.platSprite(s.w, s.h, L, "normal"), s.x - 30, s.y - 30);
    for (const p of G.clays) { c.globalAlpha = Math.min(1, p.life); c.fillStyle = "#ffb08a"; M.rr(c, p.x, p.y, p.w, p.h, 12); c.fill(); c.fillStyle = "rgba(255,255,255,0.5)"; M.rr(c, p.x + 8, p.y + 4, p.w - 16, 6, 3); c.fill(); c.globalAlpha = 1; }
    for (const w of L.walls) if (w.x > x1 && w.x < x2) M.drawWall(c, w);
    for (const s of L.switches) if (s.x > x1 && s.x < x2) M.drawSwitch(c, s, t);
    for (const s of L.signs) if (s.x > x1 && s.x < x2) M.drawSign(c, s);
    for (const k of L.checks) if (k.x > x1 && k.x < x2) M.drawCheck(c, k, t);
    for (const s of L.shrooms) if (s.x > x1 && s.x < x2) M.drawShroom(c, s, t, L);
    for (const g of L.giants) if (g.x > x1 && g.x < x2) drawGiant(g);
    for (const v of L.visitors) if (v.x > x1 && v.x < x2) drawVisitor(v);
    if (L.cage && L.cage.x > x1 && L.cage.x < x2) M.drawCage(c, L.cage, t);
    drawBoss();
    for (const e of L.enemies) if (e.x > x1 && e.x < x2) drawEnemy(e);
    for (const k of L.candies) if (!k.got && k.x > x1 && k.x < x2) M.drawCandy(c, k, t);
    for (const s of L.sparks) if (!s.got && s.x > x1 && s.x < x2) drawSpark(s);
    for (const m of G.minis) M.drawMini(c, m, t);
    for (const s of G.shots) { c.save(); c.globalCompositeOperation = "lighter"; c.drawImage(M.IMG.glow.orange, s.x - 40, s.y - 40, 80, 80); c.restore(); c.fillStyle = "#ffcf5a"; c.beginPath(); c.arc(s.x, s.y, 11, 0, 7); c.fill(); c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(s.x - 3, s.y - 3, 4, 0, 7); c.fill(); }
    for (const a of G.auras) { const k = 1 - a.t / 0.6; c.strokeStyle = a.type === "risa" ? `rgba(255,220,90,${k})` : `rgba(255,255,255,${k})`; c.lineWidth = 8 * k + 2; c.beginPath(); c.arc(a.x, a.y, a.r, 0, 7); c.stroke(); }
    if (G.comp) drawComp(G.comp);
    G.heroes.forEach(drawHero);
    // primer plano del mundo: flora delante de los pies y decorados nítidos por los que pasas por detrás
    for (const s of L.solids) if (s.front && s.x < x2 && s.x + s.w > x1) M.drawFlora(c, L, s.front.filter((f) => f.x > x1 && f.x < x2), s.y, t, true, lead);
    for (const d of L.dress) if (d.x > x1 && d.x < x2) { const im = M.IMG.props[d.key]; if (!im) continue; const w = d.h * im.width / im.height;
      const behind = G.heroes.some((h) => Math.abs(h.x - d.x) < w * 0.45 && h.y > d.y - d.h - 30);
      d.a = lerp(d.a ?? 1, behind ? 0.4 : 1, 0.15); c.save(); c.globalAlpha = d.a; c.translate(d.x, d.y); if (d.flip) c.scale(-1, 1);
      const cut = 0.84; c.drawImage(im, 0, 0, im.width, im.height * cut, -w / 2, -d.h * cut, w, d.h * cut);
      c.fillStyle = "rgba(60,30,60,0.18)"; c.beginPath(); c.ellipse(0, 0, w * 0.34, 7, 0, 0, 7); c.fill(); c.restore(); }
    drawParticles();
    if (G.state === "play") drawPrompt(G.near);
    c.restore();

    c.save(); c.globalAlpha = 0.85; for (const p of L.props) if (p.layer === "front") drawProp(p, 1.3, 1.1, M.IMG.blur); c.restore();
    if (night) {
      drawDarkness(x1, x2);
      c.save(); c.globalCompositeOperation = "lighter";
      for (const a of ambient) { const x = ((a.x * (VW + 100) - cam.x * a.z * 0.7 + Math.sin(t * 0.7 + a.ph) * 40) % (VW + 100) + VW + 100) % (VW + 100) - 50, y = ((a.y * VH - cam.y * a.z * 0.4 + Math.cos(t * 0.5 + a.ph) * 30) % VH + VH) % VH;
        c.globalAlpha = 0.5 + Math.sin(t * 3 + a.ph * 3) * 0.5; c.drawImage(a.ph > 3 ? M.IMG.glow.mint : M.IMG.glow.warm, x - 14, y - 14, 28, 28); } c.restore();
    }
    // etalonaje suave: calidez arriba, frescor abajo
    const cg = c.createLinearGradient(0, 0, 0, VH); cg.addColorStop(0, "rgba(255,225,200,0.07)"); cg.addColorStop(1, "rgba(120,90,170,0.08)"); c.fillStyle = cg; c.fillRect(0, 0, VW, VH);
    c.drawImage(getVignette(), 0, 0, VW, VH);
  }

  // ——— bucle ———
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    I.poll(); M.UI && M.UI.frame && M.UI.frame(dt);
    if (G.state === "play") {
      acc += dt;
      while (acc >= STEP) { acc -= STEP; G.t += STEP; G.stats.time += STEP;
        G.heroes.forEach((h) => stepHero(h, STEP)); stepComp(STEP); stepEnemies(STEP); stepBoss(STEP); stepWorld(STEP); stepParticles(STEP); }
      stepCamera(dt);
    } else if (G.state === "attract" && G.L) {
      G.t += dt; G.cam.x += dt * 55; if (G.cam.x > G.L.end - VW) G.cam.x = -200; G.cam.y = lerp(G.cam.y, 820 - VH - 40, dt);
      G.L.enemies.forEach((e) => (e.t += dt)); G.L.sparks.forEach((s) => (s.t += dt)); stepParticles(dt);
    } else { I.clear(); A.vacuum(false); }
    if (G.L) render();
    if (!M._manual) requestAnimationFrame(frame);
  }
  G.attract = function (L) { G.L = L; G.heroes = []; G.comp = null; G.boss = null; G.state = "attract"; G.cam.x = -200; G.puddles = []; G.shots = []; G.clays = []; G.auras = []; G.minis = []; };
  G.begin = () => requestAnimationFrame(frame);
  M._tick = (n = 1, ms = 16.7) => { M._manual = true; for (let i = 0; i < n; i++) frame(last + ms); M._manual = false; };
  M.gameCanvas = cv;
})();
