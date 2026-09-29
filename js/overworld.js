// Mapa del mundo (overworld): grafo procedural por perfil, con ramas que se bifurcan y se reúnen,
// regiones-isla, secretos, eventos, Mash salvajes y niebla sobre lo no descubierto. Crece a medida que avanzas.
window.M = window.M || {};

M.Overworld = (() => {
  const COLW = 150, H = 520, PAD = 110, GAP = 120;
  // eventos del mapa: los "level" son mundos jugables con sorpresa; los demás se resuelven en el propio mapa
  const EVENTS = {
    feria:    { icon: "🍭", name: "Feria de Caramelos", level: true, force: "caramelos", setpiece: "garden", desc: "puestos de feria y caramelos de poder por todas partes" },
    cueva:    { icon: "🔦", name: "Cueva bonus", level: true, force: "chicle", setpiece: "cave", desc: "una cueva a oscuras, llena de chispas y setas-farol" },
    mercader: { icon: "🧺", name: "Mercader de huevos", level: false, desc: "cambia chispas por un huevo de Mash salvaje" },
    amigo:    { icon: "💌", name: "Visita de un amigo", level: false, desc: "un amigo trae noticias… y quizá un secreto" },
  };
  const TYPES = {
    normal:  { icon: "", name: "Mundo", color: null },
    jefe:    { icon: "👑", name: "Guarida del Grumo Mayor", color: "#ffd36b" },
    secreto: { icon: "✨", name: "Rincón secreto", color: "#d9c8ff" },
    salvaje: { icon: "🐾", name: "Claro de los salvajes", color: "#b8f0c8" },
    evento:  { icon: "🎪", name: "Evento", color: "#ffc7dc" },
  };
  const VARIANT = ["Lejana", "Escondida", "de Azúcar Glas", "de los Ecos", "Salvaje", "Dorada", "Nevada", "Dormida"];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex2rgb = (h) => { const n = parseInt(String(h).slice(1), 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, k) => { const A = hex2rgb(a), B = hex2rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
  const regOf = (id) => { const m = /^r(\d+)/.exec(id || ""); return m ? +m[1] : 0; };

  // ——— estado del perfil ———
  function ensure(p) {
    p.map = p.map || { v: 1, done: [], found: [], at: null };
    p.map.done = p.map.done || []; p.map.found = p.map.found || [];
    return p.map;
  }
  function regionMood(p, r) {
    if (M.WorldLife) return M.WorldLife.region(p.worldState, r);
    const ws = p.worldState || {}, g = (o) => (o && o[r] !== undefined ? +o[r] : 0);
    return { bloom: clamp(g(ws.bloom), 0, 1), bitter: clamp(g(ws.bitter), 0, 1), pop: null, visits: 0 };
  }
  function regionInfo(seed, r) {
    const nb = M.BIOMES.length, base = M.BIOMES[r % nb], lap = Math.floor(r / nb), rr = M.rng(seed * 17 + r * 101 + 5);
    const noun = base.noun || base.region.split(" ")[0];
    return { idx: r, base: r % nb, lap, name: lap === 0 ? base.region : noun + " " + VARIANT[(rr.int(0, 99) + lap) % VARIANT.length], color: base.body, top: base.top || base.body };
  }

  // ——— generación de una región: columnas de nodos unidas por caminos que se abren y se juntan ———
  function buildRegion(seed, r, x0) {
    const rr = M.rng(seed * 131 + r * 7919 + 11);
    const mid = r === 0 ? 3 : rr.int(3, 4), T = mid + 2, cols = [], nodes = [];
    const sizes = [1]; for (let c = 1; c <= mid; c++) sizes.push(rr.weighted({ 1: 1.2, 2: 3, 3: 1.4 }) | 0); sizes.push(1);
    if (sizes.slice(1, -1).every((s) => s === 1)) sizes[2] = 2;           // siempre hay al menos una bifurcación
    const yc = H / 2 + Math.sin(r * 1.7 + seed * 0.01) * 28;
    for (let c = 0; c < T; c++) {
      const n = sizes[c], col = [];
      for (let i = 0; i < n; i++) {
        const id = "r" + r + "c" + c + "i" + i;
        const nd = { id, region: r, col: c, x: x0 + PAD + c * COLW + rr.range(-16, 16), y: yc + (i - (n - 1) / 2) * 128 + rr.range(-26, 26),
          type: "normal", event: null, links: [], from: [], index: 4 * r + 1 + Math.round((c / (T - 1)) * 3), seed: M.hash(seed + ":" + id) % 1000000, gimmicks: [] };
        col.push(nd); nodes.push(nd);
      }
      cols.push(col);
    }
    const link = (a, b) => { if (!a.links.includes(b.id)) a.links.push(b.id); if (!b.from.includes(a.id)) b.from.push(a.id); };
    // tipos de nodo
    cols[T - 1][0].type = "jefe";
    for (let c = 1; c < T - 1; c++) {
      cols[c].forEach((nd) => {
        if (r === 0 && c === 1) return;
        const t = rr.weighted({ normal: 6, salvaje: 1.6, evento: 2.1 });
        nd.type = t;
        if (t === "evento") nd.event = rr.weighted({ feria: 1, cueva: 1, mercader: 1.1, amigo: 1.1 });
      });
      // una columna nunca es solo eventos sin mundo: siempre hay algo que jugar
      if (cols[c].every((nd) => nd.event && !EVENTS[nd.event].level)) { cols[c][0].type = "normal"; cols[c][0].event = null; }
    }
    // caminos: correspondencia monótona (sin cruces) + atajos que se bifurcan y se reúnen
    for (let c = 0; c < T - 1; c++) {
      const A = cols[c], B = cols[c + 1], map = (i, a, b) => (a <= 1 ? 0 : Math.round((i * (b - 1)) / (a - 1)));
      A.forEach((a, i) => { if (A.length === 1) B.forEach((b) => link(a, b)); else link(a, B[map(i, A.length, B.length)]); });
      B.forEach((b, j) => { if (!b.from.length) link(A[map(j, B.length, A.length)], b); });
      A.forEach((a, i) => { if (A.length > 1 && B.length > 1 && rr.chance(0.28)) link(a, B[clamp(map(i, A.length, B.length) + rr.pick([-1, 1]), 0, B.length - 1)]); });
    }
    // rincón secreto: un desvío que no sale en el mapa hasta que lo descubres
    const c = rr.int(1, T - 3), parent = rr.pick(cols[c]), target = rr.pick(cols[c + 2]), nxt = cols[c + 1];
    const up = Math.min(...nxt.map((n) => n.y)) - 120, dn = Math.max(...nxt.map((n) => n.y)) + 120;
    const ys = up > 50 && (dn > H - 40 || rr.chance(0.5)) ? up : dn;
    const secId = "r" + r + "s";
    const ab = abilityPool(r, rr);
    const sec = { id: secId, region: r, col: c + 1, x: x0 + PAD + (c + 1) * COLW + rr.range(-10, 10), y: clamp(ys, 40, H - 30), type: "secreto", event: null, links: [], from: [],
      index: Math.min(4 * r + 3, parent.index + 1), seed: M.hash(seed + ":" + secId) % 1000000, gimmicks: [], need: { sparks: 3 + r * 3, ability: ab } };
    nodes.push(sec); link(parent, sec); link(sec, target);
    // mecánicas sugeridas por nodo (el cuento Kids ofrece elegir entre las dos)
    nodes.forEach((nd) => {
      if (nd.type === "jefe") return;
      const gr = M.rng(nd.seed + 7), ev = nd.event && EVENTS[nd.event];
      const pool = Object.keys(M.GIMMICKS || {}).filter((g) => M.GIMMICKS[g].from <= nd.index);
      const g = []; if (ev && ev.force) g.push(ev.force);
      for (let k = 0; k < 8 && g.length < 2 && pool.length; k++) { const x = gr.pick(pool); if (!g.includes(x)) g.push(x); }
      nd.gimmicks = g;
    });
    return { nodes, width: PAD * 2 + (T - 1) * COLW + GAP, entry: cols[0][0], boss: cols[T - 1][0] };
  }
  // el poder que abre el secreto de la región: uno que ya deberías tener a esas alturas
  function abilityPool(r, rr) {
    const ids = (M.RESCUE_ORDER || []).slice(0, Math.max(2, 4 * r + 2));
    const abs = [...new Set(ids.map((id) => M.CAST[id] && M.CAST[id].ability).filter(Boolean))];
    return abs.length ? rr.pick(abs) : null;
  }

  // ——— helpers de equipo ———
  function wildIds(p) { return ((p && p.wild) || []).map((s) => (M.ensureWild ? M.ensureWild(s) : null)).filter(Boolean); }
  function teamAbilities(p) {
    const team = (p.rescued || []).concat(wildIds(p));
    return [...new Set(team.map((id) => M.CAST[id] && M.CAST[id].ability).filter(Boolean))];
  }

  // ——— el grafo completo del perfil ———
  function build(p) {
    const seed = p.seed || 1, st = ensure(p);
    const maxDone = st.done.reduce((m, id) => Math.max(m, regOf(id)), 0);
    const nodes = [], regions = [], byId = {};
    let x0 = 0, prevBoss = null;
    for (let r = 0; r <= maxDone + 2; r++) {
      const R = buildRegion(seed, r, x0), info = regionInfo(seed, r);
      Object.assign(info, regionMood(p, r), { x0, x1: x0 + R.width, entry: R.entry.id, boss: R.boss.id });
      if (prevBoss) { prevBoss.links.push(R.entry.id); R.entry.from.push(prevBoss.id); }
      prevBoss = R.boss; x0 += R.width;
      R.nodes.forEach((n) => { nodes.push(n); byId[n.id] = n; });
      regions.push(info);
    }
    const g = { nodes, byId, regions, width: x0, height: H, root: "r0c0i0" };
    // perfiles antiguos (mapa lineal): marcamos un camino ya recorrido de p.world-1 mundos
    if (!st.migrated) {
      st.migrated = true;
      if (!st.done.length && (p.world || 1) > 1) {
        let n = byId[g.root];
        for (let k = 1; k < p.world && n; k++) { st.done.push(n.id); st.at = n.id; n = byId[n.links.find((id) => byId[id] && byId[id].type !== "secreto")]; }
        return build(p);
      }
    }
    applyState(g, p);
    return g;
  }
  function applyState(g, p) {
    const st = ensure(p), done = new Set(st.done), found = new Set(st.found), W = p.worldState;
    g.nodes.forEach((n) => { n.done = done.has(n.id); n.hidden = n.type === "secreto" && !found.has(n.id) && !n.done; });
    g.nodes.forEach((n) => {
      const reach = n.id === g.root || n.from.some((id) => g.byId[id].done);
      n.state = n.done ? "hecho" : reach && !n.hidden ? "disponible" : "bloqueado";
    });
    // lo que se ve: hecho, disponible y los vecinos siguientes (como silueta); el resto, niebla
    g.nodes.forEach((n) => {
      const nearAvail = n.from.some((id) => g.byId[id].state !== "bloqueado");
      n.seen = !n.hidden && (n.state !== "bloqueado" || nearAvail);
      n.fog = !n.hidden && !n.seen;
      const mood = g.regions[n.region];
      // libre albedrío: en regiones amargas los grumos vuelven a mundos ya limpios
      n.invaded = n.done && n.type === "normal" && mood && mood.bitter > 0.5 && n.seed % 3 === 0;
    });
    g.regions.forEach((R) => { R.reached = g.nodes.some((n) => n.region === R.idx && n.seen); R.bloom = regionMood(p, R.idx).bloom; R.bitter = regionMood(p, R.idx).bitter; });
    g.at = st.at && g.byId[st.at] ? st.at : g.root;
    g.avail = g.nodes.filter((n) => n.state === "disponible").map((n) => n.id);
    void W;
    return g;
  }

  // completar un nodo: lo marca y devuelve los nodos que se acaban de abrir
  function complete(p, id) {
    const before = build(p).avail, st = ensure(p);
    if (!st.done.includes(id)) st.done.push(id);
    st.at = id;
    const g = build(p);
    return { graph: g, opened: g.avail.filter((x) => !before.includes(x)).map((x) => g.byId[x]) };
  }
  // secretos: se revelan con chispas secretas (p.secretSparks) o con el poder adecuado en el equipo
  function checkSecrets(p) {
    const g = build(p), st = ensure(p), abs = teamAbilities(p), out = [];
    g.nodes.forEach((n) => {
      if (!n.hidden || !g.regions[n.region].reached) return;
      const parentSeen = n.from.some((id) => g.byId[id].seen);
      if (!parentSeen) return;
      if ((p.secretSparks || 0) >= n.need.sparks || (n.need.ability && abs.includes(n.need.ability))) { st.found.push(n.id); out.push(n); }
    });
    if (out.length) applyState(g, p);
    return out;
  }
  // revelar un secreto a la fuerza (por ejemplo, un amigo te lo cuenta)
  function revealOne(p) {
    const g = build(p), st = ensure(p);
    const n = g.nodes.find((x) => x.hidden && g.regions[x.region].reached);
    if (!n) return null;
    st.found.push(n.id); return n;
  }

  function nodeName(n) {
    if (!n) return "";
    if (n.event && EVENTS[n.event]) return EVENTS[n.event].name;
    if (n.type === "normal") return "Mundo " + n.index;
    return TYPES[n.type].name;
  }
  function nodeIcon(n) {
    if (n.event && EVENTS[n.event]) return EVENTS[n.event].icon;
    if (n.type !== "normal") return TYPES[n.type].icon;
    const g = n.gimmicks && n.gimmicks[0];
    return g && M.GIMMICKS[g] ? M.GIMMICKS[g].icon : "●";
  }
  const isLevel = (n) => !!n && (!n.event || EVENTS[n.event].level);

  // opciones para M.generate a partir de un nodo
  function genOptions(p, node) {
    const ev = node.event && EVENTS[node.event], rescued = p.rescued || [], r = M.rng(node.seed + 3);
    const friend = (M.RESCUE_ORDER || []).find((id) => !rescued.includes(id)) || (rescued.length ? r.pick(rescued) : "pompon");
    let force = (node.gimmicks && node.gimmicks[0]) || null;
    if (p.age === "baby" && force === "noche") force = node.gimmicks[1] || null;
    return {
      seed: p.seed, nodeSeed: node.seed, index: node.index, region: node.region, nodeType: node.type,
      event: ev && ev.setpiece ? ev.setpiece : null, eventKind: node.event || null, force,
      worldState: p.worldState || null, age: p.age, skill: p.skill, owned: teamAbilities(p), friend,
      visitors: rescued.slice(), recent: p.recent || [], node: node.id,
    };
  }

  // ——— DIBUJO: mapa de plastilina en canvas (ratón, táctil y teclado) ———
  function View(cv, onPick) {
    const ctx = cv.getContext("2d");
    let g = null, p = null, sel = null, raf = 0, W = 0, Hc = 0, dpr = 1, drag = null, hist = {};
    const cam = { x: 0, y: 0, s: 1, tx: null, ty: null }, nube = { x: 0, y: 0, ok: false };
    const imgs = {};
    const img = (src) => { if (!src) return null; let im = imgs[src]; if (!im) { im = imgs[src] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
    const por = (id) => (M.castPortrait ? M.castPortrait(id, 160) : M.portrait ? M.portrait(id) : null);

    function fit() {
      const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - Hc) > 0.5) {
        W = r.width; Hc = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, Hc * dpr);
        cam.s = clamp(Hc / (H + 20), 0.5, 1.35); clampCam(); if (sel) focus(sel, true);
      }
    }
    function clampCam() {
      const ww = (g ? g.width : 800) * cam.s, hh = H * cam.s;
      cam.x = ww < W ? (ww - W) / 2 : clamp(cam.x, -40, ww - W + 40);
      cam.y = hh < Hc ? (hh - Hc) / 2 : clamp(cam.y, -20, hh - Hc + 20);
    }
    function focus(n, now) {
      if (!n) return; const tx = n.x * cam.s - W / 2, ty = n.y * cam.s - Hc / 2;
      if (now) { cam.x = tx; cam.y = ty; cam.tx = null; clampCam(); } else { cam.tx = tx; cam.ty = ty; }
    }
    const toWorld = (px, py) => [(px + cam.x) / cam.s, (py + cam.y) / cam.s];
    function hit(px, py) {
      if (!g) return null; const [wx, wy] = toWorld(px, py); let best = null, bd = 56 * 56;
      g.nodes.forEach((n) => { if (!n.seen) return; const d = (n.x - wx) ** 2 + (n.y - wy) ** 2; if (d < bd) { bd = d; best = n; } });
      return best;
    }
    // entrada
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
    cv.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect(), h = !drag && hit(e.clientX - r.left, e.clientY - r.top);
      cv.style.cursor = drag && drag.moved ? "grabbing" : h ? "pointer" : "grab";
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && dx * dx + dy * dy > 64) drag.moved = true;
      if (drag.moved) { cam.x = drag.cx - dx; cam.y = drag.cy - dy; cam.tx = null; clampCam(); }
    });
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) { const r = cv.getBoundingClientRect(), n = hit(e.clientX - r.left, e.clientY - r.top); if (n) { select(n.id); onPick && onPick(n); } }
      drag = null;
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", () => (drag = null));
    cv.addEventListener("wheel", (e) => { e.preventDefault(); cam.x += e.deltaX + e.deltaY; cam.tx = null; clampCam(); }, { passive: false });

    function set(graph, profile) {
      g = graph; p = profile; hist = {};
      (p.history || []).forEach((h) => { if (h.node) hist[h.node] = h; });
      const at = g.byId[g.at]; if (at && !nube.ok) { nube.x = at.x; nube.y = at.y; nube.ok = true; }
      fit(); clampCam();
    }
    function select(id) { sel = g && g.byId[id] ? g.byId[id] : null; if (sel) focus(sel); }
    // teclado: recorrer los nodos elegibles por orden en el mapa
    function cycle(dir) {
      if (!g) return null;
      const list = g.nodes.filter((n) => n.seen && n.state !== "bloqueado").sort((a, b) => a.x - b.x || a.y - b.y);
      if (!list.length) return null;
      const i = sel ? list.indexOf(sel) : -1, n = list[(i + dir + list.length) % list.length];
      select(n.id); return n;
    }

    // ——— pintura ———
    function blob(circles, color, dy) { ctx.fillStyle = color; ctx.beginPath(); circles.forEach(([x, y, r]) => { ctx.moveTo(x + r, y + dy); ctx.arc(x, y + dy, r, 0, Math.PI * 2); }); ctx.fill(); }
    function cloud(x, y, s, a, t) {
      ctx.fillStyle = "rgba(255,255,255," + a + ")"; ctx.beginPath();
      [[0, 0, 1], [-0.8, 0.2, 0.7], [0.8, 0.25, 0.75], [-0.3, -0.45, 0.65], [0.4, -0.4, 0.6]].forEach(([dx, dy, r]) => { const X = x + dx * s + Math.sin(t * 0.6 + dx * 3) * 4; ctx.moveTo(X + r * s, y + dy * s); ctx.arc(X, y + dy * s, r * s, 0, Math.PI * 2); });
      ctx.fill();
    }
    function emoji(ch, x, y, size) { ctx.font = size + "px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, x, y + size * 0.05); }
    function pill(text, x, y, bg, fg, size) {
      ctx.font = "700 " + size + "px Fredoka, system-ui, sans-serif"; const w = ctx.measureText(text).width + size * 1.4, h = size * 1.7;
      ctx.fillStyle = "rgba(90,50,80,.18)"; rr(x - w / 2, y - h / 2 + 4, w, h, h / 2); ctx.fill();
      ctx.fillStyle = bg; rr(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
      ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 1);
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function islandColor(R) { let c = R.color; if (R.bloom > 0.05) c = mix(c, "#9fe0a8", R.bloom * 0.35); if (R.bitter > 0.05) c = mix(c, "#9d8fae", R.bitter * 0.55); return c; }

    function drawRegion(R, t) {
      const ns = g.nodes.filter((n) => n.region === R.idx && !n.hidden), circles = [];
      ns.forEach((n) => { circles.push([n.x, n.y, 92]); n.links.forEach((id) => { const b = g.byId[id]; if (b && b.region === R.idx && !b.hidden) circles.push([(n.x + b.x) / 2, (n.y + b.y) / 2, 72]); }); });
      const col = islandColor(R);
      blob(circles, "rgba(70,110,140,.16)", 26);
      blob(circles, mix(col, "#6b4f63", 0.28), 14);
      blob(circles, col, 0);
      ctx.globalAlpha = 0.35; blob(circles.map(([x, y, r]) => [x - 8, y - 10, r * 0.72]), "#ffffff", 0); ctx.globalAlpha = 1;
      // flores si florece, grumitos y tormenta si se amarga
      const rng = M.rng(R.idx * 97 + 13);
      if (R.bloom > 0.3) for (let i = 0; i < Math.round(R.bloom * 26); i++) {
        const n = rng.pick(ns), a = rng() * Math.PI * 2, d = 50 + rng() * 34, x = n.x + Math.cos(a) * d, y = n.y + Math.sin(a) * d * 0.8;
        ctx.fillStyle = rng.pick(["#ff9fb6", "#ffe08a", "#c9b6ff", "#ffffff"]);
        for (let k = 0; k < 5; k++) { const b = (k / 5) * Math.PI * 2 + t * 0.2; ctx.beginPath(); ctx.arc(x + Math.cos(b) * 4, y + Math.sin(b) * 4, 3.4, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#ffcf5a"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      if (R.bitter > 0.3) for (let i = 0; i < Math.round(R.bitter * 14); i++) {
        const n = rng.pick(ns), a = rng() * Math.PI * 2, d = 48 + rng() * 34, x = n.x + Math.cos(a) * d, y = n.y + Math.sin(a) * d * 0.8 + Math.sin(t * 3 + i) * 1.5;
        ctx.fillStyle = "#8f7d9e"; ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#2c2030"; ctx.fillRect(x - 3, y - 2, 1.6, 2.2); ctx.fillRect(x + 1.5, y - 2, 1.6, 2.2);
      }
      const top = Math.min(...ns.map((n) => n.y)) - 92, cx = (R.x0 + R.x1 - GAP) / 2;
      if (R.bitter > 0.45) {
        const sx = cx + Math.sin(t * 0.4 + R.idx) * 40, sy = top - 10;
        ctx.strokeStyle = "rgba(120,110,160,.45)"; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) { const x = sx - 40 + i * 13, o = ((t * 60 + i * 17) % 30); ctx.beginPath(); ctx.moveTo(x - o * 0.2, sy + 10 + o); ctx.lineTo(x - 3 - o * 0.2, sy + 20 + o); ctx.stroke(); }
        ctx.save(); ctx.globalAlpha = 0.9; cloud(sx, sy, 26, 0.95, t); ctx.restore();
        ctx.fillStyle = "rgba(140,120,170,.55)"; ctx.beginPath(); ctx.ellipse(sx, sy + 6, 44, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
      const mood = R.bloom > 0.45 ? "🌸 " : R.bitter > 0.45 ? "🥀 " : "";
      pill(mood + R.name, cx, top + 6, "rgba(255,255,255,.92)", "#5b3d52", 15);
    }
    function drawPaths(t) {
      g.nodes.forEach((a) => a.links.forEach((id) => {
        const b = g.byId[id]; if (!b || a.hidden || b.hidden || (!a.seen && !b.seen)) return;
        const both = a.seen && b.seen, done = a.done && (b.done || b.state === "disponible");
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 18 + ((a.seed % 7) - 3) * 4;
        const path = () => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); };
        ctx.lineCap = "round"; ctx.globalAlpha = both ? 1 : 0.45;
        ctx.setLineDash([]); ctx.strokeStyle = "rgba(90,50,80,.14)"; ctx.lineWidth = 16; path(); ctx.stroke();
        ctx.setLineDash([1, 15]); ctx.lineDashOffset = done ? -t * 18 : 0; ctx.strokeStyle = done ? "#ffffff" : "rgba(255,255,255,.8)"; ctx.lineWidth = done ? 9 : 7; path(); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }));
    }
    function drawNode(n, t) {
      const boss = n.type === "jefe", R = boss ? 40 : n.type === "secreto" ? 30 : 33, avail = n.state === "disponible", locked = n.state === "bloqueado";
      const x = n.x, y = n.y + (avail ? Math.sin(t * 3 + n.x) * 3 : 0), reg = g.regions[n.region];
      let base = TYPES[n.type].color || mix(reg.top, "#ffffff", 0.35);
      if (n.event && EVENTS[n.event]) base = n.event === "mercader" ? "#ffe0a8" : n.event === "amigo" ? "#ffd1e3" : "#ffc7dc";
      if (locked) base = mix(base, "#d8ccd6", 0.6);
      ctx.fillStyle = "rgba(60,30,60,.2)"; ctx.beginPath(); ctx.ellipse(x, n.y + R * 0.85, R * 0.95, R * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      if (avail) { const k = (t * 1.3) % 1; ctx.strokeStyle = "rgba(255,111,145," + (0.6 * (1 - k)) + ")"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, R + 6 + k * 16, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = mix(base, "#5b3d52", 0.25); ctx.beginPath(); ctx.arc(x, y + 5, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(x - R * 0.3, y - R * 0.42, R * 0.38, R * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = sel === n ? "#ff6f91" : "#ffffff"; ctx.lineWidth = sel === n ? 6 : 4; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      const h = hist[n.id], im = h && h.friend ? img(por(h.friend)) : null;
      if (n.done && im) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, R - 4, 0, Math.PI * 2); ctx.clip();
        const s = (R * 1.9) / Math.max(im.naturalWidth, im.naturalHeight); ctx.drawImage(im, x - (im.naturalWidth * s) / 2, y - (im.naturalHeight * s) / 2 + 3, im.naturalWidth * s, im.naturalHeight * s); ctx.restore();
      } else {
        ctx.globalAlpha = locked ? 0.55 : 1; ctx.fillStyle = "#5b3d52";
        if (locked && n.type === "normal") { ctx.font = "700 26px Fredoka, system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", x, y + 1); }
        else emoji(nodeIcon(n), x, y, boss ? 30 : 25);
        ctx.globalAlpha = 1;
      }
      if (n.done && h && h.stars) { ctx.font = "700 13px system-ui"; ctx.fillStyle = "#f0b020"; ctx.textAlign = "center"; ctx.fillText("★".repeat(h.stars) + "☆".repeat(Math.max(0, 3 - h.stars)), x, y + R + 14); }
      if (n.done && n.type !== "normal" && !im) { ctx.fillStyle = "#5cc4a4"; ctx.beginPath(); ctx.arc(x + R * 0.7, y - R * 0.7, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "700 13px system-ui"; ctx.textAlign = "center"; ctx.fillText("✓", x + R * 0.7, y - R * 0.68); }
      if (n.invaded) emoji("🥀", x + R * 0.75, y - R * 0.7, 17);
      if (sel === n) pill(nodeName(n), x, y - R - 24, "#ff6f91", "#ffffff", 13);
    }
    function drawNube(t) {
      const target = sel && sel.state !== "bloqueado" ? sel : g.byId[g.at];
      if (!target) return;
      nube.x += (target.x - nube.x) * 0.06; nube.y += (target.y - nube.y) * 0.06;
      const moving = Math.hypot(target.x - nube.x, target.y - nube.y) > 3;
      const hop = moving ? Math.abs(Math.sin(t * 9)) * 16 : Math.sin(t * 2.2) * 3, x = nube.x - 30, y = nube.y - 64 - hop;
      ctx.fillStyle = "rgba(60,30,60,.18)"; ctx.beginPath(); ctx.ellipse(x, nube.y - 20, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      const im = img(M.nubePortrait ? M.nubePortrait() : null), sq = moving ? 1 + Math.sin(t * 18) * 0.05 : 1 + Math.sin(t * 2.2) * 0.02;
      ctx.save(); ctx.translate(x, y + 26); ctx.scale(1 / sq, sq);
      if (im) { const s = 58 / Math.max(im.naturalWidth, im.naturalHeight); ctx.drawImage(im, (-im.naturalWidth * s) / 2, -im.naturalHeight * s, im.naturalWidth * s, im.naturalHeight * s); }
      else { ctx.fillStyle = "#fff"; rr(-20, -44, 40, 38, 10); ctx.fill(); ctx.fillStyle = "#1e1418"; ctx.fillRect(-9, -32, 4, 6); ctx.fillRect(5, -32, 4, 6); ctx.fillStyle = "#e0505a"; ctx.fillRect(-12, -6, 6, 8); ctx.fillRect(6, -6, 6, 8); }
      ctx.restore();
    }
    function draw() {
      raf = requestAnimationFrame(draw);
      if (!g || !cv.isConnected) return;
      fit(); if (!W || !Hc) return;
      const t = performance.now() / 1000;
      if (cam.tx !== null && cam.tx !== undefined) { cam.x += (cam.tx - cam.x) * 0.12; cam.y += (cam.ty - cam.y) * 0.12; clampCam(); if (Math.abs(cam.tx - cam.x) < 0.5) cam.tx = null; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // mar de almíbar
      const sea = ctx.createLinearGradient(0, 0, 0, Hc); sea.addColorStop(0, "#cdeaf1"); sea.addColorStop(1, "#f3e3ee");
      ctx.fillStyle = sea; ctx.fillRect(0, 0, W, Hc);
      ctx.save(); ctx.translate(-cam.x, -cam.y); ctx.scale(cam.s, cam.s);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      const vx0 = cam.x / cam.s - 60, vx1 = (cam.x + W) / cam.s + 60;
      for (let yy = 30; yy < H; yy += 70) for (let xx = Math.floor(vx0 / 180) * 180 + ((yy / 70) % 2) * 90; xx < vx1; xx += 180) {
        const o = Math.sin(t * 0.8 + xx * 0.01 + yy) * 6; ctx.beginPath(); ctx.moveTo(xx + o, yy); ctx.quadraticCurveTo(xx + 12 + o, yy - 7, xx + 24 + o, yy); ctx.quadraticCurveTo(xx + 36 + o, yy + 7, xx + 48 + o, yy); ctx.stroke();
      }
      g.regions.forEach((R) => { if (R.x1 > vx0 - 200 && R.x0 < vx1 + 200) drawRegion(R, t); });
      drawPaths(t);
      g.nodes.forEach((n) => { if (n.seen) drawNode(n, t); });
      // niebla: nubes sobre lo que aún no has descubierto
      g.nodes.forEach((n) => { if (n.fog) { cloud(n.x, n.y, 34, 0.93, t + n.seed); cloud(n.x + 26, n.y + 18, 24, 0.9, t * 1.2 + n.seed); } });
      g.regions.forEach((R) => {
        if (R.reached) return;
        for (let x = R.x0 + 40; x < R.x1; x += 90) for (let y = 70; y < H; y += 110) cloud(x + ((y / 110) % 2) * 40, y, 52, 0.96, t + x * 0.01);
        pill("¿" + (R.lap ? "Tierras lejanas" : "Nueva región") + "?", (R.x0 + R.x1) / 2, H / 2, "rgba(255,255,255,.9)", "#8a6a80", 15);
      });
      drawNube(t);
      ctx.restore();
    }
    return {
      set, select, cycle, focus: (id) => g && focus(g.byId[id]),
      get selected() { return sel; },
      start() { if (!raf) raf = requestAnimationFrame(draw); },
      stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    };
  }

  return { build, applyState, complete, checkSecrets, revealOne, genOptions, nodeName, nodeIcon, isLevel, teamAbilities, wildIds, View, EVENTS, TYPES, H };
})();
