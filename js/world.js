// Carga de assets y dibujo del mundo: terreno con profundidad, flora por capas, objetos, grumos y mini mash.
window.M = window.M || {};
M.IMG = { chars: {}, props: {}, bg: {}, fog: {}, blur: {}, midblur: {}, bgBlur: {}, tiles: {}, glow: {} };

M.load = function (onProgress) {
  const man = window.MANIFEST, jobs = [];
  const add = (group, key, src) => jobs.push(new Promise((res) => { const im = new Image(); im.onload = () => { M.IMG[group][key] = im; res(); }; im.onerror = () => res(); im.src = src; }));
  Object.keys(man.chars).forEach((k) => add("chars", k, "assets/chars/" + k + ".webp"));
  Object.keys(man.props).forEach((k) => add("props", k, "assets/props/" + k + ".webp"));
  man.bg.forEach((k) => add("bg", k, "assets/bg/" + k + ".jpg"));
  let done = 0; jobs.forEach((p) => p.then(() => onProgress(++done / jobs.length)));
  return Promise.all(jobs).then(() => { M.prerender(); M.buildFlora(); });
};

M.prerender = function () {
  const C = M.canvas;
  for (const k in M.IMG.props) {
    const im = M.IMG.props[k];
    const mk = (hgt, blur, fog, pad) => { const s = hgt / im.height, w = im.width * s, h = im.height * s, cv = C(w + pad * 2, h + pad * 2), c = cv.getContext("2d");
      c.filter = `blur(${blur}px)`; c.drawImage(im, pad, pad, w, h); c.filter = "none";
      if (fog) { c.globalCompositeOperation = "source-atop"; c.fillStyle = `rgba(245,238,230,${fog})`; c.fillRect(0, 0, cv.width, cv.height); } cv.pad = pad / hgt; return cv; };
    M.IMG.fog[k] = mk(260, 2.5, 0.42, 8);
    M.IMG.midblur[k] = mk(360, 1.4, 0.16, 6);
    M.IMG.blur[k] = mk(420, 9, 0, 20);
  }
  for (const k in M.IMG.bg) { const im = M.IMG.bg[k], c = C(im.width, im.height), cx = c.getContext("2d"); cx.filter = "blur(4px) saturate(1.05)"; cx.drawImage(im, 0, 0); M.IMG.bgBlur[k] = c; }
  M.platCache = {};
  M.BIOMES.forEach((b) => M.tileFor(b));
  const glow = (col) => { const s = C(128, 128), x = s.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, col); gr.addColorStop(0.4, col.replace(/[\d.]+\)$/, "0.35)")); gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return s; };
  M.IMG.glow = { warm: glow("rgba(255,226,140,0.9)"), pink: glow("rgba(255,160,200,0.9)"), mint: glow("rgba(160,255,220,0.9)"), white: glow("rgba(255,255,255,0.9)"), orange: glow("rgba(255,160,80,0.9)") };
  M.platCache = {};
};

// textura de plastilina del terreno; se crea al vuelo para los biomas procedurales (con límite de caché)
const tileKeys = [];
M.tileFor = function (b) {
  if (M.IMG.tiles[b.id]) return M.IMG.tiles[b.id];
  const t = M.canvas(256, 256), c = t.getContext("2d"), r = M.rng(M.hash(b.id) + 5);
  c.fillStyle = b.body; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1100; i++) { c.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.035)"; c.beginPath(); c.arc(r() * 256, r() * 256, 0.6 + r() * 1.8, 0, 7); c.fill(); }
  for (let i = 0; i < 14; i++) { const x = r() * 256, y = r() * 256, rad = 3 + r() * 6;
    c.fillStyle = b.dots[(r() * b.dots.length) | 0]; c.beginPath(); c.ellipse(x, y, rad, rad * 0.85, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(x - rad * 0.3, y - rad * 0.35, rad * 0.35, rad * 0.25, 0, 0, 7); c.fill(); }
  M.IMG.tiles[b.id] = t;
  if (b.variant) { tileKeys.push(b.id); if (tileKeys.length > 8) delete M.IMG.tiles[tileKeys.shift()]; }
  if (M.platCache && Object.keys(M.platCache).length > 260) M.platCache = {};
  return t;
};

