// Rig de animación: deforma los sprites de los personajes como plastilina con una malla de triángulos
// (transformación afín por triángulo) movida por "huesos" procedurales con muelles.
// API: M.Rig.create(face) · step(r, o, dt) · hit(r, tipo, fuerza) · draw(ctx, img, W, H, r, o) · anchor(r, u, v, W, H) · deform(...) · frame(dtMs)
window.M = window.M || {};
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // estado del rig (compatible con el antiguo "soft": sq, sqv, jx, jv, walk)
  function create(face) {
    return { sq: 0, sqv: 0, jx: 0, jv: 0, hx: 0, hv: 0, hy: 0, hyv: 0, walk: 0, run: 0, prevVx: 0, prevVy: 0,
      t: Math.random() * 10, face: face || 1, shown: face || 1, turn: 0, shake: 0, effort: 0, crouch: 0, air: 0 };
  }

  // o = { vx, vy, on, maxv, face, crouch, vac }
  function step(r, o, dt) {
    if (!dt) return;
    const vx = o.vx || 0, vy = o.vy || 0, on = o.on !== false, maxv = o.maxv || 400;
    const ax = clamp((vx - r.prevVx) / dt, -9000, 9000), ay = clamp((vy - r.prevVy) / dt, -30000, 30000);
    r.prevVx = vx; r.prevVy = vy; r.t += dt;
    // columna: se inclina hacia donde corre y se retrasa al acelerar
    const leanT = clamp(vx / maxv, -1.2, 1.2) * (on ? 0.14 : 0.07);
    r.jv += (-160 * (r.jx - leanT) - 11 * r.jv - ax * 0.00009) * dt; r.jx += r.jv * dt;
    // cabeza: muelle blando que llega tarde (movimiento secundario)
    r.hv += (-95 * r.hx - 6.5 * r.hv - ax * 0.00011) * dt; r.hx += r.hv * dt;
    r.hyv += (-140 * r.hy - 7 * r.hyv + ay * 0.000012) * dt; r.hy += r.hyv * dt;
    // aplastar / estirar anclado a los pies
    r.crouch += ((o.crouch ? 1 : 0) - r.crouch) * Math.min(1, dt * 14);
    const breathe = on && Math.abs(vx) < 20 ? Math.sin(r.t * 2.2) * 0.022 : 0;
    const sqT = on ? breathe - r.crouch * 0.34 : clamp(Math.abs(vy) / 9000, 0, 0.13) - r.crouch * 0.2;
    r.sqv += (-190 * (r.sq - sqT) - 12 * r.sqv) * dt; r.sq += r.sqv * dt;
    r.sq = clamp(r.sq, -0.5, 0.5); r.jx = clamp(r.jx, -0.5, 0.5); r.hx = clamp(r.hx, -0.3, 0.3); r.hy = clamp(r.hy, -0.2, 0.2);
    // ciclo de andar
    r.run += ((on ? clamp(Math.abs(vx) / maxv, 0, 1.5) : 0) - r.run) * Math.min(1, dt * 8);
    if (on && Math.abs(vx) > 30) r.walk += dt * Math.abs(vx) * 0.04;
    r.air = on ? 0 : r.air + dt;
    // volteo con aplastamiento: la silueta se estrecha y cambia de lado a mitad de giro
    if (o.face && o.face !== r.face) { r.face = o.face; r.turn = 1; r.sqv += 1.5; }
    if (r.turn > 0) { r.turn = Math.max(0, r.turn - dt / 0.17); if (r.turn < 0.5) r.shown = r.face; } else r.shown = r.face;
    r.shake = Math.max(0, r.shake - dt * 2.5);
    r.effort += ((o.vac ? 1 : 0) - r.effort) * Math.min(1, dt * 10);
  }

  // impulsos: jump (anticipación + estirón), land (impacto), hurt (sacudida), boing, stomp
  function hit(r, kind, amt) {
    amt = amt == null ? 1 : amt;
    if (kind === "jump") { r.sq = Math.min(r.sq, -0.2); r.sqv = 7.5 * amt; r.hyv += 1.2; }
    else if (kind === "land") { r.sqv -= 7 * amt; r.hyv += 2.2 * amt; }
    else if (kind === "hurt") { r.shake = 1; r.sqv -= 6; r.jv += (Math.random() - 0.5) * 8; r.hv += (Math.random() - 0.5) * 6; }
    else if (kind === "boing") { r.sqv += 7 * amt; r.hyv -= 1.5; }
    else if (kind === "stomp") { r.sqv += 5 * amt; }
    else if (kind === "wobble") { r.jv += (Math.random() - 0.5) * 6 * amt; r.hv += (Math.random() - 0.5) * 4 * amt; }
  }

  // parámetros de pose a partir del estado (se calculan una vez por dibujo)
  function pose(r, o) {
    o = o || {};
    const run = clamp(r.run, 0, 1.3), sq = r.sq;
    return {
      sy: 1 + sq, sx: 1 - sq * 0.55, bulge: -sq * 0.35 + (r.effort * 0.05),
      lean: r.jx + (o.extraLean || 0), hx: r.hx, hy: r.hy,
      bob: Math.abs(Math.sin(r.walk)) * 0.045 * run, waddle: Math.sin(r.walk) * 0.05 * run, run, walk: r.walk,
      turn: 1 - 0.85 * Math.sin(Math.PI * r.turn), shake: r.shake, t: r.t, face: r.shown, effort: r.effort,
      breath: Math.sin(r.t * 2.2) * 0.02 * (1 - Math.min(1, run * 3)),
    };
  }

  // punto (u, v) de la silueta deformado. u ∈ [-0.5, 0.5] (izq→der) · v ∈ [0, 1] (pies→cabeza). Devuelve [x, y] con los pies en (0, 0).
  function deform(P, u, v, W, H, out) {
    let x = u * W * P.sx * P.turn * (1 + (P.bulge + P.breath) * Math.sin(v * Math.PI));
    let y = -v * H * P.sy * (1 - P.bob * 0.4) - P.bob * H * 0.3 * v;
    // pasitos: las esquinas de abajo se levantan y avanzan por turnos
    if (v < 0.01 && P.run > 0.05 && u !== 0) {
      const ph = P.walk + (u < 0 ? 0 : Math.PI);
      y -= Math.max(0, Math.sin(ph)) * H * 0.04 * P.run; x += Math.cos(ph) * W * 0.05 * P.run * P.face;
    }
    x += P.lean * H * 0.55 * Math.pow(v, 1.3);                       // columna
    const hw = smooth(0.45, 1, v); x += P.hx * H * hw; y += P.hy * H * hw;  // cabeza con retraso
    if (P.shake > 0) x += Math.sin(P.t * 70 + v * 4) * H * 0.045 * P.shake * v;
    if (P.effort > 0) { // aspirando: se estira hacia delante y vibra
      x += P.face * P.effort * H * 0.07 * Math.sin(v * Math.PI) * (0.6 + u * P.face) + Math.sin(P.t * 55 + v * 9) * H * 0.006 * P.effort;
    }
    if (P.waddle) { const a = P.waddle, c = Math.cos(a), s = Math.sin(a), nx = x * c - y * s; y = x * s + y * c; x = nx; }
    out[0] = x; out[1] = y; return out;
  }
  function anchor(r, u, v, W, H, o) { return deform(pose(r, o), u, v, W, H, [0, 0]); }

  // ——— texturas en caché (sprite reescalado con margen transparente) ———
  const BUCKETS = [96, 160, 256, 384, 512];
  function tex(im, pxH, variant) {
    const iw = im.width || 1, ih = im.height || 1;
    let th = BUCKETS[BUCKETS.length - 1]; for (const b of BUCKETS) if (b >= pxH) { th = b; break; }
    th = Math.min(th, ih);
    const key = th + (variant || ""), store = im.__rig || (im.__rig = {});
    if (store[key]) return store[key];
    const tw = Math.max(1, Math.round(iw * th / ih)), pad = 2, cv = M.canvas(tw + pad * 2, th + pad * 2), x = cv.getContext("2d");
    if ("imageSmoothingQuality" in x) x.imageSmoothingQuality = "high";
    x.drawImage(im, pad, pad, tw, th);
    if (variant) { // variantes sin filtros en tiempo real (caros en móvil)
      x.globalCompositeOperation = "source-atop";
      x.fillStyle = variant === "flash" ? "rgba(255,255,255,0.6)" : variant === "sugar" ? "rgba(255,170,220,0.4)" : "rgba(255,255,255,0.3)";
      x.fillRect(0, 0, cv.width, cv.height); x.globalCompositeOperation = "source-over";
    }
    cv.tw = tw; cv.th = th; cv.pad = pad; store[key] = cv; return cv;
  }

  // triángulo con textura: recorta el destino y aplica la afín que lleva el origen al destino
  function tri(c, T, s0x, s0y, s1x, s1y, s2x, s2y, d0x, d0y, d1x, d1y, d2x, d2y, grow) {
    const den = s0x * (s1y - s2y) + s1x * (s2y - s0y) + s2x * (s0y - s1y); if (Math.abs(den) < 1e-6) return;
    const a = (d0x * (s1y - s2y) + d1x * (s2y - s0y) + d2x * (s0y - s1y)) / den;
    const b = (d0y * (s1y - s2y) + d1y * (s2y - s0y) + d2y * (s0y - s1y)) / den;
    const cc = (d0x * (s2x - s1x) + d1x * (s0x - s2x) + d2x * (s1x - s0x)) / den;
    const d = (d0y * (s2x - s1x) + d1y * (s0x - s2x) + d2y * (s1x - s0x)) / den;
    const e = (d0x * (s1x * s2y - s2x * s1y) + d1x * (s2x * s0y - s0x * s2y) + d2x * (s0x * s1y - s1x * s0y)) / den;
    const f = (d0y * (s1x * s2y - s2x * s1y) + d1y * (s2x * s0y - s0x * s2y) + d2y * (s0x * s1y - s1x * s0y)) / den;
    // el recorte crece un poco desde el centro para que no se vean costuras
    const cx = (d0x + d1x + d2x) / 3, cy = (d0y + d1y + d2y) / 3;
    const g = (px, py) => { const dx = px - cx, dy = py - cy, l = Math.hypot(dx, dy) || 1; return [px + dx / l * grow, py + dy / l * grow]; };
    const p0 = g(d0x, d0y), p1 = g(d1x, d1y), p2 = g(d2x, d2y);
    c.save(); c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    const bx = Math.max(0, Math.min(s0x, s1x, s2x) - 2), by = Math.max(0, Math.min(s0y, s1y, s2y) - 2);
    const bw = Math.min(T.width, Math.max(s0x, s1x, s2x) + 2) - bx, bh = Math.min(T.height, Math.max(s0y, s1y, s2y) + 2) - by;
    if (bw > 0 && bh > 0) c.drawImage(T, bx, by, bw, bh, bx, by, bw, bh);
    c.restore();
  }

  // LOD adaptativo: si el juego va lento, la malla baja de resolución
  let lod = 0, slow = 0;
  function frame(dtMs) { if (dtMs > 24) slow = Math.min(3, slow + 0.02); else slow = Math.max(0, slow - 0.01); lod = slow > 1.5 ? 1 : slow < 0.5 ? 0 : lod; }

  const P0 = [0, 0], GRID = [];
  // dibuja el sprite con los pies en el origen del contexto. o = { nat, extraLean, quality: "hi"|"lo", variant: "flash"|"sugar" }
  function draw(c, im, W, H, r, o) {
    if (!im || !im.width) return;
    o = o || {};
    let sc = 1; try { const m = c.getTransform && c.getTransform(); if (m) sc = Math.hypot(m.a, m.b) || 1; } catch (e) {}
    const px = H * sc, T = tex(im, px, o.variant);
    const lo = o.quality === "lo" || lod > 0 || px < 90;
    const rows = lo ? 4 : px > 220 ? 7 : 6, cols = lo ? 2 : 3;
    const P = pose(r, o), flip = (P.face || 1) !== (o.nat || 1);
    // vértices
    let k = 0;
    for (let j = 0; j <= rows; j++) { const v = j / rows;
      for (let i = 0; i <= cols; i++) { const u = i / cols - 0.5; deform(P, u, v, W, H, P0);
        const g = GRID[k] || (GRID[k] = [0, 0, 0, 0]);
        g[0] = T.pad + (flip ? 0.5 - u : u + 0.5) * T.tw; g[1] = T.pad + (1 - v) * T.th; g[2] = P0[0]; g[3] = P0[1]; k++; } }
    const grow = 0.75 / sc, C = cols + 1;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const A = GRID[j * C + i], B = GRID[j * C + i + 1], D = GRID[(j + 1) * C + i], E = GRID[(j + 1) * C + i + 1];
      tri(c, T, A[0], A[1], B[0], B[1], E[0], E[1], A[2], A[3], B[2], B[3], E[2], E[3], grow);
      tri(c, T, A[0], A[1], E[0], E[1], D[0], D[1], A[2], A[3], E[2], E[3], D[2], D[3], grow);
    }
  }

  M.Rig = { create, step, hit, pose, deform, anchor, draw, tex, frame, get lod() { return lod; } };
})();
