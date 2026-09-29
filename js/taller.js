// Baby: Taller de Mash. Un juguete de sensaciones: amasar, derretir, congelar, romper en mini mash, juntar, crear.
window.M = window.M || {};

M.Taller = (() => {
  const $ = M.$, A = M.Audio;
  let cv, c, S = 1, W = 1280, H = 720, running = false, last = 0, prof = null;
  let blob = null, minis = [], parts = [], bubbles = [], candies = [], tool = "amasar", t = 0, friends = [], talk = [];
  const COLORS = ["#ffffff", "#ffd1e0", "#c9f2e4", "#fff1b8", "#dcd0ff", "#cfe9ff", "#ffd9c2"];
  const SHAPES = ["cubo", "bola", "gota", "alto"], FACES = ["feliz", "ojazos", "dormilon", "sorpresa"], ACCS = ["nada", "brotes", "orejas", "cuernos", "antenas", "seta", "corona"];
  const GROUND = 600, N = 26;
  const cheer = { poke: ["¡Jiji!", "¡Blandito!", "¡Otra vez!"], melt: ["¡Se derrite!", "¡Qué calorcito!"], freeze: ["¡Brrr, frío!", "¡Hielo!"], shatter: ["¡Pum! ¡Cuántos!", "¡Mini mash!"], join: ["¡Todos juntos!", "¡Ya está!"], color: ["¡Qué bonito!", "¡Me encanta!"], feed: ["¡Ñam ñam!", "¡Crece!"], save: ["¡Guardado!", "¡Tu Mash!"] };

  function shapeOffsets(shape, r) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      let x, y;
      if (shape === "cubo") { const n = 5; x = r * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n); y = r * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n) * 0.95; }
      else if (shape === "gota") { const k = 0.6 + 0.4 * (1 + sa) / 2; x = r * ca * k; y = r * sa * 1.05 - (sa < 0 ? r * 0.15 * -sa : 0); }
      else if (shape === "alto") { x = r * ca * 0.72; y = r * sa * 1.3; }
      else { x = r * ca; y = r * sa; }
      out.push({ x, y });
    }
    return out;
  }
  function newBlob(d) {
    const design = Object.assign({ shape: "cubo", color: "#ffffff", face: "feliz", acc: "nada", size: 1 }, d || {});
    const cx = W / 2, cy = GROUND - 130;
    const rest = shapeOffsets(design.shape, 120);
    return { d: design, rest, restT: rest, pts: rest.map((o) => ({ x: cx + o.x, y: cy + o.y, vx: 0, vy: 0, g: 0 })), melt: 0, meltT: 0, frozen: 0, frozenT: 0, pop: 1, look: { x: cx, y: cy }, mood: 0, wob: 0 };
  }
  const centroid = (b) => { let x = 0, y = 0; b.pts.forEach((p) => { x += p.x; y += p.y; }); return { x: x / N, y: y / N }; };

  // ——— física del cuerpo blando (shape matching) ———
  let drag = null;
  function stepBlob(dt) {
    const b = blob; if (!b) return;
    b.melt += (b.meltT - b.melt) * Math.min(1, dt * (b.meltT > b.melt ? 0.7 : 3));
    b.frozen += (b.frozenT - b.frozen) * Math.min(1, dt * 4);
    b.pop = Math.min(1, b.pop + dt * 2.5);
    b.rest = b.rest.map((o, i) => ({ x: o.x + (b.restT[i].x - o.x) * Math.min(1, dt * 6), y: o.y + (b.restT[i].y - o.y) * Math.min(1, dt * 6) }));
    const C = centroid(b), size = b.d.size * (0.2 + 0.8 * easeBack(b.pop));
    const k = 55 + b.frozen * 500 - b.melt * 40, damp = 6 + b.frozen * 20;
    b.pts.forEach((p, i) => {
      const o = b.rest[i];
      // derretido: la forma se aplasta en charquito
      const tx = C.x + o.x * size * (1 + b.melt * 0.8), ty = C.y + o.y * size * (1 - b.melt * 0.82) + b.melt * 60;
      let ax = k * (tx - p.x) - damp * p.vx, ay = k * (ty - p.y) - damp * p.vy + 900 * (1 - b.frozen * 0.2);
      if (p.g > 0 && drag) { ax += (drag.x + p.ox - p.x) * 260 * p.g - p.vx * 8 * p.g; ay += (drag.y + p.oy - p.y) * 260 * p.g - p.vy * 8 * p.g; }
      p.vx += ax * dt; p.vy += ay * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > GROUND) { p.y = GROUND; p.vy *= -0.25; p.vx *= 0.85; }
      if (p.x < 40) { p.x = 40; p.vx *= -0.4; } if (p.x > W - 40) { p.x = W - 40; p.vx *= -0.4; }
      if (p.y < 40) { p.y = 40; p.vy *= -0.4; }
    });
    if (b.melt > 0.3 && Math.random() < dt * 8) { const p = b.pts[(Math.random() * N) | 0]; parts.push({ x: p.x, y: p.y, vx: 0, vy: 40, g: 700, life: 1, size: 5 + Math.random() * 5, col: b.d.color, drip: true }); }
    if (b.frozen > 0.5 && Math.random() < dt * 4) { const p = b.pts[(Math.random() * N) | 0]; parts.push({ x: p.x, y: p.y, vx: 0, vy: -20, g: 0, life: 0.8, size: 4, col: "#fff", star: true }); }
    b.mood = Math.max(0, b.mood - dt);
  }
  const easeBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  function stepMinis(dt) {
    const C = blob ? null : { x: W / 2, y: GROUND - 130 };
    minis.forEach((m) => {
      if (m.home) { m.x += (m.hx - m.x) * Math.min(1, dt * 6); m.y += (m.hy - m.y) * Math.min(1, dt * 6); m.r *= 0.995; return; }
      if (m.held) return;
      m.vy += 1200 * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.t += dt;
      if (m.y > GROUND - m.r) { m.y = GROUND - m.r; m.vy = -Math.abs(m.vy) * 0.55; m.vx *= 0.9; if (Math.abs(m.vy) < 60) m.vy = 0; if (Math.abs(m.vy) > 200) m.sq = 0.4; }
      if (m.x < m.r + 20) { m.x = m.r + 20; m.vx = Math.abs(m.vx) * 0.7; } if (m.x > W - m.r - 20) { m.x = W - m.r - 20; m.vx = -Math.abs(m.vx) * 0.7; }
      m.sq = Math.max(0, (m.sq || 0) - dt * 3);
      if (Math.random() < dt * 0.25 && m.vy === 0) { m.vy = -300 - Math.random() * 250; m.vx = (Math.random() - 0.5) * 200; }
    });
    // choque simple entre mini mash
    for (let i = 0; i < minis.length; i++) for (let j = i + 1; j < minis.length; j++) {
      const a = minis[i], b2 = minis[j]; if (a.home || b2.home) continue;
      const dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy), m = a.r + b2.r;
      if (d > 0 && d < m) { const k = (m - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b2.x += dx * k; b2.y += dy * k; }
    }
    if (joining && minis.length && minis.every((m) => m.home && Math.hypot(m.x - m.hx, m.y - m.hy) < 12)) {
      const d = blobDesign; minis = []; joining = false; blob = newBlob(d); blob.pop = 0; A.sfx("friend"); react("join");
      for (let i = 0; i < 30; i++) parts.push({ x: W / 2, y: GROUND - 130, vx: (Math.random() - 0.5) * 700, vy: -Math.random() * 600, g: 800, life: 1, size: 7, col: COLORS[i % COLORS.length], star: true });
    }
  }
  let joining = false, blobDesign = null;

  // ——— acciones ———
  function react(kind) {
    const lines = cheer[kind]; if (!lines) return;
    const f = friends[(Math.random() * friends.length) | 0]; if (!f) return;
    f.say = lines[(Math.random() * lines.length) | 0]; f.sayT = 2; f.hop = 0.5;
    M.speak && M.speak(f.say, "baby");
  }
  function poke(x, y) {
    const b = blob; if (!b) return;
    b.pts.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y); if (d < 150) { const k = (150 - d) / 150; p.vx += (p.x - x) / (d || 1) * -380 * k; p.vy += (p.y - y) / (d || 1) * -380 * k + 200 * k; } });
    b.mood = 0.6; A.sfx("boing"); react("poke");
  }
  function melt() { if (!blob) return; blob.meltT = blob.meltT > 0.5 ? 0 : 1; blob.frozenT = 0; A.sfx(blob.meltT ? "fire" : "boing"); if (blob.meltT) react("melt"); }
  function freeze() { if (!blob) return; blob.frozenT = blob.frozenT > 0.5 ? 0 : 1; blob.meltT = 0; A.sfx("sugar"); if (blob.frozenT) react("freeze"); }
  function shatter() {
    const b = blob; if (!b) return;
    if (b.frozen < 0.4) { if (b.frozenT < 1) { b.frozenT = 1; b.meltT = 0; A.sfx("sugar"); react("freeze"); } return; }  // primero se congela, luego se rompe
    blobDesign = b.d; const n = 14 + ((Math.random() * 6) | 0);
    for (let i = 0; i < n; i++) { const p = b.pts[(i * 7) % N]; const C = centroid(b);
      minis.push({ x: p.x, y: p.y, vx: (p.x - C.x) * 4 + (Math.random() - 0.5) * 300, vy: -350 - Math.random() * 500, r: 16 + Math.random() * 10, t: Math.random() * 6, col: b.d.color, face: i % 3, sq: 0 }); }
    for (let i = 0; i < 40; i++) parts.push({ x: centroid(b).x, y: centroid(b).y, vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 700, g: 900, life: 1, size: 3 + Math.random() * 5, col: "#e6f7ff", shard: true });
    blob = null; A.sfx("crumble"); A.sfx("pop"); react("shatter");
  }
  function join() {
    if (blob || !minis.length) return; joining = true;
    minis.forEach((m, i) => { m.home = true; const a = i / minis.length * Math.PI * 2; m.hx = W / 2 + Math.cos(a) * 20; m.hy = GROUND - 130 + Math.sin(a) * 20; });
    A.sfx("power");
  }
  function cycle(key, list) { if (!blob) return; const i = list.indexOf(blob.d[key]); blob.d[key] = list[(i + 1) % list.length];
    if (key === "shape") blob.restT = shapeOffsets(blob.d.shape, 120);
    blob.mood = 0.5; A.sfx("pop"); const C = centroid(blob);
    for (let k = 0; k < 16; k++) parts.push({ x: C.x, y: C.y - 60, vx: (Math.random() - 0.5) * 600, vy: -Math.random() * 500, g: 800, life: 0.9, size: 6, col: key === "color" ? blob.d.color : COLORS[k % COLORS.length], star: true });
    react("color");
  }
  function feed() { candies.push({ x: W / 2 + (Math.random() - 0.5) * 200, y: -40, vy: 0 }); A.sfx("whoosh"); }
  function blow() { for (let i = 0; i < 8; i++) bubbles.push({ x: W / 2 + (Math.random() - 0.5) * 300, y: GROUND - 40, r: 14 + Math.random() * 26, vy: -60 - Math.random() * 80, ph: Math.random() * 6 }); A.sfx("djump"); }
  function saveMash() {
    if (!blob || !prof) return;
    prof.creations = prof.creations || []; prof.creations.unshift(Object.assign({}, blob.d)); prof.creations = prof.creations.slice(0, 8);
    M.Save.persist(); renderGallery(); A.sfx("check"); react("save");
  }

  // ——— dibujo ———
  function blobPath(pts) {
    c.beginPath();
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let m0 = mid(pts[N - 1], pts[0]); c.moveTo(m0.x, m0.y);
    for (let i = 0; i < N; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % N]); c.quadraticCurveTo(p.x, p.y, m.x, m.y); }
    c.closePath();
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
  function drawBlob() {
    const b = blob; if (!b) return;
    const C = centroid(b); let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, top = b.pts[0];
    b.pts.forEach((p) => { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); if (p.y < top.y) top = p; });
    const w = maxX - minX, h = maxY - minY;
    // sombra
    c.fillStyle = "rgba(70,40,70,0.2)"; c.beginPath(); c.ellipse(C.x, GROUND + 4, w * 0.5, 14, 0, 0, 7); c.fill();
    const col = b.frozen > 0.5 ? "#cfeeff" : b.d.color;
    blobPath(b.pts);
    const g = c.createRadialGradient(C.x - w * 0.25, C.y - h * 0.3, 10, C.x, C.y, Math.max(w, h) * 0.75);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, shade(col, 0.1)); g.addColorStop(1, shade(col, -0.18));
    c.save(); c.shadowColor = "rgba(90,40,80,0.25)"; c.shadowBlur = 18; c.shadowOffsetY = 8; c.fillStyle = g; c.fill(); c.restore();
    if (b.frozen > 0.05) { // hielo: capa brillante y grietas
      c.save(); blobPath(b.pts); c.clip(); c.globalAlpha = b.frozen;
      const ig = c.createLinearGradient(minX, minY, maxX, maxY); ig.addColorStop(0, "rgba(255,255,255,0.8)"); ig.addColorStop(0.5, "rgba(170,225,255,0.45)"); ig.addColorStop(1, "rgba(120,190,240,0.6)");
      c.fillStyle = ig; c.fillRect(minX, minY, w, h);
      c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 3; c.beginPath(); c.moveTo(C.x - w * 0.3, minY + h * 0.2); c.lineTo(C.x - w * 0.1, C.y); c.lineTo(C.x - w * 0.25, maxY - h * 0.2); c.moveTo(C.x + w * 0.25, minY + h * 0.15); c.lineTo(C.x + w * 0.1, C.y + h * 0.1); c.stroke();
      c.restore();
    }
    // brillo
    c.fillStyle = "rgba(255,255,255,0.75)"; c.beginPath(); c.ellipse(C.x - w * 0.26, C.y - h * 0.28, w * 0.09, h * 0.12, -0.5, 0, 7); c.fill();
    // cara (mira hacia el dedo)
    const lx = Math.max(-1, Math.min(1, (b.look.x - C.x) / 300)), ly = Math.max(-1, Math.min(1, (b.look.y - C.y) / 300));
    const fy = C.y - h * 0.08 * (1 - b.melt), ex = w * 0.17 * (1 - b.melt * 0.3), es = Math.min(w, h) / 240 + 0.3;
    c.save(); c.translate(C.x + lx * 8, fy + ly * 6); c.scale(es, es);
    const shiver = b.frozen > 0.5 ? Math.sin(t * 60) * 1.2 : 0; c.translate(shiver, 0);
    const blink = (Math.sin(t * 0.9) > 0.985) ? 0.1 : 1, happy = b.mood > 0;
    c.fillStyle = "#2a1b22";
    const face = b.melt > 0.6 ? "derretido" : b.d.face;
    if (face === "ojazos") { [-1, 1].forEach((s) => { c.fillStyle = "#fff"; c.beginPath(); c.ellipse(s * ex, -6, 17, 20 * blink, 0, 0, 7); c.fill(); c.fillStyle = "#2a1b22"; c.beginPath(); c.ellipse(s * ex + lx * 5, -4 + ly * 4, 9, 11 * blink, 0, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(s * ex + 3, -10, 3.5, 0, 7); c.fill(); }); }
    else if (face === "dormilon" || face === "derretido") { c.strokeStyle = "#2a1b22"; c.lineWidth = 4; c.lineCap = "round"; [-1, 1].forEach((s) => { c.beginPath(); c.arc(s * ex, -6, 9, 0.2, Math.PI - 0.2); c.stroke(); }); }
    else { [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(s * ex, -6, 7, 10 * blink, 0, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(s * ex + 2, -10, 2.5, 0, 7); c.fill(); c.fillStyle = "#2a1b22"; }); }
    c.fillStyle = "rgba(255,140,170,0.5)"; [-1, 1].forEach((s) => { c.beginPath(); c.ellipse(s * (ex + 16), 10, 11, 6, 0, 0, 7); c.fill(); });
    c.fillStyle = "#6b3448"; c.strokeStyle = "#2a1b22"; c.lineWidth = 3.5; c.lineCap = "round";
    if (face === "sorpresa" || (happy && drag)) { c.beginPath(); c.ellipse(0, 16, 8, 10, 0, 0, 7); c.fill(); }
    else if (b.frozen > 0.5) { c.beginPath(); for (let i = -12; i <= 12; i += 6) c.lineTo(i, 16 + (i / 6 % 2 ? 3 : -3)); c.stroke(); }
    else if (happy) { c.beginPath(); c.arc(0, 8, 14, 0.15, Math.PI - 0.15); c.fill(); }
    else { c.beginPath(); c.arc(0, 8, 10, 0.3, Math.PI - 0.3); c.stroke(); }
    c.restore();
    drawAcc(b.d.acc, top.x, top.y + 6, Math.min(w, h) / 220 + 0.35, b.d.color);
  }
  function drawAcc(acc, x, y, s, col) {
    if (acc === "nada") return;
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.sin(t * 2.5) * 0.06);
    const blobC = (bx, by, rx, ry, cl) => { const g = c.createRadialGradient(bx - rx * 0.3, by - ry * 0.4, 1, bx, by, Math.max(rx, ry)); g.addColorStop(0, "#fff"); g.addColorStop(0.35, cl); g.addColorStop(1, shade(cl, -0.2)); c.fillStyle = g; c.beginPath(); c.ellipse(bx, by, rx, ry, 0, 0, 7); c.fill(); };
    if (acc === "brotes") { c.strokeStyle = "#7fc392"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke(); blobC(-14, -40, 16, 9, "#9fe0b0"); blobC(14, -44, 16, 9, "#9fe0b0"); }
    else if (acc === "orejas") { [-1, 1].forEach((sd) => { blobC(sd * 30, -46, 14, 40, "#ffd1e0"); blobC(sd * 30, -44, 7, 28, "#ffb3c7"); }); }
    else if (acc === "cuernos") { c.strokeStyle = "#d9a66b"; c.lineWidth = 9; c.lineCap = "round"; [-1, 1].forEach((sd) => { c.beginPath(); c.moveTo(sd * 22, 0); c.quadraticCurveTo(sd * 40, -40, sd * 30, -62); c.moveTo(sd * 33, -32); c.lineTo(sd * 52, -44); c.stroke(); }); }
    else if (acc === "antenas") { c.strokeStyle = "#8a6aa0"; c.lineWidth = 4; [-1, 1].forEach((sd) => { c.beginPath(); c.moveTo(sd * 12, 0); c.quadraticCurveTo(sd * 20, -30, sd * 30, -50); c.stroke(); blobC(sd * 30, -54, 10, 10, "#ff9fb6"); }); }
    else if (acc === "seta") { blobC(0, -8, 12, 16, "#fff6e6"); blobC(0, -30, 38, 22, "#ff8fab"); c.fillStyle = "#fff"; [[-14, -34], [8, -40], [20, -28]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, 5, 0, 7); c.fill(); }); }
    else if (acc === "corona") { c.fillStyle = "#ffd36b"; c.strokeStyle = "#e0a93c"; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 0); c.lineTo(-30, -36); c.lineTo(-14, -16); c.lineTo(0, -44); c.lineTo(14, -16); c.lineTo(30, -36); c.lineTo(34, 0); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  }
  function drawMiniBlob(m) {
    const sq = 1 + (m.sq || 0) * 0.5;
    c.save(); c.translate(m.x, m.y); c.scale(sq, 1 / sq);
    c.fillStyle = "rgba(70,40,70,0.15)"; c.beginPath(); c.ellipse(0, GROUND - m.y + 3, m.r * 0.8, 5, 0, 0, 7); c.fill();
    const g = c.createRadialGradient(-m.r * 0.3, -m.r * 0.4, 2, 0, 0, m.r * 1.2); g.addColorStop(0, "#fff"); g.addColorStop(0.5, shade(m.col, 0.05)); g.addColorStop(1, shade(m.col, -0.18));
    c.fillStyle = g; M.rr(c, -m.r, -m.r, m.r * 2, m.r * 2, m.r * 0.55); c.fill();
    c.fillStyle = "#2a1b22"; c.beginPath(); c.ellipse(-m.r * 0.3, -m.r * 0.15, m.r * 0.12, m.r * 0.16, 0, 0, 7); c.ellipse(m.r * 0.3, -m.r * 0.15, m.r * 0.12, m.r * 0.16, 0, 0, 7); c.fill();
    c.strokeStyle = "#2a1b22"; c.lineWidth = 2; c.beginPath(); c.arc(0, m.r * 0.15, m.r * 0.2, 0.2, Math.PI - 0.2); c.stroke();
    c.fillStyle = "rgba(255,140,170,0.5)"; c.beginPath(); c.ellipse(-m.r * 0.55, m.r * 0.15, m.r * 0.15, m.r * 0.09, 0, 0, 7); c.ellipse(m.r * 0.55, m.r * 0.15, m.r * 0.15, m.r * 0.09, 0, 0, 7); c.fill();
    c.restore();
  }
  function render() {
    c.setTransform(S, 0, 0, S, 0, 0);
    const bgI = M.IMG.bgBlur.pradera;
    if (bgI) { const s2 = Math.max(W / bgI.width, H / bgI.height) * 1.05; c.drawImage(bgI, (W - bgI.width * s2) / 2, (H - bgI.height * s2) / 2, bgI.width * s2, bgI.height * s2); }
    c.fillStyle = "rgba(255,244,236,0.28)"; c.fillRect(0, 0, W, H);
    // mesa de plastilina
    const tg = c.createLinearGradient(0, GROUND - 20, 0, H); tg.addColorStop(0, "#ffe3ec"); tg.addColorStop(0.08, "#f7c9d6"); tg.addColorStop(1, "#e3a9bd");
    c.fillStyle = tg; M.rr(c, -20, GROUND - 16, W + 40, H - GROUND + 40, 30); c.fill();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.fillRect(0, GROUND - 12, W, 5);
    for (let i = 0; i < 30; i++) { c.fillStyle = ["#fff", "#c9f2e4", "#fff1b8", "#dcd0ff"][i % 4]; c.beginPath(); c.arc((i * 137) % W, GROUND + 30 + (i * 53) % (H - GROUND - 40), 4 + i % 4, 0, 7); c.fill(); }
    // amigos que miran
    friends.forEach((f) => {
      const im = M.IMG.chars[f.id]; if (!im) return; const hh = 170, ww = hh * im.width / im.height; f.hop = Math.max(0, (f.hop || 0) - 1 / 60);
      const hop = f.hop > 0 ? -Math.sin(f.hop / 0.5 * Math.PI) * 40 : 0, br = Math.sin(t * 2 + f.x) * 0.02;
      c.save(); c.translate(f.x, GROUND + 6 + hop); c.scale((f.x < W / 2 ? -1 : 1) * -M.CAST[f.id].nat * (1 - br), 1 + br); c.drawImage(im, -ww / 2, -hh, ww, hh); c.restore();
      if (f.sayT > 0) { f.sayT -= 1 / 60; c.font = "700 26px Fredoka, system-ui"; const tw = c.measureText(f.say).width + 34; c.fillStyle = "#fff"; M.rr(c, f.x - tw / 2, GROUND - 270, tw, 50, 25); c.fill(); c.fillStyle = "#e0507e"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(f.say, f.x, GROUND - 245); }
    });
    // pompas
    bubbles.forEach((bb) => { c.save(); c.globalAlpha = 0.8; const g = c.createRadialGradient(bb.x - bb.r * 0.3, bb.y - bb.r * 0.3, 1, bb.x, bb.y, bb.r); g.addColorStop(0, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(200,170,255,0.35)"); c.fillStyle = g; c.beginPath(); c.arc(bb.x + Math.sin(t * 2 + bb.ph) * 10, bb.y, bb.r, 0, 7); c.fill(); c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = 2; c.stroke(); c.restore(); });
    candies.forEach((k) => { c.save(); c.translate(k.x, k.y); c.rotate(t * 3); c.fillStyle = "#ff9fb6"; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill(); c.fillStyle = "#fff"; c.fillRect(-18, -4, 36, 8); c.restore(); });
    minis.forEach(drawMiniBlob);
    drawBlob();
    parts.forEach((p) => { c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.col;
      if (p.star) { M.star(c, p.x, p.y, p.size, t * 4); c.fill(); } else if (p.shard) { c.save(); c.translate(p.x, p.y); c.rotate(p.x); c.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); c.restore(); }
      else { c.beginPath(); c.ellipse(p.x, p.y, p.size * 0.8, p.size * (p.drip ? 1.4 : 1), 0, 0, 7); c.fill(); } }); c.globalAlpha = 1;
    if (!blob && minis.length && !joining) { c.font = "700 28px Fredoka"; c.textAlign = "center"; c.fillStyle = "#fff"; c.strokeStyle = "rgba(200,90,140,0.6)"; c.lineWidth = 6; c.strokeText("Toca 🧲 para juntarlos", W / 2, 90); c.fillText("Toca 🧲 para juntarlos", W / 2, 90); }
  }
  function step(dt) {
    t += dt;
    for (let i = 0; i < 2; i++) { stepBlob(dt / 2); }
    stepMinis(dt);
    parts.forEach((p) => { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.drip && p.y > GROUND) { p.y = GROUND; p.vy = 0; p.vx = 0; } }); parts = parts.filter((p) => p.life > 0);
    bubbles.forEach((bb) => { bb.y += bb.vy * dt; }); bubbles = bubbles.filter((bb) => bb.y > -60);
    candies.forEach((k) => { k.vy += 900 * dt; k.y += k.vy * dt; if (blob) { const C = centroid(blob); if (Math.hypot(k.x - C.x, k.y - C.y) < 120) { k.eaten = true; blob.d.size = Math.min(1.45, blob.d.size + 0.08); blob.mood = 1; A.sfx("absorb", 6); react("feed");
      blob.pts.forEach((p) => { p.vy -= 200; }); } } if (k.y > GROUND) k.eaten = true; }); candies = candies.filter((k) => !k.eaten);
  }
  function loop(now) { if (!running) return; const dt = Math.min(0.033, (now - last) / 1000); last = now; step(dt); render(); requestAnimationFrame(loop); }

  // ——— entrada táctil / ratón ———
  function toWorld(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  let downAt = null, heldMini = null;
  function onDown(e) {
    e.preventDefault(); A.init(); const p = toWorld(e); downAt = { x: p.x, y: p.y, t: performance.now() };
    // pompas y mini mash se pueden tocar/arrastrar
    const bb = bubbles.find((b2) => Math.hypot(b2.x - p.x, b2.y - p.y) < b2.r + 10); if (bb) { bb.y = -999; A.sfx("absorb", (Math.random() * 8) | 0); for (let i = 0; i < 8; i++) parts.push({ x: bb.x, y: bb.y, vx: 0, vy: 0, life: 0 }); return; }
    const mm = minis.find((m) => Math.hypot(m.x - p.x, m.y - p.y) < m.r + 12); if (mm && !mm.home) { heldMini = mm; mm.held = true; mm.px = p.x; mm.py = p.y; A.sfx("absorb", (Math.random() * 8) | 0); mm.sq = 0.5; return; }
    if (!blob) return;
    const C = centroid(blob), inside = Math.hypot(C.x - p.x, C.y - p.y) < 190 * blob.d.size;
    if (!inside) return;
    if (tool === "derretir") return melt();
    if (tool === "congelar") return freeze();
    if (tool === "romper") return shatter();
    drag = { x: p.x, y: p.y };
    blob.pts.forEach((q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); q.g = Math.max(0, 1 - d / 150); q.ox = q.x - p.x; q.oy = q.y - p.y; });
    blob.mood = 1; A.sfx("squish");
  }
  function onMove(e) {
    const p = toWorld(e); if (blob) blob.look = p;
    if (heldMini) { heldMini.vx = (p.x - heldMini.px) * 30; heldMini.vy = (p.y - heldMini.py) * 30; heldMini.x = p.x; heldMini.y = p.y; heldMini.px = p.x; heldMini.py = p.y; return; }
    if (drag) { drag.x = p.x; drag.y = p.y; }
  }
  function onUp(e) {
    const p = toWorld(e);
    if (heldMini) { heldMini.held = false; heldMini = null; return; }
    if (drag) { const moved = downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 12 && performance.now() - downAt.t < 300;
      blob.pts.forEach((q) => { q.g = 0; }); drag = null; if (moved) poke(p.x, p.y); else A.sfx("boing"); }
  }

  // ——— interfaz ———
  const TOOLS = [
    { id: "amasar", icon: "👆", label: "Amasar" }, { id: "derretir", icon: "🔥", label: "Derretir" }, { id: "congelar", icon: "❄️", label: "Congelar" },
    { id: "romper", icon: "🔨", label: "Romper" }, { id: "juntar", icon: "🧲", label: "Juntar", act: join },
    { id: "forma", icon: "🔷", label: "Forma", act: () => cycle("shape", SHAPES) }, { id: "color", icon: "🎨", label: "Color", act: () => cycle("color", COLORS) },
    { id: "cara", icon: "😊", label: "Cara", act: () => cycle("face", FACES) }, { id: "adorno", icon: "🌱", label: "Adorno", act: () => cycle("acc", ACCS) },
    { id: "comer", icon: "🍬", label: "Comida", act: feed }, { id: "pompas", icon: "🫧", label: "Pompas", act: blow }, { id: "guardar", icon: "💾", label: "Guardar", act: saveMash },
  ];
  function renderTools() {
    const L = $("tl-left"), R = $("tl-right"); L.innerHTML = ""; R.innerHTML = "";
    TOOLS.forEach((T, i) => { const bar = i < 6 ? L : R; const b = document.createElement("button"); b.className = "tl-b" + (tool === T.id ? " on" : ""); b.innerHTML = `<span>${T.icon}</span><i>${T.label}</i>`;
      b.onclick = () => { A.init(); if (T.act) { T.act(); } else { tool = T.id; renderTools(); A.sfx("pop"); if (T.id === "romper" && blob && blob.frozen > 0.5) shatter(); } };
      bar.appendChild(b); });
  }
  function renderGallery() {
    const g = $("tl-gallery"); g.innerHTML = ""; (prof.creations || []).forEach((d) => { const b = document.createElement("button"); b.className = "tl-g"; b.style.background = d.color;
      b.innerHTML = `<b>${{ cubo: "⬜", bola: "⚪", gota: "💧", alto: "🥚" }[d.shape] || "⚪"}</b>`; b.onclick = () => { minis = []; joining = false; blob = newBlob(d); blob.pop = 0; A.sfx("friend"); }; g.appendChild(b); });
  }
  function resize() { if (!cv) return; const dpr = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; S = Math.min(cv.height / H, cv.width / 1000); W = cv.width / S; }
  function open(p) {
    prof = p; cv = $("tl-canvas"); c = cv.getContext("2d"); resize();
    blob = newBlob(p.creations && p.creations[0]); blob.pop = 0; minis = []; parts = []; bubbles = []; candies = []; tool = "amasar"; joining = false;
    const pool = p.rescued.length ? p.rescued : ["pompon", "gluglu"];
    friends = [{ id: pool[pool.length - 1], x: W * 0.27 }, { id: pool.length > 1 ? pool[0] : "gluglu", x: W * 0.73 }];
    renderTools(); renderGallery(); $("taller").classList.add("open"); document.body.classList.add("in-taller");
    A.init(); A.play("cajita", 0);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    setTimeout(() => { if (running) { friends[0].say = "¡Tócalo! ¡Es blandito!"; friends[0].sayT = 3; M.speak("¡Tócalo! ¡Es blandito!", "baby"); } }, 900);
  }
  function close() { running = false; $("taller").classList.remove("open"); document.body.classList.remove("in-taller"); }
  addEventListener("resize", resize);
  document.addEventListener("DOMContentLoaded", () => {});
  function bind() {
    const el = $("tl-canvas"); if (!el || el._b) return; el._b = true;
    el.addEventListener("pointerdown", onDown); addEventListener("pointermove", (e) => { if (running) onMove(e); }); addEventListener("pointerup", (e) => { if (running) onUp(e); });
  }
  return { open: (p) => { bind(); open(p); }, close, get running() { return running; },
    _step: (n = 1) => { for (let i = 0; i < n; i++) step(1 / 60); render(); }, get _state() { return { blob: !!blob, frozen: blob ? +blob.frozen.toFixed(2) : null, melt: blob ? +blob.melt.toFixed(2) : null, minis: minis.length }; } };
})();
