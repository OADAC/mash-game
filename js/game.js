// Motor v5 "Vivo": masa, aspirar, poderes-transformación, rig de plastilina (rig.js), moveset ampliado
// (deslizar, pisotón, bordes, paredes), IA de grumos, Mash salvajes, cámara con anticipación y zoom.
(function () {
  M.CAPS = { slide: true, ledge: true, pound: true };
  const A = M.Audio, I = M.Input, { clamp, lerp, rand } = M;
  const cv = M.$("game"); let c = cv.getContext("2d");
  const GRAV = 2700, BOUNCE = 1560, STOMP = 800, STEP = 1 / 120;
  const DUCK = 0.45;          // alto agachado / deslizando respecto al alto de pie (ver informe: techos bajos)
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

  const G = M.G = { state: "idle", t: 0, L: null, heroes: [], comp: null, cam: { x: 0, y: 100, shake: 0, look: 0, lookY: 0, zoom: 1, kick: 0 },
    parts: [], texts: [], puddles: [], shots: [], clays: [], auras: [], minis: [], falling: [], boss: null, hitstop: 0, focus: null,
    stats: null, combo: { n: 0, t: 0, best: 0 }, check: null, rescued: false, onEvent: () => {} };
  const ev = (n, d) => G.onEvent(n, d);
  const PASTEL = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff", "#ffffff"];
  const MINICOL = ["#ffffff", "#fff0f5", "#fff6e0", "#eefcf6", "#f3efff", "#ffeef0"];
  // módulos opcionales de otros agentes: un fallo suyo no debe tumbar el bucle
  const warned = {};
  function safe(name, fn) { try { return fn(); } catch (err) { if (!warned[name]) { warned[name] = 1; console.error("[" + name + "]", err); } } }

  // ——— partículas ———
  function part(o) { G.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, size: 6, rot: 0, vr: 0, drag: 0, color: "#fff", type: "dot" }, o)); }
  function burst(x, y, n, colors, type = "star", speed = 320) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rand(speed * 0.35, speed);
    part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, g: 500, life: rand(0.5, 1.1), size: rand(5, 11), color: colors[i % colors.length], type, vr: rand(-8, 8), drag: 1.8 }); } }
  function puff(x, y, n = 6, s = 1) { for (let i = 0; i < n; i++) part({ x: x + rand(-16, 16) * s, y: y - rand(0, 8), vx: rand(-80, 80), vy: rand(-90, -20), life: rand(0.35, 0.6), size: rand(8, 16) * s, color: "rgba(255,255,255,0.9)", type: "puff", drag: 3 }); }
  function say(x, y, text, color = "#ff6f91", big = false) { G.texts.push({ x, y, text, color, life: big ? 2.6 : 1.5, big }); }
  M.say = say;
  const hitstop = (t) => { G.hitstop = Math.max(G.hitstop || 0, t); };
  const focus = (x, y, t = 1.5, zoom = 1.15) => { G.focus = { x, y, t, zoom }; };

  // ——— cuerpo blando: rig de malla (rig.js) con respaldo por tiras si no está cargado ———
  const R = M.Rig;
  function softNew(face) { return R ? R.create(face) : { jx: 0, jv: 0, sq: 0, sqv: 0, walk: 0, prevVx: 0, face: face || 1, shown: face || 1, hx: 0 }; }
  function softStep(s, vx, on, dt, maxv, idleT, o) {
    if (R) { const q = o || {}; q.vx = vx; q.on = on; q.maxv = maxv; R.step(s, q, dt); return; }
    const acc = (vx - s.prevVx) / dt; s.prevVx = vx; if (o && o.face) s.face = s.shown = o.face;
    const leanT = clamp(vx / maxv, -1.2, 1.2) * 0.13;
    s.jv += (-160 * (s.jx - leanT) - 11 * s.jv - clamp(acc, -8000, 8000) * 0.00009) * dt; s.jx += s.jv * dt;
    const sqT = on ? Math.sin(idleT * 2.2) * 0.018 - (o && o.crouch ? 0.3 : 0) : 0;
    s.sqv += (-190 * (s.sq - sqT) - 12 * s.sqv) * dt; s.sq += s.sqv * dt;
    s.sq = clamp(s.sq, -0.45, 0.5); s.jx = clamp(s.jx, -0.5, 0.5);
    if (on && Math.abs(vx) > 30) s.walk += dt * Math.abs(vx) * 0.04;
  }
  function rigHit(s, kind, amt = 1) {
    if (R) return R.hit(s, kind, amt);
    if (kind === "land") s.sqv -= 7 * amt; else if (kind === "hurt") { s.sqv -= 6; s.jv += (Math.random() - 0.5) * 8; } else s.sqv += 5 * amt;
  }
  // respaldo: sprite en tiras (la parte de arriba se inclina, abajo queda pegada al suelo)
  function drawStrips(im, w, h, s, flip, extra = 0) {
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
  // dibuja un personaje (sprite con rig, o procedural con M.ProcChar) con los pies en el origen
  function charImg(id) { return M.IMG.chars[id]; }
  function charW(id, H) { const im = charImg(id); return im && im.height ? H * im.width / im.height : H * 0.8; }
  function drawChar(id, H, rig, o = {}) {
    const def = M.CAST[id];
    if (def && def.procgen) {
      const cr = def.creature || def;
      if (M.ProcChar && M.ProcChar.draw) { safe("ProcChar.draw", () => M.ProcChar.draw(c, cr, 0, 0, H, o.st || { t: G.t, vx: 0, vy: 0, on: true, face: rig.shown || 1, mood: "idle", sq: rig.sq })); return; }
      return drawBlob(H, rig, (cr.look && cr.look.color) || "#ffe0ef");
    }
    const im = charImg(id); if (!im) return;
    const W = H * im.width / im.height, nat = def ? def.nat || 1 : 1;
    if (R) R.draw(c, im, W, H, rig, { nat, extraLean: o.extraLean || 0, variant: o.variant, quality: o.quality });
    else { if (o.variant === "flash") c.filter = "brightness(1.8)"; drawStrips(im, W, H, rig, (rig.shown || rig.face || 1) !== nat, o.extraLean || 0); c.filter = "none"; }
  }
  // criatura de respaldo si M.ProcChar no está: bolita de plastilina con ojos
  function drawBlob(H, rig, col) {
    const sq = rig.sq || 0, w = H * 0.42 * (1 - sq * 0.5), hh = H * 0.5 * (1 + sq), f = rig.shown || 1;
    c.fillStyle = col; c.beginPath(); c.ellipse(0, -hh, w, hh, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.ellipse(-w * 0.35, -hh * 1.4, w * 0.2, hh * 0.18, -0.4, 0, 7); c.fill();
    c.fillStyle = "#3d2735"; [-1, 1].forEach((d) => { c.beginPath(); c.ellipse(f * w * 0.2 + d * w * 0.25, -hh * 1.15, w * 0.07, hh * 0.11, 0, 0, 7); c.fill(); });
  }

  // ——— materiales del suelo: inercia y fricción ———
  const MATS = { normal: { acc: 1, dec: 1, top: 1 }, hielo: { acc: 0.2, dec: 0.05, top: 1.12 }, chicle: { acc: 0.85, dec: 1.8, top: 0.8, jump: 0.92 }, jelly: { acc: 1, dec: 1, top: 1 } };

  // ——— héroes ———
  function makeHero(id, pi, age, x, y, mass) {
    const def = M.CAST[id], AG = M.AGES[age];
    return { pi, id, def, age, AG, x, y, w: 44, h: 60, vx: 0, vy: 0, on: false, coyote: 0, buf: 0, dbl: true, face: 1, inv: 0, blink: 2,
      mass: mass ?? AG.startMass, soft: softNew(1), idleT: 0, rot: 0, spin: 0, mover: null, onPlat: null, onMat: null, slip: false, bounced: false,
      giant: 0, bubble: 0, flying: false, turbo: false, sugar: false, vac: false, fireCd: 0, wall: 0, candy: null, low: 0,
      // moveset v5
      duck: false, duckT: 0, slide: 0, slideDir: 1, pound: null, recover: 0, ledge: null, ledgeCd: 0, climb: null, wallT: 0, wallSide: 0, wallSticky: false,
      wjLock: 0, wjSide: 0, kbT: 0, downT: 0, hurtT: 0, happyT: 0, dizzy: 0, scared: 0, scT: 0, mood: "idle", maxv: 400,
      spd: 0.8 + def.stats[0] * 0.07, jmp: 0.86 + def.stats[1] * 0.045, heavy: def.stats[2] >= 4 };
  }
  const scaleOf = (h) => (0.86 + 0.38 * h.mass) * (h.giant > 0 ? 1.6 : 1);
  function sizeHero(h) { const k = scaleOf(h), ph = h.def.procedural ? 58 : h.def.ph * 0.9; h.k = k; h.w = 46 * k; h.hStand = ph * k; h.h = h.hStand * (h.duck ? DUCK : 1); }
  function makeComp(id, hero) { return { id, def: M.CAST[id], x: hero.x - 70, y: hero.y, face: 1, t: 0, trail: [], hop: 0, soft: softNew(1), vx: 0, vy: 0 }; }

  G.start = function (cfg) {
    G.cfg = cfg; G.L = cfg.L; G.fusion = !!cfg.fusion;
    G.parts = []; G.texts = []; G.puddles = []; G.shots = []; G.clays = []; G.auras = []; G.minis = []; G.falling = [];
    G.stats = { falls: 0, hits: 0, stomps: 0, ability: 0, eats: 0, sparks: 0, time: 0, big: 0, minis: 0, melts: 0, style: 0 };
    G.combo = { n: 0, t: 0, best: 0 }; G.rescued = false; G.done = false; G.check = { x: 120, y: 600 }; G.hitstop = 0; G.focus = null; plCache = null;
    G.heroes = cfg.players.map((p, i) => { const h = makeHero(p.leader, i, p.age, 120 - i * 60, 600); sizeHero(h); return h; });
    G.comp = !G.fusion && cfg.players[0].companion ? makeComp(cfg.players[0].companion, G.heroes[0]) : null;
    G.bonds = cfg.players[0].profile ? cfg.players[0].profile.bonds || {} : {};
    G.boss = G.L.bossData ? Object.assign({ vx: 0, vy: 0, flash: 0, soft: softNew(-1), dir: -1, wave: null }, G.L.bossData) : null;
    G.L.wild = G.L.wild || [];
    G.age = cfg.players[0].age; G.cam.x = -VW * 0.3; G.cam.y = 100; G.cam.zoom = 1; G.cam.kick = 0; G.cam.lookY = 0; G.state = "play"; G.t = 0;
    I.setFusion(G.fusion);
    A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, false);
    if (M.Events && M.Events.init) safe("Events.init", () => M.Events.init(G));
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
    const old = h.id, nh = makeHero(G.comp.id, 0, h.age, G.comp.x, h.y, h.mass); nh.face = h.face; nh.candy = h.candy; nh.soft = softNew(h.face); sizeHero(nh);
    G.heroes[0] = nh; G.comp = makeComp(old, nh); G.comp.x = h.x; puff(nh.x, nh.y, 8); rigHit(nh.soft, "jump", 0.6); A.sfx("pop"); ev("hud");
  };

  // ——— colisiones ———
  const overlap = (p, s) => p.x + p.w / 2 > s.x && p.x - p.w / 2 < s.x + s.w && p.y > s.y + 0.01 && p.y - p.h < s.y + s.h;
  function solidList(h) {
    const L = G.L, arr = L.solids.filter((s) => s.x < G.cam.x + VW + 900 && s.x + s.w > G.cam.x - 900);
    L.walls.forEach((w) => { if (w.alive && !(h && h.sugar && w.type === "azucar")) arr.push(w); });
    L.giants.forEach((g) => { if (!g.awake) { const lw = g.lw || 240, lh = Math.max(60, (g.lh || 110) - 10); arr.push({ x: g.x - lw / 2, y: g.y - lh, w: lw, h: lh }); } });
    L.enemies.forEach((e) => { if (e.state === "ice") arr.push({ x: e.x - 46, y: e.y - 84, w: 92, h: 84 }); });
    return arr;
  }
  // lista de plataformas (en caché durante un mismo paso de física: groundBelow se llama muchas veces)
  let plCache = null, plKey = -1;
  function platList() { if (plCache && plKey === G.t && plCache.n === G.clays.length) return plCache;
    const a = []; G.L.plats.forEach((p) => { if (!p.gone) a.push(p); }); G.L.movers.forEach((m) => a.push(m)); G.clays.forEach((p) => a.push(p)); a.n = G.clays.length; plCache = a; plKey = G.t; return a; }
  const inPuddle = (x, y) => G.puddles.some((p) => x > p.x1 && x < p.x2 && Math.abs(y - p.y) < 6);
  function groundBelow(x, y) { let best = 5000; for (const s of G.L.solids) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y; for (const s of platList()) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y; return best; }
  // ¿hay un sólido en ese punto? (terreno y muros vivos)
  function solidAt(x, y) { for (const s of G.L.solids) if (x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h) return s;
    for (const w of G.L.walls) if (w.alive && x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return w; return null; }
  // ¿cabe de pie con este alto?
  function headroom(h, hh) { const box = { x: h.x, y: h.y, w: h.w * 0.9, h: hh }; for (const s of solidList(h)) if (overlap(box, s)) return false; return true; }

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
    if (h.stick > 0) { h.stick -= dt; if (h.stick <= 0) { h.vy = -1350; h.spin = 1; A.sfx("boing"); rigHit(h.soft, "boing", 1.2); } heroAnim(h, dt); return; }
    sizeHero(h);
    // subir desde un borde (animación corta, sin colisiones)
    if (h.climb) {
      const cl = h.climb; cl.t += dt / 0.24; const k = Math.min(1, cl.t), e = k * k * (3 - 2 * k);
      h.x = lerp(cl.x0, cl.x1, clamp(e * 1.3 - 0.3, 0, 1)); h.y = lerp(cl.y0, cl.y1, Math.min(1, e * 1.7)) - Math.sin(k * Math.PI) * 10; h.vx = h.vy = 0;
      if (k >= 1) { h.climb = null; h.on = true; h.coyote = AG.coyote; h.dbl = true; rigHit(h.soft, "land", 0.5); puff(h.x, h.y, 3, h.k); }
      heroAnim(h, dt); return;
    }
    let dir = (held("R") ? 1 : 0) - (held("L") ? 1 : 0);
    if (h.wjLock > 0) { h.wjLock -= dt; if (dir === h.wjSide) dir = 0; }        // tras un salto de pared no te vuelves a pegar al instante
    if (dir && !h.turbo && !(h.slide > 0) && !h.pound && !h.ledge) h.face = dir;
    // poderes: C = el tuyo (o el del compañero si tu líder no tiene), V = el del compañero,
    // caramelo = extra automático y temporal que se suma a los dos
    const ownAb = h.def.ability, compAb = pi === 0 && G.comp ? G.comp.def.ability : null;
    const bAb = ownAb || compAb, bSrc = ownAb ? "lead" : "comp";
    const cand = h.candy ? h.candy.type : null;
    const holdPow = (ab, key) => { const on = ab && M.ABILITIES[ab].kind === "hold" && held(key); return on ? spend(h, M.ABILITIES[ab].cost * dt) : false; };
    const useB = holdPow(bAb, "B"), useC = holdPow(compAb, "C");
    const candyOn = (ab) => cand === ab && (ab === "volar" ? held("J") && !h.on : ab === "turbo" ? dir !== 0 : ab === "azucar");
    const want = (ab) => (useB && bAb === ab) || (useC && compAb === ab) || candyOn(ab);
    h.flying = want("volar") && !h.on && !h.ledge;
    h.turbo = want("turbo");
    h.sugar = want("azucar");
    const superVac = want("aspiradora");
    h.vac = (held("A") || superVac) && !h.ledge;
    if (h.flying || h.turbo || h.sugar || superVac) G.stats.ability += dt * 0.5;
    if (I.consume(pi, "B") && bAb && M.ABILITIES[bAb].kind === "tap") { tapPower(bSrc === "comp" ? G.comp : h, bAb, h, bSrc); if (bSrc === "comp") G.comp.hop = 0.5; }
    if (pi === 0 && G.comp && I.consume(0, "C") && compAb && M.ABILITIES[compAb].kind === "tap") { tapPower(G.comp, compAb, h, "comp"); G.comp.hop = 0.5; }
    if ((useB && bSrc === "comp") || useC) { if (G.comp && Math.random() < 0.3) part({ x: G.comp.x, y: G.comp.y - 60, vy: -80, life: 0.5, size: 5, color: "#9ff0d4", type: "star", vr: 5 }); }
    if (pi === 0 && G.comp && I.consume(0, "S")) G.swapLeader();

    // ——— ABAJO: ↓/S (D) o, sin nada cerca con lo que interactuar, E (joystick abajo en móvil) ———
    const nearObj = findNear(h), young = G.L.hardAge === "young";
    let downHit = I.consume(pi, "D");
    if (!nearObj) downHit = I.consume(pi, "E") || downHit;
    else if (!h.on && downHit) I.consume(pi, "E");
    const downHeld = held("D");
    if (downHit) h.downT = 0.25;
    const airOk = !h.on && !h.ledge && !h.pound && h.bubble <= 0 && !h.flying;
    if (downHit && airOk) {
      // Young: ↓ en el aire = mortal (encadenable); ↓ y luego Saltar = pisotón. Resto de edades: ↓ en el aire = pisotón.
      if (young) { h.trick = 1; h.tricks = (h.tricks || 0) + 1; A.sfx("djump"); }
      else startPound(h);
    }
    if (h.trick > 0) { h.trick -= dt * 2.6; h.rot = (1 - Math.max(0, h.trick)) * Math.PI * 2 * h.face; if (h.trick <= 0) { h.trick = 0; h.rot = 0; } }
    // caramelo de fuego: dispara solo cuando hay grumos delante
    if (cand === "fuego") { h.candyFire = (h.candyFire || 0) - dt;
      if (h.candyFire <= 0 && G.L.enemies.some((e) => e.alive && e.state !== "gone" && (e.x - h.x) * h.face > 0 && Math.abs(e.x - h.x) < 520 && Math.abs(e.y - h.y) < 200)) { tapPower(h, "fuego", h, "candy"); h.candyFire = 0.45; } }
    if (h.candy) { h.candy.t -= dt; if (h.candy.t <= 0) { h.candy = null; say(h.x, h.y - h.h - 30, "¡Se acabó el caramelo!", "#8a6a80"); ev("hud"); } }
    h.fireCd -= dt; h.low -= dt;
    if (h.giant > 0) { h.giant -= dt; if (h.giant <= 0) { puff(h.x, h.y, 14, 1.4); A.sfx("pop"); } }

    const axis = I.players[pi].axis || 0;   // joystick analógico del móvil / stick del mando
    const mat = MATS[h.onMat] || MATS.normal, grip = h.def.mat === "musgo";
    let MAXV = AG.speed * h.spd * (h.turbo ? 2.1 : 1) * (h.vac ? 0.55 : 1) * (h.giant > 0 ? 0.85 : 1) * (axis && !h.turbo ? Math.abs(axis) : 1);
    h.maxv = AG.speed * h.spd;
    if (h.on && !grip) MAXV *= mat.top;
    h.slip = !grip && h.on && (h.onMat === "hielo" || inPuddle(h.x, h.y));

    // ——— colgado de un borde ———
    if (h.ledge) {
      const lg = h.ledge, s = lg.s; h.vx = h.vy = 0; h.on = false; h.face = lg.side;
      h.x = lg.side > 0 ? s.x - h.w / 2 : s.x + s.w + h.w / 2; h.y = s.y + h.h * 0.62;
      if (I.consume(pi, "J") || h.buf > 0) {
        h.buf = 0; h.ledge = null;
        if (dir === -lg.side) { h.vy = -AG.jump * 0.9; h.vx = -lg.side * 560; h.face = -lg.side; h.ledgeCd = 0.3; h.wjLock = 0.16; h.wjSide = lg.side; rigHit(h.soft, "jump"); A.sfx("jump"); }
        else { const x1 = lg.side > 0 ? Math.min(s.x + h.w * 0.6, s.x + s.w / 2) : Math.max(s.x + s.w - h.w * 0.6, s.x + s.w / 2);
          h.climb = { t: 0, x0: h.x, y0: h.y, x1, y1: s.y }; rigHit(h.soft, "jump", 0.7); A.sfx("jump"); }
      } else if (downHit || downHeld || !G.L.solids.includes(s)) { h.ledge = null; h.ledgeCd = 0.35; }
      heroAnim(h, dt); return;
    }
    h.ledgeCd -= dt; h.wallT -= dt; h.downT -= dt; h.duckT -= dt; h.recover -= dt;

    // ——— agacharse y deslizar ———
    if (h.on && downHit && !nearObj && !(h.slide > 0) && h.giant <= 0) {
      if (Math.abs(h.vx) > h.maxv * 0.45) { // deslizamiento
        h.slide = 0.55; h.slideDir = Math.sign(h.vx); h.vx = h.slideDir * Math.max(Math.abs(h.vx) * 1.15, h.maxv * 1.2);
        A.sfx("whoosh"); puff(h.x, h.y, 5, h.k); rigHit(h.soft, "land", 0.6);
      } else h.duckT = 0.4;                                        // toque rápido (móvil): agacharse un momento
    }
    const hStand = h.hStand;
    const wantDuck = h.on && (h.slide > 0 || downHeld || h.duckT > 0);
    if (wantDuck) h.duck = true; else if (h.duck && headroom(h, hStand)) h.duck = false;
    h.h = hStand * (h.duck ? DUCK : 1);
    if (h.slide > 0) {
      h.slide -= dt;
      if (h.slide <= 0 && h.duck && !headroom(h, hStand)) h.slide = 0.05;   // bajo un techo: sigue arrastrándose
      if (!h.on) h.slide = 0;
    }

    // ——— aceleración con inercia y fricción por material ———
    let acc = h.on ? (dir ? (h.turbo ? 5200 : 3600) * (grip ? 1 : mat.acc) : 3000 * (grip ? 1 : mat.dec)) : (h.def.mat === "lana" ? 2600 : 2200);
    if (h.slip) acc = dir ? 700 : 150;
    if (h.bubble > 0) acc = 1400;
    if (!h.on && dir && Math.sign(h.vx) === -dir) acc *= 1.3;           // girar en el aire es algo más ágil
    if (h.kbT > 0) { h.kbT -= dt; acc *= 0.2; h.vx *= Math.exp(-2.2 * dt); }   // retroceso: curva de frenado
    let target = dir * MAXV;
    if (h.duck && !(h.slide > 0)) target = dir * MAXV * 0.35;
    if (h.slide > 0) { // desliza: sin control, frena poco (casi nada en hielo)
      const minV = h.duck && !headroom(h, hStand) ? 150 : 0;
      h.vx = h.slideDir * Math.max(minV, Math.abs(h.vx) - (h.slip ? 60 : 520) * dt);
      if (Math.random() < dt * 30) part({ x: h.x - h.slideDir * 16, y: h.y - 2, vx: -h.slideDir * rand(40, 140), vy: rand(-80, -20), g: 400, life: 0.35, size: rand(3, 6), color: "rgba(255,255,255,0.9)", type: "puff", drag: 2 });
    } else if (!h.pound) { if (h.vx < target) h.vx = Math.min(target, h.vx + acc * dt); else if (h.vx > target) h.vx = Math.max(target, h.vx - acc * dt); }
    if (h.mover) { h.x += h.mover.vx * dt; h.y += h.mover.vy * dt; }
    // viento
    for (const wz of G.L.winds) if (h.x > wz.x1 && h.x < wz.x2 && h.y > wz.y1 && h.y < wz.y2) { h.vx += 900 * dt * (h.vx < 380 ? 1 : 0); if (!h.on) h.vy = lerp(h.vy, -170, dt * 3.2); }

    // ——— salto (normal, largo desde deslizamiento, de pared, doble) y pisotón ———
    if (I.consume(pi, "J")) h.buf = 0.14;
    h.buf -= dt; h.coyote -= dt;
    const softBoost = h.onPlat && (h.onPlat.kind === "soft" || h.onPlat.kind === "raft") ? 1.12 : 1;
    const poundAsk = h.buf > 0 && !h.on && h.coyote <= 0 && (downHeld || h.downT > 0) && airOk;
    if (poundAsk) { h.buf = 0; startPound(h); }
    else if (h.buf > 0 && (h.on || h.coyote > 0) && h.bubble <= 0 && (!h.duck || headroom(h, hStand))) {
      const pj = h.recover > 0 ? 1.18 : 1;                              // rebote de pisotón
      h.vy = -AG.jump * h.jmp * softBoost * (h.giant > 0 ? 1.1 : 1) * (mat.jump && !grip ? mat.jump : 1) * pj; h.on = false; h.coyote = 0; h.buf = 0; h.mover = null; h.bounced = false;
      if (h.slide > 0) { h.vx = h.slideDir * Math.max(Math.abs(h.vx), h.maxv * 1.3); h.vy *= 0.92; h.slide = 0; say(h.x, h.y - h.h - 20, "¡Salto largo!", "#6aa88f"); }
      h.duck = false; h.h = hStand;
      rigHit(h.soft, "jump", pj); A.sfx("jump"); puff(h.x, h.y, 5, h.k);
      if (pj > 1) burst(h.x, h.y, 8, PASTEL, "star", 240);
    } else if (h.buf > 0 && (h.wall || h.wallT > 0) && !h.on) {
      const side = h.wall || h.wallSide, sticky = h.wall ? h.wallChicle : h.wallSticky;
      h.vy = -AG.jump * (sticky ? 1 : 0.93); h.vx = -side * (sticky ? 680 : 560); h.face = -side; h.buf = 0; h.dbl = true; h.wallT = 0; h.wjLock = 0.16; h.wjSide = side;
      rigHit(h.soft, "jump", 0.9); A.sfx(sticky ? "boing" : "jump"); puff(h.x + side * 20, h.y - h.h / 2, 6);
    } else if (h.buf > 0 && h.dbl && !h.on && h.bubble <= 0 && !h.flying && !h.pound) {
      h.vy = -AG.djump * h.jmp; h.dbl = false; h.buf = 0; h.spin = 1; h.bounced = false; rigHit(h.soft, "jump", 0.8); A.sfx("djump");
      for (let i = 0; i < 8; i++) part({ x: h.x + rand(-20, 20), y: h.y - 10, vx: rand(-120, 120), vy: rand(40, 160), life: 0.5, size: rand(8, 14), color: "rgba(255,255,255,0.95)", type: "puff", drag: 3 });
    }
    // ——— gravedad, velocidad terminal y estados ———
    let g = GRAV;
    if (h.vy < 0 && !held("J") && !h.bounced) g *= 2.3;
    if (h.vy > 0) g *= h.def.mat === "lana" ? 0.9 : 1.12;
    if (Math.abs(h.vy) < 110 && held("J") && !h.on) g *= 0.6;             // flotadito en el ápice
    if (h.bubble > 0) { h.pound = null; h.bubble -= dt; h.vy = lerp(h.vy, -200, dt * 5); g = 0; if (h.bubble <= 0) { burst(h.x, h.y - h.h / 2, 12, ["#ffb3d9", "#fff"], "dot", 200); A.sfx("pop"); } }
    if (h.flying) { h.pound = null; h.vy = lerp(h.vy, -330, dt * 6); g = 0; if (Math.random() < 0.5) part({ x: h.x + rand(-h.w, h.w), y: h.y - h.h * 0.5, vx: rand(-60, 60), vy: 120, life: 0.4, size: rand(5, 9), color: "rgba(255,255,255,0.9)", type: "puff", drag: 2 }); }
    if (h.pound) {
      const pd = h.pound; pd.t += dt; g = 0;
      if (pd.ph === 0) { h.vx *= Math.exp(-12 * dt); h.vy = lerp(h.vy, 0, Math.min(1, dt * 20)); h.rot = Math.min(1, pd.t / 0.14) * Math.PI * 2 * h.face; if (pd.t > 0.14) { pd.ph = 1; h.rot = 0; h.vy = 2000; } }
      else { h.vy = 2000; h.vx = dir * 60; if (Math.random() < 0.8) part({ x: h.x + rand(-h.w * 0.4, h.w * 0.4), y: h.y - h.h - rand(0, 20), vy: -200, life: 0.25, size: rand(3, 6), color: "rgba(255,255,255,0.85)", type: "puff", drag: 4 }); }
    }
    const TERM = h.pound ? 2100 : h.def.mat === "lana" ? 900 : h.heavy ? 1550 : 1350;
    h.vy = Math.min(h.vy + g * dt, TERM);
    if (h.wall && h.vy > 0) { h.vy = Math.min(h.vy, h.wallChicle ? 40 : 170); if (Math.random() < dt * 20) part({ x: h.x + h.wall * h.w * 0.5, y: h.y - h.h * 0.8, vx: -h.wall * 30, vy: -40, life: 0.3, size: rand(3, 5), color: h.wallChicle ? "#ffb3d9" : "rgba(255,255,255,0.9)", type: "puff", drag: 3 }); }

    // X
    const solids = solidList(h), vxIn = h.vx;
    h.x += h.vx * dt; h.wall = 0; h.wallChicle = false;
    for (const s of solids) if (overlap(h, s)) {
      if ((h.turbo || h.giant > 0) && s.type === "galleta" && s.alive) { breakWall(s); continue; }
      const side = h.x < s.x + s.w / 2 ? 1 : -1;
      h.x = side > 0 ? s.x - h.w / 2 : s.x + s.w + h.w / 2; h.vx = 0;
      if (h.on) continue;
      // rebote en paredes de chicle a toda velocidad
      if (s.mat === "chicle" && Math.abs(vxIn) > 330 && !h.pound) { h.vx = -vxIn * 0.82; h.vy = Math.min(h.vy, -420); h.face = -side; h.dbl = true; rigHit(h.soft, "wobble", 1.5); rigHit(h.soft, "boing", 0.6); A.sfx("boing"); burst(h.x + side * h.w * 0.5, h.y - h.h / 2, 8, ["#ffb3d9", "#fff"], "dot", 200); continue; }
      // agarrarse a un borde
      if (dir === side && s.mat && s.mat !== "jelly" && h.vy > -80 && !h.pound && !h.flying && h.bubble <= 0 && h.ledgeCd <= 0 && !h.duck && h.giant <= 0 && s.y > h.y - h.h - 16 && s.y < h.y - h.h * 0.45) {
        const box = { x: side > 0 ? s.x + h.w * 0.6 : s.x + s.w - h.w * 0.6, y: s.y - 1, w: h.w, h: hStand };
        if (!solids.some((o) => o !== s && overlap(box, o))) { h.ledge = { s, side }; h.vx = h.vy = 0; h.y = s.y + h.h * 0.62; h.dbl = true; h.trick = 0; h.tricks = 0; h.rot = 0; h.spin = 0; rigHit(h.soft, "land", 0.5); A.sfx("land", 0.4); heroAnim(h, dt); return; }
      }
      if (dir === side) { h.wall = side; h.wallChicle = s.mat === "chicle"; h.wallT = 0.1; h.wallSide = side; h.wallSticky = h.wallChicle; }
    }
    // Y
    const prevY = h.y, wasOn = h.on, impact = h.vy;
    h.y += h.vy * dt; h.on = false; h.mover = null; h.onPlat = null; h.onMat = null;
    for (const s of solids) if (overlap(h, s)) {
      if (h.vy > 0 && prevY <= s.y + 2 + h.vy * dt) {
        if (s.mat === "jelly") { const pw = !!h.pound; h.pound = null; h.y = s.y; h.vy = pw ? -1650 : -1150; h.bounced = true; h.dbl = true; rigHit(h.soft, "boing", pw ? 1.6 : 1); A.sfx("boing"); say(h.x, h.y - 110, pw ? "¡¡BOING!!" : "¡Boing!", "#c46be0"); burst(h.x, h.y, 10, ["#ffb3d9", "#e0b3ff", "#fff"], "dot", 260); continue; }
        h.y = s.y; h.vy = 0; h.on = true; h.onMat = s.mat;
      } else if (h.vy < 0) { h.y = s.y + s.h + h.h; h.vy = 0; rigHit(h.soft, "land", 0.3); } else h.y = s.y;
    }
    if (h.vy >= 0) for (const p of platList()) {
      const py = p.y + (p.sink || 0);
      if (h.x + h.w / 2 > p.x + 6 && h.x - h.w / 2 < p.x + p.w - 6 && prevY <= py + 3 + (p.vy ? Math.abs(p.vy) * dt + 2 : 0) && h.y >= py) { h.y = py; h.vy = 0; h.on = true; h.onPlat = p; if (p.vx !== undefined) h.mover = p; }
    }
    if (h.on && h.tricks) {
      if (h.trick > 0.28) { say(h.x, h.y - h.h - 30, "¡Plof!", "#8a6a80"); rigHit(h.soft, "land", 1.3); h.dizzy = 1.2; ev("fx", "fail"); }
      else { const pts = 100 * h.tricks * h.tricks; G.stats.style += pts; h.happyT = 1.2; say(h.x, h.y - h.h - 40, (h.tricks > 1 ? "MORTAL x" + h.tricks : "¡MORTAL!") + " +" + pts, "#9c6bff", true); A.sfx("power"); ev("fx", "trick"); ev("hud"); }
      h.tricks = 0; h.trick = 0; h.rot = 0;
    }
    if (h.on) {
      h.coyote = AG.coyote; h.dbl = true; h.bounced = false;
      if (h.pound) poundLand(h);
      else if (!wasOn && impact > 250) {
        const v = clamp(impact / 1200, 0.3, 1.2); rigHit(h.soft, "land", v); A.sfx("land", v); puff(h.x, h.y, 4 + (v * 6) | 0, h.k);
        if (h.giant > 0 && impact > 500) giantStomp(h); else if (h.heavy && impact > 900) { G.cam.shake = 6; wakeAround(h.x, h.y, 420); }
      }
      const p = h.onPlat;
      if (p && p.kind === "crumble") p.t += dt;
      if (p && (p.kind === "soft" || p.kind === "raft")) p.sink = lerp(p.sink, p.kind === "raft" ? 70 : 16, dt * (p.kind === "raft" ? 1.2 : 10));
      if (h.slip && Math.abs(h.vx) > 200 && Math.random() < dt * 20) part({ x: h.x - h.face * 12, y: h.y - 2, vx: -h.vx * 0.3, vy: -30, life: 0.3, size: 3, color: "rgba(200,240,255,0.9)" });
    }
    for (const s of G.L.shrooms) bounceCheck(h, s.x, s.y - 98 * (s.big ? 1.3 : 1), 66 * (s.big ? 1.3 : 1), prevY, s.big ? 1.25 : 1, () => { s.squash = 1; burst(s.x, s.y - 98, 12, PASTEL, "star", 380); });
    for (const gi of G.L.giants) if (gi.awake && gi.wake > 1) bounceCheck(h, gi.x, gi.y - gi.hh + 30, 80, prevY, 1, () => { gi.squash = 1; if (gi.rig) rigHit(gi.rig, "land", 1.2); A.sfx("pop"); });

    // efectos visuales de poderes
    if (h.turbo && h.on && Math.random() < 0.9) { part({ x: h.x - h.face * h.w * 0.5, y: h.y - rand(4, h.h * 0.6), vx: -h.face * rand(40, 160), vy: rand(-80, 20), g: 600, life: 0.5, size: rand(2.5, 5), color: h.def.mat === "malvavisco" ? "#fff3e6" : "#f6e3d6", type: "dot" }); }
    if (h.sugar && Math.random() < 0.6) part({ x: h.x + rand(-h.w, h.w) * 0.6, y: h.y - rand(0, h.h), vy: -40, life: 0.6, size: rand(2, 4), color: PASTEL[(Math.random() * 5) | 0], type: "star", vr: 6 });
    if (h.vac) vacuumStep(h, superVac ? 2 : 1);

    if (h.spin > 0) { h.spin -= dt * 2.6; h.rot = (1 - Math.max(0, h.spin)) * Math.PI * 2 * h.face; if (h.spin <= 0) h.rot = 0; }
    if (h.on && Math.abs(h.vx) > 30 && Math.random() < dt * 8 && !h.slip && !(h.slide > 0)) puff(h.x - h.face * 14, h.y, 1, h.k);
    heroAnim(h, dt);
    h.x = clamp(h.x, -400, G.L.end);
    if (G.boss && G.boss.state !== "sleep" && G.boss.state !== "gone") h.x = clamp(h.x, G.boss.arena[0], G.boss.arena[1]);
    if (h.y > 1300) { G.stats.falls++; h.pound = null; hurt(h, true); }
  }
  // animación, temporizadores y humor (cara) del héroe
  function heroAnim(h, dt) {
    softStep(h.soft, h.vx, h.on || !!h.ledge || !!h.climb, dt, h.maxv || 400, h.idleT, { vy: h.ledge ? 0 : h.vy, face: h.face, crouch: h.duck, vac: h.vac });
    h.inv -= dt; h.blink -= dt; if (h.blink < -0.12) h.blink = rand(2, 4.5);
    h.idleT = Math.abs(h.vx) < 5 && h.on ? h.idleT + dt : 0;
    h.hurtT -= dt; h.happyT -= dt; h.dizzy -= dt;
    if ((h.scT -= dt) <= 0) { h.scT = 0.12; // ¿hay algo que asuste delante?
      const threat = G.L.enemies.some((e) => e.alive && (e.state === "walk" || e.state === "flash") && e.ai !== "sleep" && Math.abs(e.x - h.x) < 170 && (e.x - h.x) * h.face > -20 && Math.abs(e.y - h.y) < 120);
      const boss = G.boss && (G.boss.state === "intro" || (G.boss.state === "jump" && Math.abs(G.boss.x - h.x) < 300));
      const drop = !h.on && h.vy > 900 && groundBelow(h.x, h.y) > h.y + 700;
      h.scared = threat || boss || drop ? 0.3 : h.scared - 0.12;
    }
    h.mood = h.hurtT > 0 ? "hurt" : h.dizzy > 0 ? "dizzy" : h.vac ? "effort" : h.ledge || h.climb ? "hang" : h.pound || h.slide > 0 ? "determined"
      : h.happyT > 0 ? "happy" : h.scared > 0 ? "scared" : "idle";
  }
  function bounceCheck(h, x, top, half, prevY, mul, fx) {
    if (h.vy > 0 && Math.abs(h.x - x) < half && h.y >= top && prevY <= top + 26) { const pw = !!h.pound; h.pound = null; h.y = top; h.vy = -BOUNCE * mul * (pw ? 1.15 : 1); h.bounced = true; h.dbl = true; h.on = false; rigHit(h.soft, "boing", 1.3); h.spin = 1; A.sfx("boing"); fx(); }
  }
  // ——— pisotón ———
  function startPound(h) {
    if (h.pound || h.on) return;
    if (h.tricks) { G.stats.style += 50 * h.tricks; say(h.x, h.y - h.h - 40, "¡Mortal-pisotón! +" + 50 * h.tricks, "#9c6bff"); }
    h.pound = { ph: 0, t: 0 }; h.vx *= 0.3; h.vy = Math.min(h.vy, -120); h.trick = 0; h.tricks = 0; h.spin = 0; h.rot = 0; h.slide = 0;
    rigHit(h.soft, "boing", 0.6); A.sfx("whoosh");
  }
  function poundLand(h) {
    h.pound = null; h.recover = 0.16; h.rot = 0; const k = h.k, x = h.x, y = h.y;
    G.cam.shake = Math.max(G.cam.shake, h.heavy ? 10 : 7); G.cam.kick = 0.035; hitstop(0.05); A.sfx("land", 1.3); rigHit(h.soft, "land", 1.5);
    G.auras.push({ x, y, r: 0, max: 170 * k, t: 0, type: "pum" }); puff(x, y, 10, k * 1.2);
    for (let i = 0; i < 12; i++) part({ x: x + rand(-20, 20), y, vx: (i % 2 ? 1 : -1) * rand(180, 420), vy: rand(-200, -40), g: 900, life: 0.5, size: rand(4, 8), color: PASTEL[i % 5] });
    G.L.enemies.forEach((e) => {
      if (!e.alive || e.state === "gone" || e.state === "pop" || e.type === "volador") return;
      const dx = Math.abs(e.x - x), dy = Math.abs(e.y - y);
      if (dx < 170 * k && dy < 70) { if (e.state === "flat" || e.state === "stun") defeat(e); else { e.state = "stun"; e.st = 1.4; e.laugh = false; e.vy = -420; e.air = true; e.jvx = Math.sign(e.x - x) * 120; } }
    });
    wakeAround(x, y, 520);
    G.L.plats.forEach((p) => { if (p.kind === "crumble" && !p.gone && Math.abs(p.x + p.w / 2 - x) < 220 && Math.abs(p.y - y) < 60) p.t = 1; });
    if (h.heavy || h.mass > 0.8) G.L.walls.forEach((w) => { if (w.alive && w.type === "galleta" && Math.abs(w.x + 30 - x) < 130) breakWall(w); });
    if (h.giant > 0) giantStomp(h);
  }
  // retroceso con curva (el control vuelve poco a poco)
  function knock(h, fromX, pw = 460, up = 560) { const d = h.x < fromX ? -1 : 1; h.vx = d * pw; h.vy = -up; h.on = false; h.kbT = 0.3; h.slide = 0; h.pound = null; h.ledge = null; h.climb = null; }
  function hurt(h, fell) {
    if (h.bubble > 0 || h.sugar || h.giant > 0 || (h.turbo && !fell)) { if (!fell) return; }
    const AG = h.AG; G.cam.shake = 8;
    if (!fell) { G.stats.hits++; hitstop(0.07); }
    const loss = Math.min(AG.hitCost * (fell ? 0.6 : 1), Math.max(0, h.mass - AG.massFloor));
    h.mass -= loss;
    if (loss > 0.01 && !fell) spawnMinis(h.x, h.y - h.h * 0.5, Math.max(2, Math.round(loss * 22)), true);
    say(h.x, h.y - h.h - 30, M.rng(Date.now()).pick(M.TXT.hurt[h.age] || M.TXT.hurt.kids), "#ff6f91"); ev("fx", fell ? "fall" : "hurt");
    A.sfx(AG.massFloor ? "pop" : "hurt");
    rigHit(h.soft, "hurt"); h.hurtT = 0.6;
    if (h.mass < 0.1 && AG.massFloor === 0) { G.stats.melts++; say(h.x, h.y - h.h - 60, M.T("melted", h.age), "#c46be0", true); h.mass = AG.startMass * 0.8; respawn(h); }
    else if (fell) respawn(h); else h.inv = 1.3;
    ev("hud");
  }
  function respawn(h) {
    h.x = G.check.x - h.pi * 50; h.y = G.check.y; h.vx = h.vy = 0; h.inv = 1.5; rigHit(h.soft, "land", 0.9);
    h.bubble = h.giant = 0; h.pound = null; h.ledge = null; h.climb = null; h.slide = 0; h.duck = false; puff(h.x, h.y, 10); burst(h.x, h.y - 30, 10, PASTEL);
  }

  // ——— ASPIRAR: el verbo central ———
  function vacuumStep(h, power) {
    const dir = h.face, mx = h.x + dir * h.w * 0.55, my = h.y - h.h * 0.5, R0 = 190 * power * (h.id === "nube" ? 1.15 : 1);
    if (Math.random() < 0.9) { const a = rand(-0.5, 0.5), d = rand(50, R0); part({ x: mx + dir * d * Math.cos(a), y: my + d * Math.sin(a), vx: -dir * 520, vy: -Math.sin(a) * 300, life: 0.22, size: rand(2, 3.5), color: "rgba(255,255,255,0.95)" }); }
    const pull = (o, strength, onEat) => {
      const dx = o.x - mx, dy = (o.y - (o.hh || 30)) - my;
      if (Math.sign(dx) !== dir && Math.abs(dx) > 24) return;
      const d = Math.hypot(dx, dy); if (d > R0 || Math.abs(dy) > 120 * power) return;
      o.x -= dx * strength; o.y -= dy * strength * 0.5; o.pulled = true;
      if (d < 46 * h.k) onEat();
    };
    G.L.enemies.forEach((e) => {
      if (!e.alive || e.state === "gone" || e.state === "pop") return;
      if (e.type === "gordo" && e.state !== "stun" && power < 2) { e.x -= (e.x - mx) * 0.01; return; }
      e.hh = 40; pull(e, 0.09 * power, () => { swallow(h, e); });
      if (e.pulled && e.ai === "sleep") wakeGrumo(e);
    });
    G.minis.forEach((m) => { m.hh = 0; pull(m, 0.25, () => { absorb(h, m); }); });
    if (power > 1) G.L.candies.forEach((k) => { if (!k.got) { k.hh = 0; pull(k, 0.12, () => pickCandy(h, k)); } });
  }
  function swallow(h, e) {
    e.alive = false; e.state = "gone"; G.stats.eats++;
    A.sfx("squish"); burst(h.x + h.face * 20, h.y - h.h * 0.5, 10, PASTEL, "heart", 220);
    const n = e.type === "gordo" ? 8 : 3;
    for (let i = 0; i < n; i++) { addMass(h, 0.035); G.stats.minis++; }
    say(h.x, h.y - h.h - 40, "+" + n + " mini mash", "#ff7aa0"); ev("fx", "eat");
    rigHit(h.soft, "boing", 0.6); h.happyT = 0.8; hitstop(0.03); reward(e);
  }
  function absorb(h, m) {
    m.dead = true; addMass(h, 0.035); G.stats.minis++;
    G.combo.mini = (G.combo.miniT > 0 ? (G.combo.mini || 0) + 1 : 0); G.combo.miniT = 0.6;
    A.sfx("absorb", G.combo.mini); part({ x: m.x, y: m.y, type: "puff", life: 0.3, size: 8, color: "rgba(255,255,255,0.9)" });
    if (h.mass >= 1) { G.stats.sparks++; }
    ev("hud");
  }
  function pickCandy(h, k) {
    k.got = true; h.candy = { type: k.type, t: M.CANDIES[k.type].secs * (k.rare ? 1.8 : 1) }; A.sfx("power"); h.happyT = 1;
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
    const B = G.boss, bossOn = B && B.state !== "gone" && B.state !== "sleep" && B.state !== "intro" && B.state !== "defeat";
    switch (ab) {
      case "gigante": h.giant = P.dur; A.sfx("giant"); G.cam.shake = 10; rigHit(h.soft, "boing", 1.5); burst(h.x, h.y - 60, 24, PASTEL, "star", 420);
        G.L.enemies.forEach((e) => { if (e.alive && Math.abs(e.x - h.x) < 700 && e.ai && e.ai !== "sleep") { e.ai = "flee"; e.fleeT = 2.5; e.fleeFrom = h.x; } }); break;
      case "fuego": h.fireCd = 0.22;
        G.shots.push({ x: ax + (actor.face || h.face) * 30, y: ay, vx: (actor.face || h.face) * 720, vy: -140, type: "fuego", life: 1.3 }); A.sfx("fire"); break;
      case "burbuja": h.bubble = P.dur; h.vy = -200; h.pound = null; A.sfx("djump"); break;
      case "modelar": { const w = 150, px = h.on ? h.x + h.face * 110 - w / 2 : h.x - w / 2, py = h.on ? h.y - 120 : h.y + 6;
        G.clays.push({ x: px, y: py, w, h: 30, kind: "clay", life: 6 }); burst(px + w / 2, py, 14, ["#ffb08a", "#ffd98e", "#fff"], "dot", 220); A.sfx("land", 1);
        if (bossOn && Math.abs(px + w / 2 - B.x) < 200) { bossHit(0.4); say(B.x, B.y - 360, "¡Plastilinazo!", "#e07a4a"); }   // la plastilina le cae encima
        break; }
      case "risa": G.auras.push({ x: ax, y: ay, r: 0, max: 320, t: 0, type: "risa" }); A.sfx("friend");
        G.L.enemies.forEach((e) => { if (!e.alive || e.state === "gone") return; const d = Math.hypot(e.x - ax, e.y - 40 - ay);
          if (d < 340) { e.state = "stun"; e.st = 1.2; e.laugh = true; say(e.x, e.y - 110, "¡Jajaja!", "#ffb000"); }
          else if (d < 750 && e.state === "walk") { e.ai = "flee"; e.fleeT = 2.5; e.fleeFrom = ax; if (Math.random() < 0.4) say(e.x, e.y - 110, "¡Qué miedo!", "#8a6aa0"); } });   // la carcajada asusta de lejos
        if (B && B.state !== "gone" && Math.abs(B.x - ax) < 380) { B.state = "dizzy"; B.t = 0; }
        break;
    }
    ev("hud");
  }
  function giantStomp(h) {
    G.cam.shake = 14; A.sfx("land", 1.3); G.auras.push({ x: h.x, y: h.y, r: 0, max: 260, t: 0, type: "pum" }); hitstop(0.05);
    for (let i = 0; i < 18; i++) part({ x: h.x, y: h.y, vx: rand(-460, 460), vy: rand(-320, -60), g: 900, life: 0.6, size: rand(5, 9), color: PASTEL[i % 5] });
    G.L.enemies.forEach((e) => { if (e.alive && e.state !== "gone" && Math.abs(e.x - h.x) < 260 && Math.abs(e.y - h.y) < 120) defeat(e); });
    G.L.walls.forEach((w) => { if (w.alive && w.type === "galleta" && Math.abs(w.x + 30 - h.x) < 180) breakWall(w); });
    G.L.plats.forEach((p) => { if (p.kind === "crumble" && !p.gone && Math.abs(p.x + p.w / 2 - h.x) < 300 && Math.abs(p.y - h.y) < 240) p.t = 1; });
    wakeAround(h.x, h.y, 700);
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
    if (C.n >= 3) G.heroes.forEach((h) => { h.happyT = 1; });
    ev("hud");
  }
  function toPuddle(e) { e.alive = false; e.state = "gone"; G.puddles.push({ x1: e.x - 75, x2: e.x + 75, y: e.y, life: 12, type: "moco" }); spawnMinis(e.x, e.y - 20, 2);
    burst(e.x, e.y - 20, 12, ["#8be06a", "#c6f5a8", "#fff"], "dot", 220); A.sfx("land", 0.6); reward(e); }
  function breakWall(w) { if (!w.alive) return; w.alive = false; w.melt = 0.001;
    for (let i = 0; i < 26; i++) part({ x: w.x + rand(0, w.w), y: w.y + w.h - rand(0, Math.min(w.h, 300)), vx: rand(-300, 300), vy: rand(-400, -50), g: 1200, life: 1, size: rand(5, 11), color: i % 3 ? "#d9a66b" : "#6b3b24", type: "confetti", vr: rand(-10, 10) });
    A.sfx("crumble"); G.cam.shake = 8; }
  function meltWall(w) { if (!w.alive) return; w.alive = false; w.melt = 0.001; w.melting = true; A.sfx("whoosh"); }

  // ——— IA de grumos: patrullar, dormir, detectar, perseguir, huir, agruparse, saltar huecos, comer caramelos y crecer ———
  function grumoInit(e) {
    const seed = e.seed || (Math.abs(Math.round(e.x * 7 + e.y * 13)) + 1); e.seed = seed; const r = M.rng(seed);
    e.ai = e.type !== "volador" && r() < 0.28 ? "sleep" : "patrol"; e.aiT = r() * 2; e.grow = e.grow || 1; e.brave = r();
    e.ox1 = e.x1; e.ox2 = e.x2; e.range = Math.max(40, (e.x2 - e.x1) / 2); e.home = (e.x1 + e.x2) / 2; e.vy = e.vy || 0; e.air = !!e.air; e.pause = 0;
    if (M.ProcChar && M.ProcChar.grumoVariant) e.var = safe("grumoVariant", () => M.ProcChar.grumoVariant(seed)) || null;
  }
  function wakeGrumo(e) { if (!e.ai) grumoInit(e); if (e.ai !== "sleep") return; e.ai = "alert"; e.aiT = 0.5; if (!e.air && e.type !== "volador") { e.vy = -380; e.air = true; e.jvx = 0; } say(e.x, e.y - 100, "!", "#e0506a"); }
  function wakeAround(x, y, r) { for (const e of G.L.enemies) if (e.alive && e.ai === "sleep" && Math.abs(e.x - x) < r && Math.abs(e.y - y) < 260) wakeGrumo(e); }
  function eatCandy(e, k) {
    k.got = true; A.sfx("squish"); burst(k.x, k.y, 12, [M.CANDIES[k.type] ? M.CANDIES[k.type].color : "#fff", "#fff"], "star", 220);
    e.grow = Math.min(1.5, (e.grow || 1) + 0.25); e.land = 1;
    if (e.type !== "gordo" && e.type !== "volador" && e.grow >= 1.25) { e.type = "gordo"; e.hp = 3; e.grow = 1; puff(e.x, e.y, 12, 1.6); G.cam.shake = 5; say(e.x, e.y - 200, "¡Grumo glotón! ¡Ha crecido!", "#b0406a", true); }
    else say(e.x, e.y - 110, "¡Ñam!", "#b0406a");
    e.ai = "patrol"; e.aiT = 1.2; e.target = null;
  }
  function jumpTo(e, lx, ly) { // salto balístico hasta (lx, ly)
    const vy = -620 - Math.max(0, e.y - ly) * 1.4, T = (-vy + Math.sqrt(vy * vy + 2 * GRAV * (ly - e.y))) / GRAV;
    e.vy = vy; e.jvx = (lx - e.x) / Math.max(0.2, T); e.air = true; e.land = -0.6;
  }
  function walkGrumo(e, vx, dt, fly) {
    if (e.pulled || e.air || !vx) return;
    const d = Math.sign(vx), nx = e.x + vx * dt;
    if (fly) { e.x = clamp(nx, e.ox1 - 320, e.ox2 + 320); if (e.x !== nx) e.dir = -e.dir; return; }
    const ahead = nx + d * 26, bold = e.ai === "chase" || e.ai === "flee" || e.ai === "eat";
    const wallHit = solidAt(ahead, e.y - 30);
    if (wallHit) {
      const top = wallHit.y;
      if (bold && e.y - top < 150 && !solidAt(ahead, top - 40)) { e.vy = -Math.sqrt(2 * GRAV * (e.y - top + 40)); e.jvx = d * 170; e.air = true; e.land = -0.6; }
      else { e.dir = -d; e.pause = 0.3; }
      return;
    }
    const gy = groundBelow(ahead, e.y - 30);
    if (gy > e.y + 12) {                      // borde o hueco delante
      if (bold) {
        for (let dd = 80; dd <= 280; dd += 25) { const lx = e.x + d * dd, ly = groundBelow(lx, e.y - 130);
          if (ly < 5000 && Math.abs(ly - e.y) < 140 && !solidAt(lx, ly - 30) && groundBelow(lx + d * 30, ly - 10) < ly + 12) { jumpTo(e, lx, ly); return; } }
        if (gy - e.y < 100) { e.x = nx; e.air = true; e.vy = 0; e.jvx = vx * 0.6; return; }  // escalón hacia abajo
      }
      e.dir = -d; e.pause = e.ai === "patrol" ? rand(0.2, 0.8) : 0; return;
    }
    if (gy < e.y - 1 && gy > e.y - 40) e.y = gy;
    e.x = nx;
  }
  function grumoAI(e, dt, sp) {
    if (!e.ai) grumoInit(e);
    e.aiT -= dt; if (e.fleeT > 0) e.fleeT -= dt;
    let h = null, hd = 1e9; for (const x of G.heroes) { const d = Math.abs(x.x - e.x) + Math.abs(x.y - e.y) * 0.6; if (d < hd) { hd = d; h = x; } }
    const dx = h ? h.x - e.x : 0, dy = h ? h.y - e.y : 0, dist = Math.hypot(dx, dy);
    const big = !!h && (h.giant > 0 || h.mass > 0.88 || h.turbo);
    const fly = e.type === "volador";
    let move = 0, speed = sp;
    // se agrupan: la patrulla deriva hacia los vecinos
    if (e.ai === "patrol" && e.aiT <= 0) {
      e.aiT = rand(1.5, 4); e.pause = Math.random() < 0.3 ? rand(0.5, 1.4) : 0;
      let n = 0, sx = 0; for (const o of G.L.enemies) if (o !== e && o.alive && o.state !== "gone" && Math.abs(o.x - e.x) < 520 && Math.abs(o.y - e.y) < 100) { n++; sx += o.x; }
      if (n) e.home = clamp(lerp(e.home, sx / n, 0.3), e.ox1 - 200, e.ox2 + 200);
      e.pack = n;
    }
    switch (e.ai) {
      case "sleep":
        if (h && (dist < 150 || (dist < 330 && Math.abs(h.vx) > 420 && h.on && !h.duck))) wakeGrumo(e);
        if (fly) e.y = e.y0 + Math.sin(e.t * 2) * 40;
        return;
      case "alert":
        e.dir = Math.sign(dx) || e.dir;
        if (e.aiT <= 0) { e.ai = big && e.brave < 0.85 ? "flee" : "chase"; e.aiT = rand(3, 6); }
        break;
      case "patrol": {
        if (e.pause > 0) e.pause -= dt; else move = e.dir;
        if (e.x < e.home - e.range) e.dir = 1; else if (e.x > e.home + e.range) e.dir = -1;
        // caramelos del suelo: se los comen y crecen
        if (!fly) for (const k of G.L.candies) if (!k.got && !k.fall && Math.abs(k.x - e.x) < 320 && Math.abs(k.y + 40 - e.y) < 90) { e.ai = "eat"; e.target = k; e.aiT = 5; break; }
        // mini mash perdidos por el héroe: bocado pequeño
        for (const m of G.minis) if (m.lost && m.wait <= 0 && !m.dead && Math.abs(m.x - e.x) < 34 && Math.abs(m.y - (e.y - 30)) < 50) { m.dead = true; e.grow = Math.min(1.5, (e.grow || 1) + 0.04); e.land = 0.6; break; }
        if (h && dist < 360 && Math.abs(dy) < 170 && (Math.sign(dx) === e.dir || dist < 170) && !(h.duck && dist > 200)) {
          if (big && e.brave < 0.85 + (e.pack || 0) * 0.05) { e.ai = "flee"; e.fleeT = 2; e.fleeFrom = h.x; } else { e.ai = "alert"; e.aiT = 0.35; say(e.x, e.y - 100 * (e.grow || 1), "!", "#e0506a"); if (!e.air && !fly) { e.vy = -300; e.air = true; e.jvx = 0; } }
        }
        break; }
      case "chase":
        move = Math.sign(dx) || e.dir; speed = sp * (1.5 + Math.min(3, e.pack || 0) * 0.1);
        if (Math.abs(dx) < 10) move = 0;
        if (!h || dist > 640 || Math.abs(dy) > 280 || e.aiT <= -8) { e.ai = "patrol"; e.aiT = 1; e.home = clamp(e.x, e.ox1 - 200, e.ox2 + 200); }
        else if (big && e.brave < 0.85) { e.ai = "flee"; e.fleeT = 2; e.fleeFrom = h.x; }
        if (fly && h) e.y0 = lerp(e.y0, clamp(h.y - 110, e.y0 - 200, e.y0 + 200), dt * 0.8);
        break;
      case "flee": {
        const from = e.fleeT > 0 && e.fleeFrom != null ? e.fleeFrom : h ? h.x : e.x - e.dir;
        move = Math.sign(e.x - from) || -e.dir; speed = sp * 1.45;
        if (Math.random() < dt * 0.4) say(e.x, e.y - 110, Math.random() < 0.5 ? "¡Aaah!" : "¡Huyamos!", "#8a6aa0");
        if (e.fleeT <= 0 && (!big || dist > 560)) { e.ai = "patrol"; e.aiT = 1.5; e.home = clamp(e.x, e.ox1 - 200, e.ox2 + 200); }
        break; }
      case "eat": {
        const k = e.target; if (!k || k.got || k.fall || e.aiT <= 0) { e.ai = "patrol"; e.target = null; break; }
        move = Math.sign(k.x - e.x); speed = sp * 1.3;
        if (Math.abs(k.x - e.x) < 26) eatCandy(e, k);
        break; }
    }
    if (move) { e.dir = move; walkGrumo(e, move * speed, dt, fly); }
    if (fly && !e.pulled) e.y = e.y0 + Math.sin(e.t * 2) * 40;
  }

  function stepEnemies(dt) {
    const L = G.L, AG = M.AGES[L.age];
    for (const e of L.enemies) {
      if (e.state === "gone") continue;
      if (e.state === "pop") { e.st += dt; if (e.st > 0.35) e.state = "gone"; continue; }
      if (Math.abs(e.x - G.cam.x - VW / 2) > VW * 1.6) continue;
      e.t += dt; if (!e.ai) grumoInit(e);
      e.land = e.land ? e.land * Math.exp(-dt * 9) : 0;
      // física vertical (saltos, caídas, empujones)
      if (e.type !== "volador") {
        if (!e.air && !e.pulled && groundBelow(e.x, e.y - 4) > e.y + 3) { e.air = true; e.vy = 0; e.jvx = 0; }
        if (e.air && !e.pulled) { const py = e.y; e.vy += GRAV * dt; e.y += e.vy * dt; e.x += (e.jvx || 0) * dt;
          if (solidAt(e.x, e.y - 30)) { e.x -= (e.jvx || 0) * dt; e.jvx = 0; }
          const gy = groundBelow(e.x, py - 2); if (e.vy > 0 && e.y >= gy) { e.y = gy; e.air = false; e.land = clamp(e.vy / 900, 0.3, 1); e.vy = 0; e.jvx = 0; }
          if (e.y > 1400) { e.alive = false; e.state = "gone"; continue; } }
      }
      if (e.state === "walk") {
        if (inPuddle(e.x, e.y) && e.type !== "moco" && e.type !== "volador") { e.state = "stun"; e.st = 1.4; }
        const sp = (e.type === "helado" ? 95 : e.type === "chicle" ? 60 : e.type === "gordo" ? 45 : e.type === "volador" ? 90 : 75) * AG.enemySpeed;
        grumoAI(e, dt, sp);
      } else if (e.state === "flat") { e.st -= dt; if (e.st <= 0) { e.state = "reform"; e.st = 0; } }
      else if (e.state === "reform") { e.st += dt; if (e.st > 0.6) { e.state = "walk"; say(e.x, e.y - 110, "¡Me recompongo!", "#e08a4a"); A.sfx("boing"); } }
      else if (e.state === "melt") { e.st += dt / 1.1; if (Math.random() < 0.5) part({ x: e.x + rand(-30, 30), y: e.y - 60 * (1 - e.st), vy: 120, g: 600, life: 0.5, size: rand(3, 6), color: "#bfeaff" });
        if (e.st >= 1) { e.alive = false; e.state = "gone"; G.puddles.push({ x1: e.x - 60, x2: e.x + 60, y: e.y, life: 6, type: "agua" }); spawnMinis(e.x, e.y - 20, 3); reward(e); } }
      else if (e.state === "stun") { e.st -= dt; if (e.st <= 0) { if (e.laugh) defeat(e, true); else { e.state = "walk"; if (e.ai === "sleep") e.ai = "patrol"; } } }
      if (e.state === "flash") { e.st -= dt; if (e.st <= 0) e.state = "walk"; }
      e.pulled = false;

      for (const h of G.heroes) {
        if (!e.alive) break;
        const gk = e.grow || 1, eh = (e.type === "gordo" ? 170 : 78) * gk, ew = (e.type === "gordo" ? 80 : 40) * gk, top = e.y - eh;
        const asleep = e.ai === "sleep";
        const harmful = (e.state === "walk" || e.state === "flash") && !asleep, stompable = harmful || asleep || (e.state === "flat" && e.st < 2.4) || e.state === "stun";
        if (!stompable) continue;
        if (!(h.x + h.w / 2 > e.x - ew && h.x - h.w / 2 < e.x + ew && h.y > top && h.y - h.h < e.y)) continue;
        if (h.sugar) continue;                               // forma de azúcar: los atraviesas
        if (h.turbo || h.bubble > 0 || h.giant > 0) { if (e.type === "gordo" && h.giant <= 0) { e.hp--; e.state = "flash"; e.st = 0.4; if (e.hp <= 0) defeat(e); h.vx = -h.vx * 0.6; } else defeat(e); continue; }
        if (h.slide > 0 && h.on && e.type !== "volador") {  // barrido
          if (e.type === "gordo") { h.vx = -h.vx * 0.5; h.slide = 0; e.state = "flash"; e.st = 0.3; rigHit(h.soft, "hurt"); }
          else if (e.state !== "stun") { e.state = "stun"; e.st = 1.3; e.laugh = false; e.vy = -420; e.air = true; e.jvx = Math.sign(h.vx || h.face) * 160; A.sfx("pop"); say(e.x, top - 30, "¡Barrido!", "#6aa88f"); hitstop(0.03); }
          continue;
        }
        if (h.vy > 60 && h.y - h.vy * STEP <= top + 26) {
          if (h.pound) { if (e.type === "gordo") { e.hp -= 2; e.state = "flash"; e.st = 0.4; if (e.hp <= 0) defeat(e); } else defeat(e);
            h.pound = null; h.vy = -STOMP * 1.15; h.bounced = true; h.dbl = true; rigHit(h.soft, "stomp", 1.4); G.cam.shake = 7; hitstop(0.06); continue; }
          if (asleep) { defeat(e); say(e.x, top - 50, "¡Por sorpresa!", "#9c6bff"); }
          else if (e.type === "helado" && harmful && h.AG.massFloor === 0 && !h.heavy) { h.vx = (h.x < e.x ? -1 : 1) * 420; h.vy = -420; A.sfx("land", 0.5); say(e.x, top - 30, "¡Resbala!", "#6fb6e0"); continue; }
          else if (e.type === "chicle" && harmful) { h.stick = 0.22; h.y = top; h.vy = 0; e.state = "stun"; e.st = 1.6; say(e.x, top - 30, "¡Pegajoso!", "#ff6fb8"); continue; }
          else if (e.state === "stun" || e.state === "flat") defeat(e);
          else if (e.type === "plastilina") { e.state = "flat"; e.st = 3; A.sfx("squish"); }
          else if (e.type === "moco") toPuddle(e);
          else if (e.type === "gordo") { e.hp--; e.state = "flash"; e.st = 0.5; A.sfx("squish"); if (e.hp <= 0) defeat(e); }
          else defeat(e);
          h.vy = I.held(h.pi, "J") ? -BOUNCE * 0.72 : -STOMP; h.bounced = I.held(h.pi, "J"); h.dbl = true; rigHit(h.soft, "stomp"); G.cam.shake = 4; hitstop(0.035);
        } else if (harmful && h.inv <= 0) { knock(h, e.x); hurt(h, false); }
        else if (asleep) wakeGrumo(e);
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
    softStep(B.soft, B.vx, B.state !== "jump", dt, 200, B.t, { vy: B.vy, face: B.dir });
    const onG = () => { B.vy += GRAV * dt; B.y += B.vy * dt; if (B.y >= B.y0) { const land = B.vy > 400; B.y = B.y0; B.vy = 0; return land; } return false; };
    B.y0 = B.y0 || B.y;
    if (B.state === "sleep") { if (G.heroes.some((x) => x.x > B.arena[0] + 260)) { B.state = "intro"; B.t = 0; A.sfx("roar"); G.cam.shake = 12; rigHit(B.soft, "boing", 1.5); say(B.x, B.y - 330, M.T("bossIntro", G.age), "#b0406a", true); A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, true); ev("boss"); ev("fx", "boss"); } return; }
    if (B.state === "intro") { if (B.t > 1.6) { B.state = "walk"; B.t = 0; } return; }
    const spd = (70 + (B.maxHp - B.hp) * 20) * AG.enemySpeed;
    if (B.state === "walk") {
      B.dir = h.x < B.x ? -1 : 1; B.vx = B.dir * spd; B.x += B.vx * dt;
      if (B.t > 2.2) { B.state = "crouch"; B.t = 0; B.vx = 0; }
    } else if (B.state === "crouch") { B.soft.sq = -0.25; if (B.t > 0.55) { B.state = "jump"; B.t = 0; B.vy = -1350; B.tx = h.x; A.sfx("whoosh"); rigHit(B.soft, "jump", 1.2); } }
    else if (B.state === "jump") {
      B.x = lerp(B.x, B.tx, dt * 1.8);
      if (onG()) { B.state = "dizzy"; B.t = 0; G.cam.shake = 18; A.sfx("land", 1.4); rigHit(B.soft, "land", 1.2); hitstop(0.06);
        B.wave = { x: B.x, r: 0, t: 0 }; for (let i = 0; i < 26; i++) part({ x: B.x + rand(-120, 120), y: B.y, vx: rand(-500, 500), vy: rand(-400, -80), g: 900, life: 0.8, size: rand(6, 12), color: PASTEL[i % 5] });
        if (B.hp < B.maxHp && Math.random() < 0.7) { G.L.enemies.push({ x: B.x + 160, y: B.y, x1: B.arena[0] + 60, x2: B.arena[1] - 60, type: "plastilina", dir: 1, t: 0, state: "walk", st: 0, alive: true, hp: 1, ai: "chase", aiT: 3, grow: 1, ox1: B.arena[0] + 60, ox2: B.arena[1] - 60, range: 200, home: B.x, brave: 1 }); } }
    } else if (B.state === "dizzy") { if (B.t > 2.4) { B.state = "walk"; B.t = 0; } }
    else if (B.state === "hurt") { if (B.t > 0.7) { B.state = B.hp <= 0 ? "defeat" : "walk"; B.t = 0; } }
    else if (B.state === "defeat") {
      B.soft.sq = Math.sin(B.t * 20) * 0.2;
      if (B.t > 1.4) { B.state = "gone"; A.sfx("friend"); spawnMinis(B.x, B.y - 150, 16); burst(B.x, B.y - 160, 60, PASTEL, "heart", 600); G.cam.shake = 16; focus(B.x, B.y - 150, 1.8, 1.15);
        G.heroes.forEach((x) => { x.happyT = 2.5; });
        say(B.x, B.y - 300, M.T("bossWin", G.age), "#ff6f91", true); A.play(M.AGES[G.L.hardAge].music, G.L.biomeIdx, false);
        G.rescued = true; setTimeout(() => ev("rescue", B.friend), 1200); }
      return;
    }
    B.x = clamp(B.x, B.arena[0] + 150, B.arena[1] - 150);
    // onda expansiva por el suelo: salta para esquivarla
    if (B.wave) { const w = B.wave; w.t += dt; w.r = w.t * 700; if (w.r > 900) B.wave = null;
      else for (const hh of G.heroes) if (hh.on && Math.abs(Math.abs(hh.x - w.x) - w.r) < 30 && hh.inv <= 0) { knock(hh, w.x, 400, 500); hurt(hh, false); hh.dizzy = 0.8; } }
    // contacto: pisotón, embestida o daño (todos los poderes le hacen algo)
    const bw = 130, bh = 270; B.icd = Math.max(0, (B.icd || 0) - dt);
    for (const hh of G.heroes) {
      // aspirar: le arranca masa (mucho más si está mareado)
      if (hh.vac && (B.x - hh.x) * hh.face > 0 && Math.abs(B.x - hh.x) < 330 && B.state !== "hurt") {
        bossHit((B.state === "dizzy" ? 0.55 : 0.1) * dt, true);
        if (Math.random() < dt * (B.state === "dizzy" ? 10 : 3)) G.minis.push({ x: B.x - hh.face * 90, y: B.y - rand(80, 220), vx: -hh.face * 300, vy: -100, t: 0, size: rand(10, 14), col: MINICOL[0], on: false, life: 6, wait: 0, lost: false });
        B.x += hh.face * -12 * dt; rigHit(B.soft, "wobble", 0.3);
      }
      if (!(hh.x + hh.w / 2 > B.x - bw && hh.x - hh.w / 2 < B.x + bw && hh.y > B.y - bh && hh.y - hh.h < B.y)) continue;
      if (hh.vy > 50 && hh.y - hh.vy * STEP < B.y - bh + 50) { const pw = !!hh.pound; hh.pound = null; hh.vy = -1200; hh.bounced = true; hh.dbl = true; rigHit(hh.soft, "stomp", 1.2);
        if (B.icd <= 0) bossHit(B.state === "dizzy" ? (pw ? 1.3 : 1) : pw ? 0.8 : 0.5); continue; }
      if ((hh.turbo || hh.giant > 0 || hh.slide > 0) && B.icd <= 0) { bossHit(B.state === "dizzy" ? 1 : hh.slide > 0 ? 0.35 : 0.6); knock(hh, B.x, 700, 500); continue; }
      if ((hh.sugar || hh.bubble > 0) && B.icd <= 0) { bossHit(0.3); say(B.x, B.y - 330, hh.sugar ? "¡Empalagado!" : "¡Pompa!", "#e0689c"); if (hh.bubble > 0) knock(hh, B.x, 400, 300); continue; }
      if (hh.sugar || hh.inv > 0 || hh.bubble > 0 || B.state === "hurt") continue;
      knock(hh, B.x, 600, 600); hurt(hh, false);
    }
    if (B.state === "dizzy" && Math.random() < 0.1) part({ x: B.x + rand(-60, 60), y: B.y - 290, vx: rand(-40, 40), vy: -30, life: 0.8, size: 8, color: "#ffe27a", type: "star", vr: 5 });
  }
  function bossHit(dmg = 1, silent = false) {
    const B = G.boss; if (!B || B.state === "defeat" || B.state === "gone" || B.state === "sleep" || B.state === "intro") return;
    B.hp -= dmg; B.flash = Math.max(B.flash, silent ? 0.08 : 0.5);
    if (!silent) { B.icd = 0.45; rigHit(B.soft, "hurt"); G.cam.shake = 9; hitstop(0.08); A.sfx("squish"); spawnMinis(B.x, B.y - 200, Math.max(1, Math.round(dmg * 4))); burst(B.x, B.y - 200, 14, PASTEL, "star", 360);
      say(B.x, B.y - 330, "−" + Math.round(dmg * 100 / B.maxHp) + "%", "#ff6f91"); }
    if (!silent) ev("fx", "bossHit");
    if (B.hp <= 0) { B.hp = 0; B.state = "defeat"; B.t = 0; }
    else if (!silent && dmg >= 1) { B.state = "hurt"; B.t = 0; }
    ev("boss");
  }

  // ——— Mash salvajes (L.wild): pasean, saltan, curiosean, huyen de los grumos; con E te haces su amigo ———
  function stepWild(dt) {
    const L = G.L; if (!L || !L.wild) return;
    for (const w of L.wild) {
      if (!w.rig) { w.rig = softNew(1); w.vx = 0; w.vy = 0; w.on = true; w.mode = "idle"; w.t = Math.random() * 5; w.aiT = rand(0.5, 2.5); w.home = w.x; w.hy = w.y; w.face = Math.random() < 0.5 ? -1 : 1; w.mood = "idle"; w.happy = 0; w.tx = w.x; }
      if (Math.abs(w.x - G.cam.x - VW / 2) > VW * 1.5) continue;
      w.t += dt; w.aiT -= dt; w.happy = Math.max(0, w.happy - dt);
      let h = null, hd = 1e9; for (const x of G.heroes) { const d = Math.abs(x.x - w.x); if (d < hd) { hd = d; h = x; } }
      let threat = null; for (const e of L.enemies) if (e.alive && e.state === "walk" && e.ai !== "sleep" && Math.abs(e.x - w.x) < 320 && Math.abs(e.y - w.y) < 150) { threat = e; break; }
      let target = 0, spd = 150;
      if (threat) { if (w.mode !== "flee") { w.mode = "flee"; if (w.on) { w.vy = -360; w.on = false; } } target = Math.sign(w.x - threat.x) || 1; spd = 300; }
      else {
        if (w.mode === "flee") { w.mode = "idle"; w.aiT = 1; }
        if (h && hd < 420 && Math.abs(h.y - w.y) < 200 && w.mode !== "curious" && w.aiT <= 0 && !w.met) { w.mode = "curious"; w.aiT = rand(2.5, 4.5); }
        else if (w.aiT <= 0) { const r = Math.random(); w.mode = r < 0.4 ? "idle" : r < 0.8 ? "wander" : "hop"; w.aiT = rand(1, 3); w.tx = w.home + rand(-220, 220); if (w.mode === "hop" && w.on) { w.vy = -rand(420, 640); w.on = false; } }
        if (w.mode === "wander") { if (Math.abs(w.tx - w.x) > 12) target = Math.sign(w.tx - w.x); else w.mode = "idle"; }
        if (w.mode === "curious" && h) { const want = h.x - Math.sign(h.x - w.x) * 110; if (Math.abs(want - w.x) > 24) { target = Math.sign(want - w.x); spd = 190; } else w.face = Math.sign(h.x - w.x) || w.face;
          if (Math.random() < dt * 0.6 && w.on) { w.vy = -380; w.on = false; } }
        if (w.met && h && hd < 320) { if (!target) w.face = Math.sign(h.x - w.x) || w.face; if (w.happy > 0 && w.on && Math.random() < dt * 3) { w.vy = -420; w.on = false; } }
      }
      if (target && w.on) { const ahead = w.x + target * 40, gy = groundBelow(ahead, w.y - 30);
        if (gy > w.y + 14 || solidAt(ahead, w.y - 30)) { target = 0; if (w.mode === "wander") w.mode = "idle"; } }
      w.vx = lerp(w.vx, target * spd, Math.min(1, dt * 8)); if (target) w.face = target;
      w.x += w.vx * dt; if (solidAt(w.x + Math.sign(w.vx) * 20, w.y - 30)) { w.x -= w.vx * dt; w.vx = 0; }
      const py = w.y; w.vy += GRAV * dt; w.y += w.vy * dt;
      const gy = groundBelow(w.x, py - 2);
      if (w.vy >= 0 && w.y >= gy) { if (!w.on && w.vy > 250) rigHit(w.rig, "land", clamp(w.vy / 900, 0.3, 1)); w.y = gy; w.vy = 0; w.on = true; } else w.on = false;
      if (w.y > 1400) { w.x = w.home; w.y = w.hy; w.vy = 0; w.vx = 0; }
      w.mood = threat ? "scared" : w.happy > 0 ? "happy" : !w.on ? "jump" : Math.abs(w.vx) > 30 ? "walk" : w.mode === "curious" ? "talk" : "idle";
      softStep(w.rig, w.vx, w.on, dt, 300, w.t, { vy: w.vy, face: w.face });
    }
  }
  function befriend(w, h) {
    if (w.met) return;
    w.met = true; w.happy = 2.5; w.vy = -520; w.on = false; h.happyT = 1.5;
    const cr = w.creature || {}, H = cr.h || 150;
    burst(w.x, w.y - H * 0.6, 22, ["#ff8fab", "#ffd98e", "#ffffff", "#9ff0d4"], "heart", 360); A.sfx("friend");
    say(w.x, w.y - H - 40, "¡" + (cr.name || "Un Mash") + " quiere ser tu amigo!", "#3f9a7d", true);
    focus(w.x, w.y - H * 0.5, 1.2, 1.1);
    ev("befriend", cr);
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
      for (const h of G.heroes) { const dx = s.x - h.x, dy = s.y - (h.y - h.h / 2); if (dx * dx + dy * dy < 52 * 52) { s.got = true; G.stats.sparks += s.big ? 5 : 1; if (s.big) { G.stats.big++; h.happyT = 1.2; say(s.x, s.y - 40, "¡Chispa secreta! +5", "#e0a020", true); }
        A.sfx("spark", s.big ? 4 : (G.stats.sparks % 5)); burst(s.x, s.y, s.big ? 20 : 7, ["#ffe27a", "#ffffff", "#ffb3c7"], "star", s.big ? 360 : 220); ev("hud"); break; } } }
    // lluvia de caramelos
    for (const sp of L.spawners) { if (lead.x < sp.x1 - 300 || lead.x > sp.x2 + 300) continue; sp.t += dt;
      if (sp.t > sp.every) { sp.t = 0; const fx = clamp(lead.x + rand(-500, 700), sp.x1, sp.x2); if (Math.random() < 0.25) L.candies.push({ x: fx, y: G.cam.y - 40, type: M.rng(G.t * 1000).pick(Object.keys(M.CANDIES)), got: false, t: 0, fall: true }); else L.sparks.push({ x: fx, y: G.cam.y - 40, got: false, t: 0, fall: true }); } }
    [L.candies, L.sparks].forEach((arr) => arr.forEach((o) => { if (o.fall && !o.got) { o.y += 260 * dt; const gy = groundBelow(o.x, o.y - 30); if (o.y > gy - 40) { o.y = gy - 40; o.fall = false; } } }));
    // interacciones
    G.near = null;
    for (const h of G.heroes) { const near = findNear(h); if (h.pi === 0) G.near = near; if (near && I.consume(h.pi, "E")) interact(near, h); }
    for (const k of L.checks) if (!k.on && G.heroes.some((h) => h.x > k.x - 20)) { k.on = true; G.check = { x: k.x, y: k.y }; A.sfx("check"); burst(k.x, k.y - 105, 14, ["#ffe27a", "#ffffff", "#ff9fb6"], "star", 260); }
    L.giants.forEach((g) => { g.t += dt; g.squash = Math.max(0, g.squash - dt * 3); if (g.awake) { g.wake += dt;
      if (!g.rig || !g.rigAwake) { g.rig = softNew(1); g.rig.sq = -0.45; g.rig.sqv = 9; g.rigAwake = true; }
      const f = lead ? (lead.x > g.x ? 1 : -1) : 1; softStep(g.rig, 0, true, dt, 300, g.t, { face: f }); } });
    L.visitors.forEach((v) => { v.t += dt; if (!v.rig) v.rig = softNew(1); const f = lead ? (lead.x > v.x ? 1 : -1) : 1; softStep(v.rig, 0, true, dt, 300, v.t, { face: f }); });
    stepWild(dt);
    const cg = L.cage;
    if (cg) { cg.t += cg.open ? dt : 0; cg.wobble = Math.max(0, cg.wobble - dt * 2);
      if (!cg.open && cg.R) for (const h of G.heroes) if (h.vy > 200 && Math.abs(h.x - cg.x) < cg.R * 0.7 && Math.abs(h.y - (cg.cy - cg.R)) < 30) { h.vy = -900; h.pound = null; cg.wobble = 1; openCage(); } }
    if (L.exit && G.rescued && !G.done && G.heroes.some((h) => Math.abs(h.x - L.exit.x) < 60 && h.y > L.exit.y - 230)) { G.done = true; A.sfx("fanfare"); ev("worldDone"); }
    if (G.combo.t > 0) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo.n = 0; }
    if (G.combo.miniT > 0) G.combo.miniT -= dt;
    if (G.fusion && G.heroes.length === 2) { const [a, b] = G.heroes; if (Math.abs(a.x - b.x) > VW * 0.85 || Math.abs(a.y - b.y) > VH * 0.9) { const [back, front] = a.x < b.x ? [a, b] : [b, a]; back.x = front.x - 60; back.y = front.y - 40; back.vx = back.vy = 0; back.bubble = 1.2; back.ledge = null; back.climb = null; puff(back.x, back.y, 10); A.sfx("pop"); } }
    // aspiración: sonido continuo
    A.vacuum(G.heroes.some((h) => h.vac));
  }
  function findNear(h) {
    const L = G.L, near = (x, y, r) => Math.abs(x - h.x) < r && Math.abs(y - h.y) < 170;
    for (const s of L.switches) if (!s.on && near(s.x, s.y, s.big ? 110 : 80)) return { kind: "switch", o: s };
    for (const g of L.giants) if (!g.awake && near(g.x, g.y, 240)) return { kind: "giant", o: g };
    for (const v of L.visitors) if (near(v.x, v.y, 140)) return { kind: "visitor", o: v };
    if (L.wild) for (const w of L.wild) if (!w.met && w.creature && near(w.x, w.y, 150)) return { kind: "wild", o: w };
    if (L.cage && !L.cage.open && near(L.cage.x, L.cage.y, 170)) return { kind: "cage", o: L.cage };
    return null;
  }
  function interact(n, h) {
    const o = n.o, age = h.age;
    if (n.kind === "switch") { o.on = true; A.sfx("check"); const w = G.L.walls.find((x) => x.id === o.wall); if (w) (w.type === "azucar" ? meltWall : breakWall)(w); burst(o.x, o.y - 40, 16, PASTEL, "star", 300); }
    else if (n.kind === "giant") { o.awake = true; o.wake = 0; A.sfx("friend"); G.cam.shake = 6; const line = M.persona(o.id, age).l; say(o.x, o.y - 260, "«" + line + "»", "#6aa88f", true); M.speak && M.speak(line, age);
      G.heroes.forEach((x) => addMass(x, 0.25)); spawnMinis(o.x, o.y - 120, 6); ev("hud"); }
    else if (n.kind === "visitor" && age === "kids" && M.Dialog && !o.talked) {
      o.talked = true; if (o.rig) rigHit(o.rig, "boing"); const gift = M.rng(o.x).pick(Object.keys(M.CANDIES)); G.state = "dialog";
      M.Dialog.show(M.Story.visitor(o.id, gift), () => { G.state = "play"; pickCandy(h, { x: o.x, y: o.y - 100, type: gift }); });
    }
    else if (n.kind === "visitor") { const line = M.persona(o.id, age).l; say(o.x, o.y - M.CAST[o.id].h - 40, "«" + line + "»", "#6aa88f", true); M.speak && M.speak(line, age); o.t = 0; if (o.rig) rigHit(o.rig, "boing"); A.sfx("pop");
      if (!o.talked) { o.talked = true; const gift = M.rng(o.x).pick(Object.keys(M.CANDIES)); pickCandy(h, { x: o.x, y: o.y - 100, type: gift }); } }
    else if (n.kind === "wild") befriend(o, h);
    else if (n.kind === "cage") openCage();
  }
  function openCage() { const cg = G.L.cage; if (cg.open) return; cg.open = true; cg.t = 0; G.rescued = true; A.sfx("friend"); G.cam.shake = 6; hitstop(0.06);
    focus(cg.x, cg.cy || cg.y - 100, 1.8, 1.18); G.heroes.forEach((x) => { x.happyT = 2.5; });
    burst(cg.x, cg.cy || cg.y - 100, 40, ["#ff8fab", "#ffd98e", "#ffffff", "#b9a3ff", "#9ff0d4"], "heart", 480); setTimeout(() => ev("rescue", cg.friend), 700); }

  // ——— compañero ———
  function stepComp(dt) {
    const cp = G.comp; if (!cp) return;
    const h = G.heroes[0]; cp.t += dt; if (cp.hop > 0) cp.hop -= dt;
    cp.trail.push([h.x, h.y]); if (cp.trail.length > 26) cp.trail.shift();
    const [tx, ty] = cp.trail[0], px = cp.x, py = cp.y;
    cp.x = lerp(cp.x, tx - h.face * 30, Math.min(1, dt * 6)); cp.y = lerp(cp.y, ty, Math.min(1, dt * 8));
    if (Math.abs(cp.x - h.x) > 700) { cp.x = h.x - h.face * 80; cp.y = h.y; puff(cp.x, cp.y, 6); }
    cp.vx = (cp.x - px) / dt; cp.vy = (cp.y - py) / dt; if (Math.abs(cp.vx) > 20) cp.face = Math.sign(cp.vx);
    else if (Math.abs(h.x - cp.x) > 10) cp.face = Math.sign(h.x - cp.x);
    const on = Math.abs(cp.vy) < 60;
    if (on && !cp.wasOn && cp.lastVy > 300) rigHit(cp.soft, "land", clamp(cp.lastVy / 1000, 0.3, 1));
    if (!on && cp.wasOn && cp.vy < -200) rigHit(cp.soft, "jump", 0.8);
    cp.wasOn = on; cp.lastVy = cp.vy;
    softStep(cp.soft, cp.vx, on, dt, 400, cp.t, { vy: cp.vy, face: cp.face, vac: h.vac && cp.def.ability === "aspiradora" });
    // Baby: el compañero ayuda solo
    if (h.AG.assist && cp.def.ability && (cp.cd = (cp.cd || 0) - dt) <= 0) {
      const threat = G.L.enemies.some((e) => e.state === "walk" && Math.abs(e.x - h.x) < 230 && Math.abs(e.y - h.y) < 140);
      if (threat && ["risa", "fuego"].includes(cp.def.ability)) { tapPower(cp, cp.def.ability, h, "candy"); cp.cd = 2.5; cp.hop = 0.5; }
    }
  }

  // ——— cámara: anticipación horizontal y vertical, zoom suave en momentos clave ———
  function stepCamera(dt) {
    const cam = G.cam; let fx, fy, zT = 1;
    if (G.heroes.length === 2) { fx = (G.heroes[0].x + G.heroes[1].x) / 2; fy = Math.min(G.heroes[0].y, G.heroes[1].y); cam.lookY = lerp(cam.lookY || 0, 0, Math.min(1, dt * 3)); }
    else { const h = G.heroes[0]; fx = h.x; fy = h.y; cam.look = lerp(cam.look, h.face * 110 + h.vx * 0.22, 1 - Math.exp(-dt * 2.2));
      let vl = 0; if (!h.on && h.vy > 600) vl = Math.min(170, (h.vy - 600) * 0.25); if (h.duck && Math.abs(h.vx) < 20 && h.idleT > 0.4) vl = 130; if (h.ledge) vl = -40;
      cam.lookY = lerp(cam.lookY || 0, vl, 1 - Math.exp(-dt * 3)); }
    let tx = fx - VW * 0.45 + (G.heroes.length === 1 ? cam.look : 0), ty = fy - VH * 0.62 + (cam.lookY || 0);
    const B = G.boss; if (B && B.state !== "sleep" && B.state !== "gone") {
      tx = clamp((fx + B.x) / 2 - VW / 2, B.arena[0] - 80, B.arena[1] + 80 - VW); ty = Math.min(ty, B.y0 - VH * 0.74);
      zT = B.state === "intro" ? 1.12 : 0.9; if (B.state === "intro") tx = lerp(tx, B.x - VW / 2, 0.5);
    }
    if (G.focus && G.focus.t > 0) { const f = G.focus; f.t -= dt; tx = lerp(tx, f.x - VW / 2, 0.6); ty = lerp(ty, f.y - VH * 0.55, 0.6); zT = f.zoom; if (f.t <= 0) G.focus = null; }
    cam.x = lerp(cam.x, tx, 1 - Math.exp(-dt * 5)); cam.y = lerp(cam.y, ty, 1 - Math.exp(-dt * 3.5));
    cam.x = clamp(cam.x, -350, G.L.end + 200 - VW); cam.y = clamp(cam.y, -900, 820 - VH);
    cam.kick = (cam.kick || 0) * Math.exp(-dt * 8);
    cam.zoom = lerp(cam.zoom || 1, zT, 1 - Math.exp(-dt * 2.5));
    cam.shake = Math.max(0, cam.shake - dt * 30);
  }
  function stepParticles(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.vy += p.g * dt; if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt * 0.5); } p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= (t.big ? 18 : 40) * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  }

  // ——— efectos para otros módulos (M.Events, etc.) ———
  M.FX = { part, burst, puff, say, shake: (n) => { G.cam.shake = Math.max(G.cam.shake, n); }, spawnMinis, sfx: (n, v) => A.sfx(n, v), hitstop, focus };

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

  // Nube: el malvavisco del primer prototipo (v1, sin lazo) con rig blando, ciclos de andar/correr y caras según el estado
  function drawNube(h) {
    const s = h.soft || {}, t = G.t || 0, face = h.face || 1, on = h.on !== false, vx = h.vx || 0, vy = h.vy || 0;
    const sq = s.sq || 0, maxv = h.maxv || 400, run = on ? Math.min(1.5, Math.abs(vx) / maxv) : 0;
    const walk = on && Math.abs(vx) > 30 ? (s.walk || 0) : 0, mood = h.mood || "idle";
    const duck = !!h.duck, slide = h.slide > 0, hang = !!(h.ledge || h.climb), pound = !!h.pound, flying = !!h.flying;
    const sy = 1 + sq, sx = 1 - sq * 0.55;
    const lean = (s.jx || 0) * 0.9 + (slide ? -face * 0.2 : 0), head = (s.hx || 0) * 0.9;
    c.save(); c.scale(sx, sy);
    // ——— piececitos ———
    const stride = 6 + run * 7, lift = 3 + run * 6;
    let f1x = -11, f1y = -3, f2x = 11, f2y = -3, r1 = 0, r2 = 0;
    if (hang) { const k = h.climb ? 0 : Math.sin(t * 16) * 5; f1x = -8; f1y = 2 + k; f2x = 8; f2y = 2 - k; }
    else if (slide || (duck && on)) { f1x = face * 10; f2x = face * 22; f1y = f2y = -2; r1 = r2 = face * 0.35; }
    else if (!on) {
      if (vy < 0 || pound) { f1x = -7; f2x = 7; f1y = f2y = -8; r1 = -0.3; r2 = 0.3; }
      else { const k = Math.sin(t * 22) * 3; f1x = -12; f2x = 12; f1y = 1 + k; f2y = 1 - k; }
    } else if (walk) {
      f1x = -11 + face * Math.sin(walk) * stride; f1y = -3 - Math.max(0, Math.cos(walk)) * lift; r1 = face * Math.cos(walk) * 0.25 * run;
      f2x = 11 + face * Math.sin(walk + Math.PI) * stride; f2y = -3 - Math.max(0, Math.cos(walk + Math.PI)) * lift; r2 = face * Math.cos(walk + Math.PI) * 0.25 * run;
    } else if ((h.idleT || 0) > 2.5 && Math.sin(t * 0.8) > 0.6) f2y = -3 - Math.max(0, Math.sin(t * 6)) * 2;   // golpecitos de pie esperando
    c.fillStyle = "#efe2da";
    c.beginPath(); c.ellipse(f1x, f1y, 9, 6, r1, 0, 7); c.fill();
    c.beginPath(); c.ellipse(f2x, f2y, 9, 6, r2, 0, 7); c.fill();
    // ——— cuerpo (columna inclinada + cabeza con retraso) ———
    c.save(); c.transform(1, 0, -(lean + head * 0.7), 1, 0, 0);
    const bob = on && !hang ? -Math.abs(Math.sin(walk)) * (2.5 + run * 3) + (Math.abs(vx) < 5 ? Math.sin(t * 2.5) * 1.2 : 0) : 0;
    c.translate(0, bob + (duck && on ? 3 : 0));
    // bracitos: acompañan la zancada, suben al saltar, se agitan al caer, empujan al aspirar
    const armRot = (sd) => {
      if (hang) return sd * -2.7 + Math.sin(t * 10 + sd) * 0.08;
      if (flying) return sd * (0.4 + Math.sin(t * 30) * 0.5) + sd * -0.6;
      if (h.vac) return -face * 1.35 + Math.sin(t * 40 + sd) * 0.12;
      if (pound) return sd * -2.1;
      if (mood === "hurt") return sd * -1.3 + Math.sin(t * 40) * 0.2;
      if (mood === "happy") return sd * -2.2 + Math.sin(t * 14 + sd) * 0.4;
      if (mood === "scared" && on) return sd * -1.9 + Math.sin(t * 30 + sd) * 0.15;
      if (slide) return face * 1.3;
      if (!on) return vy < 0 ? sd * -1.6 : sd * -1.8 + Math.sin(t * 25 + sd * 2) * 0.35;
      if (walk) { const sw = Math.sin(walk) * (0.5 + run * 0.7); return sd * 0.4 + (sd < 0 ? sw : -sw) * face; }
      return sd * 0.4 + Math.sin(t * 2 + sd) * 0.08;
    };
    const armY = hang ? -40 : -30;
    [-1, 1].forEach((sd) => {
      c.save(); c.translate(sd * 24, armY); c.rotate(armRot(sd));
      c.fillStyle = "#f6ece6"; c.beginPath(); c.ellipse(sd * 5, 6, 6, 10 + (hang ? 3 : 0), 0, 0, 7); c.fill(); c.restore();
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
    // ——— cara (mira hacia donde va; la cabeza llega un poco tarde) ———
    c.translate(-head * 30, 0);
    const look = mood === "idle" && (h.idleT || 0) > 3 ? Math.sin(t * 0.7) * 3 : 0;
    const ex = face * 5 + look, blink = h.blink < 0 ? 0.12 : 1, ink = "#3d2735";
    c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = "round"; c.lineWidth = 2.4;
    const eyesNormal = (dy = 0) => { [-9, 9].forEach((d) => { c.beginPath(); c.ellipse(ex + d, -34 + dy, 3.6, 5.2 * blink, 0, 0, 7); c.fill(); });
      if (blink > 0.5) { c.fillStyle = "#fff"; [-9, 9].forEach((d) => { c.beginPath(); c.arc(ex + d + 1.2, -36 + dy, 1.4, 0, 7); c.fill(); }); c.fillStyle = ink; } };
    const sweat = () => { c.fillStyle = "rgba(150,210,255,0.9)"; const x2 = -face * 22, y2 = -52 + ((t * 30) % 10); c.beginPath(); c.moveTo(x2, y2 - 6); c.quadraticCurveTo(x2 + 4, y2, x2, y2 + 3); c.quadraticCurveTo(x2 - 4, y2, x2, y2 - 6); c.fill(); c.fillStyle = ink; };
    let cheek = 1;
    if (mood === "effort") { // aspirando: ojos apretados, mofletes hinchados y boca abierta
      [-9, 9].forEach((d) => { c.beginPath(); c.moveTo(ex + d - 4, -36); c.lineTo(ex + d + 4, -33); c.stroke(); });
      c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex + face * 3, -23, 7, 6 + Math.sin(t * 30), 0, 0, 7); c.fill(); cheek = 1.35; sweat();
    } else if (mood === "hurt") { // > <
      [-9, 9].forEach((d) => { const k = d < 0 ? 1 : -1; c.beginPath(); c.moveTo(ex + d - 3 * k, -38); c.lineTo(ex + d + 3 * k, -34); c.lineTo(ex + d - 3 * k, -30); c.stroke(); });
      c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 6, -24); for (let i = 1; i <= 4; i++) c.lineTo(ex - 6 + i * 3, -24 + (i % 2 ? -2 : 1)); c.stroke();
    } else if (mood === "dizzy") { // ojos en espiral y estrellitas
      c.lineWidth = 1.6; [-9, 9].forEach((d) => { c.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * 0.42; c.lineTo(ex + d + Math.cos(a + t * 8) * r, -34 + Math.sin(a + t * 8) * r); } c.stroke(); });
      c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 5, -24); c.quadraticCurveTo(ex, -28, ex + 5, -24); c.stroke();
      c.fillStyle = "#ffd65c"; for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; M.star(c, Math.cos(a) * 20, -72 + Math.sin(a) * 5, 4, a); c.fill(); } c.fillStyle = ink;
    } else if (mood === "scared") { // ojos grandes, pupilas pequeñas, boquita temblorosa
      c.fillStyle = "#fff"; [-9, 9].forEach((d) => { c.beginPath(); c.ellipse(ex + d, -35, 5, 6.5, 0, 0, 7); c.fill(); }); c.lineWidth = 1.2; [-9, 9].forEach((d) => { c.beginPath(); c.ellipse(ex + d, -35, 5, 6.5, 0, 0, 7); c.stroke(); });
      c.fillStyle = ink; [-9, 9].forEach((d) => { c.beginPath(); c.arc(ex + d + face * 1.2 + Math.sin(t * 40) * 0.5, -35, 1.8, 0, 7); c.fill(); });
      c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex, -23, 3 + Math.sin(t * 30) * 0.6, 3.6, 0, 0, 7); c.fill(); sweat();
    } else if (mood === "happy") { // ^ ^ y sonrisa abierta
      c.lineWidth = 2.6; [-9, 9].forEach((d) => { c.beginPath(); c.arc(ex + d, -32, 4, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
      c.fillStyle = "#6b3448"; c.beginPath(); c.arc(ex, -27, 6, 0.1, Math.PI - 0.1); c.closePath(); c.fill();
      c.fillStyle = "#ff8fab"; c.beginPath(); c.ellipse(ex, -23, 3, 1.6, 0, 0, 7); c.fill(); cheek = 1.2;
    } else if (mood === "determined" || mood === "hang") { // cejas decididas / esfuerzo agarrado
      eyesNormal(mood === "hang" ? 1 : 0);
      c.lineWidth = 2.2; [-9, 9].forEach((d) => { c.beginPath(); c.moveTo(ex + d - 5, d < 0 ? -42 : -40); c.lineTo(ex + d + 5, d < 0 ? -40 : -42); c.stroke(); });
      if (mood === "hang") { c.fillStyle = "#fff"; M.rr(c, ex - 6, -27, 12, 5, 2); c.fill(); c.lineWidth = 1.5; M.rr(c, ex - 6, -27, 12, 5, 2); c.stroke(); sweat(); }
      else { c.lineWidth = 2; c.beginPath(); c.moveTo(ex - 5, -25); c.lineTo(ex + 5, -25); c.stroke(); }
    } else {
      eyesNormal();
      c.lineWidth = 2;
      if (!on) { c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex, -24, 3, 4 + (vy > 0 ? 1 : 0), 0, 0, 7); c.fill(); }
      else { c.beginPath(); c.arc(ex - 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.arc(ex + 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.stroke(); }
    }
    c.fillStyle = "rgba(255,140,170,0.55)";
    c.beginPath(); c.ellipse(ex - 16, -26, 5.5 * cheek, 3.5 * cheek, 0, 0, 7); c.ellipse(ex + 16, -26, 5.5 * cheek, 3.5 * cheek, 0, 0, 7); c.fill();
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
  const moodST = (m, on, vx) => m === "hurt" || m === "dizzy" ? "hurt" : m === "scared" ? "scared" : m === "happy" ? "happy" : !on ? "jump" : Math.abs(vx) > 30 ? "walk" : "idle";
  function drawHero(h) {
    const gy = groundBelow(h.x, h.y), dist = gy - h.y;
    if (dist < 600) { const kk = clamp(1 - dist / 500, 0.2, 1) * h.k; c.fillStyle = `rgba(60,30,60,${0.24 * clamp(1 - dist / 500, 0.2, 1)})`; c.beginPath(); c.ellipse(h.x, gy + 2, 30 * kk, 7 * kk, 0, 0, 7); c.fill(); }
    if (h.inv > 0 && Math.floor(h.inv * 14) % 2 === 0) return;
    if (h.pound && h.pound.ph === 1) { c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 3; c.lineCap = "round"; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(h.x + i * h.w * 0.35, h.y - h.h - 10); c.lineTo(h.x + i * h.w * 0.35, h.y - h.h - 70); c.stroke(); } }
    if (h.turbo) for (let i = 1; i < 4; i++) { c.globalAlpha = 0.16 * (4 - i); drawBody(h, h.x - h.face * i * 30, h.y, "lo"); } c.globalAlpha = 1;
    if (h.sugar) {
      c.save(); c.globalAlpha = 0.6; if (h.def.procedural) c.filter = "brightness(1.35) saturate(1.4) hue-rotate(-20deg)"; drawBody(h, h.x, h.y, null, "sugar"); c.restore();
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35; c.drawImage(M.IMG.glow.pink, h.x - h.h, h.y - h.h * 1.4, h.h * 2, h.h * 2); c.restore(); }
    else drawBody(h, h.x, h.y);
    if (h.bubble > 0) { c.save(); const R0 = h.h * 0.8, g = c.createRadialGradient(h.x - R0 * 0.3, h.y - h.h / 2 - R0 * 0.3, 4, h.x, h.y - h.h / 2, R0); g.addColorStop(0, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,150,210,0.45)"); c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y - h.h / 2, R0 + Math.sin(G.t * 8) * 3, 0, 7); c.fill(); c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = 3; c.stroke(); c.restore(); }
    if (h.giant > 0 && h.giant < 1.2 && Math.floor(h.giant * 8) % 2) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.3; c.drawImage(M.IMG.glow.white, h.x - h.h, h.y - h.h * 1.5, h.h * 2, h.h * 2); c.restore(); }
    if (h.vac) { c.save(); c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 2; const mx = h.x + h.face * h.w * 0.55, my = h.y - h.h * 0.5;
      for (let i = 0; i < 3; i++) { const r = ((G.t * 300 + i * 60) % 180); c.globalAlpha = 1 - r / 180; c.beginPath(); c.ellipse(mx + h.face * (180 - r), my, 14 + (180 - r) * 0.25, 20 + (180 - r) * 0.35, 0, 0, 7); c.stroke(); } c.restore();
      if (!h.def.procedural && Math.floor(G.t * 6) % 2) { c.fillStyle = "rgba(150,210,255,0.9)"; c.beginPath(); c.ellipse(h.x - h.face * h.w * 0.4, h.y - h.h * 0.95, 3, 5, 0, 0, 7); c.fill(); } }   // gota de esfuerzo
    if (G.fusion) { c.font = "700 15px Fredoka, system-ui"; c.textAlign = "center"; c.fillStyle = h.pi ? "#6a8cff" : "#ff6f91"; c.fillText("J" + (h.pi + 1), h.x, h.y - h.h - 30); }
  }
  function drawBody(h, x, y, quality, variant) {
    c.save(); c.translate(x, y);
    c.translate(0, -h.h / 2); c.rotate(h.rot); c.translate(0, h.h / 2);
    if (h.def.procedural) { c.rotate(h.on ? 0 : clamp(h.vx / 2000, -0.12, 0.12)); c.scale(h.k * 0.9, h.k * 0.9 * (h.duck && h.on ? 0.82 : 1)); drawNube(h); }
    else {
      const H = h.def.ph * h.k;
      if (h.duck && h.on) c.scale(1, 0.72);
      if (h.slide > 0) c.rotate(-h.slideDir * 0.12);
      drawChar(h.id, H, h.soft, { extraLean: h.flying ? Math.sin(G.t * 20) * 0.04 : 0, variant, quality,
        st: { t: G.t, vx: h.vx, vy: h.vy, on: h.on, face: h.face, mood: moodST(h.mood, h.on, h.vx), sq: h.soft.sq } });
    }
    c.restore();
  }
  function drawComp(cp) {
    const ph = cp.def.ph * 0.9, hop = cp.hop > 0 ? -Math.sin(cp.hop / 0.5 * Math.PI) * 34 : 0;
    c.fillStyle = "rgba(60,30,60,0.16)"; c.beginPath(); c.ellipse(cp.x, cp.y + 2, charW(cp.id, ph) * 0.3, 6, 0, 0, 7); c.fill();
    c.save(); c.translate(cp.x, cp.y + hop);
    drawChar(cp.id, ph, cp.soft, { st: { t: cp.t, vx: cp.vx, vy: cp.vy, on: Math.abs(cp.vy) < 60, face: cp.face, mood: cp.hop > 0 ? "happy" : Math.abs(cp.vx) > 30 ? "walk" : "idle", sq: cp.soft.sq } });
    c.restore();
  }
  function drawEnemy(e) {
    if (e.state === "gone") return;
    const isG = e.type === "gordo", gk = e.grow || 1, V = e.var || e.variant || null;
    const shadowW = (isG ? 90 : 42) * gk;
    if (e.type !== "volador") { const gy = e.air ? groundBelow(e.x, e.y) : e.y, a = e.air ? clamp(1 - (gy - e.y) / 400, 0.3, 1) : 1; c.fillStyle = `rgba(50,25,45,${0.28 * a})`; c.beginPath(); c.ellipse(e.x, gy + 2, shadowW * a, 8, 0, 0, 7); c.fill(); }
    else { const gy = groundBelow(e.x, e.y); c.fillStyle = "rgba(50,25,45,0.14)"; c.beginPath(); c.ellipse(e.x, gy + 2, 30, 6, 0, 0, 7); c.fill(); }
    c.save(); c.translate(e.x, e.y);
    const flip = e.dir === -1; // el grumo mira a la derecha en su imagen
    if (e.state === "pop") { const k = e.st / 0.35; c.globalAlpha = 1 - k; c.scale(1 + k, 1 - k * 0.8); }
    else if (e.ai === "sleep" && e.state === "walk") c.scale(1.08, 0.9 + Math.sin(e.t * 1.8) * 0.035);
    else if (e.air && e.state === "walk") c.scale(0.9, 1.12);
    else if (e.state === "walk" || e.state === "flash") {
      const f = e.ai === "chase" ? 1.6 : e.ai === "flee" ? 2 : 1;
      const hop = e.type === "volador" ? 0 : Math.abs(Math.sin(e.t * 5 * f)) * 7 * (e.ai === "chase" ? 1.3 : 1), sq = 1 + Math.cos(e.t * 10 * f) * 0.05;
      if (e.ai === "flee") c.translate(Math.sin(e.t * 60) * 1.5, 0);
      if (e.ai === "chase") c.rotate(e.dir * 0.08);
      if (e.ai === "alert") c.scale(1.1, 0.92);
      c.translate(0, -hop); c.scale(2 - sq, sq);
    }
    else if (e.state === "flat") c.scale(1.5, 0.22 + Math.sin(e.t * 8) * 0.02);
    else if (e.state === "reform") { const k = e.st / 0.6, el = 1 + Math.sin(k * Math.PI * 3) * (1 - k) * 0.4; c.scale(1.5 - 0.5 * k, (0.22 + 0.78 * k) * el); }
    else if (e.state === "melt") { const k = e.st; c.scale(1 + k * 0.5, 1 - k * 0.8); c.globalAlpha = 1 - k * 0.3; }
    else if (e.state === "stun") { c.rotate(Math.sin(e.t * 22) * 0.14); c.scale(1.05, 0.93); }
    if (e.land) c.scale(1 + e.land * 0.25, 1 - e.land * 0.25);
    if (e.pulledVis) { c.rotate(Math.sin(G.t * 30) * 0.2); c.scale(0.85, 1.1); }
    c.scale(gk, gk);
    if (V) { const vs = V.scale || 1; c.scale(vs * (V.sx || 1), vs * (V.sy || 1)); }
    if (flip) c.scale(-1, 1);
    if (e.state === "flash" && Math.floor(G.t * 20) % 2) c.filter = "brightness(1.8)";
    const PC = M.ProcChar, gh = 88 * (isG ? 2 : 1);
    if (V && PC && PC.drawGrumoVariant) safe("variant.back", () => PC.drawGrumoVariant(c, V, 0, 0, gh, G.t, "back", 1));
    M.drawGrumoSprite(c, e, G.t);
    c.filter = "none";
    if (V && PC && PC.drawGrumoVariant) safe("variant.front", () => PC.drawGrumoVariant(c, V, 0, 0, gh, G.t, "front", 1));
    if (V && typeof V.draw === "function") safe("grumoVariant.draw", () => V.draw(c, e, G.t));
    c.restore();
    const topY = e.y - (isG ? 190 : 100) * gk;
    c.textAlign = "center";
    if (e.state === "stun") { c.font = "22px system-ui"; c.fillText(e.laugh ? "😂" : "💫", e.x, topY); }
    else if (e.state === "walk" && e.ai === "sleep") { c.font = "700 22px Fredoka, system-ui"; c.fillStyle = "#8a6aa0"; for (let i = 0; i < 2; i++) { const k = (e.t * 0.5 + i / 2) % 1; c.globalAlpha = 1 - k; c.fillText("z", e.x + 20 + k * 20, topY - k * 40); } c.globalAlpha = 1; }
    else if (e.state === "walk" && e.ai === "alert") { c.font = "900 30px Fredoka, system-ui"; c.fillStyle = "#e0506a"; c.fillText("!", e.x, topY - 6); }
    else if (e.state === "walk" && e.ai === "flee") { c.font = "18px system-ui"; c.fillText("💦", e.x - e.dir * 26, topY + 10); }
    if (isG && e.alive) { c.fillStyle = "rgba(255,255,255,0.8)"; M.rr(c, e.x - 40, e.y - 200 * gk, 80, 8, 4); c.fill(); c.fillStyle = "#ff6f91"; M.rr(c, e.x - 40, e.y - 200 * gk, 80 * Math.max(0, e.hp) / 3, 8, 4); c.fill(); }
  }
  function drawBoss() {
    const B = G.boss; if (!B || B.state === "gone") return;
    const im = M.IMG.chars.grumo; if (!im) return; const h = 300, w = h * im.width / im.height;
    c.fillStyle = "rgba(50,25,45,0.3)"; c.beginPath(); c.ellipse(B.x, B.y0 || B.y, 170 * (1 - Math.min(0.5, ((B.y0 || B.y) - B.y) / 800)), 16, 0, 0, 7); c.fill();
    if (B.wave) { c.strokeStyle = `rgba(255,200,120,${1 - B.wave.r / 900})`; c.lineWidth = 8; [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(B.wave.x + s * B.wave.r, B.y0, 30, 12, 0, Math.PI, 0); c.stroke(); }); }
    c.save(); c.translate(B.x, B.y);
    if (B.state === "sleep") { c.scale(1.05, 0.95 + Math.sin(B.t * 1.5) * 0.02); }
    if (B.state === "defeat") c.globalAlpha = 1 - B.t / 1.4;
    const flash = B.flash > 0 && Math.floor(G.t * 20) % 2;
    if (R) R.draw(c, im, w, h, B.soft, { nat: 1, variant: flash ? "flash" : undefined });
    else { if (flash) c.filter = "brightness(1.9)"; drawStrips(im, w, h, B.soft, B.dir === -1); c.filter = "none"; }
    // corona: sigue a la cabeza deformada
    let cx0 = 0, cy = -h * 0.92 * (1 + B.soft.sq);
    if (R) { const a = R.anchor(B.soft, 0, 0.93, w, h); cx0 = a[0]; cy = a[1]; }
    c.translate(cx0, 0); c.rotate((B.soft.hx || 0) * 0.8);
    c.fillStyle = "#ffd36b"; c.strokeStyle = "#e0a93c"; c.lineWidth = 3; c.beginPath();
    c.moveTo(-60, cy); c.lineTo(-50, cy - 50); c.lineTo(-22, cy - 22); c.lineTo(0, cy - 60); c.lineTo(22, cy - 22); c.lineTo(50, cy - 50); c.lineTo(60, cy); c.closePath(); c.fill(); c.stroke();
    ["#ff6f91", "#9ff0d4", "#b9a3ff"].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(-30 + i * 30, cy - 10, 7, 0, 7); c.fill(); });
    c.restore();
    if (B.state === "sleep") { c.font = "700 36px Fredoka"; c.fillStyle = "#8a6aa0"; for (let i = 0; i < 3; i++) { const k = (G.t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText("z", B.x + 120 + k * 50, B.y - 300 - k * 90); } c.globalAlpha = 1; }
  }
  function drawGiant(g) {
    const def = M.CAST[g.id], im = M.IMG.chars[g.id]; if (!def || (!im && !def.procgen)) return; const H = def.h * 1.15; g.hh = H;
    c.fillStyle = "rgba(60,30,60,0.2)"; c.beginPath(); c.ellipse(g.x, g.y + 3, 150, 14, 0, 0, 7); c.fill();
    c.save(); c.translate(g.x, g.y);
    if (!g.awake) {
      if (im) { const sc = Math.min(240 / im.height, 130 / im.width), Ws = im.width * sc, Hs = im.height * sc; g.lw = Hs; g.lh = Ws;
        c.save(); c.rotate(-Math.PI / 2); c.scale(1 + Math.sin(g.t * 1.6) * 0.035, 1); c.drawImage(im, 0, -Hs / 2, Ws, Hs); c.restore(); }
      else { g.lw = 240; g.lh = 110; c.save(); c.rotate(-Math.PI / 2); drawChar(g.id, 110, g.rig || (g.rig = softNew(1))); c.restore(); }
      const top = g.lh || 110;
      c.font = "700 26px Fredoka"; c.fillStyle = "#8a6aa0"; for (let i = 0; i < 3; i++) { const k = (g.t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText("z", 40 + k * 40, -top - 10 - k * 70); } c.globalAlpha = 1; }
    else { const k = Math.min(1, g.wake); c.scale(1, 0.3 + 0.7 * k); drawChar(g.id, H, g.rig || (g.rig = softNew(1))); }
    c.restore();
  }
  function drawVisitor(v) {
    const def = M.CAST[v.id]; if (!def) return; const H = def.h, rig = v.rig || (v.rig = softNew(1));
    c.fillStyle = "rgba(60,30,60,0.18)"; c.beginPath(); c.ellipse(v.x, v.y + 2, charW(v.id, H) * 0.35, 9, 0, 0, 7); c.fill();
    c.save(); c.translate(v.x, v.y); drawChar(v.id, H, rig, { st: { t: v.t, vx: 0, vy: 0, on: true, face: rig.shown || 1, mood: v.t < 1.5 && v.talked ? "talk" : "idle", sq: rig.sq } }); c.restore();
    if (!v.talked) { c.font = "22px system-ui"; c.textAlign = "center"; c.fillText("💬", v.x, v.y - H - 20 + Math.sin(v.t * 3) * 4); } }
  function drawWild(w) {
    const cr = w.creature; if (!cr) return; const H = cr.h || 150, rig = w.rig || (w.rig = softNew(1));
    const gy = w.on !== false ? w.y : groundBelow(w.x, w.y);
    c.fillStyle = "rgba(60,30,60,0.18)"; c.beginPath(); c.ellipse(w.x, gy + 2, H * 0.28, 8, 0, 0, 7); c.fill();
    const st = { t: w.t || 0, vx: w.vx || 0, vy: w.vy || 0, on: w.on !== false, face: w.face || 1, mood: w.mood || "idle", sq: rig.sq };
    if (M.ProcChar && M.ProcChar.draw) safe("ProcChar.draw", () => M.ProcChar.draw(c, cr, w.x, w.y, H, st));
    else { c.save(); c.translate(w.x, w.y); drawBlob(H, rig, (cr.look && cr.look.color) || "#ffe0ef"); c.restore(); }
    c.textAlign = "center";
    if (!w.met) { c.font = "20px system-ui"; c.fillText(w.mood === "scared" ? "💦" : "✨", w.x, w.y - H - 16 + Math.sin((w.t || 0) * 3) * 4); }
    else if (w.happy > 0) { c.fillStyle = "#ff8fab"; M.heart(c, w.x, w.y - H - 34 - (2.5 - w.happy) * 10, 16); }
  }
  function drawPrompt(n) {
    if (!n) return; const o = n.o, h = G.heroes[0];
    const label = { switch: o.big ? "¡Pulsa!" : "Tirar", giant: M.T("giant", h.age), visitor: "Charlar", cage: "¡Liberar!", wild: "Hacer amigos" }[n.kind];
    const x = o.x, y = (n.kind === "cage" ? o.cy - o.R : n.kind === "visitor" ? o.y - M.CAST[o.id].h : n.kind === "wild" ? o.y - ((o.creature && o.creature.h) || 150) - 20 : n.kind === "giant" ? o.y - 150 : o.y - 90) - 40 + Math.sin(G.t * 4) * 4;
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
  function drawDarkness(x1, x2, z) {
    if (!darkCv || darkCv.width !== Math.ceil(VW)) darkCv = M.canvas(Math.ceil(VW), Math.ceil(VH));
    const d = darkCv.getContext("2d"); d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, darkCv.width, darkCv.height);
    d.fillStyle = "rgba(18,10,42,0.72)"; d.fillRect(0, 0, VW, VH); d.globalCompositeOperation = "destination-out";
    const cam = G.cam, sx = (x) => (x - cam.x - VW / 2) * z + VW / 2, sy = (y) => (y - cam.y - VH / 2) * z + VH / 2;
    const hole = (x, y, r) => { x = sx(x); y = sy(y); r *= z; const g = d.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, 7); d.fill(); };
    G.heroes.forEach((h) => hole(h.x, h.y - h.h / 2, 300 + h.mass * 80));
    if (G.comp) hole(G.comp.x, G.comp.y - 50, 150);
    G.L.checks.forEach((k) => { if (k.on) hole(k.x, k.y - 104, 220); });
    G.L.solids.forEach((s) => { if (s.x < x2 && s.x + s.w > x1 && s.back) s.back.forEach((f) => { if (f.kind === "farol") hole(f.x, s.y - 30, 130); }); });
    G.L.sparks.forEach((s) => { if (!s.got && s.x > x1 && s.x < x2) hole(s.x, s.y, 70); });
    G.L.candies.forEach((k) => { if (!k.got && k.x > x1 && k.x < x2) hole(k.x, k.y, 110); });
    if (G.L.wild) G.L.wild.forEach((w) => { if (w.x > x1 && w.x < x2) hole(w.x, w.y - 60, 120); });
    if (G.L.cage) hole(G.L.cage.x, G.L.cage.y - 100, 260);
    c.drawImage(darkCv, 0, 0, VW, VH);
  }

  function render() {
    const cam = G.cam, t = G.t, L = G.L, b = L.biome, z = (cam.zoom || 1) + (cam.kick || 0);
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

    // ——— mundo (con zoom alrededor del centro de la pantalla) ———
    const ex = Math.max(0, (VW / z - VW) / 2), ey = Math.max(0, (VH / z - VH) / 2);
    c.save(); c.translate(VW / 2 + sh.x, VH / 2 + sh.y); c.scale(z, z); c.translate(-VW / 2 - Math.round(cam.x), -VH / 2 - Math.round(cam.y));
    const x1 = cam.x - 400 - ex, x2 = cam.x + VW + 400 + ex, lead = G.heroes[0], camV = { x: cam.x - ex, y: cam.y - ey }, VWz = VW + ex * 2, VHz = VH + ey * 2;
    for (const p of L.props) if (p.layer === "back" && p.x > x1 && p.x < x2) { const im = M.IMG.props[p.key]; if (!im) continue; const w = p.h * im.width / im.height; c.save(); c.translate(p.x, p.y); if (p.flip) c.scale(-1, 1); c.drawImage(im, -w / 2, -p.h, w, p.h); c.restore(); }
    // viento: estelas
    for (const wz of L.winds) if (wz.x2 > x1 && wz.x1 < x2) { c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 3; c.lineCap = "round";
      for (let i = 0; i < 14; i++) { const px = wz.x1 + ((i * 97 + t * 260) % (wz.x2 - wz.x1)), py = wz.y2 - ((i * 131 + t * 320) % (wz.y2 - wz.y1)); c.globalAlpha = 0.6; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 20, py - 30, px + 10, py - 60); c.stroke(); } c.globalAlpha = 1; }
    if (L.exit) M.drawExit(c, L.exit, t, G.rescued);
    for (const s of L.solids) if (s.x < x2 && s.x + s.w > x1) M.drawGround(c, s, L, camV, VWz, VHz, t);
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
    if (M.Events && M.Events.drawWorld) { c.save(); safe("Events.drawWorld", () => M.Events.drawWorld(c, G)); c.restore(); }
    for (const g of L.giants) if (g.x > x1 && g.x < x2) drawGiant(g);
    for (const v of L.visitors) if (v.x > x1 && v.x < x2) drawVisitor(v);
    if (L.wild) for (const w of L.wild) if (w.x > x1 && w.x < x2) drawWild(w);
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
    if (M.Events && M.Events.drawFront) { c.save(); safe("Events.drawFront", () => M.Events.drawFront(c, G)); c.restore(); }
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
      drawDarkness(x1, x2, z);
      c.save(); c.globalCompositeOperation = "lighter";
      for (const a of ambient) { const x = ((a.x * (VW + 100) - cam.x * a.z * 0.7 + Math.sin(t * 0.7 + a.ph) * 40) % (VW + 100) + VW + 100) % (VW + 100) - 50, y = ((a.y * VH - cam.y * a.z * 0.4 + Math.cos(t * 0.5 + a.ph) * 30) % VH + VH) % VH;
        c.globalAlpha = 0.5 + Math.sin(t * 3 + a.ph * 3) * 0.5; c.drawImage(a.ph > 3 ? M.IMG.glow.mint : M.IMG.glow.warm, x - 14, y - 14, 28, 28); } c.restore();
    }
    if (M.Events && M.Events.drawScreen) { c.save(); safe("Events.drawScreen", () => M.Events.drawScreen(c, G, VW, VH)); c.restore(); }
    // etalonaje suave: calidez arriba, frescor abajo
    const cg = c.createLinearGradient(0, 0, 0, VH); cg.addColorStop(0, "rgba(255,225,200,0.07)"); cg.addColorStop(1, "rgba(120,90,170,0.08)"); c.fillStyle = cg; c.fillRect(0, 0, VW, VH);
    c.drawImage(getVignette(), 0, 0, VW, VH);
  }

  // ——— bucle ———
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    I.poll(); M.UI && M.UI.frame && M.UI.frame(dt);
    if (R && R.frame) R.frame(dt * 1000);
    if (G.state === "play") {
      if (G.hitstop > 0) { G.hitstop -= dt; acc = 0; }          // parón de impacto: el mundo se congela un instante
      else {
        acc += dt;
        while (acc >= STEP) { acc -= STEP; G.t += STEP; G.stats.time += STEP;
          G.heroes.forEach((h) => stepHero(h, STEP)); stepComp(STEP); stepEnemies(STEP); stepBoss(STEP); stepWorld(STEP);
          if (M.Events && M.Events.step) safe("Events.step", () => M.Events.step(G, STEP));
          stepParticles(STEP); if (G.state !== "play" || G.hitstop > 0) { acc = 0; break; } }
      }
      stepCamera(dt);
    } else if (G.state === "attract" && G.L) {
      G.t += dt; G.cam.x += dt * 55; if (G.cam.x > G.L.end - VW) G.cam.x = -200; G.cam.y = lerp(G.cam.y, 820 - VH - 40, dt); G.cam.zoom = 1;
      G.L.enemies.forEach((e) => (e.t += dt)); G.L.sparks.forEach((s) => (s.t += dt)); if (G.L.wild) safe("wild", () => stepWild(dt)); stepParticles(dt);
    } else { I.clear(); A.vacuum(false); }
    if (G.L) render();
    if (!M._manual) requestAnimationFrame(frame);
  }
  G.attract = function (L) { G.L = L; G.heroes = []; G.comp = null; G.boss = null; G.state = "attract"; G.cam.x = -200; G.cam.zoom = 1; G.cam.kick = 0; plCache = null; G.focus = null; G.hitstop = 0; G.puddles = []; G.shots = []; G.clays = []; G.auras = []; G.minis = []; };
  G.begin = () => requestAnimationFrame(frame);
  M._tick = (n = 1, ms = 16.7) => { M._manual = true; for (let i = 0; i < n; i++) frame(last + ms); M._manual = false; };
  M.gameCanvas = cv;
})();
