// Generador de mundos v3: regiones, mecánica protagonista por mundo, 3 actos, jefes y adaptación al jugador.
window.M = window.M || {};

M.BIOMES = [
  { id: "pradera", region: "Pradera de Algodón", bgs: ["pradera", "rio"], body: "#a9dcc0", frost: "#fff4dc", top: "#8fd3a6", dots: ["#ffb3c1", "#ffe08a", "#c9b6ff", "#ffffff"],
    sky: ["#bfe6dc", "#f6ecd9"], fog: [242, 238, 222], tint: "rgba(255,244,220,0.14)",
    far: ["arbol_grande", "arbol_isla", "arbol_conejo", "seta_gorda"], back: ["arbol_isla", "arbol_conejo", "arbol_grande", "seta_gorda", "arbol_setas"], front: ["seta_luz", "cactus", "seta_gorda"] },
  { id: "setas", region: "Bosque de Setas", bgs: ["setas", "bosque"], body: "#f5bfa6", frost: "#ffe1e6", top: "#f3a3b5", dots: ["#9ee3cf", "#fff2b3", "#c9b6ff", "#ffffff"],
    sky: ["#d8e8d6", "#f7dfe0"], fog: [246, 226, 222], tint: "rgba(255,214,220,0.1)",
    far: ["seta_arbol", "seta_columnas", "seta_gorda", "seta_luz"], back: ["seta_arbol", "seta_gorda", "seta_columnas", "arbol_setas", "seta_luz"], front: ["seta_luz", "seta_gorda", "seta_columnas"] },
  { id: "aldea", region: "Aldea Plastilina", bgs: ["atardecer"], body: "#f5dc98", frost: "#d8f3e8", top: "#a8d99a", dots: ["#ff9fb6", "#9fd9ff", "#c3f0b4", "#ffffff"],
    sky: ["#f7d9c4", "#f3e3cf"], fog: [250, 228, 206], tint: "rgba(255,210,170,0.12)",
    far: ["castillo", "casitas", "casa_torre", "casa_setas"], back: ["casa_seta", "casa_amarilla", "casa_torre", "casa_setas", "casa_redonda", "casa_blanca", "casa_puerta", "casa_ojos"], front: ["cactus", "seta_luz"] },
  { id: "valle", region: "Valle de las Luces", bgs: ["cueva", "valle"], body: "#cbb8ea", frost: "#fdf0ff", top: "#9fc9c8", dots: ["#fff08a", "#9ff0dc", "#ffb3d9", "#ffffff"],
    sky: ["#bcb4dc", "#e6d6ee"], fog: [214, 204, 232], tint: "rgba(90,70,140,0.14)",
    far: ["castillo", "seta_arbol", "casa_luz", "seta_columnas"], back: ["casa_luz", "seta_luz", "seta_columnas", "seta_arbol", "casa_seta"], front: ["seta_luz", "cactus"] },
];

// Mecánicas protagonistas (se van desbloqueando)
M.GIMMICKS = {
  setas:     { from: 1, icon: "🍄", name: "Setas saltarinas", desc: "setas que te lanzan al cielo" },
  estampida: { from: 2, icon: "🐾", name: "Estampida de grumos", desc: "montones de grumos que aspirar" },
  galletas:  { from: 2, icon: "🍪", name: "Galletas frágiles", desc: "plataformas que se desmoronan" },
  viento:    { from: 3, icon: "🌬️", name: "Viento de azúcar", desc: "ráfagas que te empujan" },
  ascenso:   { from: 3, icon: "🧗", name: "Ascenso", desc: "torres que hay que escalar" },
  lago:      { from: 5, icon: "🍮", name: "Lago de gelatina", desc: "balsas de malvavisco que se hunden" },
  hielo:     { from: 5, icon: "🧊", name: "Escarcha", desc: "suelos resbaladizos y grumos helados" },
  chicle:    { from: 6, icon: "🍬", name: "Cuevas de chicle", desc: "túneles y paredes pegajosas para saltar" },
  caramelos: { from: 6, icon: "🍭", name: "Lluvia de caramelos", desc: "caen caramelos de poder del cielo" },
  noche:     { from: 7, icon: "🌙", name: "Noche de luciérnagas", desc: "oscuridad y setas que brillan" },
};
const NAMES = {
  setas: ["Colinas Saltarinas", "Setal Rebotón", "Prado de los Brincos"], estampida: ["Paso de la Estampida", "Llanura Gruñona", "Camino Alborotado"],
  galletas: ["Puentes de Galleta", "Barranco Crujiente", "Ruinas de Mantequilla"], viento: ["Cumbres del Viento Dulce", "Mirador Soplón", "Llano de las Ráfagas"],
  ascenso: ["Torre Merengue", "Pico de Nata", "Escalera de Nubes"], lago: ["Lago de Gelatina", "Ciénaga de Flan", "Orilla de Natillas"],
  hielo: ["Glaseado Helado", "Cañada Escarchada", "Pista de Azúcar Glas"], chicle: ["Grutas de Chicle", "Túnel Pegajoso", "Cueva Mascada"],
  caramelos: ["Lluvia de Caramelos", "Cielo Goloso", "Chubasco de Gominolas"], noche: ["Bosque de Luciérnagas", "Hondonada Nocturna", "Valle Dormido"],
};

