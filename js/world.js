// Carga de assets, decorados en capas y terreno de plastilina.
window.M = window.M || {};

M.IMG = { chars: {}, props: {}, bg: {}, fog: {}, blur: {}, bgBlur: {} };

M.load = function (onProgress) {
  const man = window.MANIFEST, jobs = [];
  const add = (group, key, src) => jobs.push(new Promise((res) => {
    const im = new Image();
    im.onload = () => { M.IMG[group][key] = im; res(); };
    im.onerror = () => res();
    im.src = src;
  }));
  Object.keys(man.chars).forEach((k) => add("chars", k, "assets/chars/" + k + ".webp"));
  Object.keys(man.props).forEach((k) => add("props", k, "assets/props/" + k + ".webp"));
  man.bg.forEach((k) => add("bg", k, "assets/bg/" + k + ".jpg"));
  let done = 0;
  jobs.forEach((p) => p.then(() => onProgress(++done / jobs.length)));
  return Promise.all(jobs).then(M.prerender);
};

function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
M.canvas = canvas;

// Versiones pre-desenfocadas / con niebla para las capas lejanas y el primer plano.
M.prerender = function () {
  const P = M.IMG.props;
  for (const k in P) {
    const im = P[k], s = 260 / im.height;
    const w = im.width * s, h = im.height * s;
    // lejano: pequeño, con bruma
    const f = canvas(w + 16, h + 16), fc = f.getContext("2d");
    fc.filter = "blur(2.5px)"; fc.drawImage(im, 8, 8, w, h); fc.filter = "none";
    fc.globalCompositeOperation = "source-atop"; fc.fillStyle = "rgba(245,238,230,0.42)"; fc.fillRect(0, 0, f.width, f.height);
    M.IMG.fog[k] = f;
    // primer plano: desenfoque fuerte
    const s2 = 420 / im.height, w2 = im.width * s2, h2 = im.height * s2;
    const b = canvas(w2 + 40, h2 + 40), bc = b.getContext("2d");
    bc.filter = "blur(9px) saturate(1.1)"; bc.drawImage(im, 20, 20, w2, h2);
    M.IMG.blur[k] = b;
  }
  for (const k in M.IMG.bg) {
    const im = M.IMG.bg[k], c = canvas(im.width, im.height), cx = c.getContext("2d");
    cx.filter = "blur(5px) saturate(1.05)"; cx.drawImage(im, 0, 0); cx.filter = "none";
    M.IMG.bgBlur[k] = c;
  }
  // tramas de motas para cada zona
  M.ZONES.forEach((z, zi) => {
    const t = canvas(256, 256), c = t.getContext("2d");
    c.fillStyle = z.body; c.fillRect(0, 0, 256, 256);
    const r = rng(zi * 97 + 5);
    for (let i = 0; i < 900; i++) { // grano de plastilina
      c.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.035)";
      c.beginPath(); c.arc(r() * 256, r() * 256, 0.6 + r() * 1.8, 0, 7); c.fill();
    }
    for (let i = 0; i < 16; i++) { // bolitas de colores
      const x = r() * 256, y = r() * 256, rad = 3 + r() * 6;
      c.fillStyle = z.dots[(r() * z.dots.length) | 0];
      c.beginPath(); c.ellipse(x, y, rad, rad * 0.85, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,0.45)";
      c.beginPath(); c.ellipse(x - rad * 0.3, y - rad * 0.35, rad * 0.35, rad * 0.25, 0, 0, 7); c.fill();
    }
    z.pattern = null; z.tile = t;
  });
  // plataformas flotantes pre-renderizadas
  M.platCache = {};
};

