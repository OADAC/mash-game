// Mashmellous · La Gran Tarta — bucle principal, física, entidades y render.
(function () {
  const A = M.Audio;
  const cv = document.getElementById("game");
  const c = cv.getContext("2d");
  const $ = (id) => document.getElementById(id);

  // ——— constantes de física ———
  const GRAV = 2700, JUMP = 1000, DJUMP = 900, MAXV = 410, BOUNCE = 1580, STOMP = 780;

  let DPR = 1, SCALE = 1, VW = 1280, VH = 720;
  function resize() {
    if (!innerWidth || !innerHeight) return; // ventana minimizada: conservar el tamaño anterior
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
    const base = innerHeight < 560 ? 600 : 720; // más zoom en pantallas bajas (móvil apaisado)
    SCALE = Math.min(cv.height / base, cv.width / (base * 1.25));
    VW = cv.width / SCALE; VH = cv.height / SCALE;
    vignette = null;
  }
  addEventListener("resize", resize);

  // ——— estado ———
  const G = {
    state: "loading", t: 0, time: 0, L: null, P: null,
    cam: { x: 0, y: 100, shake: 0, look: 0 }, parts: [], texts: [],
    sparks: 0, sparkTotal: 0, combo: 0, lastSpark: 0, happy: 0, falls: 0,
    met: new Set(), zone: -1, check: null, near: null, finaleT: 0, party: [],
  };
  M.G = G;

  let save = { met: [], best: null };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem("mm_save") || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem("mm_save", JSON.stringify(save)); } catch (e) {} };

  // ——— entrada ———
  const keys = {}, hit = {};
  const KEYMAP = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", Space: "J", ArrowUp: "J", KeyW: "J", KeyZ: "J",
    KeyE: "E", Enter: "E", ArrowDown: "E", KeyS: "E", KeyX: "E", Escape: "P", KeyP: "P", KeyM: "MUTE", Tab: "ALB" };
  addEventListener("keydown", (e) => {
    const k = KEYMAP[e.code]; if (!k) return;
    if (["J", "ALB"].includes(k) || e.code.startsWith("Arrow")) e.preventDefault();
    if (!keys[k]) hit[k] = true;
    keys[k] = true;
    A.init();
  });
  addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  const consume = (k) => { const v = hit[k]; hit[k] = false; return v; };

  // controles táctiles
  document.querySelectorAll("[data-key]").forEach((b) => {
    const k = b.dataset.key;
    const on = (e) => { e.preventDefault(); A.init(); if (!keys[k]) hit[k] = true; keys[k] = true; b.classList.add("down"); };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("down"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });

  // ——— nivel ———
  function newPlayer(x, y) {
    return { x, y, w: 46, h: 56, vx: 0, vy: 0, on: false, coyote: 0, buf: 0, dbl: true, face: 1, sx: 1, sy: 1,
      hearts: 3, inv: 0, walk: 0, rot: 0, spin: 0, mover: null, blink: 2, cut: false, idle: 0 };
  }
  function resetRun() {
    G.L = M.buildLevel();
    M.decorate(G.L);
    G.P = newPlayer(200, 600);
    G.sparks = 0; G.sparkTotal = G.L.sparks.length; G.happy = 0; G.falls = 0; G.time = 0;
    G.met = new Set(); G.zone = -1; G.check = { x: 200, y: 600 }; G.parts = []; G.texts = []; G.party = []; G.finaleT = 0;
    G.cam.x = 200 - VW * 0.4; G.cam.y = 100;
    updateHUD();
  }

  // ——— utilidades ———
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  function part(o) { G.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1, max: 1, size: 6, rot: 0, vr: 0, drag: 0, color: "#fff", type: "dot" }, o)); }
  function burst(x, y, n, colors, type = "star", speed = 320) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(speed * 0.35, speed);
      part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, g: 500, life: rand(0.5, 1.1), size: rand(5, 11), color: colors[i % colors.length], type, vr: rand(-8, 8), drag: 1.8 });
    }
  }
  function puff(x, y, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) part({ x: x + rand(-16, 16), y: y - rand(0, 8), vx: rand(-80, 80) + dir * 60, vy: rand(-90, -20), life: rand(0.35, 0.6), size: rand(8, 16), color: "rgba(255,255,255,0.9)", type: "puff", drag: 3 });
  }
  function floatText(x, y, text, color = "#ff6f91") { G.texts.push({ x, y, text, color, life: 1.4 }); }
  const PASTEL = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff", "#ffffff"];

  // ——— física del jugador ———
  function overlap(p, s) {
    return p.x + p.w / 2 > s.x && p.x - p.w / 2 < s.x + s.w && p.y > s.y + 0.01 && p.y - p.h < s.y + s.h;
  }
  function stepPlayer(dt) {
    const P = G.P, L = G.L;
    const dir = (keys.R ? 1 : 0) - (keys.L ? 1 : 0);
    if (dir) P.face = dir;
    const acc = P.on ? (dir ? 3600 : 3000) : 2100;
    const target = dir * MAXV;
    if (P.vx < target) P.vx = Math.min(target, P.vx + acc * dt); else if (P.vx > target) P.vx = Math.max(target, P.vx - acc * dt);

    // mover encima de plataformas móviles
    if (P.mover) { P.x += P.mover.vx * dt; P.y += P.mover.vy * dt; }

    if (hit.J) { P.buf = 0.14; hit.J = false; }
    P.buf -= dt; P.coyote -= dt;
    if (P.buf > 0 && (P.on || P.coyote > 0)) {
      P.vy = -JUMP; P.on = false; P.coyote = 0; P.buf = 0; P.cut = false; P.mover = null;
      P.sx = 0.72; P.sy = 1.32; A.play("jump"); puff(P.x, P.y, 5);
    } else if (P.buf > 0 && P.dbl && !P.on) {
      P.vy = -DJUMP; P.dbl = false; P.buf = 0; P.cut = false; P.spin = 1;
      P.sx = 0.8; P.sy = 1.25; A.play("djump");
      for (let i = 0; i < 8; i++) part({ x: P.x + rand(-20, 20), y: P.y - 10, vx: rand(-120, 120), vy: rand(40, 160), life: 0.5, size: rand(8, 14), color: "rgba(255,255,255,0.95)", type: "puff", drag: 3 });
      burst(P.x, P.y - 20, 6, PASTEL, "star", 200);
    }
    let g = GRAV;
    if (P.vy < 0 && !keys.J && !P.bounced) g *= 2.3;
    if (P.vy > 0) g *= 1.12;
    P.vy = Math.min(P.vy + g * dt, 1500);

    // eje X
    P.x += P.vx * dt;
    for (const s of L.solids) if (overlap(P, s)) {
      if (P.x < s.x + s.w / 2) P.x = s.x - P.w / 2; else P.x = s.x + s.w + P.w / 2;
      P.vx = 0;
    }
    // eje Y
    const prevY = P.y, wasOn = P.on, impact = P.vy;
    P.y += P.vy * dt;
    P.on = false; P.mover = null;
    for (const s of L.solids) if (overlap(P, s)) {
      if (P.vy > 0 && prevY <= s.y + 2 + P.vy * dt) { P.y = s.y; P.vy = 0; P.on = true; }
      else if (P.vy < 0) { P.y = s.y + s.h + P.h; P.vy = 0; }
      else P.y = s.y;
    }
    if (P.vy >= 0) {
      const oneWay = (s, mv) => {
        if (P.x + P.w / 2 > s.x + 6 && P.x - P.w / 2 < s.x + s.w - 6 && prevY <= s.y + 3 + (mv ? Math.abs(mv.vy) * dt + 2 : 0) && P.y >= s.y) {
          P.y = s.y; P.vy = 0; P.on = true; if (mv) P.mover = mv;
        }
      };
      L.plats.forEach((s) => oneWay(s));
      L.movers.forEach((s) => oneWay(s, s));
    }
    if (P.on) {
      P.coyote = 0.1; P.dbl = true; P.bounced = false;
      if (!wasOn && impact > 250) {
        const v = clamp(impact / 1200, 0.3, 1.2);
        P.sx = 1 + 0.35 * v; P.sy = 1 - 0.3 * v; A.play("land", v); puff(P.x, P.y, 4 + (v * 6) | 0);
        if (impact > 1250) G.cam.shake = 6;
      }
    }
    // setas rebotadoras
    for (const s of L.shrooms) {
      const top = s.y - 98;
      if (P.vy > 0 && Math.abs(P.x - s.x) < 66 && P.y >= top && prevY <= top + 26) {
        P.y = top; P.vy = -BOUNCE; P.bounced = true; P.dbl = true; P.on = false; s.squash = 1;
        P.sx = 0.7; P.sy = 1.4; P.spin = 1; A.play("boing");
        burst(s.x, top, 12, PASTEL, "star", 380);
      }
    }
    // squash & stretch → vuelve a 1
    P.sx = lerp(P.sx, 1, Math.min(1, dt * 11)); P.sy = lerp(P.sy, 1, Math.min(1, dt * 11));
    if (P.spin > 0) { P.spin -= dt * 2.6; P.rot = (1 - Math.max(0, P.spin)) * Math.PI * 2 * P.face; if (P.spin <= 0) P.rot = 0; }
    if (P.on && Math.abs(P.vx) > 30) { P.walk += dt * Math.abs(P.vx) * 0.045; if (Math.random() < dt * 8) puff(P.x - P.face * 14, P.y, 1); }
    P.inv -= dt;
    P.blink -= dt; if (P.blink < -0.12) P.blink = rand(2, 4.5);
    P.idle = (Math.abs(P.vx) < 5 && P.on) ? P.idle + dt : 0;
    P.x = clamp(P.x, -300, M.LEVEL_END - 60);

    // caída
    if (P.y > 1300) {
      G.falls++;
      hurt(true);
    }
  }

  function hurt(fell) {
    const P = G.P;
    P.hearts--;
    A.play("hurt"); G.cam.shake = 10;
    if (fell || P.hearts <= 0) {
      if (P.hearts <= 0) { P.hearts = 3; floatText(G.check.x, G.check.y - 120, "¡Otra vez!", "#b07ce0"); }
      P.x = G.check.x; P.y = G.check.y; P.vx = 0; P.vy = 0; P.inv = 1.5; P.sx = 1.4; P.sy = 0.6;
      puff(P.x, P.y, 10); burst(P.x, P.y - 30, 10, PASTEL);
    } else {
      P.inv = 1.4;
    }
    updateHUD();
  }

  // ——— resto de entidades ———
  function stepWorld(dt) {
    const L = G.L, P = G.P, t = G.t;
    L.movers.forEach((m) => {
      const a = ((t / m.period) * Math.PI * 2) + m.phase;
      const nx = m.x0 + Math.sin(a) * m.dx, ny = m.y0 + Math.sin(a) * m.dy;
      m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
    });
    L.shrooms.forEach((s) => { s.squash = Math.max(0, s.squash - dt * 4); });

    // chispas
    for (const s of L.sparks) {
      if (s.got) continue;
      s.t += dt;
      const dx = s.x - P.x, dy = s.y - (P.y - 30);
      if (dx * dx + dy * dy < 46 * 46) {
        s.got = true; G.sparks++;
        G.combo = (G.t - G.lastSpark < 0.7) ? G.combo + 1 : 0; G.lastSpark = G.t;
        A.play("spark", G.combo);
        burst(s.x, s.y, 7, ["#ffe27a", "#ffffff", "#ffb3c7"], "star", 220);
        part({ x: s.x, y: s.y, type: "ring", life: 0.4, size: 10, color: "rgba(255,240,180,0.9)" });
        updateHUD();
      }
    }
    // amigos
    G.near = null;
    let best = 1e9;
    for (const f of L.friends) {
      f.t += dt;
      if (f.hop > 0) f.hop -= dt;
      else if (f.met && Math.random() < dt * 0.35) f.hop = 0.6;
      const d = Math.abs(f.x - P.x);
      if (d < 150 && Math.abs(f.y - P.y) < 170 && d < best) { best = d; G.near = f; }
      if (f.met && Math.random() < dt * 0.6) part({ x: f.x + rand(-40, 40), y: f.y - M.FRIENDS[f.id].h * rand(0.5, 0.9), vy: -40, vx: rand(-15, 15), life: 1.4, size: rand(6, 9), color: "#ff8fab", type: "heart" });
    }
    if (G.near && consume("E")) {
      if (!G.near.met) openEncounter(G.near.id, true);
      else { const lines = ["¡Nos vemos en la fiesta!", "¡Qué blandito eres!", "¡Hola otra vez!", "¡Guárdame un trozo de tarta!", "¡Ji ji ji!"]; floatText(G.near.x, G.near.y - M.FRIENDS[G.near.id].h - 30, lines[(Math.random() * lines.length) | 0], "#6aa88f"); G.near.hop = 0.6; A.play("pop"); }
    }
    hit.E = false;

    // grumos gruñones
    for (const g of L.grumos) {
      if (!g.alive) { g.dead += dt; continue; }
      g.t += dt;
      g.x += g.dir * 75 * dt;
      if (g.x < g.x1) { g.x = g.x1; g.dir = 1; } else if (g.x > g.x2) { g.x = g.x2; g.dir = -1; }
      g.squash = Math.max(0, g.squash - dt * 3);
      const hop = Math.abs(Math.sin(g.t * 5)) * 7, top = g.y - 70 - hop;
      if (P.x + P.w / 2 > g.x - 40 && P.x - P.w / 2 < g.x + 40 && P.y > top && P.y - P.h < g.y) {
        if (P.vy > 60 && P.y - P.vy * dt <= top + 22) {
          g.alive = false; g.dead = 0; G.happy++;
          P.vy = keys.J ? -BOUNCE * 0.72 : -STOMP; P.bounced = keys.J; P.dbl = true; P.sx = 0.75; P.sy = 1.3;
          A.play("stomp"); G.cam.shake = 5;
          burst(g.x, g.y - 30, 14, ["#ff8fab", "#ffd98e", "#ffffff", "#9ff0d4"], "heart", 300);
          floatText(g.x, g.y - 90, "¡Contento!", "#ff7aa0");
          updateHUD();
        } else if (P.inv <= 0) {
          P.vx = (P.x < g.x ? -1 : 1) * 460; P.vy = -560; P.on = false;
          hurt(false);
        }
      }
    }
    // farolillos
    for (const k of L.checks) {
      if (!k.on && P.x > k.x - 20) {
        k.on = true; G.check = { x: k.x, y: k.y }; A.play("check");
        burst(k.x, k.y - 105, 14, ["#ffe27a", "#ffffff", "#ff9fb6"], "star", 260);
        floatText(k.x, k.y - 160, "¡Farolillo encendido!", "#d9a13a");
      }
    }
    // zona
    const z = M.zoneAt(P.x);
    if (z !== G.zone) {
      G.zone = z;
      A.startMusic(M.ZONES[z].music);
      showBanner(z);
    }
    // meta
    if (L.goal && P.x > L.goal.x - 230 && G.state === "play") startFinale();
  }

  function stepParticles(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.life -= dt;
      if (p.life <= 0) { G.parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt * 0.5); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.life -= dt; t.y -= 40 * dt; if (t.life <= 0) G.texts.splice(i, 1); }
  }

  function stepCamera(dt, auto) {
    const cam = G.cam, P = G.P;
    if (auto) {
      cam.x += dt * 70;
      if (cam.x > M.LEVEL_END - VW - 400) cam.x = -100;
      cam.y = lerp(cam.y, 820 - VH - 40, dt);
      return;
    }
    cam.look = lerp(cam.look, P.face * 110 + P.vx * 0.15, Math.min(1, dt * 2.2));
    let tx = P.x - VW * 0.42 + cam.look;
    if (G.state === "finale") tx = G.L.goal.x - VW * 0.5;
    const ty = P.y - VH * 0.6;
    cam.x = lerp(cam.x, tx, 1 - Math.exp(-dt * 5));
    cam.y = lerp(cam.y, ty, 1 - Math.exp(-dt * (P.vy > 600 ? 7 : 3.5)));
    cam.x = clamp(cam.x, -250, M.LEVEL_END - VW);
    cam.y = clamp(cam.y, -700, 820 - VH);
    cam.shake = Math.max(0, cam.shake - dt * 30);
  }

  // ——— final ———
  function startFinale() {
    G.state = "finale"; G.finaleT = 0;
    A.startMusic(4); A.play("fanfare");
    const g = G.L.goal, met = M.FRIEND_ORDER.filter((id) => G.met.has(id));
    G.party = met.map((id, i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      return { id, x: g.x + side * (250 + k * 105), y: g.y, drop: -700 - i * 120, vy: 0, delay: 0.6 + i * 0.18, t: rand(0, 6) };
    });
    hideHUDPrompts();
  }
  function stepFinale(dt) {
    G.finaleT += dt;
    const P = G.P, g = G.L.goal;
    // Nube camina hasta la tarta
    const target = g.x - 180;
    keys.L = keys.R = false;
    if (P.x < target - 5) keys.R = true;
    stepPlayer(dt); keys.R = false;
    if (P.on && Math.abs(P.x - target) < 8 && Math.random() < dt * 1.5) { P.vy = -700; P.on = false; P.sy = 1.3; P.sx = 0.75; }
    G.party.forEach((f) => {
      if (G.finaleT < f.delay) return;
      f.t += dt;
      if (f.drop < 0) {
        f.vy += 2200 * dt; f.drop += f.vy * dt;
        if (f.drop >= 0) { f.drop = 0; f.vy = -f.vy * 0.35; if (Math.abs(f.vy) > 80) { f.drop = -0.1; } puff(f.x, f.y, 6); A.play("pop"); }
      } else if (Math.random() < dt * 0.9) { f.drop = -0.1; f.vy = -520; }
    });
    if (Math.random() < dt * 5) {
      const x = g.x + rand(-VW / 2, VW / 2);
      for (let i = 0; i < 8; i++) part({ x, y: G.cam.y - 20, vx: rand(-60, 60), vy: rand(60, 200), g: 120, drag: 0.6, life: 4, size: rand(7, 12), color: PASTEL[(Math.random() * 5) | 0], type: "confetti", vr: rand(-10, 10) });
    }
    if (Math.random() < dt * 1.2) {
      const fx = g.x + rand(-500, 500), fy = g.y - rand(380, 560);
      burst(fx, fy, 26, PASTEL, Math.random() < 0.5 ? "star" : "heart", 420);
      part({ x: fx, y: fy, type: "ring", life: 0.6, size: 20, color: "rgba(255,255,255,0.8)" });
    }
    if (G.finaleT > 5 && !G.finaleShown) { G.finaleShown = true; showFinale(); }
  }

  // ——— RENDER ———
  let vignette = null, glowSprites = null, ambient = null;
  function makeGlow(col) {
    const s = M.canvas(128, 128), x = s.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(0.4, col.replace(/[\d.]+\)$/, "0.35)")); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return s;
  }
  function initFx() {
    glowSprites = { warm: makeGlow("rgba(255,226,140,0.9)"), pink: makeGlow("rgba(255,160,200,0.9)"), mint: makeGlow("rgba(160,255,220,0.9)"), white: makeGlow("rgba(255,255,255,0.9)") };
    ambient = [];
    for (let i = 0; i < 70; i++) ambient.push({ x: Math.random(), y: Math.random(), z: rand(0.3, 1.2), s: rand(1.5, 4), ph: rand(0, 6) });
  }
  function getVignette() {
    if (vignette && vignette.width === Math.ceil(VW)) return vignette;
    vignette = M.canvas(Math.ceil(VW), Math.ceil(VH));
    const x = vignette.getContext("2d"), g = x.createRadialGradient(VW / 2, VH * 0.45, VH * 0.35, VW / 2, VH * 0.5, VW * 0.75);
    g.addColorStop(0, "rgba(60,30,60,0)"); g.addColorStop(1, "rgba(60,30,70,0.38)");
    x.fillStyle = g; x.fillRect(0, 0, VW, VH);
    return vignette;
  }

  function zoneBlend() {
    // devuelve [zonaA, zonaB, mezcla] según la posición de la cámara
    const cx = G.cam.x + VW / 2;
    let a = M.zoneAt(cx), b = a, k = 0;
    const next = M.ZONES[a + 1];
    if (next && cx > next.x0 - 900) { b = a + 1; k = clamp((cx - (next.x0 - 900)) / 900, 0, 1); }
    return [a, b, k];
  }

  function drawBackdrop(zi, alpha) {
    const z = M.ZONES[zi], im = M.IMG.bgBlur[z.bg]; if (!im) return;
    const S = Math.max(VW, VH) * 1.3;
    const zEnd = (M.ZONES[zi + 1] ? M.ZONES[zi + 1].x0 : M.LEVEL_END);
    const prog = clamp((G.cam.x - z.x0 + VW / 2) / (zEnd - z.x0), 0, 1);
    const ox = -(S - VW) * prog, oy = clamp(-(S - VH) * 0.55 - G.cam.y * 0.06, -(S - VH), 0);
    c.globalAlpha = alpha; c.drawImage(im, ox, oy, S, S);
    c.fillStyle = z.tint; c.fillRect(0, 0, VW, VH);
    c.globalAlpha = 1;
  }

  function drawHills(par, baseY, amp, col, seed) {
    const ox = G.cam.x * par, oy = G.cam.y * par * 0.5;
    c.fillStyle = col; c.beginPath(); c.moveTo(0, VH);
    for (let x = 0; x <= VW + 20; x += 20) {
      const wx = (x + ox) * 0.004 + seed;
      c.lineTo(x, baseY - oy - (Math.sin(wx) * 0.6 + Math.sin(wx * 2.3 + 1) * 0.3 + Math.sin(wx * 0.5) * 0.5) * amp);
    }
    c.lineTo(VW, VH); c.closePath(); c.fill();
  }

  function drawPropImg(p, par, parY, set) {
    const im = set[p.key]; if (!im) return;
    const man = window.MANIFEST.props[p.key];
    const h = p.h, w = h * man[0] / man[1];
    const pad = set === M.IMG.fog ? 8 * (h / 260) : set === M.IMG.blur ? 20 * (h / 420) : 0;
    const sx = p.x - G.cam.x * par, sy = p.y - G.cam.y * parY;
    if (sx + w < -60 || sx - w > VW + 60) return;
    c.save(); c.translate(sx, sy); if (p.flip) c.scale(-1, 1);
    c.drawImage(im, -w / 2 - pad, -h - pad, w + pad * 2, h + pad * 2);
    c.restore();
  }

  function drawFriend(f) {
    const info = M.FRIENDS[f.id], im = M.IMG.chars[f.id]; if (!im) return;
    const h = info.h, w = h * im.width / im.height, t = f.t;
    const hopY = f.hop > 0 ? -Math.sin((f.hop / 0.6) * Math.PI) * 40 : 0;
    const br = Math.sin(t * 2.2) * 0.022;
    // sombra
    c.fillStyle = "rgba(70,40,70,0.18)"; c.beginPath(); c.ellipse(f.x, f.y + 2, w * 0.38, 10, 0, 0, 7); c.fill();
    if (!f.met) { // halo de "perdido"
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35 + Math.sin(t * 3) * 0.12;
      c.drawImage(glowSprites.white, f.x - w * 0.8, f.y - h * 1.05, w * 1.6, h * 1.3); c.restore();
    }
    c.save(); c.translate(f.x, f.y + hopY);
    c.scale(1 - br * 0.6, 1 + br);
    c.rotate(Math.sin(t * 1.3) * 0.02);
    c.drawImage(im, -w / 2, -h, w, h);
    c.restore();
    // burbuja
    const by = f.y - h - 38 + Math.sin(t * 3) * 5 + hopY;
    if (!f.met || G.near === f) {
      c.save(); c.translate(f.x, by);
      const near = G.near === f;
      c.shadowColor = "rgba(90,40,80,0.25)"; c.shadowBlur = 10; c.shadowOffsetY = 4;
      c.fillStyle = near ? "#fff" : "rgba(255,255,255,0.92)";
      M.rr(c, near ? -62 : -22, -22, near ? 124 : 44, 42, 21); c.fill();
      c.beginPath(); c.moveTo(-8, 18); c.lineTo(0, 30); c.lineTo(8, 18); c.fill();
      c.shadowColor = "transparent";
      c.fillStyle = "#6b4658"; c.textAlign = "center"; c.textBaseline = "middle";
      if (near) { c.font = "700 18px Fredoka, system-ui"; c.fillText(IS_TOUCH ? "¡Toca Hola!" : (f.met ? "E · Charlar" : "E · Saludar"), 0, 0); }
      else { c.font = "700 24px Fredoka, system-ui"; c.fillStyle = "#ff7aa0"; c.fillText("?", 0, 1); }
      c.restore();
    }
  }

  function drawGrumo(g) {
    const im = M.IMG.chars.grumo; if (!im) return;
    const h = 80, w = h * im.width / im.height;
    if (!g.alive) {
      if (g.dead > 0.35) return;
      const k = g.dead / 0.35;
      c.save(); c.translate(g.x, g.y); c.globalAlpha = 1 - k; c.scale(1 + k * 0.8, 1 - k * 0.85);
      c.drawImage(im, -w / 2, -h, w, h); c.restore(); return;
    }
    const hop = Math.abs(Math.sin(g.t * 5)) * 7;
    const sq = 1 + Math.cos(g.t * 10) * 0.05;
    c.fillStyle = "rgba(70,40,70,0.2)"; c.beginPath(); c.ellipse(g.x, g.y + 2, w * 0.4, 7, 0, 0, 7); c.fill();
    c.save(); c.translate(g.x, g.y - hop); c.scale(g.dir * (2 - sq), sq);
    c.drawImage(im, -w / 2, -h, w, h); c.restore();
    // nubecita de enfado
    if (Math.sin(g.t * 2) > 0.6) { c.fillStyle = "rgba(120,90,110,0.45)"; c.beginPath(); c.arc(g.x + 14, g.y - h - 10 - hop, 6, 0, 7); c.arc(g.x + 22, g.y - h - 16 - hop, 4, 0, 7); c.fill(); }
  }

  function groundBelow(x, y) {
    let best = 5000;
    const L = G.L;
    for (const s of L.solids) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y;
    for (const s of L.plats.concat(L.movers)) if (x > s.x && x < s.x + s.w && s.y >= y - 2 && s.y < best) best = s.y;
    return best;
  }

  function drawPlayer(P) {
    if (P.inv > 0 && Math.floor(P.inv * 14) % 2 === 0) return;
    const gy = groundBelow(P.x, P.y), dist = gy - P.y;
    if (dist < 600) {
      const k = clamp(1 - dist / 500, 0.2, 1);
      c.fillStyle = `rgba(70,40,70,${0.22 * k})`; c.beginPath(); c.ellipse(P.x, gy + 2, 26 * k, 7 * k, 0, 0, 7); c.fill();
    }
    c.save();
    c.translate(P.x, P.y);
    c.rotate(P.rot * 0.0 + (P.on ? 0 : clamp(P.vx / 2000, -0.12, 0.12)));
    c.translate(0, -28); c.rotate(P.rot); c.translate(0, 28);
    c.scale(P.sx, P.sy);
    const walk = P.on && Math.abs(P.vx) > 30 ? P.walk : 0;
    const lean = P.on ? P.vx / MAXV * 0.08 : 0;
    // piececitos
    const f1 = Math.sin(walk) * 7, f2 = Math.sin(walk + Math.PI) * 7;
    c.fillStyle = "#efe2da";
    c.beginPath(); c.ellipse(-11 + f1, -3 - Math.max(0, Math.cos(walk)) * 4, 9, 6, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(11 + f2, -3 - Math.max(0, Math.cos(walk + Math.PI)) * 4, 9, 6, 0, 0, 7); c.fill();
    c.save(); c.transform(1, 0, -lean, 1, 0, 0);
    const bob = P.on ? Math.abs(Math.sin(walk)) * -3 + Math.sin(G.t * 2.5) * (P.idle > 0 ? 1.2 : 0) : 0;
    c.translate(0, bob);
    // bracitos
    const arm = P.on ? Math.sin(walk) * 0.6 : -0.9;
    [[-1, arm], [1, -arm]].forEach(([s, a]) => {
      c.save(); c.translate(s * 24, -30); c.rotate(s * (0.4 + a * 0.4) + (P.on ? 0 : s * -0.6));
      c.fillStyle = "#f6ece6"; c.beginPath(); c.ellipse(s * 5, 6, 6, 10, 0, 0, 7); c.fill(); c.restore();
    });
    // cuerpo de malvavisco
    const body = c.createLinearGradient(0, -62, 0, 0);
    body.addColorStop(0, "#ffffff"); body.addColorStop(0.65, "#fbf5f1"); body.addColorStop(1, "#ecdcd3");
    c.save(); c.shadowColor = "rgba(90,50,80,0.25)"; c.shadowBlur = 8; c.shadowOffsetY = 3;
    c.fillStyle = body; M.rr(c, -26, -62, 52, 58, 19); c.fill(); c.restore();
    // tapa superior (volumen)
    c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.ellipse(0, -57, 22, 6, 0, 0, 7); c.fill();
    const side = c.createLinearGradient(-26, 0, 26, 0);
    side.addColorStop(0, "rgba(255,255,255,0)"); side.addColorStop(0.75, "rgba(255,255,255,0)"); side.addColorStop(1, "rgba(200,170,170,0.28)");
    c.fillStyle = side; M.rr(c, -26, -62, 52, 58, 19); c.fill();
    c.fillStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.ellipse(-13, -48, 5, 8, -0.3, 0, 7); c.fill();
    // cara
    const ex = P.face * 5;
    const blink = P.blink < 0 ? 0.12 : 1;
    const air = !P.on;
    c.fillStyle = "#3d2735";
    [-9, 9].forEach((d) => { c.beginPath(); c.ellipse(ex + d, -34, 3.6, 5.2 * blink, 0, 0, 7); c.fill(); });
    if (blink > 0.5) { c.fillStyle = "#fff"; [-9, 9].forEach((d) => { c.beginPath(); c.arc(ex + d + 1.2, -36, 1.4, 0, 7); c.fill(); }); }
    c.fillStyle = "rgba(255,140,170,0.55)";
    c.beginPath(); c.ellipse(ex - 16, -26, 5.5, 3.5, 0, 0, 7); c.ellipse(ex + 16, -26, 5.5, 3.5, 0, 0, 7); c.fill();
    c.strokeStyle = "#3d2735"; c.lineWidth = 2; c.lineCap = "round";
    if (air) { c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(ex, -24, 3, 4, 0, 0, 7); c.fill(); }
    else { c.beginPath(); c.arc(ex - 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.arc(ex + 2.5, -27, 2.6, 0.2, Math.PI - 0.2); c.stroke(); }
    // lacito rojo
    c.save(); c.translate(-13, -61); c.rotate(-0.25 + Math.sin(G.t * 3) * 0.05);
    c.fillStyle = "#ff5c7a";
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-16, -13, -15, 2); c.quadraticCurveTo(-12, 9, 0, 0); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(16, -13, 15, 2); c.quadraticCurveTo(12, 9, 0, 0); c.fill();
    c.fillStyle = "#e0405f"; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(-9, -3, 3, 1.6, -0.5, 0, 7); c.fill();
    c.restore();
    c.restore();
    c.restore();
  }

  function heartPath(x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.25);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.55, x, y + s * 0.75, x, y + s);
    c.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.55, x + s * 0.5, y + s * 0.25);
    c.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3); c.fill();
  }
  function starPath(x, y, r, rot, pts = 5) {
    c.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts, rad = i % 2 ? r * 0.5 : r;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
  }
  function drawParticles() {
    for (const p of G.parts) {
      const k = clamp(p.life / (p.max || 1), 0, 1);
      c.globalAlpha = Math.min(1, p.life * 3);
      c.fillStyle = p.color;
      if (p.type === "puff") { const r = p.size * (1.6 - p.life); c.beginPath(); c.arc(p.x, p.y, Math.max(1, r), 0, 7); c.fill(); }
      else if (p.type === "star") { starPath(p.x, p.y, p.size, p.rot); c.fill(); }
      else if (p.type === "heart") heartPath(p.x, p.y - p.size / 2, p.size * 1.4);
      else if (p.type === "confetti") { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore(); }
      else if (p.type === "ring") { c.strokeStyle = p.color; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.size + (0.6 - p.life) * 120, 0, 7); c.stroke(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.size, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
    c.textAlign = "center"; c.textBaseline = "middle";
    for (const t of G.texts) {
      c.globalAlpha = Math.min(1, t.life * 2);
      c.font = "700 24px Fredoka, system-ui";
      c.lineWidth = 6; c.strokeStyle = "rgba(255,255,255,0.95)"; c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color; c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  function drawSpark(s, t) {
    const bob = Math.sin(s.t * 3) * 5, r = 13 + Math.sin(s.t * 5) * 1;
    c.drawImage(glowSprites.warm, s.x - 34, s.y + bob - 34, 68, 68);
    c.save(); c.translate(s.x, s.y + bob); c.rotate(Math.sin(s.t * 2) * 0.3);
    c.fillStyle = "#ffd65c"; starPath(0, 0, r, -Math.PI / 2); c.fill();
    c.fillStyle = "#fff3b8"; starPath(-1, -2, r * 0.55, -Math.PI / 2); c.fill();
    c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.arc(-4, -5, 2.5, 0, 7); c.fill();
    c.restore();
  }

  function render() {
    const cam = G.cam, t = G.t;
    c.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const sh = cam.shake ? { x: rand(-cam.shake, cam.shake), y: rand(-cam.shake, cam.shake) } : { x: 0, y: 0 };
    const [za, zb, zk] = zoneBlend();
    const night = (M.ZONES[za].night ? 1 - zk : 0) + (M.ZONES[zb].night ? zk : 0);

    // 1 · fondo
    drawBackdrop(za, 1);
    if (zk > 0) drawBackdrop(zb, zk);
    // 2 · rayos de luz
    if (night < 0.9) {
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const x = ((i * 380 - cam.x * 0.08) % (VW + 600) + VW + 600) % (VW + 600) - 300;
        const a = (0.05 + Math.sin(t * 0.4 + i * 2) * 0.025) * (1 - night);
        const g = c.createLinearGradient(x, 0, x + 240, VH); g.addColorStop(0, `rgba(255,245,220,${a})`); g.addColorStop(1, "rgba(255,245,220,0)");
        c.fillStyle = g; c.beginPath(); c.moveTo(x, -10); c.lineTo(x + 120, -10); c.lineTo(x + 420, VH); c.lineTo(x + 200, VH); c.fill();
      }
      c.restore();
    }
    // 3 · colinas y decorados lejanos
    const fz = M.ZONES[za].fog, fz2 = M.ZONES[zb].fog;
    const fog = [0, 1, 2].map((i) => Math.round(lerp(fz[i], fz2[i], zk)));
    drawHills(0.2, VH * 0.78, 60, `rgba(${fog},0.55)`, 0);
    c.save(); c.translate(sh.x * 0.3, sh.y * 0.3);
    for (const p of G.L.props) if (p.layer === "far") drawPropImg(p, 0.45, 0.3, M.IMG.fog);
    c.restore();
    drawHills(0.35, VH * 0.95, 45, `rgba(${fog},0.5)`, 3);

    // polen lejano
    for (const a of ambient) {
      if (a.z > 0.8) continue;
      const x = ((a.x * (VW + 100) - cam.x * a.z * 0.5 + Math.sin(t * 0.5 + a.ph) * 20) % (VW + 100) + VW + 100) % (VW + 100) - 50;
      const y = ((a.y * VH - cam.y * a.z * 0.3 - t * 8 * a.z) % VH + VH) % VH;
      c.fillStyle = night > 0.5 ? "rgba(255,240,170,0.6)" : "rgba(255,255,255,0.55)";
      c.beginPath(); c.arc(x, y, a.s * a.z, 0, 7); c.fill();
    }

    // 4 · mundo
    c.save();
    c.translate(-Math.round(cam.x) + sh.x, -Math.round(cam.y) + sh.y);
    const L = G.L, x1 = cam.x - 400, x2 = cam.x + VW + 400;
    for (const p of L.props) if (p.layer === "mid" && p.x > x1 && p.x < x2) {
      const im = M.IMG.props[p.key]; if (!im) continue;
      const w = p.h * im.width / im.height;
      c.save(); c.translate(p.x, p.y); if (p.flip) c.scale(-1, 1); c.drawImage(im, -w / 2, -p.h, w, p.h); c.restore();
    }
    if (L.goal && L.goal.x > x1 - 400 && L.goal.x < x2 + 400) M.drawCake(c, L.goal, t);
    for (const s of L.solids) if (s.x < x2 && s.x + s.w > x1) M.drawGround(c, s, cam.x, cam.y, VW, VH);
    for (const s of L.plats) if (s.x < x2 && s.x + s.w > x1) { const sp = M.platSprite(s.w, s.h, M.zoneAt(s.x)); c.drawImage(sp, s.x - 30, s.y - 30); }
    for (const s of L.movers) if (s.x < x2 && s.x + s.w > x1) { const sp = M.platSprite(s.w, s.h, M.zoneAt(s.x0)); c.drawImage(sp, s.x - 30, s.y - 30); }
    for (const s of L.signs) if (s.x > x1 && s.x < x2) M.drawSign(c, s);
    for (const k of L.checks) if (k.x > x1 && k.x < x2) M.drawCheck(c, k, t);
    for (const s of L.shrooms) if (s.x > x1 && s.x < x2) M.drawShroom(c, s, t);
    for (const f of L.friends) if (f.x > x1 && f.x < x2) drawFriend(f);
    if (G.state === "finale") G.party.forEach((f) => {
      if (G.finaleT < f.delay) return;
      drawFriend({ id: f.id, x: f.x, y: f.y + f.drop, met: true, t: f.t, hop: 0 });
    });
    for (const g of L.grumos) if (g.x > x1 && g.x < x2) drawGrumo(g);
    for (const s of L.sparks) if (!s.got && s.x > x1 && s.x < x2) drawSpark(s, t);
    if (G.state !== "title") drawPlayer(G.P);
    drawParticles();
    c.restore();

    // 5 · primer plano
    c.save(); c.globalAlpha = 0.8;
    for (const p of G.L.props) if (p.layer === "front") drawPropImg(p, 1.25, 1.1, M.IMG.blur);
    c.restore();

    // 6 · noche + luces
    if (night > 0.01) {
      c.fillStyle = `rgba(40,25,80,${0.34 * night})`; c.fillRect(0, 0, VW, VH);
      c.save(); c.globalCompositeOperation = "lighter";
      const ox = -cam.x, oy = -cam.y;
      c.globalAlpha = night * 0.55;
      for (const s of L.sparks) if (!s.got && s.x > x1 && s.x < x2) c.drawImage(glowSprites.warm, s.x + ox - 45, s.y + oy - 45, 90, 90);
      for (const k of L.checks) if (k.on && k.x > x1 && k.x < x2) c.drawImage(glowSprites.warm, k.x + ox - 110, k.y + oy - 215, 220, 220);
      c.globalAlpha = night * 0.28;
      for (const f of L.friends) if (!f.met && f.x > x1 && f.x < x2) c.drawImage(glowSprites.mint, f.x + ox - 110, f.y + oy - 190, 220, 220);
      if (G.P && G.state !== "title") c.drawImage(glowSprites.white, G.P.x + ox - 70, G.P.y + oy - 100, 140, 140);
      if (L.goal) c.drawImage(glowSprites.warm, L.goal.x + ox - 300, L.goal.y + oy - 560, 600, 600);
      // luciérnagas
      for (const a of ambient) {
        const x = ((a.x * (VW + 100) - cam.x * a.z * 0.7 + Math.sin(t * 0.7 + a.ph) * 40) % (VW + 100) + VW + 100) % (VW + 100) - 50;
        const y = ((a.y * VH - cam.y * a.z * 0.4 + Math.cos(t * 0.5 + a.ph) * 30) % VH + VH) % VH;
        const tw = 0.5 + Math.sin(t * 3 + a.ph * 3) * 0.5;
        c.globalAlpha = night * tw; c.drawImage(a.ph > 3 ? glowSprites.mint : glowSprites.warm, x - 14, y - 14, 28, 28);
      }
      c.restore();
    }
    // polen cercano
    for (const a of ambient) {
      if (a.z <= 0.8) continue;
      const x = ((a.x * (VW + 100) - cam.x * a.z + Math.sin(t * 0.6 + a.ph) * 30) % (VW + 100) + VW + 100) % (VW + 100) - 50;
      const y = ((a.y * VH - cam.y * a.z * 0.5 - t * 12) % VH + VH) % VH;
      c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(x, y, a.s * 1.2, 0, 7); c.fill();
    }
    c.drawImage(getVignette(), 0, 0, VW, VH);
  }

  // ——— HUD / interfaz ———
  const IS_TOUCH = matchMedia("(pointer: coarse)").matches;
  if (IS_TOUCH) document.body.classList.add("touch");
  function updateHUD() {
    if (!G.P) return;
    $("hud-sparks").textContent = G.sparks;
    $("hud-friends").textContent = G.met.size + "/16";
    const h = $("hud-hearts"); h.innerHTML = "";
    for (let i = 0; i < 3; i++) { const d = document.createElement("i"); d.className = i < G.P.hearts ? "on" : ""; d.textContent = "♥"; h.appendChild(d); }
  }
  function hideHUDPrompts() { $("btn-hola").classList.remove("show"); }
  let bannerT = null;
  function showBanner(z) {
    const b = $("banner");
    b.querySelector("small").textContent = "Zona " + (z + 1);
    b.querySelector("b").textContent = M.ZONES[z].name;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 3200);
  }
  function show(id, on) { $(id).classList.toggle("open", on); }
  function setBlur(on) { cv.classList.toggle("blur", on); }

  // carta de encuentro
  let encounterFrom = null;
  function openEncounter(id, fresh) {
    const f = M.FRIENDS[id];
    encounterFrom = G.state; G.state = "encounter";
    const v = $("enc-video");
    v.poster = "assets/chars/" + id + ".webp";
    v.src = window.MANIFEST.vid[id]; v.currentTime = 0;
    const pr = v.play(); if (pr) pr.catch(() => {});
    $("enc-name").textContent = f.name;
    $("enc-kind").textContent = f.kind;
    $("enc-desc").textContent = f.desc;
    $("enc-num").textContent = "#" + String(M.FRIEND_ORDER.indexOf(id) + 1).padStart(2, "0");
    const labels = ["Esponjosidad", "Dulzura", "Risas"];
    $("enc-stats").innerHTML = labels.map((l, i) => `<div><span>${l}</span><em>${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= f.stats[i] ? "on" : ""}"></i>`).join("")}</em></div>`).join("");
    $("enc-btn").textContent = fresh ? "¡Amigos para siempre! 💖" : "Cerrar";
    $("encounter").dataset.id = id; $("encounter").dataset.fresh = fresh ? "1" : "";
    $("enc-new").style.display = fresh ? "" : "none";
    show("encounter", true); setBlur(true); $("banner").classList.remove("show");
    A.duck(true);
    if (fresh) { A.play("friend"); confettiDOM($("encounter")); }
    else A.play("pop");
  }
  function closeEncounter() {
    const e = $("encounter"), id = e.dataset.id, fresh = e.dataset.fresh;
    show("encounter", false);
    $("enc-video").pause();
    A.duck(false);
    if (fresh) {
      const f = G.L.friends.find((x) => x.id === id);
      f.met = true; f.hop = 0.6; G.met.add(id);
      if (!save.met.includes(id)) { save.met.push(id); persist(); }
      burst(f.x, f.y - M.FRIENDS[id].h * 0.6, 30, ["#ff8fab", "#ffd98e", "#ffffff", "#b9a3ff"], "heart", 420);
      floatText(f.x, f.y - M.FRIENDS[id].h - 40, "¡Nuevo amigo! " + G.met.size + "/16", "#ff6f91");
      A.play("check");
      updateHUD();
      $("hud-friends").parentElement.classList.remove("pulse"); void $("hud-friends").offsetWidth; $("hud-friends").parentElement.classList.add("pulse");
    }
    G.state = encounterFrom === "album" ? "album" : encounterFrom || "play";
    if (G.state === "album") { renderAlbum(); } else setBlur(G.state !== "play");
  }
  $("enc-btn").onclick = closeEncounter;

  function confettiDOM(el) {
    const host = el.querySelector("#confetti, #confetti-f");
    host.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const s = document.createElement("i");
      s.style.left = rand(10, 90) + "%"; s.style.background = PASTEL[i % 5];
      s.style.setProperty("--dx", rand(-300, 300) + "px"); s.style.setProperty("--dy", rand(-420, -160) + "px");
      s.style.setProperty("--r", rand(-720, 720) + "deg"); s.style.animationDelay = rand(0, 0.15) + "s";
      host.appendChild(s);
    }
  }

  // Mashmellopedia
  function renderAlbum() {
    const grid = $("album-grid"); grid.innerHTML = "";
    const known = new Set([...save.met, ...G.met]);
    M.FRIEND_ORDER.forEach((id, i) => {
      const f = M.FRIENDS[id], got = known.has(id);
      const zoneIdx = Math.floor(i / 4);
      const card = document.createElement("button");
      card.className = "acard" + (got ? " got" : "");
      card.innerHTML = `<span class="num">#${String(i + 1).padStart(2, "0")}</span><img src="assets/chars/${id}.webp" alt=""><b>${got ? f.name : "???"}</b><small>${got ? f.kind : M.ZONES[zoneIdx].name}</small>`;
      if (got) card.onclick = () => { A.play("pop"); openEncounter(id, false); };
      grid.appendChild(card);
    });
    $("album-count").textContent = known.size + " / 16 descubiertos";
  }
  let albumFrom = "title";
  function openAlbum() {
    if (G.state === "album" || G.state === "encounter") return;
    albumFrom = G.state; G.state = "album";
    renderAlbum(); show("album", true); setBlur(true); A.play("pop");
  }
  function closeAlbum() {
    show("album", false); G.state = albumFrom; setBlur(G.state !== "play" && G.state !== "title"); A.play("pop");
  }
  $("btn-album").onclick = openAlbum; $("t-album").onclick = () => { A.init(); openAlbum(); };
  $("album-close").onclick = closeAlbum;

  // pausa
  function togglePause() {
    if (G.state === "play") { G.state = "pause"; show("pause", true); setBlur(true); A.duck(true); }
    else if (G.state === "pause") { G.state = "play"; show("pause", false); setBlur(false); A.duck(false); }
  }
  $("btn-pause").onclick = togglePause; $("p-resume").onclick = togglePause;
  $("p-restart").onclick = () => { show("pause", false); setBlur(false); A.duck(false); resetRun(); G.state = "play"; };
  const muteBtn = $("btn-mute");
  const syncMute = () => muteBtn.classList.toggle("off", A.muted);
  muteBtn.onclick = () => { A.init(); A.toggleMute(); syncMute(); };
  syncMute();

  // título → intro → juego
  const INTRO = [
    "En lo más blandito del mundo vive Nube, un malvavisco muy pequeñito…",
    "…que esta noche celebra la Gran Tarta, la fiesta más dulce del año.",
    "¡Pero un viento de azúcar ha esparcido a sus 16 amigos por todo el valle!",
    "Encuéntralos, llévalos a la fiesta… y que no se enfríe la tarta. ¡Allá vamos!",
  ];
  let introI = 0, typeT = null;
  function typeLine() {
    const el = $("intro-text"), s = INTRO[introI]; el.textContent = ""; let i = 0;
    clearInterval(typeT);
    typeT = setInterval(() => { el.textContent = s.slice(0, ++i); if (i % 3 === 0) A.play("pop"); if (i >= s.length) clearInterval(typeT); }, 28);
    $("intro-dots").innerHTML = INTRO.map((_, k) => `<i class="${k === introI ? "on" : ""}"></i>`).join("");
  }
  function startIntro() {
    A.init(); A.startMusic(5);
    show("title", false);
    G.state = "intro"; introI = 0; show("intro", true);
    const v = $("intro-video"); v.src = window.MANIFEST.vid.intro; v.play().catch(() => {});
    A.play("whoosh"); typeLine();
  }
  function nextIntro() {
    const el = $("intro-text");
    if (el.textContent.length < INTRO[introI].length) { clearInterval(typeT); el.textContent = INTRO[introI]; return; }
    introI++;
    if (introI >= INTRO.length) return beginPlay();
    if (introI === 2) { const v = $("intro-video"); v.src = window.MANIFEST.vid.colina; v.play().catch(() => {}); }
    A.play("pop"); typeLine();
  }
  function beginPlay() {
    clearInterval(typeT);
    show("intro", false); $("intro-video").pause();
    resetRun(); G.state = "play"; setBlur(false);
    document.body.classList.add("playing");
    A.play("whoosh");
  }
  $("t-play").onclick = startIntro;
  $("intro").onclick = (e) => { if (e.target.id !== "intro-skip") nextIntro(); };
  $("intro-skip").onclick = beginPlay;
  $("btn-hola").onclick = () => { hit.E = true; };

  // final
  function showFinale() {
    const n = G.met.size, secs = Math.floor(G.time);
    const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
    $("fin-title").textContent = n === 16 ? "¡Todos a la fiesta!" : n >= 10 ? "¡Qué fiestón!" : "¡Feliz Gran Tarta!";
    $("fin-sub").textContent = n === 16 ? "Has reunido a los 16 Mashmellous. El valle entero te aplaude (con las manos pegajosas)."
      : `Has traído a ${n} de 16 amigos. ¡Los demás siguen perdidos por el valle!`;
    $("fin-time").textContent = mm + ":" + ss;
    $("fin-sparks").textContent = G.sparks + "/" + G.sparkTotal;
    $("fin-friends").textContent = n + "/16";
    $("fin-happy").textContent = G.happy;
    const stars = n === 16 ? 3 : n >= 10 ? 2 : 1;
    $("fin-stars").innerHTML = [1, 2, 3].map((k) => `<i class="${k <= stars ? "on" : ""}" style="animation-delay:${0.3 + k * 0.25}s"></i>`).join("");
    const v = $("fin-video"); v.src = window.MANIFEST.vid[n === 16 ? "abrazo" : "tarta"]; v.play().catch(() => {});
    $("fin-parade").innerHTML = M.FRIEND_ORDER.filter((id) => G.met.has(id)).map((id, i) => `<img src="assets/chars/${id}.webp" style="animation-delay:${i * 0.08}s">`).join("");
    if (save.best == null || secs < save.best) { save.best = secs; persist(); }
    show("finale", true); $("banner").classList.remove("show");
    confettiDOM($("finale"));
  }
  $("fin-again").onclick = () => { show("finale", false); G.finaleShown = false; resetRun(); G.state = "play"; A.startMusic(0); };
  $("fin-stay").onclick = () => { show("finale", false); };

  // ——— bucle ———
  let last = performance.now(), acc = 0;
  const STEP = 1 / 120;
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (consume("MUTE")) { A.toggleMute(); syncMute(); }
    if (consume("ALB")) { if (G.state === "album") closeAlbum(); else if (G.state === "play" || G.state === "title") openAlbum(); }
    if (consume("P")) {
      if (G.state === "encounter") closeEncounter();
      else if (G.state === "album") closeAlbum();
      else togglePause();
    }
    if (G.state === "encounter" && consume("E")) closeEncounter();
    if (G.state === "intro" && (consume("J") || consume("E"))) nextIntro();
    if (G.state === "title" && (consume("J") || consume("E"))) startIntro();

    if (G.state === "play" || G.state === "title" || G.state === "finale") {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP; G.t += STEP;
        if (G.state === "play") { G.time += STEP; stepPlayer(STEP); stepWorld(STEP); }
        else if (G.state === "finale") { stepFinale(STEP); stepWorld(STEP); }
        else { G.L.movers.forEach((m) => { const a = (G.t / m.period) * Math.PI * 2 + m.phase; m.x = m.x0 + Math.sin(a) * m.dx; m.y = m.y0 + Math.sin(a) * m.dy; }); G.L.friends.forEach((f) => (f.t += STEP)); G.L.sparks.forEach((s) => (s.t += STEP)); G.L.grumos.forEach((g) => (g.t += STEP)); }
        stepParticles(STEP);
      }
      stepCamera(dt, G.state === "title");
      $("btn-hola").classList.toggle("show", G.state === "play" && !!G.near);
    } else hit.J = false;
    if (G.L) render();
    if (!M._manual) requestAnimationFrame(frame);
  }
  // depuración: avanzar fotogramas a mano (M._tick(n)) cuando rAF está pausado
  M._tick = (n = 1, ms = 16.7) => { M._manual = true; for (let i = 0; i < n; i++) frame(last + ms); M._manual = false; };
  M._keys = keys; M._hit = hit;

  // ——— arranque ———
  resize();
  M.load((p) => { $("load-bar").style.width = Math.round(p * 100) + "%"; }).then(() => {
    initFx();
    resetRun();
    G.cam.x = -100;
    G.state = "title";
    show("loading", false); show("title", true);
    $("t-parade").innerHTML = M.FRIEND_ORDER.map((id, i) => `<img src="assets/chars/${id}.webp" style="--i:${i};--h:${11 + ((i * 7) % 5) * 1.6}vh">`).join("");
    requestAnimationFrame(frame);
  });
  document.addEventListener("pointerdown", () => A.init(), { once: true });
})();