function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
M.rr = rr;
M.star = (c, x, y, r, rot, pts = 5) => { c.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = rot + (i * Math.PI) / pts, d = i % 2 ? r * 0.5 : r; c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } c.closePath(); };
M.heart = (c, x, y, s) => { c.beginPath(); c.moveTo(x, y + s * 0.3); c.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.25); c.bezierCurveTo(x - s * 0.5, y + s * 0.55, x, y + s * 0.75, x, y + s); c.bezierCurveTo(x, y + s * 0.75, x + s * 0.5, y + s * 0.55, x + s * 0.5, y + s * 0.25); c.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3); c.fill(); };

// ——— flora ———
M.drawFlora = function (c, L, list, sy, t, front, hero) {
  const set = M.floraFor ? M.floraFor(L.biome) : M.FLORA[L.biome.id]; if (!set) return;
  for (const f of list) {
    const arr = set[f.kind] || set.mata, im = arr[f.i % arr.length]; if (!im) continue;
    const w = im.width * f.sc, h = im.height * f.sc, y = sy + (front ? f.dy : 2);
    const sway = Math.sin(t * 1.6 + f.x * 0.05) * (f.kind === "mata" || f.kind === "flor" ? 0.06 : 0.015);
    let alpha = 1;
    if (front && hero && Math.abs(hero.x - f.x) < w * 0.7 + 20 && hero.y > y - h - 60) alpha = 0.35;
    c.save(); c.globalAlpha = alpha; c.translate(f.x, y); c.rotate(sway); if (f.flip) c.scale(-1, 1);
    c.drawImage(im, -w / 2, -h, w, h); c.restore();
    if (im.glow && (L.tod !== "day" || f.lamp)) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.45 + Math.sin(t * 2 + f.x) * 0.15; c.drawImage(M.IMG.glow.warm, f.x - 50, y - h - 20, 100, 100); c.restore(); }
  }
};