function rng(seed) { seed = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
M.rng = rng;

M.zoneAt = function (x) {
  let z = 0;
  for (let i = 0; i < M.ZONES.length; i++) if (x >= M.ZONES[i].x0) z = i;
  return z;
};

// Rellena el nivel con decorados procedurales (deterministas) además de los manuales.
M.decorate = function (L) {
  const r = rng(1234);
  const nearFriend = (x) => L.friends.some((f) => Math.abs(f.x - x) < 170) || L.checks.some((c) => Math.abs(c.x - x) < 90) || L.signs.some((s) => Math.abs(s.x - x) < 120);
  // capa lejana: a lo largo de todo el nivel
  for (let x = -600; x < M.LEVEL_END * 0.45 + 1200; x += 230 + r() * 260) {
    const z = M.ZONES[M.zoneAt(x / 0.45)];
    L.props.push({ layer: "far", key: z.far[(r() * z.far.length) | 0], x, y: 520 + r() * 60, h: 170 + r() * 110, flip: r() < 0.5 });
  }
  // capa media: sobre el suelo
  L.solids.forEach((s) => {
    if (s.w < 260) return;
    for (let x = s.x + 80 + r() * 160; x < s.x + s.w - 80; x += 420 + r() * 420) {
      if (nearFriend(x)) continue;
      const z = M.ZONES[M.zoneAt(x)];
      L.props.push({ layer: "mid", key: z.mid[(r() * z.mid.length) | 0], x, y: s.y + 14, h: 230 + r() * 170, flip: r() < 0.5 });
    }
  });
  // primer plano desenfocado
  for (let x = 300; x < M.LEVEL_END * 1.25; x += 900 + r() * 900) {
    const z = M.ZONES[M.zoneAt(x / 1.25)];
    L.props.push({ layer: "front", key: z.front[(r() * z.front.length) | 0], x, y: 930 + r() * 50, h: 300 + r() * 80, flip: r() < 0.5 });
  }
  const order = { far: 0, mid: 1, front: 2 };
  L.props.sort((a, b) => order[a.layer] - order[b.layer] || a.x - b.x);
  // motas del suelo: bolitas en el borde superior
  L.solids.forEach((s) => {
    s.balls = [];
    const rr = rng((s.x | 0) + 77), z = M.ZONES[M.zoneAt(s.x + 10)];
    for (let x = s.x + 20; x < s.x + s.w - 20; x += 40 + rr() * 90) s.balls.push({ x, r: 4 + rr() * 6, c: z.dots[(rr() * z.dots.length) | 0], dy: rr() * 6 });
    s.drips = [];
    for (let x = s.x + 24; x < s.x + s.w - 24; x += 38 + rr() * 70) s.drips.push({ x, len: 10 + rr() * 26, w: 9 + rr() * 8 });
  });
};

// ——— dibujo del terreno ———
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
M.rr = rr;

M.drawGround = function (c, s, camX, camY, viewW, viewH) {
  const z = M.ZONES[M.zoneAt(s.x + Math.min(s.w, 200))];
  if (!z.pattern) z.pattern = c.createPattern(z.tile, "repeat");
  const x1 = Math.max(s.x, camX - 60), x2 = Math.min(s.x + s.w, camX + viewW + 60);
  if (x2 <= x1) return;
  const bottom = Math.min(s.y + s.h, camY + viewH + 40);
  // cuerpo
  c.save();
  rr(c, s.x, s.y, s.w, s.h + 40, 34);
  c.clip();
  c.fillStyle = z.pattern; c.fillRect(x1, s.y, x2 - x1, bottom - s.y);
  const g = c.createLinearGradient(0, s.y, 0, s.y + 380);
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.35, "rgba(60,30,60,0.06)"); g.addColorStop(1, "rgba(60,30,60,0.28)");
  c.fillStyle = g; c.fillRect(x1, s.y, x2 - x1, bottom - s.y);
  // brillo/sombra laterales para volumen
  const sg = c.createLinearGradient(s.x, 0, s.x + 40, 0);
  sg.addColorStop(0, "rgba(255,255,255,0.35)"); sg.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = sg; c.fillRect(s.x, s.y, 40, bottom - s.y);
  const eg = c.createLinearGradient(s.x + s.w - 44, 0, s.x + s.w, 0);
  eg.addColorStop(0, "rgba(80,40,70,0)"); eg.addColorStop(1, "rgba(80,40,70,0.22)");
  c.fillStyle = eg; c.fillRect(s.x + s.w - 44, s.y, 44, bottom - s.y);
  // glaseado con goterones
  c.fillStyle = z.frost;
  c.beginPath();
  c.moveTo(x1 - 20, s.y - 2);
  c.lineTo(x2 + 20, s.y - 2);
  c.lineTo(x2 + 20, s.y + 20);
  for (let i = s.drips.length - 1; i >= 0; i--) {
    const d = s.drips[i];
    if (d.x < x1 - 40 || d.x > x2 + 40) continue;
    c.lineTo(d.x + d.w, s.y + 20);
    c.quadraticCurveTo(d.x + d.w, s.y + 20 + d.len, d.x, s.y + 20 + d.len);
    c.quadraticCurveTo(d.x - d.w, s.y + 20 + d.len, d.x - d.w, s.y + 20);
  }
  c.lineTo(x1 - 20, s.y + 20);
  c.closePath(); c.fill();
  // sombra suave bajo el glaseado
  c.strokeStyle = "rgba(90,50,80,0.12)"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x1, s.y + 23); c.lineTo(x2, s.y + 23); c.stroke();
  c.restore();
  // borde brillante superior
  c.save();
  c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(Math.max(x1, s.x + 22), s.y + 4); c.lineTo(Math.min(x2, s.x + s.w - 22), s.y + 4); c.stroke();
  // bolitas encima
  s.balls.forEach((b) => {
    if (b.x < x1 - 20 || b.x > x2 + 20) return;
    c.fillStyle = b.c; c.beginPath(); c.ellipse(b.x, s.y + 1 - b.r * 0.5 + b.dy * 0.2, b.r, b.r * 0.8, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.ellipse(b.x - b.r * 0.3, s.y - b.r * 0.8 + b.dy * 0.2, b.r * 0.35, b.r * 0.22, 0, 0, 7); c.fill();
  });
  c.restore();
};