M.generate = function (o) {
  const ageIdx = (a) => M.AGE_ORDER.indexOf(a);
  const A1 = M.AGES[o.age], A2 = o.age2 ? M.AGES[o.age2] : null;
  const soft = A2 && ageIdx(o.age2) < ageIdx(o.age) ? A2 : A1;
  const hard = A2 && ageIdx(o.age2) > ageIdx(o.age) ? A2 : A1;
  const W0 = o.index, r = M.rng(o.seed * 31 + W0 * 7919 + 17);
  const sk = o.skill, owned = o.owned || [], notes = [];
  const region = Math.floor((W0 - 1) / 4) % 4, boss = W0 % 4 === 0;
  const biome = M.BIOMES[region];

  // ——— dificultad adaptativa ———
  let d = 0.18 + Math.min(0.5, (W0 - 1) * 0.04);
  d += M.clamp((1.1 - sk.falls) * 0.1, -0.2, 0.1) + M.clamp((1.4 - sk.hits) * 0.05, -0.12, 0.08);
  d = M.clamp(d, 0.08, 0.95);

  // ——— mecánicas del mundo: evolucionan con el número de mundo y con tu estilo ———
  const avail = Object.keys(M.GIMMICKS).filter((g) => M.GIMMICKS[g].from <= W0 && !(soft.id === "baby" && g === "noche"));
  const recent = (o.recent || []).slice(-3);
  const pref = {
    estampida: 0.8 + Math.min(1.4, sk.stomps / 4 + sk.eats / 3), setas: 1, galletas: 1, viento: 1 + sk.ability / 5, ascenso: 1,
    lago: 1, hielo: 0.9, chicle: 1, caramelos: 0.8 + sk.ability / 4, noche: 0.9,
  };
  const weights = {}; avail.forEach((g) => { weights[g] = pref[g] * (recent.includes(g) ? 0.15 : 1) * (g === M.GIMMICKS_NEW(W0) ? 3 : 1); });
  const count = W0 === 1 ? 1 : W0 < 5 ? 2 : 3;
  const gim = [];
  if (W0 === 1) gim.push("setas");
  while (gim.length < Math.min(count, avail.length)) { const g = r.weighted(weights); if (!gim.includes(g)) gim.push(g); weights[g] = 0; }
  const has = (g) => gim.includes(g);
  const main = gim[0];

  if (sk.worlds > 0) {
    const styles = [[sk.stomps / 4, "👟", "Aplastagrumos"], [sk.ability / 3, "✨", "Estratega de poderes"], [sk.sparks * 2, "⭐", "Coleccionista"],
      [(1.2 - sk.falls) * 1.5, "🤸", "Equilibrista"], [sk.eats / 3, "😋", "Aspirador profesional"]].sort((a, b) => b[0] - a[0]);
    notes.push({ icon: styles[0][1], k: "Tu estilo: " + styles[0][2], v: "el mundo se construye alrededor de eso" });
    if (sk.falls > 1.6) notes.push({ icon: "🫧", k: "Menos abismos", v: "te has caído bastante" });
    else if (sk.falls < 0.4) notes.push({ icon: "🕳️", k: "Huecos más anchos", v: "casi nunca te caes" });
  }
  gim.forEach((g, i) => notes.push({ icon: M.GIMMICKS[g].icon, k: (i ? "También: " : "Protagonista: ") + M.GIMMICKS[g].name, v: M.GIMMICKS[g].desc }));
  if (owned.length) notes.push({ icon: owned.map((a) => M.ABILITIES[a].icon).join(""), k: "Rutas para tus poderes", v: "rincones secretos que solo abre tu equipo" });
  notes.push({ icon: "📈", k: "Dificultad " + Math.round(d * 100) + "%", v: d > 0.45 ? "sube porque vas sobrado" : d < 0.22 ? "suave, para disfrutar" : "a tu medida" });

  const tod = has("noche") ? "night" : soft.id === "baby" ? (r.chance(0.3) ? "dusk" : "day") : region === 3 ? (r.chance(0.5) ? "night" : "dusk") : r.chance(0.25) ? "dusk" : "day";
  const L = {
    seed: o.seed, index: W0, age: soft.id, hardAge: hard.id, d, biome, biomeIdx: region, region, boss, gim, main, tod,
    weather: r.pick(biome.id === "setas" ? ["petals", "spores"] : biome.id === "valle" ? ["fireflies", "spores"] : ["pollen", "petals", "sugar"]),
    bg: r.pick(biome.bgs), name: boss ? "Guarida del Grumo Mayor" : r.pick(NAMES[main]),
    solids: [], plats: [], movers: [], shrooms: [], sparks: [], enemies: [], walls: [], switches: [], giants: [], checks: [], signs: [],
    props: [], dress: [], visitors: [], winds: [], candies: [], spawners: [], secrets: 0, cage: null, exit: null, bossData: null, notes,
  };

  // ——— constructores ———
  let wallId = 0, x = 0, gy = 600, lastCheck = 0;
  const ground = (x1, x2, y, mat = "normal") => { L.solids.push({ x: x1, y, w: x2 - x1, h: 1600 - y, mat }); };
  const block = (x1, y, w, h, mat = "normal") => L.solids.push({ x: x1, y, w, h, mat });
  const plat = (px, y, w, kind = "normal") => L.plats.push({ x: px, y, w, h: 36, kind, y0: y, sink: 0, t: 0, fall: 0, gone: 0 });
  const mover = (px, y, w, dx, dy, period, phase = 0) => L.movers.push({ x0: px, y0: y, x: px, y, w, h: 36, dx, dy, period, phase, vx: 0, vy: 0 });
  const shroom = (px, y, big = false) => L.shrooms.push({ x: px, y, w: 110, squash: 0, big });
  const spark = (px, y, big = false) => L.sparks.push({ x: px, y, got: false, t: r() * 6, big });
  const line = (px, y, n, dx = 60, dy = 0) => { for (let i = 0; i < n; i++) spark(px + i * dx, y + i * dy); };
  const arc = (px, y, n, w, h) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); spark(px + t * w, y - Math.sin(t * Math.PI) * h); } };
  const types = () => { const t = ["plastilina"]; if (W0 >= 2) t.push("moco"); if (W0 >= 3) t.push("volador"); if (W0 >= 5 || has("hielo")) t.push("helado"); if (W0 >= 6 || has("chicle")) t.push("chicle"); return soft.id === "baby" ? ["plastilina", "plastilina", "chicle"] : t; };
  const enemy = (px, y, range, type) => {
    type = type || r.pick(types());
    const e = { x: px, y, x1: px - range, x2: px + range, type, dir: r.chance(0.5) ? -1 : 1, t: r() * 6, state: "walk", st: 0, alive: true, hp: 1, y0: y };
    if (type === "volador") { e.y = y - 170 - r() * 80; e.y0 = e.y; }
    if (type === "gordo") e.hp = 3;
    L.enemies.push(e);
  };
  const wall = (px, y, h, type) => { const w = { id: wallId++, x: px, y: y - h, w: 60, h, type, alive: true, melt: 0 }; L.walls.push(w); return w; };
  const check = (px, y) => L.checks.push({ x: px, y, on: false });
  const sign = (px, y, text) => L.signs.push({ x: px, y, text });
  const candy = (px, y, type) => L.candies.push({ x: px, y, type: type || r.pick(Object.keys(M.CANDIES)), got: false, t: r() * 6 });
  const nEn = (len) => Math.max(1, Math.round((len / 620) * soft.density * (0.6 + d) * (has("estampida") ? 2.2 : 1)));
  const hole = (x1, x2) => { if (!soft.pits) ground(x1, x2, gy + 150, "jelly"); };

  // ——— fragmentos ———
  const C = {
    run() { const len = r.int(560, 900); ground(x, x + len, gy); const n = nEn(len);
      for (let i = 0; i < n; i++) enemy(x + 180 + (i + 0.5) * (len - 260) / n, gy, r.int(60, 140));
      if (r.chance(0.7)) line(x + 120, gy - 70, r.int(3, 6), 60); x += len; },
    gap() { const w = Math.round(M.lerp(110, soft.pits ? 250 + d * 110 : 170, M.clamp(d * r.range(0.7, 1.2), 0, 1)));
      ground(x, x + 200, gy); x += 200; hole(x, x + w); arc(x - 20, gy - 70, Math.max(3, Math.round(w / 60)), w + 40, 90 + w * 0.25); x += w; gy = M.clamp(gy + r.pick([-60, 0, 0, 40]), 460, 640); },
    stairs() { const n = r.int(2, 4), up = gy > 480 ? r.chance(0.65) : false;
      for (let i = 0; i < n; i++) { const w = r.int(180, 260); ground(x, x + w, gy); if (r.chance(0.5)) spark(x + w / 2, gy - 70); x += w; gy = M.clamp(gy + (up ? -1 : 1) * r.int(60, 90), 400, 660); } },
    setas() { ground(x, x + 760, gy); shroom(x + 110, gy); const py = gy - r.int(300, 380); plat(x + 200, py, 240);
      shroom(x + 420, py, true); line(x + 220, py - 60, 3, 60); arc(x + 400, py - 200, 5, 300, 120); if (r.chance(0.5)) enemy(x + 600, gy, 80); x += 760; },
    hop() { ground(x, x + 180, gy); x += 180; const start = x, n = 2 + Math.round(d * 3 * r.range(0.6, 1.1)); let py = gy - 40;
      for (let i = 0; i < n; i++) { x += Math.round(M.lerp(80, 190, d) * r.range(0.8, 1.1)); const w = Math.round(M.lerp(230, 130, d) * r.range(0.85, 1.15));
        py = M.clamp(py + r.int(-90, 70), gy - 260, gy - 10);
        const kind = has("galletas") && soft.id !== "baby" ? (r.chance(0.7) ? "crumble" : "normal") : r.chance(0.3) ? "soft" : "normal";
        plat(x, py, w, kind); line(x + 30, py - 55, Math.max(1, Math.round(w / 70)), 60); x += w; }
      x += Math.round(M.lerp(80, 160, d)); hole(start, x); ground(x, x + 180, gy); x += 180; },
    mover() { ground(x, x + 160, gy); x += 160; const w = r.int(380, 540), start = x; hole(x, x + w);
      mover(x + w * 0.25, gy - 60, 150, w * 0.18, 0, r.range(3, 4.2)); if (w > 450) mover(x + w * 0.62, gy - 110, 140, 0, 70, r.range(3, 3.8), 1);
      line(x + 40, gy - 150, Math.round(w / 90), 90); x = start + w; ground(x, x + 160, gy); x += 160; },
    galletas() { ground(x, x + 160, gy); x += 160; const start = x; let py = gy - 60;
      for (let i = 0; i < 4 + Math.round(d * 2); i++) { const w = r.int(110, 150); plat(x, py, w, soft.id === "baby" ? "soft" : "crumble"); spark(x + w / 2, py - 60); x += w + r.int(40, 90); py = M.clamp(py + r.int(-60, 50), gy - 220, gy - 30); }
      hole(start, x); ground(x, x + 200, gy); x += 200; },
    viento() { // ráfaga que empuja hacia arriba sobre un gran hueco
      ground(x, x + 220, gy); x += 220; const w = r.int(520, 700), start = x; hole(x, x + w);
      L.winds.push({ x1: x + 40, x2: x + w - 40, y1: gy - 700, y2: gy + 200, fx: 380, fy: -1650 });
      arc(x + 40, gy - 260, 7, w - 80, 120); plat(x + w * 0.5 - 70, gy - 90, 140, "soft"); x += w; ground(x, x + 220, gy); x += 220;
      sign(start - 120, gy, "🌬️ ¡Déjate llevar por el viento!"); },
    ascenso() { // torre vertical
      ground(x, x + 900, gy); const base = x; let py = gy, side = 0;
      const floors = 4 + Math.round(d * 3);
      for (let i = 0; i < floors; i++) { py -= r.int(120, 150); side = 1 - side; const px = base + 180 + side * 320 + r.int(-30, 30);
        plat(px, py, r.int(170, 230), has("galletas") && i % 2 ? "crumble" : "normal"); spark(px + 80, py - 60); if (i === floors - 2 && r.chance(0.6)) candy(px + 100, py - 70); }
      block(base + 820, py - 20, 80, gy - py + 20);  // la cima conecta con una meseta
      x += 900; gy = M.clamp(py - 20, 150, 640); ground(x, x + 500, gy); enemy(x + 250, gy, 120); line(x + 60, gy - 70, 5, 70); x += 500;
      // bajada escalonada de vuelta
      while (gy < 560) { const w = r.int(160, 220); gy += r.int(70, 100); ground(x, x + w, gy); x += w; } },
    lago() { ground(x, x + 160, gy); x += 160; const w = r.int(700, 1000), start = x;
      ground(x, x + w, gy + 150, "jelly");
      for (let px = x + 60; px < x + w - 120; px += r.int(170, 230)) plat(px, gy - r.int(0, 40), r.int(110, 150), "raft");
      line(x + 80, gy - 110, Math.round(w / 110), 110); x = start + w; ground(x, x + 180, gy); x += 180; },
    hielo() { const len = r.int(700, 1000); ground(x, x + len, gy, "hielo"); sign(x + 60, gy, soft.id === "baby" ? "¡Resbala! ⛸️" : "¡Hielo resbaladizo!");
      for (let i = 0; i < nEn(len); i++) enemy(x + 300 + i * 220, gy, 120, r.chance(0.7) ? "helado" : undefined); line(x + 200, gy - 60, 6, 80); x += len; },
    chicle() { // cueva con techo y pilares pegajosos para saltar entre paredes
      const len = r.int(900, 1200); ground(x, x + len, gy); block(x, gy - 330, len, 60, "chicle");
      for (let px = x + 220; px < x + len - 200; px += r.int(260, 340)) { block(px, gy - 270 + r.int(0, 60), 50, 180 + r.int(0, 40), "chicle"); enemy(px + 130, gy, 60); }
      line(x + 100, gy - 200, Math.round(len / 120), 120); x += len; },
    caramelos() { const len = r.int(800, 1100); ground(x, x + len, gy); L.spawners.push({ x1: x, x2: x + len, t: 0, every: 1.1 }); candy(x + len / 2, gy - 90);
      for (let i = 0; i < nEn(len); i++) enemy(x + 250 + i * 260, gy, 90); x += len; },
    estampida() { const len = 1000; ground(x, x + len, gy); const n = 4 + Math.round(d * 4);
      for (let i = 0; i < n; i++) enemy(x + 150 + i * (len - 250) / n, gy, 70); if (W0 >= 3 && soft.id !== "baby") enemy(x + len - 180, gy, 60, "gordo");
      arc(x + 200, gy - 90, 8, 600, 120); x += len; },
    noche() { // tramo nocturno: setas saltarinas iluminadas y grumos al acecho
      const len = r.int(700, 900); ground(x, x + len, gy); shroom(x + 200, gy); plat(x + 300, gy - 300, 200); line(x + 320, gy - 360, 3, 60);
      for (let i = 0; i < nEn(len); i++) enemy(x + 450 + i * 180, gy, 80); x += len; },
    gate() { const hasHeat = owned.includes("fuego"), hasBreak = owned.includes("turbo") || owned.includes("gigante");
      const type = hasHeat && (!hasBreak || r.chance(0.5)) ? "azucar" : hasBreak ? "galleta" : r.pick(["azucar", "galleta"]);
      ground(x, x + 820, gy); const w = wall(x + 560, gy, 1100, type);
      if (soft.assist) L.switches.push({ x: x + 420, y: gy, wall: w.id, on: false, big: true });
      else { shroom(x + 150, gy); plat(x + 250, gy - 330, 200); L.switches.push({ x: x + 350, y: gy - 330, wall: w.id, on: false }); line(x + 270, gy - 390, 3, 60); }
      sign(x + 70, gy, M.T("gate", soft.id)); x += 820; },
    giant() { ground(x, x + 900, gy); const pool = o.visitors && o.visitors.length ? o.visitors : ["pompon", "merengue"];
      L.giants.push({ x: x + 460, y: gy, id: r.pick(pool), awake: false, t: 0, wake: 0, squash: 0 }); sign(x + 160, gy, M.T("giant", soft.id)); line(x + 380, gy - 330, 3, 60); x += 900; },
    visitor() { ground(x, x + 600, gy); L.visitors.push({ id: r.pick(o.visitors), x: x + 320, y: gy, t: r() * 6, talked: false }); x += 600; },
    bonus() { const ab = r.pick(owned); ground(x, x + 760, gy);
      if (["volar", "burbuja", "modelar"].includes(ab)) { const py = gy - (soft.id === "baby" ? 330 : 480); plat(x + 340, py, 220); arc(x + 330, py - 50, 5, 240, 40); spark(x + 450, py - 110, true); sign(x + 120, gy, M.ABILITIES[ab].icon + " ¡Allá arriba!"); }
      else { const t = ab === "fuego" ? "azucar" : ab === "azucar" ? "azucar" : "galleta"; wall(x + 380, gy, 190, t); wall(x + 620, gy, 190, t);
        block(x + 370, gy - 230, 320, 44); block(x + 250, gy - 110, 90, 110);
        line(x + 470, gy - 60, 3, 50); spark(x + 530, gy - 120, true); sign(x + 120, gy, M.ABILITIES[ab].icon + " Algo brilla dentro…"); }
      L.secrets++; x += 760; },
  };

  // ——— estructura en 3 actos ———
  ground(-500, 700, gy); sign(260, gy, (boss ? "👑 " : M.GIMMICKS[main].icon + " ") + L.name); x = 700;
  if (W0 === 1) { sign(560, gy, soft.id === "baby" ? "¡Mantén X y cómete a los grumos! 😋" : "Mantén X para aspirar grumos"); }
  const len = Math.round((4 + W0 * 0.22) * soft.worldLen + d * 2);
  const general = ["run", "gap", "stairs", "hop", "mover"];
  const seq = [];
  if (!boss) {
    // Acto I: presentación suave de la mecánica
    seq.push("run", gim[0]);
    // Acto II: desarrollo, mezcla de mecánicas y fragmentos generales
    for (let i = 0; i < len; i++) seq.push(r.chance(0.55) ? r.pick(gim) : r.pick(general));
    // Acto III: momento especial
    seq.splice(Math.floor(seq.length * 0.45), 0, "gate");
    if (soft.id === "baby" || r.chance(0.65)) seq.splice(Math.floor(seq.length * 0.7), 0, o.visitors && o.visitors.length && r.chance(0.5) ? "visitor" : "giant");
    if (owned.length) seq.splice(Math.floor(seq.length * 0.6), 0, "bonus");
    if (!seq.includes("gap") && !seq.includes("hop")) seq.splice(2, 0, "gap");
  } else seq.push("run", r.pick(general), gim[0] === "setas" ? "setas" : "run");
  let candyPlaced = false;
  seq.forEach((k, i) => {
    C[k]();
    if (!candyPlaced && i >= seq.length / 2 && W0 > 1) { ground(x, x + 260, gy); candy(x + 130, gy - 90); candyPlaced = true; x += 260; }
    if (x - lastCheck > 1500) { ground(x, x + 220, gy); check(x + 110, gy); lastCheck = x; x += 220; }
  });

  // ——— final: rescate o jefe ———
  if (boss) {
    gy = 600; ground(x, x + 1700, gy); block(x - 40, gy - 900, 40, 900); check(x + 120, gy);
    L.bossData = { x: x + 1100, y: gy, arena: [x + 40, x + 1600], friend: o.friend, hp: soft.bossHP + (hard === soft ? 0 : 1), maxHp: soft.bossHP, state: "sleep", t: 0 };
    L.cage = null; L.exit = { x: x + 1500, y: gy }; x += 1700;
  } else {
    ground(x, x + 1100, gy);
    L.cage = { x: x + 450, y: gy - 20, friend: o.friend, open: false, t: 0, wobble: 0 };
    arc(x + 150, gy - 80, 5, 200, 60); L.exit = { x: x + 900, y: gy }; x += 1100;
  }
  ground(x, x + 700, gy); L.end = x + 600;
  dress(L, o, r);
  L.sparkTotal = L.sparks.length; L.chunks = seq;
  return L;
};
M.GIMMICKS_NEW = (w) => Object.keys(M.GIMMICKS).find((g) => M.GIMMICKS[g].from === w);