// ——— terreno ———
M.drawGround = function (c, s, L, cam, VW, VH, t) {
  const b = L.biome, x1 = Math.max(s.x, cam.x - 80), x2 = Math.min(s.x + s.w, cam.x + VW + 80);
  if (x2 <= x1) return;
  const bottom = Math.min(s.y + s.h, cam.y + VH + 40);
  if (s.mat === "jelly") {
    c.save(); const wob = (x) => Math.sin(x * 0.02 + t * 3) * 5;
    c.beginPath(); c.moveTo(x1, bottom); for (let x = x1; x <= x2; x += 16) c.lineTo(x, s.y + wob(x)); c.lineTo(x2, bottom); c.closePath();
    const g = c.createLinearGradient(0, s.y, 0, s.y + 220); g.addColorStop(0, "rgba(255,160,205,0.8)"); g.addColorStop(1, "rgba(200,130,255,0.6)"); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 4; c.beginPath(); for (let x = x1; x <= x2; x += 16) c.lineTo(x, s.y + 6 + wob(x)); c.stroke();
    c.fillStyle = "rgba(255,255,255,0.5)"; for (let x = Math.ceil(x1 / 70) * 70; x < x2; x += 70) { c.beginPath(); c.arc(x + Math.sin(x) * 10, s.y + 40 + ((x * 7) % 60) - ((t * 20 + x) % 40), 3 + (x % 5), 0, 7); c.fill(); }
    c.restore(); return;
  }
  if (s.mat === "chicle") { // bloques de chicle rosa brillante
    c.save(); const g = c.createLinearGradient(s.x, s.y, s.x + s.w, s.y + s.h); g.addColorStop(0, "#ffc2df"); g.addColorStop(1, "#f58cc0");
    c.fillStyle = g; rr(c, s.x, s.y, s.w, s.h, 18); c.fill();
    c.fillStyle = "rgba(255,255,255,0.45)"; rr(c, s.x + 8, s.y + 6, Math.min(40, s.w - 16), Math.max(0, s.h - 12), 10); c.fill();
    c.strokeStyle = "rgba(200,70,140,0.25)"; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(s.x + 6, s.y + s.h * i / 4); c.quadraticCurveTo(s.x + s.w / 2, s.y + s.h * i / 4 + 8, s.x + s.w - 6, s.y + s.h * i / 4); c.stroke(); }
    c.restore(); return;
  }
  if (!L._pat) L._pat = c.createPattern(M.tileFor(b), "repeat");
  const ice = s.mat === "hielo", hang = s.float || Array.isArray(s.under) || s.cave;
  c.save(); if (hang) rr(c, s.x, s.y, s.w, s.h, 26); else rr(c, s.x, s.y, s.w, s.h + 40, 30); c.clip();
  c.fillStyle = L._pat; c.fillRect(x1, s.y, x2 - x1, bottom - s.y);
  // capas de estratos de plastilina
  c.globalAlpha = 0.18; c.fillStyle = "#fff";
  for (let k = 1; k < 5; k++) { const yy = s.y + 70 + k * 95; c.beginPath(); c.moveTo(x1, yy); for (let x = x1; x <= x2; x += 30) c.lineTo(x, yy + Math.sin(x * 0.012 + k) * 9); c.lineTo(x2, yy + 10); c.lineTo(x1, yy + 10); c.fill(); }
  c.globalAlpha = 1;
  const g = c.createLinearGradient(0, s.y, 0, s.y + 420); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.3, "rgba(60,30,60,0.05)"); g.addColorStop(1, "rgba(60,30,70,0.38)");
  c.fillStyle = g; c.fillRect(x1, s.y, x2 - x1, bottom - s.y);
  const sg = c.createLinearGradient(s.x, 0, s.x + 50, 0); sg.addColorStop(0, "rgba(255,255,255,0.35)"); sg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = sg; c.fillRect(s.x, s.y, 50, bottom - s.y);
  const eg = c.createLinearGradient(s.x + s.w - 50, 0, s.x + s.w, 0); eg.addColorStop(0, "rgba(80,40,70,0)"); eg.addColorStop(1, "rgba(80,40,70,0.25)"); c.fillStyle = eg; c.fillRect(s.x + s.w - 50, s.y, 50, bottom - s.y);
  // franja superior con profundidad (el "suelo" visto un poco desde arriba)
  const topCol = ice ? "#e4f8ff" : b.top;
  const tg = c.createLinearGradient(0, s.y - 4, 0, s.y + 30); tg.addColorStop(0, topCol); tg.addColorStop(1, ice ? "#c7ecff" : b.frost);
  c.fillStyle = tg; c.beginPath(); c.moveTo(x1 - 20, s.y - 4); c.lineTo(x2 + 20, s.y - 4); c.lineTo(x2 + 20, s.y + 22);
  for (let i = s.drips.length - 1; i >= 0; i--) { const d = s.drips[i]; if (d.x < x1 - 40 || d.x > x2 + 40) continue;
    c.lineTo(d.x + d.w, s.y + 22); c.quadraticCurveTo(d.x + d.w, s.y + 22 + d.len, d.x, s.y + 22 + d.len); c.quadraticCurveTo(d.x - d.w, s.y + 22 + d.len, d.x - d.w, s.y + 22); }
  c.lineTo(x1 - 20, s.y + 22); c.closePath(); c.fill();
  c.fillStyle = "rgba(90,50,80,0.14)"; c.fillRect(x1, s.y + 22, x2 - x1, 4);
  if (ice) { c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 2; for (let x = Math.ceil(x1 / 90) * 90; x < x2; x += 90) { c.globalAlpha = (Math.sin(t * 2 + x) + 1) / 2; c.beginPath(); c.moveTo(x, s.y + 6); c.lineTo(x + 34, s.y + 6); c.stroke(); } c.globalAlpha = 1; }
  if (s.cave) { c.fillStyle = "rgba(40,20,60,0.35)"; c.fillRect(x1, s.y, x2 - x1, s.h); }
  c.restore();
  if (hang) drawUnder(c, s, L, x1, x2);
  c.save(); c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(Math.max(x1, s.x + 20), s.y - 1); c.lineTo(Math.min(x2, s.x + s.w - 20), s.y - 1); c.stroke(); c.restore();
};
// panza de islas, techos y repisas: goterones de plastilina que cuelgan (sin huecos blancos)
function drawUnder(c, s, L, x1, x2) {
  const b = L.biome, by = s.y + s.h, list = Array.isArray(s.under) ? s.under : [];
  if (!list.length) return;
  c.save();
  const g = c.createLinearGradient(0, by - 30, 0, by + 60); g.addColorStop(0, b.body); g.addColorStop(1, M.Col ? M.Col.adj(b.body, 0, 0.9, -0.14) : b.body);
  c.fillStyle = g; c.beginPath(); c.moveTo(Math.max(x1 - 20, s.x + 14), by - 20);
  for (const d of list) { if (d.x < x1 - 60 || d.x > x2 + 60) continue;
    c.lineTo(d.x - d.w, by - 4); c.quadraticCurveTo(d.x - d.w, by + d.len, d.x, by + d.len); c.quadraticCurveTo(d.x + d.w, by + d.len, d.x + d.w, by - 4); }
  c.lineTo(Math.min(x2 + 20, s.x + s.w - 14), by - 20); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,0.28)"; for (const d of list) { if (d.x < x1 - 60 || d.x > x2 + 60) continue; c.beginPath(); c.ellipse(d.x - d.w * 0.3, by + d.len * 0.45, d.w * 0.22, d.len * 0.22, 0, 0, 7); c.fill(); }
  c.restore();
}
// pared falsa: parece terreno macizo; al entrar se vuelve translúcida (M.Events calcula f.a)
M.drawFake = function (c, f, L, t) {
  const a = f.a === undefined ? 1 : f.a; if (a <= 0.01) return;
  c.save(); c.globalAlpha = a; rr(c, f.x, f.y, f.w, f.h, 18); c.clip();
  if (!L._pat) L._pat = c.createPattern(M.tileFor(L.biome), "repeat");
  c.fillStyle = L._pat; c.fillRect(f.x, f.y, f.w, f.h);
  const g = c.createLinearGradient(0, f.y, 0, f.y + f.h); g.addColorStop(0, "rgba(60,30,60,0.12)"); g.addColorStop(1, "rgba(60,30,70,0.3)"); c.fillStyle = g; c.fillRect(f.x, f.y, f.w, f.h);
  const sg = c.createLinearGradient(f.x, 0, f.x + 50, 0); sg.addColorStop(0, "rgba(255,255,255,0.3)"); sg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = sg; c.fillRect(f.x, f.y, 50, f.h);
  c.restore();
  // pista para los atentos: un brillo que va y viene en la grieta
  const k = (Math.sin(t * 2.2 + f.x) + 1) / 2; if (a > 0.5 && k > 0.8) { c.save(); c.globalAlpha = (k - 0.8) * 4 * a; c.fillStyle = "#fff6c8"; M.star(c, f.x + 14, f.y + f.h * 0.55, 6, t); c.fill(); c.restore(); }
};

