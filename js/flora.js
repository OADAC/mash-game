// Flora de plastilina generada por código (setas, flores, matas, arbustos, piedras, cristales).
// Se pre-renderiza una vez por bioma y se usa para vestir el borde del suelo por detrás y por delante.
window.M = window.M || {};

M.FLORA = {};
(function () {
  const C = (w, h) => M.canvas(w, h);
  function shade(hex, k) { // aclara (k>0) u oscurece (k<0) un color
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function blob(c, x, y, rx, ry, col) {
    const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.22));
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill();
  }
  function dots(c, r, cx, cy, rx, ry, n, col = "rgba(255,255,255,0.92)") {
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()); const x = cx + Math.cos(a) * rx * d * 0.8, y = cy + Math.sin(a) * ry * d * 0.7 - ry * 0.1, s = 2 + r() * 3.5;
      c.fillStyle = col; c.beginPath(); c.ellipse(x, y, s, s * 0.85, 0, 0, 7); c.fill(); }
  }
  const make = {
    seta(r, pal) {
      const H = 40 + r() * 60, W = H * (0.8 + r() * 0.5), cv = C(W + 20, H + 20), c = cv.getContext("2d");
      const cx = (W + 20) / 2, base = H + 14, capH = H * (0.38 + r() * 0.15), stemW = W * 0.22;
      const sg = c.createLinearGradient(cx - stemW, 0, cx + stemW, 0); sg.addColorStop(0, "#fff7ea"); sg.addColorStop(1, "#e6d4c0");
      c.fillStyle = sg; M.rr(c, cx - stemW / 2, base - H + capH * 0.5, stemW, H - capH * 0.5, stemW / 2); c.fill();
      const col = r.pick(pal.caps);
      c.save(); c.shadowColor = "rgba(90,40,70,0.25)"; c.shadowBlur = 6; c.shadowOffsetY = 3;
      blob(c, cx, base - H + capH * 0.6, W / 2, capH, col); c.restore();
      c.fillStyle = shade(col, -0.25); c.beginPath(); c.ellipse(cx, base - H + capH * 1.25, W * 0.42, capH * 0.18, 0, 0, 7); c.fill();
      dots(c, r, cx, base - H + capH * 0.45, W / 2, capH * 0.7, 3 + (r() * 5 | 0));
      return cv;
    },
    flor(r, pal) {
      const H = 26 + r() * 34, cv = C(40, H + 24), c = cv.getContext("2d"), cx = 20, top = 18;
      c.strokeStyle = shade(pal.leaf, -0.15); c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, H + 20); c.quadraticCurveTo(cx + (r() - 0.5) * 12, top + H / 2, cx, top); c.stroke();
      blob(c, cx - 6, top + H * 0.6, 7, 4, pal.leaf);
      const col = r.pick(pal.flowers);
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; blob(c, cx + Math.cos(a) * 7, top + Math.sin(a) * 7, 6, 6, col); }
      blob(c, cx, top, 5, 5, "#fff2a8");
      return cv;
    },
    mata(r, pal) {
      const W = 40 + r() * 50, H = 22 + r() * 26, cv = C(W + 10, H + 10), c = cv.getContext("2d");
      const n = 5 + (r() * 5 | 0);
      for (let i = 0; i < n; i++) {
        const x = 5 + (i + 0.5) * W / n, h = H * (0.55 + r() * 0.45);
        const col = i % 2 ? pal.leaf : shade(pal.leaf, 0.12);
        c.fillStyle = col; c.beginPath(); c.moveTo(x - 6, H + 8); c.quadraticCurveTo(x - 7, H + 8 - h * 0.6, x + (r() - 0.5) * 8, H + 8 - h); c.quadraticCurveTo(x + 7, H + 8 - h * 0.6, x + 6, H + 8); c.fill();
      }
      c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(0, H + 4, W + 10, 2);
      return cv;
    },
    arbusto(r, pal) {
      const W = 70 + r() * 70, H = W * (0.5 + r() * 0.2), cv = C(W + 20, H + 20), c = cv.getContext("2d");
      const col = r.chance(0.3) ? r.pick(pal.caps) : pal.leaf;
      for (let i = 0; i < 6; i++) { const x = 10 + W * (0.15 + r() * 0.7), rad = W * (0.18 + r() * 0.12); blob(c, x, H + 10 - rad * 0.9 - r() * H * 0.3, rad, rad * 0.85, i % 2 ? col : shade(col, 0.08)); }
      dots(c, r, (W + 20) / 2, H * 0.55, W * 0.45, H * 0.4, 5, r.pick(pal.flowers));
      return cv;
    },
    piedra(r, pal) {
      const W = 18 + r() * 26, H = W * 0.6, cv = C(W + 8, H + 8), c = cv.getContext("2d");
      blob(c, (W + 8) / 2, H / 2 + 5, W / 2, H / 2, r.pick(pal.stones)); return cv;
    },
    cristal(r, pal) {
      const H = 26 + r() * 30, cv = C(44, H + 10), c = cv.getContext("2d"), col = r.pick(["#ffd1f0", "#c9f2ff", "#e8dbff", "#fff3c4"]);
      for (let i = 0; i < 3; i++) {
        const x = 12 + i * 10, h = H * (0.5 + r() * 0.5), w = 8;
        const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, "#fff"); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.2));
        c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, H + 8); c.lineTo(x - w / 2, H + 8 - h * 0.8); c.lineTo(x, H + 8 - h); c.lineTo(x + w / 2, H + 8 - h * 0.8); c.lineTo(x + w / 2, H + 8); c.fill();
      }
      return cv;
    },
    farol(r, pal) { // seta que brilla de noche (y en las cuevas)
      const cv = make.seta(r, { caps: ["#ffe98a", "#9ff0dc", "#ffc2e2"] }); cv.glow = true; return cv;
    },
    piruleta(r, pal) { // piruleta-flor en espiral (regiones que florecen, aldeas)
      const H = 44 + r() * 40, R = 11 + r() * 7, cv = C(R * 2 + 16, H + R + 16), c = cv.getContext("2d"), cx = R + 8, cy = R + 8;
      c.strokeStyle = "#fff4ea"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + (r() - 0.5) * 6, H + R + 12); c.stroke();
      const col = r.pick(pal.caps); blob(c, cx, cy, R, R, col);
      c.strokeStyle = "rgba(255,255,255,0.85)"; c.lineWidth = 3; c.beginPath();
      for (let a = 0; a < 12; a += 0.3) { const rad = a / 12 * R * 0.9; c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } c.stroke();
      return cv;
    },
    algodon(r, pal) { // mata de algodón de azúcar
      const W = 50 + r() * 40, H = W * 0.7, cv = C(W + 16, H + 26), c = cv.getContext("2d"), col = r.pick(["#ffd1e6", "#d8ccff", "#cdf1ff", "#fff0f5"]);
      c.strokeStyle = shade(pal.leaf, -0.2); c.lineWidth = 4; c.beginPath(); c.moveTo((W + 16) / 2, H + 24); c.lineTo((W + 16) / 2, H * 0.6); c.stroke();
      for (let i = 0; i < 5; i++) blob(c, 8 + W * (0.2 + r() * 0.6), H * (0.35 + r() * 0.35), W * (0.18 + r() * 0.1), H * 0.26, i % 2 ? col : shade(col, 0.15));
      return cv;
    },
    mustia(r, pal) { // flor mustia y gris de las regiones amargas
      const H = 24 + r() * 26, cv = C(44, H + 20), c = cv.getContext("2d"), cx = 14;
      c.strokeStyle = "#a79d8e"; c.lineWidth = 3.5; c.lineCap = "round"; c.beginPath(); c.moveTo(cx, H + 18); c.quadraticCurveTo(cx + 2, 10, cx + 16, 14); c.stroke();
      const col = r.pick(["#b9aab0", "#a8a0b8", "#c2b59f"]);
      for (let i = 0; i < 4; i++) blob(c, cx + 16 + Math.cos(i * 1.6 + 1) * 5, 18 + Math.sin(i * 1.6 + 1) * 4 + 3, 4.5, 5.5, col);
      blob(c, cx + 16, 20, 3.5, 3.5, "#8c8279");
      return cv;
    },
  };
  const PAL = {
    pradera: { leaf: "#8fd3a6", caps: ["#ff9fb6", "#ffb08a", "#ffd36b", "#c9b6ff"], flowers: ["#ff9fb6", "#ffffff", "#ffd36b", "#b9a3ff"], stones: ["#e9dccf", "#d6e9df", "#f2d7dd"] },
    setas:   { leaf: "#9fd8b8", caps: ["#ff8fab", "#ff9f7a", "#9fd9ff", "#c9b6ff", "#ffd36b"], flowers: ["#ffffff", "#ffb3c7", "#9ff0dc"], stones: ["#f0d9d0", "#e3d4ea"] },
    aldea:   { leaf: "#a8d99a", caps: ["#ff9fb6", "#9fd9ff", "#ffc36b"], flowers: ["#ff9fb6", "#9fd9ff", "#ffffff", "#ffe08a"], stones: ["#efe0c8", "#e0e8d6"] },
    valle:   { leaf: "#9fc9c8", caps: ["#b9a3ff", "#9ff0dc", "#ff9fd0", "#fff08a"], flowers: ["#fff08a", "#9ff0dc", "#ffb3d9"], stones: ["#d8cdea", "#c9dbe6"] },
  };
  const KINDS = ["seta", "flor", "mata", "arbusto", "piedra", "cristal", "farol", "piruleta", "algodon", "mustia"];
  function buildSet(r, pal, many, few) {
    const set = {}; KINDS.forEach((k) => (set[k] = []));
    for (let i = 0; i < many; i++) { set.seta.push(make.seta(r, pal)); set.flor.push(make.flor(r, pal)); set.mata.push(make.mata(r, pal)); }
    for (let i = 0; i < few; i++) ["arbusto", "piedra", "cristal", "farol", "piruleta", "algodon", "mustia"].forEach((k) => set[k].push(make[k](r, pal)));
    return set;
  }
  M.buildFlora = function () {
    Object.keys(PAL).forEach((b, bi) => { M.FLORA[b] = buildSet(M.rng(bi * 101 + 3), PAL[b], 8, 5); });
  };
  // flora de un bioma procedural (paleta en biome.flora): se construye la primera vez y se guarda (máx. 6 variantes)
  const varKeys = [];
  M.floraFor = function (biome) {
    if (M.FLORA[biome.id]) return M.FLORA[biome.id];
    if (!biome.flora) return M.FLORA[biome.base] || M.FLORA.pradera;
    M.FLORA[biome.id] = buildSet(M.rng(M.hash(biome.id) + 3), biome.flora, 6, 4);
    varKeys.push(biome.id); if (varKeys.length > 6) delete M.FLORA[varKeys.shift()];
    return M.FLORA[biome.id];
  };
})();