// ——— vestir el mundo: capas de decorado, flora por delante y por detrás ———
function dress(L, o, r0) {
  const b = L.biome, dr = M.rng(o.seed + L.index * 131), busy = (px) => L.walls.some((w) => Math.abs(w.x - px) < 160) || L.giants.some((g) => Math.abs(g.x - px) < 260) || (L.cage && Math.abs(L.cage.x - px) < 230) || L.signs.some((s) => Math.abs(s.x - px) < 110) || (L.bossData && px > L.bossData.arena[0] && px < L.bossData.arena[1]);
  // capa lejana y media-lejana
  for (let fx = -600; fx < L.end * 0.45 + 1200; fx += 200 + dr() * 220) L.props.push({ layer: "far", key: dr.pick(b.far), x: fx, y: 552 + dr() * 30, h: 170 + dr() * 110, flip: dr() < 0.5 });
  for (let fx = -600; fx < L.end * 0.7 + 1200; fx += 380 + dr() * 380) L.props.push({ layer: "midfar", key: dr.pick(b.back), x: fx, y: 634 + dr() * 34, h: 260 + dr() * 160, flip: dr() < 0.5 });
  L.solids.forEach((s) => {
    const rr = M.rng((s.x | 0) + 77 + o.seed);
    s.balls = []; s.drips = []; s.back = []; s.front = [];
    for (let bx = s.x + 24; bx < s.x + s.w - 24; bx += 38 + rr() * 70) s.drips.push({ x: bx, len: 10 + rr() * 26, w: 9 + rr() * 8 });
    if (s.mat === "jelly" || s.h < 200 || s.mat === "chicle") return;
    // decorados grandes detrás del terreno
    if (s.w >= 260) for (let px = s.x + 80 + dr() * 160; px < s.x + s.w - 80; px += 360 + dr() * 380) {
      if (busy(px)) continue;
      const key = dr.pick(b.back), h = 230 + dr() * 190, man = window.MANIFEST ? window.MANIFEST.props[key] : null, w = man ? h * man[0] / man[1] : h;
      if (px - w * 0.42 < s.x + 10 || px + w * 0.42 > s.x + s.w - 10) continue;   // no puede sobresalir sobre un hueco
      L.props.push({ layer: "back", key, x: px, y: s.y + 30, h, flip: dr() < 0.5 });
    }
    // flora del borde: fila trasera (detrás de los personajes) y delantera (tapa los pies)
    const ice = s.mat === "hielo";
    for (let px = s.x + 14; px < s.x + s.w - 14; px += 22 + rr() * 46) {
      const kind = ice ? "cristal" : rr.weighted({ mata: 6, flor: 3, seta: 1.2, piedra: 1.2, arbusto: 1, cristal: 0.3, farol: L.tod === "night" ? 1.2 : 0 });
      const big = kind === "seta" || kind === "arbusto" || kind === "farol";
      s.back.push({ x: px, kind, i: (rr() * 8) | 0, sc: big ? 0.45 + rr() * 0.3 : 0.6 + rr() * 0.35, flip: rr() < 0.5 });
    }
    for (let px = s.x + 30; px < s.x + s.w - 30; px += 70 + rr() * 150) {
      if (busy(px) && rr() < 0.7) continue;
      const kind = ice ? "cristal" : rr.weighted({ mata: 5, flor: 3, seta: 0.7, piedra: 1.5, farol: L.tod === "night" ? 0.5 : 0 });
      s.front.push({ x: px, kind, i: (rr() * 8) | 0, sc: kind === "seta" || kind === "farol" ? 0.45 + rr() * 0.25 : 0.7 + rr() * 0.4, flip: rr() < 0.5, dy: 16 + rr() * 12 });
    }
    // de vez en cuando, un decorado nítido delante del camino: el personaje pasa por detrás
    if (s.w >= 400) for (let px = s.x + 200 + dr() * 300; px < s.x + s.w - 150; px += 900 + dr() * 900) {
      if (busy(px)) continue; L.dress.push({ key: dr.pick(b.front), x: px, y: s.y + 26, h: 150 + dr() * 90, flip: dr() < 0.5, sy: s.y });
    }
  });
  // primer plano extremo desenfocado
  for (let fx = 300; fx < L.end * 1.3; fx += 700 + dr() * 800) L.props.push({ layer: "front", key: dr.pick(b.front), x: fx, y: 960 + dr() * 50, h: 320 + dr() * 90, flip: dr() < 0.5 });
  const order = { far: 0, midfar: 1, back: 2, front: 3 };
  L.props.sort((a, c) => order[a.layer] - order[c.layer] || a.x - c.x);
}