M.platSprite = function (w, h, L, kind) {
  const key = L.biome.id + w + kind; if (M.platCache[key]) return M.platCache[key];
  const b = L.biome, pad = 30, cv = M.canvas(w + pad * 2, h + pad * 2 + 30), c = cv.getContext("2d"); c.translate(pad, pad);
  const body = kind === "crumble" ? "#d9a66b" : kind === "soft" || kind === "raft" || kind === "rainbow" ? "#fff3f6" : b.body, rad = kind === "crumble" ? 10 : h / 2;
  c.save(); c.shadowColor = "rgba(80,40,80,0.25)"; c.shadowBlur = 18; c.shadowOffsetY = 12; rr(c, 0, 0, w, h, rad); c.fillStyle = body; c.fill(); c.restore();
  c.save(); rr(c, 0, 0, w, h, rad); c.clip();
  if (kind === "normal") { c.fillStyle = c.createPattern(M.tileFor(b), "repeat"); c.fillRect(0, 0, w, h); }
  if (kind === "rainbow") ["#ff9fb6", "#ffc28e", "#ffe98a", "#aef0b8", "#9fd9ff", "#c9b6ff"].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * h / 6, w, h / 6 + 1); });
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0.15)"); g.addColorStop(1, "rgba(60,30,60,0.28)"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const r = M.rng(w * 7 + kind.length);
  if (kind === "crumble") { c.fillStyle = "#6b3b24"; for (let i = 0; i < w / 18; i++) { c.beginPath(); c.ellipse(r() * w, 8 + r() * (h - 14), 3.5, 2.6, r() * 3, 0, 7); c.fill(); }
    c.strokeStyle = "rgba(90,50,30,0.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.3, 0); c.lineTo(w * 0.36, h * 0.5); c.lineTo(w * 0.3, h); c.moveTo(w * 0.7, 0); c.lineTo(w * 0.64, h); c.stroke(); }
  else { c.fillStyle = kind === "normal" ? b.top : "#fff"; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, 13);
    for (let x = w - 16; x > 10; x -= 22 + r() * 18) { const l = 6 + r() * 12; c.lineTo(x + 7, 13); c.quadraticCurveTo(x + 7, 13 + l, x, 13 + l); c.quadraticCurveTo(x - 7, 13 + l, x - 7, 13); }
    c.lineTo(0, 13); c.closePath(); c.fill();
    if (kind === "rainbow") { c.fillStyle = "rgba(255,255,255,0.6)"; for (let x = 16; x < w; x += 28) { M.star(c, x, h * 0.62, 4, x); c.fill(); } }
    if (kind === "soft" || kind === "raft") { c.fillStyle = "rgba(255,150,190,0.5)"; for (let x = 20; x < w; x += 34) { c.beginPath(); c.arc(x, h * 0.65, 4, 0, 7); c.fill(); } } }
  c.restore(); c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 2.5; c.lineCap = "round"; c.beginPath(); c.moveTo(h / 2, 4); c.lineTo(w - h / 2, 4); c.stroke();
  M.platCache[key] = cv; return cv;
};