// Plataformas flotantes: nubes de malvavisco (cacheadas).
M.platSprite = function (w, h, zi) {
  const key = w + "_" + zi;
  if (M.platCache[key]) return M.platCache[key];
  const z = M.ZONES[zi], pad = 30, cv = canvas(w + pad * 2, h + pad * 2 + 30), c = cv.getContext("2d");
  c.translate(pad, pad);
  c.save(); c.shadowColor = "rgba(80,40,80,0.25)"; c.shadowBlur = 18; c.shadowOffsetY = 12;
  rr(c, 0, 0, w, h, h / 2); c.fillStyle = z.body; c.fill(); c.restore();
  c.save(); rr(c, 0, 0, w, h, h / 2); c.clip();
  c.fillStyle = c.createPattern(z.tile, "repeat"); c.fillRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0.1)"); g.addColorStop(1, "rgba(60,30,60,0.3)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // glaseado
  c.fillStyle = z.frost; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, 13);
  const r = rng(w * 7 + zi);
  for (let x = w - 16; x > 10; x -= 22 + r() * 18) { const l = 6 + r() * 12; c.lineTo(x + 7, 13); c.quadraticCurveTo(x + 7, 13 + l, x, 13 + l); c.quadraticCurveTo(x - 7, 13 + l, x - 7, 13); }
  c.lineTo(0, 13); c.closePath(); c.fill();
  c.restore();
  c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 2.5; c.lineCap = "round";
  c.beginPath(); c.moveTo(h / 2, 4); c.lineTo(w - h / 2, 4); c.stroke();
  M.platCache[key] = cv;
  return cv;
};

// Seta rebotadora.
M.drawShroom = function (c, s, t) {
  const sq = s.squash, x = s.x, y = s.y;
  const zi = M.zoneAt(x), capCol = ["#ff9fb6", "#ffb08a", "#9fd9ff", "#ffd36b"][zi];
  c.save(); c.translate(x, y);
  // tallo
  const stH = 52 - sq * 18;
  const sg = c.createLinearGradient(-18, 0, 18, 0); sg.addColorStop(0, "#fff6e6"); sg.addColorStop(1, "#ead8c2");
  c.fillStyle = sg; rr(c, -17, -stH, 34, stH + 4, 14); c.fill();
  // sombrero
  const cw = 62 * (1 + sq * 0.35), ch = 40 * (1 - sq * 0.4), cy = -stH - 6;
  c.save(); c.shadowColor = "rgba(90,40,70,0.25)"; c.shadowBlur = 10; c.shadowOffsetY = 6;
  c.fillStyle = capCol; c.beginPath(); c.ellipse(0, cy, cw, ch, 0, Math.PI, 0); c.quadraticCurveTo(cw * 0.6, cy + 14, 0, cy + 12); c.quadraticCurveTo(-cw * 0.6, cy + 14, -cw, cy); c.fill();
  c.restore();
  c.fillStyle = "rgba(255,255,255,0.9)";
  [[-30, -14, 8], [4, -26, 10], [30, -10, 7], [-10, -6, 5]].forEach(([dx, dy, r]) => { c.beginPath(); c.ellipse(dx * (1 + sq * 0.3), cy + dy * (1 - sq * 0.4), r, r * 0.8, 0, 0, 7); c.fill(); });
  c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(-cw * 0.45, cy - ch * 0.55, cw * 0.2, ch * 0.18, -0.5, 0, 7); c.fill();
  // carita
  c.fillStyle = "#4a3040";
  const blink = Math.sin(t * 1.3 + x) > 0.97;
  if (blink) { c.fillRect(-10, -stH * 0.55, 6, 2); c.fillRect(4, -stH * 0.55, 6, 2); }
  else { c.beginPath(); c.ellipse(-7, -stH * 0.55, 2.5, 3.5, 0, 0, 7); c.ellipse(7, -stH * 0.55, 2.5, 3.5, 0, 0, 7); c.fill(); }
  c.restore();
};