M.drawShroom = function (c, s, t, L) {
  const sq = s.squash, capCol = s.big ? "#b9a3ff" : ["#ff9fb6", "#ffb08a", "#9fd9ff", "#ffd36b"][L.biomeIdx], k = s.big ? 1.3 : 1;
  c.save(); c.translate(s.x, s.y); c.scale(k, k);
  const stH = 52 - sq * 18, sg = c.createLinearGradient(-18, 0, 18, 0); sg.addColorStop(0, "#fff6e6"); sg.addColorStop(1, "#ead8c2");
  c.fillStyle = sg; rr(c, -17, -stH, 34, stH + 4, 14); c.fill();
  const cw = 62 * (1 + sq * 0.35), ch = 40 * (1 - sq * 0.4), cy = -stH - 6;
  c.save(); c.shadowColor = "rgba(90,40,70,0.25)"; c.shadowBlur = 10; c.shadowOffsetY = 6;
  const cg = c.createRadialGradient(-cw * 0.3, cy - ch * 0.6, 4, 0, cy, cw); cg.addColorStop(0, "#fff"); cg.addColorStop(0.25, capCol); cg.addColorStop(1, capCol);
  c.fillStyle = cg; c.beginPath(); c.ellipse(0, cy, cw, ch, 0, Math.PI, 0); c.quadraticCurveTo(cw * 0.6, cy + 14, 0, cy + 12); c.quadraticCurveTo(-cw * 0.6, cy + 14, -cw, cy); c.fill(); c.restore();
  c.fillStyle = "rgba(255,255,255,0.92)"; [[-30, -14, 8], [4, -26, 10], [30, -10, 7], [-10, -6, 5]].forEach(([dx, dy, r]) => { c.beginPath(); c.ellipse(dx * (1 + sq * 0.3), cy + dy * (1 - sq * 0.4), r, r * 0.8, 0, 0, 7); c.fill(); });
  c.fillStyle = "#4a3040"; c.beginPath(); c.ellipse(-7, -stH * 0.55, 2.5, 3.5, 0, 0, 7); c.ellipse(7, -stH * 0.55, 2.5, 3.5, 0, 0, 7); c.fill();
  c.restore();
};
M.drawCheck = function (c, k, t) {
  c.save(); c.translate(k.x, k.y); c.fillStyle = "#f3e5d0"; rr(c, -6, -90, 12, 92, 6); c.fill();
  const bob = Math.sin(t * 2 + k.x) * 3;
  if (k.on) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.6; c.drawImage(M.IMG.glow.warm, -80, -184 + bob, 160, 160); c.restore(); }
  c.fillStyle = k.on ? "#ffe07a" : "#e8d8ea"; c.beginPath(); c.ellipse(0, -104 + bob, 22, 26, 0, 0, 7); c.fill();
  c.fillStyle = k.on ? "#ff9fb6" : "#c7b8cc"; c.beginPath(); c.ellipse(0, -126 + bob, 26, 10, 0, Math.PI, 0); c.fill();
  c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.ellipse(-8, -112 + bob, 5, 8, -0.3, 0, 7); c.fill(); c.restore();
};
M.drawSign = function (c, s) {
  c.save(); c.translate(s.x, s.y); c.font = "600 17px Fredoka, system-ui, sans-serif";
  const w = Math.min(420, c.measureText(s.text).width + 34);
  c.fillStyle = "#d9b48a"; rr(c, -5, -70, 10, 72, 4); c.fill();
  c.save(); c.shadowColor = "rgba(90,50,40,0.25)"; c.shadowBlur = 8; c.shadowOffsetY = 5; c.fillStyle = "#fff4e2"; rr(c, -w / 2, -118, w, 50, 18); c.fill(); c.restore();
  c.strokeStyle = "#f0c9a0"; c.lineWidth = 3; rr(c, -w / 2 + 4, -114, w - 8, 42, 15); c.stroke();
  c.fillStyle = "#6b4658"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s.text, 0, -92); c.restore();
};
M.drawWall = function (c, w) {
  if (!w.alive && w.melt >= 1) return;
  const k = w.melt, h = w.h * (1 - k), y = w.y + w.h - h; c.save();
  if (w.type === "azucar") { const g = c.createLinearGradient(w.x, 0, w.x + w.w, 0); g.addColorStop(0, "rgba(235,248,255,0.95)"); g.addColorStop(0.5, "rgba(200,235,255,0.9)"); g.addColorStop(1, "rgba(170,215,245,0.95)");
    c.fillStyle = g; rr(c, w.x, y, w.w, h + 4, 14); c.fill(); c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 2;
    for (let i = 0; i < h / 40; i++) { c.beginPath(); c.moveTo(w.x + 10, y + 20 + i * 40); c.lineTo(w.x + 26, y + 34 + i * 40); c.stroke(); }
    if (k > 0) { c.fillStyle = "rgba(190,230,255,0.6)"; c.beginPath(); c.ellipse(w.x + w.w / 2, w.y + w.h, 40 + k * 50, 8, 0, 0, 7); c.fill(); } }
  else { c.fillStyle = "#d9a66b"; rr(c, w.x, y, w.w, h + 4, 10); c.fill(); c.fillStyle = "#6b3b24"; for (let i = 0; i < h / 30; i++) { c.beginPath(); c.ellipse(w.x + 14 + ((i * 23) % 34), y + 16 + i * 30, 4, 3, i, 0, 7); c.fill(); } }
  c.fillStyle = "rgba(255,255,255,0.4)"; rr(c, w.x + 6, y + 8, 8, Math.max(0, h - 30), 4); c.fill(); c.restore();
};
M.drawSwitch = function (c, s, t) {
  c.save(); c.translate(s.x, s.y);
  if (s.big) { const p = s.on ? 0.3 : 1 + Math.sin(t * 5) * 0.06; c.fillStyle = "#e8c9d6"; rr(c, -46, -18, 92, 20, 10); c.fill();
    c.fillStyle = s.on ? "#9ff0d4" : "#ff6f91"; c.beginPath(); c.ellipse(0, -18, 38 * p, 22 * p, 0, Math.PI, 0); c.fill(); }
  else { c.fillStyle = "#b98a6a"; rr(c, -26, -16, 52, 18, 8); c.fill(); c.rotate(s.on ? 0.7 : -0.7);
    c.strokeStyle = "#fff"; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -62); c.stroke();
    c.strokeStyle = "#ff6f91"; c.setLineDash([7, 7]); c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -62); c.stroke(); c.setLineDash([]);
    c.fillStyle = s.on ? "#9ff0d4" : "#ffd36b"; c.beginPath(); c.arc(0, -66, 12, 0, 7); c.fill(); }
  c.restore();
};
M.drawCage = function (c, cg, t) {
  if (cg.open && cg.t > 1) return;
  const im = M.IMG.chars[cg.friend], info = M.CAST[cg.friend], h = info.h * 0.8, w = h * im.width / im.height, R = Math.max(w, h) * 0.62 + 20;
  const wob = Math.sin(t * 3) * 4 + cg.wobble * Math.sin(t * 30) * 10, cy = cg.y - R + 10;
  c.save(); if (cg.open) c.globalAlpha = 1 - cg.t;
  c.fillStyle = "rgba(70,40,70,0.2)"; c.beginPath(); c.ellipse(cg.x, cg.y + 18, R * 0.8, 12, 0, 0, 7); c.fill();
  c.drawImage(im, cg.x - w / 2, cy + R - h + 4, w, h);
  const g = c.createRadialGradient(cg.x - R * 0.3, cy - R * 0.3, R * 0.1, cg.x, cy, R); g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(0.6, "rgba(255,170,210,0.22)"); g.addColorStop(1, "rgba(220,120,200,0.55)");
  c.fillStyle = g; c.beginPath(); c.ellipse(cg.x, cy, R + wob, R - wob, 0, 0, 7); c.fill(); c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 4; c.stroke();
  c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.ellipse(cg.x - R * 0.45, cy - R * 0.5, R * 0.16, R * 0.08, -0.6, 0, 7); c.fill(); c.restore();
  cg.R = R; cg.cy = cy;
};
M.drawExit = function (c, e, t, open) {
  c.save(); c.translate(e.x, e.y); c.globalAlpha = open ? 1 : 0.45; c.fillStyle = "#e9d2f5";
  rr(c, -90, -220, 30, 222, 14); c.fill(); rr(c, 60, -220, 30, 222, 14); c.fill();
  c.beginPath(); c.ellipse(0, -220, 90, 50, 0, Math.PI, 0); c.lineTo(60, -220); c.ellipse(0, -220, 60, 26, 0, 0, Math.PI, true); c.fill();
  if (open) { for (let i = 0; i < 5; i++) { c.strokeStyle = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff"][i]; c.lineWidth = 7; c.beginPath(); c.ellipse(0, -110, 52 - i * 9, 100 - i * 18, 0, t * (1.5 + i * 0.4), t * (1.5 + i * 0.4) + 4.2); c.stroke(); }
    c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.5; c.drawImage(M.IMG.glow.white, -100, -220, 200, 220); }
  else { c.font = "700 34px system-ui"; c.textAlign = "center"; c.fillText("🔒", 0, -100); }
  c.restore();
};
// caramelo de poder
M.drawCandy = function (c, k, t) {
  const C = M.CANDIES[k.type] || M.CANDIES.volar, bob = Math.sin(t * 3 + k.x) * 6;
  c.save(); c.translate(k.x, k.y + bob); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.6; c.drawImage(M.IMG.glow.white, -45, -45, 90, 90); c.restore();
  if (k.rare) { // caramelo raro: anillo arcoíris que gira y destellos
    c.save(); c.translate(k.x, k.y + bob); c.lineWidth = 4;
    ["#ff9fb6", "#ffe98a", "#9ff0d4", "#9fd9ff", "#c9b6ff"].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(0, 0, 30, t * 2 + i * 1.256, t * 2 + i * 1.256 + 1.1); c.stroke(); });
    c.fillStyle = "#fff6c8"; for (let i = 0; i < 3; i++) { const a = t * 1.3 + i * 2.1; M.star(c, Math.cos(a) * 38, Math.sin(a) * 38, 4 + Math.sin(t * 5 + i) * 2, a); c.fill(); }
    c.restore(); }
  c.save(); c.translate(k.x, k.y + bob); c.rotate(Math.sin(t * 2) * 0.3);
  c.fillStyle = C.color; c.beginPath(); c.moveTo(-26, -12); c.lineTo(-14, 0); c.lineTo(-26, 12); c.fill(); c.beginPath(); c.moveTo(26, -12); c.lineTo(14, 0); c.lineTo(26, 12); c.fill();
  const g = c.createRadialGradient(-5, -6, 2, 0, 0, 18); g.addColorStop(0, "#fff"); g.addColorStop(0.4, C.color); g.addColorStop(1, C.color); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 17, 0, 7); c.fill();
  c.font = "18px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(C.icon, 0, 1); c.restore();
};
// mini mash: cubitos de malvavisco con carita
M.drawMini = function (c, m, t) {
  const s = m.size, sq = 1 + Math.sin(m.t * 14) * 0.08 * (m.on ? 1 : 0.3);
  c.save(); c.translate(m.x, m.y); c.scale(1 / sq, sq);
  c.fillStyle = "rgba(70,40,70,0.16)"; c.beginPath(); c.ellipse(0, 2, s * 0.6, 3, 0, 0, 7); c.fill();
  const g = c.createLinearGradient(0, -s * 1.1, 0, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, m.col);
  c.fillStyle = g; rr(c, -s * 0.55, -s * 1.05, s * 1.1, s, s * 0.3); c.fill();
  c.fillStyle = "#2a1c22"; c.beginPath(); c.arc(-s * 0.18, -s * 0.6, s * 0.07, 0, 7); c.arc(s * 0.18, -s * 0.6, s * 0.07, 0, 7); c.fill();
  c.strokeStyle = "#2a1c22"; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -s * 0.47, s * 0.1, 0.3, Math.PI - 0.3); c.stroke();
  c.restore();
};

// Grumo con su imagen original. El tipo se reconoce por accesorios, no por teñirlo.
M.drawGrumoSprite = function (c, e, t, scale = 1) {
  const im = M.IMG.chars.grumo, h = 88 * scale * (e.type === "gordo" ? 2 : 1), w = h * im.width / im.height;
  c.drawImage(im, -w / 2, -h, w, h);
  if (e.type === "moco") { // babas verdes que gotean
    c.fillStyle = "rgba(140,220,90,0.9)";
    for (let i = 0; i < 3; i++) { const dx = -w * 0.25 + i * w * 0.22, len = 8 + ((t * 20 + i * 13) % 22); c.beginPath(); c.ellipse(dx, -h * 0.18 + len * 0.5, 4, len * 0.5 + 3, 0, 0, 7); c.fill(); }
    c.fillStyle = "rgba(160,235,110,0.55)"; c.beginPath(); c.ellipse(0, -h * 0.9, w * 0.3, h * 0.08, 0, 0, 7); c.fill();
  } else if (e.type === "helado") { // corona de escarcha
    c.fillStyle = "rgba(220,245,255,0.95)";
    for (let i = 0; i < 5; i++) { const x = -w * 0.3 + i * w * 0.15; c.beginPath(); c.moveTo(x - 7, -h * 0.82); c.lineTo(x, -h * 0.82 - 14 - (i % 2) * 8); c.lineTo(x + 7, -h * 0.82); c.fill(); }
    c.fillStyle = "rgba(200,235,255,0.35)"; c.beginPath(); c.ellipse(0, -h * 0.5, w * 0.48, h * 0.48, 0, 0, 7); c.fill();
  } else if (e.type === "chicle") { // pompa de chicle
    const r = 8 + (Math.sin(t * 2.5) + 1) * 9; c.fillStyle = "rgba(255,140,200,0.8)"; c.beginPath(); c.arc(w * 0.42, -h * 0.35, r, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.arc(w * 0.42 - r * 0.3, -h * 0.35 - r * 0.3, r * 0.25, 0, 7); c.fill();
  } else if (e.type === "volador") { // alitas de nube
    const fl = Math.sin(t * 18) * 0.5;
    [-1, 1].forEach((s) => { c.save(); c.translate(s * w * 0.3, -h * 0.75); c.rotate(s * (0.4 + fl)); c.fillStyle = "#fff"; c.beginPath(); c.ellipse(s * 18, 0, 22, 11, 0, 0, 7); c.fill(); c.fillStyle = "rgba(220,220,255,0.8)"; c.beginPath(); c.ellipse(s * 26, 3, 12, 6, 0, 0, 7); c.fill(); c.restore(); });
  } else if (e.type === "gordo") { // corona torcida
    c.fillStyle = "#ffd36b"; c.beginPath(); c.moveTo(-w * 0.2, -h * 0.88); c.lineTo(-w * 0.15, -h * 1.02); c.lineTo(-w * 0.05, -h * 0.92); c.lineTo(0, -h * 1.05); c.lineTo(w * 0.05, -h * 0.92); c.lineTo(w * 0.15, -h * 1.02); c.lineTo(w * 0.2, -h * 0.88); c.fill();
  }
  return { w, h };
};