// Farolillo de control (checkpoint).
M.drawCheck = function (c, k, t) {
  c.save(); c.translate(k.x, k.y);
  c.fillStyle = "#f3e5d0"; rr(c, -6, -90, 12, 92, 6); c.fill();
  const on = k.on, bob = Math.sin(t * 2 + k.x) * 3;
  if (on) {
    const g = c.createRadialGradient(0, -104 + bob, 4, 0, -104 + bob, 90);
    g.addColorStop(0, "rgba(255,230,150,0.75)"); g.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, -104 + bob, 90, 0, 7); c.fill();
  }
  c.fillStyle = on ? "#ffe07a" : "#e8d8ea";
  c.beginPath(); c.ellipse(0, -104 + bob, 22, 26, 0, 0, 7); c.fill();
  c.fillStyle = on ? "#ff9fb6" : "#c7b8cc";
  c.beginPath(); c.ellipse(0, -126 + bob, 26, 10, 0, Math.PI, 0); c.fill();
  c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.ellipse(-8, -112 + bob, 5, 8, -0.3, 0, 7); c.fill();
  if (on) { c.fillStyle = "#6b4050"; c.beginPath(); c.arc(-6, -102 + bob, 2.4, 0, 7); c.arc(6, -102 + bob, 2.4, 0, 7); c.fill();
    c.strokeStyle = "#6b4050"; c.lineWidth = 2; c.beginPath(); c.arc(0, -98 + bob, 4, 0.2, Math.PI - 0.2); c.stroke(); }
  c.restore();
};

// Cartelito de madera de galleta.
M.drawSign = function (c, s) {
  c.save(); c.translate(s.x, s.y);
  c.font = "600 17px Fredoka, 'Baloo 2', system-ui, sans-serif";
  const w = Math.min(340, c.measureText(s.text).width + 34);
  c.fillStyle = "#d9b48a"; rr(c, -5, -70, 10, 72, 4); c.fill();
  c.save(); c.shadowColor = "rgba(90,50,40,0.25)"; c.shadowBlur = 8; c.shadowOffsetY = 5;
  c.fillStyle = "#fff4e2"; rr(c, -w / 2, -118, w, 50, 18); c.fill(); c.restore();
  c.strokeStyle = "#f0c9a0"; c.lineWidth = 3; rr(c, -w / 2 + 4, -114, w - 8, 42, 15); c.stroke();
  c.fillStyle = "#6b4658"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(s.text, 0, -92);
  c.restore();
};

// La Gran Tarta (meta).
M.drawCake = function (c, g, t) {
  c.save(); c.translate(g.x, g.y);
  const tiers = [[300, 110, "#ffc6d3", "#fff3f6"], [230, 95, "#c9f0e0", "#ffffff"], [160, 85, "#fff0b8", "#ffffff"]];
  let y = 0;
  // resplandor
  const rg = c.createRadialGradient(0, -200, 30, 0, -200, 420);
  rg.addColorStop(0, "rgba(255,236,170,0.3)"); rg.addColorStop(1, "rgba(255,220,160,0)");
  c.fillStyle = rg; c.beginPath(); c.arc(0, -200, 420, 0, 7); c.fill();
  c.fillStyle = "#f7f0ff"; c.beginPath(); c.ellipse(0, 4, 190, 22, 0, 0, 7); c.fill();
  tiers.forEach(([w, h, col, fr], i) => {
    c.save(); c.shadowColor = "rgba(90,40,70,0.25)"; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.fillStyle = col; rr(c, -w / 2, y - h, w, h, 26); c.fill(); c.restore();
    c.fillStyle = fr; c.beginPath(); c.moveTo(-w / 2 + 8, y - h + 4);
    for (let x = -w / 2 + 8; x <= w / 2 - 8; x += 22) { const l = 10 + ((x * 13 + i * 7) % 17); c.quadraticCurveTo(x + 5, y - h + 18 + l, x + 11, y - h + 16); }
    c.lineTo(w / 2 - 8, y - h + 4); c.quadraticCurveTo(0, y - h - 10, -w / 2 + 8, y - h + 4); c.fill();
    for (let k = 0; k < 7; k++) {
      c.fillStyle = ["#ff8fab", "#8fd8c0", "#ffd98e", "#b9a3ff"][(k + i) % 4];
      c.beginPath(); c.arc(-w / 2 + 22 + k * (w - 44) / 6, y - h * 0.4, 7, 0, 7); c.fill();
    }
    y -= h;
  });
  // velas
  for (let k = -2; k <= 2; k++) {
    const x = k * 28, fl = Math.sin(t * 12 + k) * 2;
    c.fillStyle = ["#ff8fab", "#8fd8c0", "#ffd98e", "#b9a3ff", "#9fd9ff"][k + 2]; rr(c, x - 6, y - 50, 12, 50, 5); c.fill();
    const fg = c.createRadialGradient(x, y - 62, 1, x, y - 62, 26); fg.addColorStop(0, "rgba(255,240,180,0.95)"); fg.addColorStop(1, "rgba(255,200,120,0)");
    c.fillStyle = fg; c.beginPath(); c.arc(x, y - 62, 26, 0, 7); c.fill();
    c.fillStyle = "#ffcf5a"; c.beginPath(); c.ellipse(x + fl * 0.3, y - 62, 5, 10 + fl, 0, 0, 7); c.fill();
  }
  c.restore();
};
