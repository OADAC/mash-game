// Generador de mundos v5 "Vivo": gramática de intensidad (calma → tensión → clímax → respiro), set pieces,
// rutas alternativas, secretos de verdad, biomas procedurales, mundo evolutivo (worldState) y Mash salvajes.
window.M = window.M || {};

// ——— biomas base (los 4 de siempre). Las variantes se generan mezclándolos: ver M.makeBiome ———
M.BIOMES = [
  { id: "pradera", region: "Pradera de Algodón", noun: "Pradera", compl: "de Algodón", kit: "bosque", bgs: ["pradera", "rio"], body: "#a9dcc0", frost: "#fff4dc", top: "#8fd3a6", dots: ["#ffb3c1", "#ffe08a", "#c9b6ff", "#ffffff"],
    sky: ["#bfe6dc", "#f6ecd9"], fog: [242, 238, 222], tint: "rgba(255,244,220,0.14)",
    flora: { leaf: "#8fd3a6", caps: ["#ff9fb6", "#ffb08a", "#ffd36b", "#c9b6ff"], flowers: ["#ff9fb6", "#ffffff", "#ffd36b", "#b9a3ff"], stones: ["#e9dccf", "#d6e9df", "#f2d7dd"] },
    far: ["arbol_grande", "arbol_isla", "arbol_conejo", "seta_gorda"], back: ["arbol_isla", "arbol_conejo", "arbol_grande", "seta_gorda", "arbol_setas"], front: ["seta_luz", "cactus", "seta_gorda"] },
  { id: "setas", region: "Bosque de Setas", noun: "Bosque", compl: "de Setas", kit: "setal", bgs: ["setas", "bosque"], body: "#f5bfa6", frost: "#ffe1e6", top: "#f3a3b5", dots: ["#9ee3cf", "#fff2b3", "#c9b6ff", "#ffffff"],
    sky: ["#d8e8d6", "#f7dfe0"], fog: [246, 226, 222], tint: "rgba(255,214,220,0.1)",
    flora: { leaf: "#9fd8b8", caps: ["#ff8fab", "#ff9f7a", "#9fd9ff", "#c9b6ff", "#ffd36b"], flowers: ["#ffffff", "#ffb3c7", "#9ff0dc"], stones: ["#f0d9d0", "#e3d4ea"] },
    far: ["seta_arbol", "seta_columnas", "seta_gorda", "seta_luz"], back: ["seta_arbol", "seta_gorda", "seta_columnas", "arbol_setas", "seta_luz"], front: ["seta_luz", "seta_gorda", "seta_columnas"] },
  { id: "aldea", region: "Aldea Plastilina", noun: "Aldea", compl: "Plastilina", kit: "aldea", bgs: ["atardecer"], body: "#f5dc98", frost: "#d8f3e8", top: "#a8d99a", dots: ["#ff9fb6", "#9fd9ff", "#c3f0b4", "#ffffff"],
    sky: ["#f7d9c4", "#f3e3cf"], fog: [250, 228, 206], tint: "rgba(255,210,170,0.12)",
    flora: { leaf: "#a8d99a", caps: ["#ff9fb6", "#9fd9ff", "#ffc36b"], flowers: ["#ff9fb6", "#9fd9ff", "#ffffff", "#ffe08a"], stones: ["#efe0c8", "#e0e8d6"] },
    far: ["castillo", "casitas", "casa_torre", "casa_setas"], back: ["casa_seta", "casa_amarilla", "casa_torre", "casa_setas", "casa_redonda", "casa_blanca", "casa_puerta", "casa_ojos"], front: ["cactus", "seta_luz"] },
  { id: "valle", region: "Valle de las Luces", noun: "Valle", compl: "de las Luces", kit: "luces", bgs: ["cueva", "valle"], body: "#cbb8ea", frost: "#fdf0ff", top: "#9fc9c8", dots: ["#fff08a", "#9ff0dc", "#ffb3d9", "#ffffff"],
    sky: ["#bcb4dc", "#e6d6ee"], fog: [214, 204, 232], tint: "rgba(90,70,140,0.14)",
    flora: { leaf: "#9fc9c8", caps: ["#b9a3ff", "#9ff0dc", "#ff9fd0", "#fff08a"], flowers: ["#fff08a", "#9ff0dc", "#ffb3d9"], stones: ["#d8cdea", "#c9dbe6"] },
    far: ["castillo", "seta_arbol", "casa_luz", "seta_columnas"], back: ["casa_luz", "seta_luz", "seta_columnas", "seta_arbol", "casa_seta"], front: ["seta_luz", "cactus"] },
];
M.BIOMES.forEach((b) => (b.base = b.id));

// conjuntos de decorado que se combinan entre biomas
M.KITS = {
  bosque:   { far: ["arbol_grande", "arbol_isla", "arbol_conejo"], back: ["arbol_isla", "arbol_conejo", "arbol_grande", "arbol_setas"], front: ["seta_gorda", "cactus"] },
  setal:    { far: ["seta_arbol", "seta_columnas", "seta_gorda"], back: ["seta_arbol", "seta_gorda", "seta_columnas", "arbol_setas", "seta_luz"], front: ["seta_luz", "seta_columnas"] },
  aldea:    { far: ["casitas", "casa_torre", "casa_setas", "castillo"], back: ["casa_seta", "casa_amarilla", "casa_torre", "casa_setas", "casa_redonda", "casa_blanca", "casa_puerta", "casa_ojos"], front: ["cactus", "seta_luz"] },
  luces:    { far: ["castillo", "casa_luz", "seta_luz"], back: ["casa_luz", "seta_luz", "seta_columnas", "casa_seta"], front: ["seta_luz"] },
  desierto: { far: ["arbol_isla", "seta_gorda"], back: ["cactus", "arbol_isla", "seta_gorda"], front: ["cactus"] },
  castillo: { far: ["castillo", "casitas", "casa_torre"], back: ["casa_torre", "casa_blanca", "arbol_grande"], front: ["seta_gorda", "cactus"] },
};

// clima: el id "weather" es el que ya entiende el motor (partículas de ambiente); "climate" lo dibuja M.Events
M.CLIMATES = {
  calma:       { name: "Brisa tranquila", icon: "🍃", weather: "pollen" },
  azucar:      { name: "Lluvia de azúcar", icon: "🌧️", weather: "sugar", climate: "rain" },
  nata:        { name: "Niebla de nata", icon: "🌫️", weather: "pollen", climate: "fog" },
  petalos:     { name: "Pétalos al viento", icon: "🌸", weather: "petals", climate: "petals" },
  coco:        { name: "Nieve de coco", icon: "❄️", weather: "sugar", climate: "snow" },
  luciernagas: { name: "Luciérnagas", icon: "✨", weather: "fireflies", climate: "fireflies" },
  esporas:     { name: "Esporas flotantes", icon: "🫧", weather: "spores" },
};
M.LIGHTS = { alba: { tod: "day", icon: "🌄", name: "alba" }, dia: { tod: "day", icon: "☀️", name: "día" }, tarde: { tod: "dusk", icon: "🌅", name: "atardecer" }, noche: { tod: "night", icon: "🌙", name: "noche" } };

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
// Set pieces: momentos memorables que cierran cada arco de intensidad
M.SETPIECES = {
  chase:  { from: 2, icon: "😱", name: "Persecución", desc: "un grumo gigante te persigue" },
  bridge: { from: 2, icon: "🌉", name: "Puente que se desmorona", desc: "no mires atrás" },
  tower:  { from: 3, icon: "🗼", name: "Torre del viento", desc: "una corriente que te sube" },
  cave:   { from: 3, icon: "🔦", name: "Cueva oscura", desc: "setas-farol en la penumbra" },
  flood:  { from: 4, icon: "🌊", name: "Gelatina que sube", desc: "carrera hacia arriba" },
  arena:  { from: 3, icon: "⚔️", name: "Arena de grumos", desc: "oleadas y premio" },
  garden: { from: 1, icon: "🌷", name: "Jardín secreto", desc: "flores, chispas y alguien raro" },
};
const NAMES = {
  setas: ["Colinas Saltarinas", "Setal Rebotón", "Prado de los Brincos"], estampida: ["Paso de la Estampida", "Llanura Gruñona", "Camino Alborotado"],
  galletas: ["Puentes de Galleta", "Barranco Crujiente", "Ruinas de Mantequilla"], viento: ["Cumbres del Viento Dulce", "Mirador Soplón", "Llano de las Ráfagas"],
  ascenso: ["Torre Merengue", "Pico de Nata", "Escalera de Nubes"], lago: ["Lago de Gelatina", "Ciénaga de Flan", "Orilla de Natillas"],
  hielo: ["Glaseado Helado", "Cañada Escarchada", "Pista de Azúcar Glas"], chicle: ["Grutas de Chicle", "Túnel Pegajoso", "Cueva Mascada"],
  caramelos: ["Lluvia de Caramelos", "Cielo Goloso", "Chubasco de Gominolas"], noche: ["Bosque de Luciérnagas", "Hondonada Nocturna", "Valle Dormido"],
};
// gramática de nombres: [palabra, femenino, plural]
const NOUNS = {
  setas: [["Colinas", 1, 1], ["Setal", 0, 0], ["Prado", 0, 0], ["Laderas", 1, 1]], estampida: [["Llanura", 1, 0], ["Paso", 0, 0], ["Camino", 0, 0], ["Explanada", 1, 0]],
  galletas: [["Puentes", 0, 1], ["Barranco", 0, 0], ["Ruinas", 1, 1], ["Cornisa", 1, 0]], viento: [["Cumbres", 1, 1], ["Mirador", 0, 0], ["Llano", 0, 0], ["Collado", 0, 0]],
  ascenso: [["Torre", 1, 0], ["Pico", 0, 0], ["Escalera", 1, 0], ["Riscos", 0, 1]], lago: [["Lago", 0, 0], ["Ciénaga", 1, 0], ["Orilla", 1, 0], ["Bahía", 1, 0]],
  hielo: [["Cañada", 1, 0], ["Pista", 1, 0], ["Glaciar", 0, 0], ["Terrazas", 1, 1]], chicle: [["Grutas", 1, 1], ["Túnel", 0, 0], ["Cueva", 1, 0], ["Madrigueras", 1, 1]],
  caramelos: [["Cielo", 0, 0], ["Huerto", 0, 0], ["Plaza", 1, 0], ["Jardines", 0, 1]], noche: [["Hondonada", 1, 0], ["Bosque", 0, 0], ["Valle", 0, 0], ["Senda", 1, 0]],
};
const ADJS = {
  setas: [["Saltarín", "Saltarina", "Saltarines", "Saltarinas"], ["Rebotón", "Rebotona", "Rebotones", "Rebotonas"]], estampida: [["Gruñón", "Gruñona", "Gruñones", "Gruñonas"], ["Alborotado", "Alborotada", "Alborotados", "Alborotadas"]],
  galletas: [["Crujiente", "Crujiente", "Crujientes", "Crujientes"], ["Quebradizo", "Quebradiza", "Quebradizos", "Quebradizas"]], viento: [["Soplón", "Soplona", "Soplones", "Soplonas"], ["Ventoso", "Ventosa", "Ventosos", "Ventosas"]],
  ascenso: [["Empinado", "Empinada", "Empinados", "Empinadas"], ["Altísimo", "Altísima", "Altísimos", "Altísimas"]], lago: [["Tembloroso", "Temblorosa", "Temblorosos", "Temblorosas"], ["Gelatinoso", "Gelatinosa", "Gelatinosos", "Gelatinosas"]],
  hielo: [["Escarchado", "Escarchada", "Escarchados", "Escarchadas"], ["Glaseado", "Glaseada", "Glaseados", "Glaseadas"]], chicle: [["Pegajoso", "Pegajosa", "Pegajosos", "Pegajosas"], ["Mascado", "Mascada", "Mascados", "Mascadas"]],
  caramelos: [["Goloso", "Golosa", "Golosos", "Golosas"], ["Azucarado", "Azucarada", "Azucarados", "Azucaradas"]], noche: [["Dormido", "Dormida", "Dormidos", "Dormidas"], ["Nocturno", "Nocturna", "Nocturnos", "Nocturnas"]],
};
const COMPL = ["de Flan", "de Nata", "de Merengue", "de Gominola", "de Caramelo", "de Azúcar Glas", "de los Mil Grumos", "de la Luna Blandita", "de las Nubes", "del Algodón", "de Mantequilla", "de Regaliz", "de los Susurros", "del Viejo Pompón"];
const MOOD_ADJ = {
  bitter: ["Amargo", "Amarga", "Amargos", "Amargas"], bloom: ["Florido", "Florida", "Floridos", "Floridas"], coco: ["Nevado", "Nevada", "Nevados", "Nevadas"],
  nata: ["Brumoso", "Brumosa", "Brumosos", "Brumosas"], azucar: ["Lluvioso", "Lluviosa", "Lluviosos", "Lluviosas"], noche: ["Nocturno", "Nocturna", "Nocturnos", "Nocturnas"],
};

// ——— utilidades de color ———
M.Col = (() => {
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgb2hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  function rgb2hsl(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h * 360, s, l]; }
  function hsl2rgb(h, s, l) { h = (((h % 360) + 360) % 360) / 360; if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
  const mix = (a, b, k) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * k)); };
  const adj = (hex, dh, ds, dl) => { const [h, s, l] = rgb2hsl(hex2rgb(hex)); return rgb2hex(hsl2rgb(h + (dh || 0), Math.max(0, Math.min(1, s * (ds === undefined ? 1 : ds))), Math.max(0, Math.min(1, l + (dl || 0))))); };
  return { hex2rgb, rgb2hex, mix, adj, rgb2hsl };
})();

// ——— bioma procedural: mezcla de paletas, luz, ánimo de la región y conjuntos de decorado ———
M.makeBiome = function (base, r, o) {
  const Cc = M.Col, M2 = o.mixWith || null, k = o.mixK || 0, bloom = o.bloom || 0, bitter = o.bitter || 0;
  const sat = 1 + bloom * 0.22 - bitter * 0.5, lig = bloom * 0.015 - bitter * 0.05, hue = o.hue || 0;
  const tone = (hex) => Cc.adj(hex, hue, sat, lig);
  const pick2 = (key) => (M2 ? Cc.mix(base[key], M2[key], k) : base[key]);
  const grey = (hex, g) => (g > 0 ? Cc.mix(hex, "#a39c94", g) : hex);
  let sky = [0, 1].map((i) => tone(M2 ? Cc.mix(base.sky[i], M2.sky[i], k) : base.sky[i]));
  const L = o.light || "dia";
  if (L === "alba") sky = [Cc.mix(sky[0], "#ffc9d6", 0.42), Cc.mix(sky[1], "#fff0d0", 0.5)];
  if (L === "tarde") sky = [Cc.mix(sky[0], "#f7a88f", 0.38), Cc.mix(sky[1], "#f3d0e0", 0.32)];
  if (L === "noche") sky = [Cc.mix(sky[0], "#4b3f7a", 0.55), Cc.mix(sky[1], "#8a78b8", 0.42)];
  if (bitter > 0.2) sky = sky.map((s) => Cc.mix(s, "#9a93a8", bitter * 0.35));
  const fogHex = Cc.mix(M2 ? Cc.mix(Cc.rgb2hex(base.fog), Cc.rgb2hex(M2.fog), k) : Cc.rgb2hex(base.fog), sky[1], 0.3);
  const tint = L === "alba" ? "rgba(255,200,210,0.12)" : L === "tarde" ? "rgba(255,190,150,0.13)" : L === "noche" ? "rgba(70,60,140,0.16)" : base.tint;
  const bf = base.flora, of = M2 ? M2.flora : null;
  const flora = {
    leaf: grey(tone(of ? Cc.mix(bf.leaf, of.leaf, k) : bf.leaf), bitter * 0.55),
    caps: bf.caps.concat(of && k > 0.25 ? of.caps.slice(0, 2) : []).map((c) => grey(tone(c), bitter * 0.5)),
    flowers: bf.flowers.concat(of && k > 0.25 ? of.flowers.slice(0, 2) : []).map((c) => grey(tone(c), bitter * 0.5)),
    stones: bf.stones.map((c) => grey(tone(c), bitter * 0.3)), wilt: bitter,
  };
  // decorados: el kit propio, a veces otro kit, y casas si la región florece
  const kits = [o.kit || base.kit]; if (o.kit2) kits.push(o.kit2); if (bloom > 0.45 && !kits.includes("aldea")) kits.push("aldea");
  const uni = (a) => [...new Set(a)];
  const far = uni(base.far.concat(...kits.map((q) => M.KITS[q].far))), back = uni(kits.flatMap((q) => M.KITS[q].back).concat(base.back.slice(0, 2)));
  const front = uni(base.front.concat(...kits.map((q) => M.KITS[q].front)));
  const id = base.id + "_" + M.hash([base.id, M2 ? M2.id : "", Math.round(k * 20), Math.round(hue), Math.round(bloom * 10), Math.round(bitter * 10), L].join("|")).toString(36).slice(0, 6);
  const region = M2 && k > 0.28 ? base.noun + " " + M2.compl : base.region;
  return {
    id, base: base.id, region, noun: base.noun, compl: base.compl, kit: kits[0], kits, bgs: uni(base.bgs.concat(M2 && k > 0.35 ? M2.bgs : [])),
    body: tone(pick2("body")), frost: tone(pick2("frost")), top: grey(tone(pick2("top")), bitter * 0.35), dots: base.dots.map(tone),
    sky, fog: Cc.hex2rgb(fogHex), tint, flora, far, back, front, variant: true, mixWith: M2 ? M2.id : null,
  };
};

// ——— memoria evolutiva del mundo: helpers para la UI (D) ———
M.WorldLife = {
  empty() { return { bloom: {}, bitter: {}, grumoPop: {}, wildMet: [], events: [], visits: {}, day: 0 }; },
  // Estado de una región leído de forma segura
  region(ws, i) {
    ws = ws || {}; const g = (o) => (o && o[i] !== undefined ? +o[i] : 0);
    const pop = ws.grumoPop && ws.grumoPop[i] !== undefined ? +ws.grumoPop[i] : null;
    return { bloom: M.clamp(g(ws.bloom), 0, 1), bitter: M.clamp(g(ws.bitter), 0, 1), pop, visits: g(ws.visits) };
  },
  // Tras cada mundo. info = { region, cleared: 0..1 (grumos vencidos / total), rescued: bool, grumosLeft, wildMet: [seeds], events: [tipos], nRegions }
  // Devuelve noticias [{ region, icon, text }] de lo que ha cambiado "por sí solo".
  afterWorld(ws, info) {
    ws = ws || M.WorldLife.empty(); ["bloom", "bitter", "grumoPop", "visits"].forEach((k) => (ws[k] = ws[k] || {}));
    ws.wildMet = ws.wildMet || []; ws.events = ws.events || []; ws.day = (ws.day || 0) + 1;
    const i = info.region || 0, cl = M.clamp(info.cleared === undefined ? 0.5 : info.cleared, 0, 1);
    ws.visits[i] = (ws.visits[i] || 0) + 1;
    ws.bloom[i] = M.clamp((ws.bloom[i] || 0) + 0.08 + cl * 0.2 + (info.rescued ? 0.05 : 0), 0, 1);
    ws.bitter[i] = M.clamp((ws.bitter[i] || 0) - 0.1 - cl * 0.2, 0, 1);
    ws.grumoPop[i] = Math.max(0, Math.round(info.grumosLeft !== undefined ? info.grumosLeft : (ws.grumoPop[i] || 20) * (1 - cl * 0.6)));
    (info.wildMet || []).forEach((s) => { if (!ws.wildMet.includes(s)) ws.wildMet.push(s); });
    if (info.events && info.events.length) ws.events = ws.events.concat(info.events.map((t) => ({ day: ws.day, region: i, type: t }))).slice(-40);
    return M.WorldLife.drift(ws, info.nRegions || 4, i);
  },
  // "Libre albedrío": las regiones que no visitas cambian solas (se amargan despacio, o florecen por sorpresa).
  drift(ws, nRegions, current) {
    const r = M.rng(((ws.day || 0) + 1) * 7919 + nRegions * 31), news = [];
    for (let i = 0; i < nRegions; i++) {
      if (i === current) continue;
      ws.bloom[i] = M.clamp((ws.bloom[i] || 0) - 0.02, 0, 1);
      ws.bitter[i] = M.clamp((ws.bitter[i] || 0) + 0.025 + (1 - (ws.bloom[i] || 0)) * 0.03 * r(), 0, 1);
      ws.grumoPop[i] = Math.round((ws.grumoPop[i] === undefined ? 20 : ws.grumoPop[i]) + r.int(0, 2));
    }
    if (r.chance(0.3) && nRegions > 1) {
      let i = r.int(0, nRegions - 1); if (i === current) i = (i + 1) % nRegions;
      const name = (M.BIOMES[i % M.BIOMES.length] || M.BIOMES[0]).region;
      if (r.chance(0.55)) { ws.bloom[i] = M.clamp((ws.bloom[i] || 0) + 0.2, 0, 1); ws.bitter[i] = M.clamp((ws.bitter[i] || 0) - 0.15, 0, 1); news.push({ region: i, icon: "🌱", text: "Los Mash salvajes han replantado " + name }); }
      else { ws.bitter[i] = M.clamp((ws.bitter[i] || 0) + 0.2, 0, 1); ws.grumoPop[i] = (ws.grumoPop[i] || 20) + 6; news.push({ region: i, icon: "🌩️", text: "Una tormenta amarga ha pasado por " + name }); }
    }
    return news;
  },
};

M.generate = function (o) {
  const ageIdx = (a) => M.AGE_ORDER.indexOf(a);
  const A1 = M.AGES[o.age], A2 = o.age2 ? M.AGES[o.age2] : null;
  const soft = A2 && ageIdx(o.age2) < ageIdx(o.age) ? A2 : A1;
  const hard = A2 && ageIdx(o.age2) > ageIdx(o.age) ? A2 : A1;
  const baby = soft.id === "baby";
  const W0 = Math.max(1, o.index | 0), r = M.rng(o.seed * 31 + W0 * 7919 + 17 + (o.nodeSeed || 0));
  const sk = Object.assign({ falls: 1, hits: 1, time: 1, sparks: 0.5, stomps: 3, ability: 2, eats: 0.5, worlds: 0 }, o.skill || {});
  const owned = o.owned || [], notes = [];
  const nodeType = o.nodeType || (W0 % 4 === 0 ? "jefe" : "normal");
  const boss = nodeType === "jefe";
  const region = o.region !== undefined && o.region !== null ? Math.max(0, o.region | 0) : Math.floor((W0 - 1) / 4);
  const baseB = M.BIOMES[region % M.BIOMES.length];
  const WS = M.WorldLife.region(o.worldState, region);
  const bloom = WS.bloom, bitter = WS.bitter;
  const popK = WS.pop === null ? 1 : M.clamp(0.75 + WS.pop / 60, 0.7, 1.5);
  const wildMet = (o.worldState && o.worldState.wildMet) || [];
  // el motor v5 (M.FX) ya sabe agacharse y deslizarse; M.CAPS, si existe, manda
  const CAN_SLIDE = M.CAPS ? !!M.CAPS.slide : !!M.FX;

  // ——— dificultad adaptativa ———
  let d = 0.18 + Math.min(0.5, (W0 - 1) * 0.04);
  d += M.clamp((1.1 - sk.falls) * 0.1, -0.2, 0.1) + M.clamp((1.4 - sk.hits) * 0.05, -0.12, 0.08);
  d = M.clamp(d + bitter * 0.06 - bloom * 0.04, 0.08, 0.95);
  // multiplicador de grumos: las regiones limpias tienen menos; las amargas, más
  const em = M.clamp((1 - bloom * 0.4 + bitter * 0.5) * popK * (nodeType === "secreto" ? 0.6 : nodeType === "salvaje" ? 0.7 : 1), 0.35, 1.9);

  // ——— mecánicas del mundo ———
  const avail = Object.keys(M.GIMMICKS).filter((g) => M.GIMMICKS[g].from <= W0 && !(baby && g === "noche"));
  const recent = (o.recent || []).slice(-3);
  const pref = {
    estampida: 0.8 + Math.min(1.4, sk.stomps / 4 + sk.eats / 3), setas: 1, galletas: 1, viento: 1 + sk.ability / 5, ascenso: 1,
    lago: 1, hielo: 0.9, chicle: 1, caramelos: 0.8 + sk.ability / 4, noche: 0.9 + bitter * 0.8,
  };
  const weights = {}; avail.forEach((g) => { weights[g] = pref[g] * (recent.includes(g) ? 0.15 : 1) * (g === M.GIMMICKS_NEW(W0) ? 3 : 1); });
  const count = W0 === 1 ? 1 : W0 < 5 ? 2 : 3;
  const gim = [];
  if (W0 === 1) gim.push("setas");
  if (o.force && M.GIMMICKS[o.force]) { gim.length = 0; gim.push(o.force); weights[o.force] = 0; }
  while (gim.length < Math.min(count, avail.length)) { const g = r.weighted(weights); if (!gim.includes(g)) gim.push(g); weights[g] = 0; }
  const has = (g) => gim.includes(g);
  const main = gim[0];

  // ——— bioma procedural: luz, clima, mezcla y ánimo ———
  const lightW = baby ? { alba: 2, dia: 5, tarde: 2, noche: 0 } : { alba: 1.5, dia: 4, tarde: 2, noche: 0.6 + bitter * 2.5 + (baseB.id === "valle" ? 2 : 0) };
  let light = has("noche") ? "noche" : r.weighted(lightW);
  if (boss && !baby && r.chance(0.4)) light = "tarde";
  const variety = M.clamp(0.25 + W0 * 0.06 + region * 0.08, 0.25, 1);
  const mixWith = r.chance(0.2 + variety * 0.5) ? r.pick(M.BIOMES.filter((b) => b !== baseB)) : null;
  const kitNames = Object.keys(M.KITS);
  const biome = M.makeBiome(baseB, r, {
    mixWith, mixK: mixWith ? r.range(0.18, 0.5) : 0, hue: r.range(-1, 1) * (4 + variety * 18), bloom, bitter, light,
    kit: baseB.kit, kit2: r.chance(0.25 + variety * 0.35) ? r.pick(kitNames) : null,
  });
  const climW = { calma: 3, azucar: 1.2, nata: 1 + (light === "alba" ? 1.5 : 0), petalos: 1.4 + bloom * 3, coco: has("hielo") ? 4 : 0.8, luciernagas: light === "noche" || light === "tarde" ? 3 : 0.2, esporas: baseB.id === "setas" ? 2 : 0.5 };
  if (baby) climW.nata = 0.3;
  const climId = r.weighted(climW), clim = M.CLIMATES[climId];
  const tod = M.LIGHTS[light].tod;

  // ——— nombre generado ———
  const nameOf = () => {
    if (boss) return r.pick(["Guarida del Grumo Mayor", "Trono del Grumo Mayor", "Madriguera del Grumo Mayor"]);
    const nn = r.pick(NOUNS[main]), gi = (nn[1] ? 1 : 0) + (nn[2] ? 2 : 0), form = (a) => a[gi];
    let mood = null;
    if (bitter > 0.5) mood = MOOD_ADJ.bitter; else if (bloom > 0.6) mood = MOOD_ADJ.bloom;
    else if (MOOD_ADJ[climId] && r.chance(0.5)) mood = MOOD_ADJ[climId]; else if (light === "noche" && main !== "noche" && r.chance(0.5)) mood = MOOD_ADJ.noche;
    const pat = r.int(0, 3);
    if (nodeType === "secreto") return "Rincón Secreto " + r.pick(COMPL);
    if (nodeType === "salvaje") return r.pick(["Refugio de los Salvajes", "Claro de los Mash Salvajes", "Madriguera Salvaje", "Pradera de los Salvajes"]);
    // el nombre de siempre, con apellido de ánimo o clima
    if (pat === 0) return r.pick(NAMES[main]) + (mood ? " " + (mood === MOOD_ADJ.bloom ? "en Flor" : mood === MOOD_ADJ.bitter ? "del Amargor" : r.pick(["del Alba", "entre Nubes", "bajo la Luna", "de los Sueños"])) : "");
    if (pat === 1) return nn[0] + " " + form(r.pick(ADJS[main]));
    if (pat === 2) return nn[0] + " " + r.pick(COMPL) + (light === "alba" && r.chance(0.5) ? " al Alba" : "");
    return nn[0] + " " + (mood ? form(mood) : form(r.pick(ADJS[main]))) + " " + r.pick(COMPL);
  };
  const name = nameOf();

  // ——— notas para la UI ———
  if (sk.worlds > 0) {
    const styles = [[sk.stomps / 4, "👟", "Aplastagrumos"], [sk.ability / 3, "✨", "Estratega de poderes"], [sk.sparks * 2, "⭐", "Coleccionista"],
      [(1.2 - sk.falls) * 1.5, "🤸", "Equilibrista"], [sk.eats / 3, "😋", "Aspirador profesional"]].sort((a, b) => b[0] - a[0]);
    notes.push({ icon: styles[0][1], k: "Tu estilo: " + styles[0][2], v: "el mundo se construye alrededor de eso" });
    if (sk.falls > 1.6) notes.push({ icon: "🫧", k: "Menos abismos", v: "te has caído bastante" });
    else if (sk.falls < 0.4) notes.push({ icon: "🕳️", k: "Huecos más anchos", v: "casi nunca te caes" });
  }
  gim.forEach((g, i) => notes.push({ icon: M.GIMMICKS[g].icon, k: (i ? "También: " : "Protagonista: ") + M.GIMMICKS[g].name, v: M.GIMMICKS[g].desc }));
  if (owned.length) notes.push({ icon: owned.map((a) => (M.ABILITIES[a] ? M.ABILITIES[a].icon : "✨")).join(""), k: "Rutas para tus poderes", v: "rincones secretos que solo abre tu equipo" });
  notes.push({ icon: clim.icon, k: clim.name, v: M.LIGHTS[light].name + (mixWith ? " · con aires de " + mixWith.region : "") });
  if (bloom > 0.45) notes.push({ icon: "🌸", k: "Esta región florece", v: "la limpiaste: más flores, aldeas y Mash salvajes" });
  else if (bitter > 0.45) notes.push({ icon: "🥀", k: "Esta región se ha amargado", v: "la dejaste sola: más grumos y mutaciones" });
  notes.push({ icon: "📈", k: "Dificultad " + Math.round(d * 100) + "%", v: d > 0.45 ? "sube porque vas sobrado" : d < 0.22 ? "suave, para disfrutar" : "a tu medida" });

  const L = {
    seed: o.seed, index: W0, age: soft.id, hardAge: hard.id, d, biome, biomeIdx: region % 4, region, boss, gim, main, tod, light,
    weather: clim.weather, climate: clim.climate ? { type: clim.climate, k: r.range(0.55, 1), name: clim.name, icon: clim.icon } : null,
    bg: r.pick(biome.bgs), name, nodeType,
    mood: { bloom, bitter, pop: WS.pop, label: bloom > 0.45 ? "floreciente" : bitter > 0.45 ? "amarga" : "en equilibrio" },
    solids: [], plats: [], movers: [], shrooms: [], sparks: [], enemies: [], walls: [], switches: [], giants: [], checks: [], signs: [],
    props: [], dress: [], visitors: [], winds: [], candies: [], spawners: [], secrets: 0, cage: null, exit: null, bossData: null, notes,
    wild: [], events: [], fakes: [], chunks: [], arc: [], surprise: null, palette: null,
  };
  L.palette = { sky: biome.sky, body: biome.body, top: biome.top, frost: biome.frost, fog: biome.fog, tint: biome.tint, dots: biome.dots,
    leaf: biome.flora.leaf, caps: biome.flora.caps, flowers: biome.flora.flowers, stones: biome.flora.stones, mix: biome.mixWith, light, climate: climId, mood: L.mood.label };

  // ——— constructores ———
  let wallId = 0, x = 0, gy = 600, lastCheck = 0;
  const reserve = []; // tramos donde dress() no debe poner decorados (aldeas, escondites)
  const last = () => L.solids[L.solids.length - 1];
  const ground = (x1, x2, y, mat = "normal") => { L.solids.push({ x: x1, y, w: x2 - x1, h: 1600 - y, mat }); return last(); };
  const block = (x1, y, w, h, mat = "normal", extra) => { L.solids.push(Object.assign({ x: x1, y, w, h, mat }, extra || {})); return last(); };
  const plat = (px, y, w, kind = "normal") => { L.plats.push({ x: px, y, w, h: 36, kind, y0: y, sink: 0, t: 0, fall: 0, gone: 0 }); return L.plats[L.plats.length - 1]; };
  const mover = (px, y, w, dx, dy, period, phase = 0) => L.movers.push({ x0: px, y0: y, x: px, y, w, h: 36, dx, dy, period, phase, vx: 0, vy: 0 });
  const shroom = (px, y, big = false) => L.shrooms.push({ x: px, y, w: 110, squash: 0, big });
  const spark = (px, y, big = false) => L.sparks.push({ x: px, y, got: false, t: r() * 6, big });
  const line = (px, y, n, dx = 60, dy = 0) => { for (let i = 0; i < n; i++) spark(px + i * dx, y + i * dy); };
  const arc = (px, y, n, w, h) => { for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); spark(px + t * w, y - Math.sin(t * Math.PI) * h); } };
  const types = () => {
    const t = ["plastilina"]; if (W0 >= 2) t.push("moco"); if (W0 >= 3) t.push("volador"); if (W0 >= 5 || has("hielo")) t.push("helado"); if (W0 >= 6 || has("chicle")) t.push("chicle");
    if (bitter > 0.5 && !baby) t.push("moco", "chicle");
    return baby ? ["plastilina", "plastilina", "chicle"] : t;
  };
  const enemy = (px, y, range, type) => {
    type = type || r.pick(types());
    if (!baby && bitter > 0.7 && W0 >= 3 && type === "plastilina" && r.chance(0.12)) type = "gordo";
    const e = { x: px, y, x1: px - range, x2: px + range, type, dir: r.chance(0.5) ? -1 : 1, t: r() * 6, state: "walk", st: 0, alive: true, hp: 1, y0: y };
    if (type === "volador") { e.y = y - 170 - r() * 80; e.y0 = e.y; }
    if (type === "gordo") e.hp = 3;
    if (r.chance(bitter * 0.6) && M.ProcChar && M.ProcChar.grumoVariant) { e.mutant = true; e.variant = M.ProcChar.grumoVariant(o.seed * 13 + L.enemies.length * 7 + W0); }
    L.enemies.push(e);
  };
  const wall = (px, y, h, type) => { const w = { id: wallId++, x: px, y: y - h, w: 60, h, type, alive: true, melt: 0 }; L.walls.push(w); return w; };
  const check = (px, y) => L.checks.push({ x: px, y, on: false });
  const sign = (px, y, text) => L.signs.push({ x: px, y, text });
  const candyTypes = Object.keys(M.CANDIES || { volar: 1 });
  const candy = (px, y, type, rare) => L.candies.push({ x: px, y, type: type || r.pick(candyTypes), got: false, t: r() * 6, rare: !!rare });
  const nEn = (len, k = 1) => Math.max(k < 0.7 ? 0 : 1, Math.round((len / 620) * soft.density * (0.6 + d) * (has("estampida") ? 2.2 : 1) * em * k));
  const hole = (x1, x2) => { if (!soft.pits) ground(x1, x2, gy + 150, "jelly"); };
  const rarity = (bonus = 0) => { const q = r(); const leg = 0.01 + W0 * 0.004 + bonus * 0.12, raro = 0.12 + W0 * 0.01 + bonus * 0.3; return q < leg ? "legendario" : q < leg + raro ? "raro" : "comun"; };
  let wildN = 0;
  const wild = (px, y, bonus = 0) => {
    if (!M.ProcChar || !M.ProcChar.generate) return null;
    let seed = (o.seed * 1009 + W0 * 131 + region * 7 + (wildN++) * 97 + (o.nodeSeed || 0)) % 2147483000;
    for (let i = 0; wildMet.includes(seed) && i < 8; i++) seed += 7777;   // no repetir Mash que ya conociste
    const rar = rarity(bonus);
    const creature = M.ProcChar.generate(seed, { age: soft.id, biome: biome.base, rarity: rar });
    const w = { x: px, y, creature, met: false, seed, rarity: rar, friendly: true };
    L.wild.push(w); return w;
  };
  const rareCandy = (px, y) => { candy(px, y, r.pick(candyTypes), true); };

  // ——— fragmentos ———
  const C = {
    run(k = 1) { const len = r.int(560, 900); ground(x, x + len, gy); const n = nEn(len, k);
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
        const kind = has("galletas") && !baby ? (r.chance(0.7) ? "crumble" : "normal") : r.chance(0.3) ? "soft" : "normal";
        plat(x, py, w, kind); line(x + 30, py - 55, Math.max(1, Math.round(w / 70)), 60); x += w; }
      x += Math.round(M.lerp(80, 160, d)); hole(start, x); ground(x, x + 180, gy); x += 180; },
    mover() { ground(x, x + 160, gy); x += 160; const w = r.int(380, 540), start = x; hole(x, x + w);
      mover(x + w * 0.25, gy - 60, 150, w * 0.18, 0, r.range(3, 4.2)); if (w > 450) mover(x + w * 0.62, gy - 110, 140, 0, 70, r.range(3, 3.8), 1);
      line(x + 40, gy - 150, Math.round(w / 90), 90); x = start + w; ground(x, x + 160, gy); x += 160; },
    // plataformas escalonadas: subida sobre suelo y bajada sobre un hueco
    steps() { ground(x, x + 200, gy); x += 200; const g0 = x, n = r.int(3, 4); let px = x + 60, py = gy;
      for (let i = 0; i < n; i++) { py -= r.int(95, 120); const w = r.int(140, 180); plat(px, py, w); spark(px + w / 2, py - 60); px += w + r.int(30, 70); }
      if (r.chance(0.35)) candy(px - 90, py - 80);
      ground(g0, px, gy); const pit = px;
      for (let j = 0; j < n - 1; j++) { px += r.int(60, 100); py = Math.min(gy - 60, py + r.int(90, 120)); const w = r.int(130, 170); plat(px, py, w); spark(px + w / 2, py - 60); px += w; }
      px += r.int(70, 120); hole(pit, px); x = px; ground(x, x + 200, gy); x += 200; },
    // pilares que salen del abismo
    pillars() { ground(x, x + 200, gy); x += 200; const start = x, n = r.int(3, 5); let py = gy;
      for (let i = 0; i < n; i++) { x += Math.round(M.lerp(90, 170, d) * r.range(0.8, 1.05)); const w = r.int(90, 140); py = M.clamp(py + r.int(-100, 80), gy - 170, gy + 60);
        ground(x, x + w, py); if (r.chance(0.6)) spark(x + w / 2, py - 70); x += w; }
      x += Math.round(M.lerp(90, 150, d)); hole(start, x); ground(x, x + 200, gy); x += 200; },
    // islas flotantes de plastilina
    islands() { ground(x, x + 180, gy); x += 180; const start = x, n = r.int(2, 4); let py = gy;
      for (let i = 0; i < n; i++) { x += Math.round(M.lerp(90, 170, d) * r.range(0.8, 1.05)); const w = r.int(200, 320); py = M.clamp(py + r.int(-100, 60), gy - 200, gy + 20);
        block(x, py, w, r.int(110, 160), "normal", { float: true, under: true }); if (w > 250 && r.chance(0.6)) enemy(x + w / 2, py, w / 2 - 50); else line(x + 40, py - 70, Math.round(w / 80), 70); x += w; }
      x += Math.round(M.lerp(90, 150, d)); hole(start, x); ground(x, x + 200, gy); x += 200; },
    // túnel: con techo bajo para deslizarse (si el motor lo permite) o con techo alto y ruta por encima
    tunnel() {
      const slide = CAN_SLIDE && !baby && r.chance(0.65);
      if (slide) {
        const len = r.int(320, 480); ground(x, x + len + 440, gy); x += 220;
        block(x, gy - 64 - 88, len, 88, "normal", { float: true, low: true });   // 64 px libres: solo se pasa deslizándose
        line(x + 40, gy - 30, Math.max(3, Math.round(len / 70)), 60); sign(x - 130, gy, "⤵️ ¡Deslízate!"); x += len + 220; return;
      }
      const len = r.int(600, 900), free = r.int(200, 240); ground(x, x + len + 400, gy); x += 200;
      if (r.chance(0.55)) { shroom(x - 110, gy); line(x + 60, gy - free - 270, Math.round(len / 90), 80); if (r.chance(0.4)) candy(x + len - 80, gy - free - 290); }
      block(x, gy - free - 200, len, 200, "normal", { under: true });
      const n = nEn(len); for (let i = 0; i < n; i++) enemy(x + 120 + (i + 0.5) * (len - 240) / n, gy, 70);
      line(x + 80, gy - 70, Math.round(len / 110), 100); x += len + 200; },
    // ruta doble: por arriba (repisa con premio) o por abajo (grumos); se reúnen al final
    split() { const len = r.int(1300, 1700); ground(x, x + len, gy);
      const s0 = x + 520, s1 = x + len - 260, top = gy - 400;
      shroom(x + 140, gy); plat(x + 230, gy - 135, 140); plat(x + 390, gy - 270, 120);
      block(s0, top, s1 - s0, 170, "normal", { float: true, under: true });
      line(s0 + 60, top - 70, Math.round((s1 - s0 - 120) / 90), 90); spark((s0 + s1) / 2, top - 160, true);
      if (r.chance(0.5 + (soft.secrets || 0) * 0.1)) rareCandy(s1 - 90, top - 90); else candy(s1 - 90, top - 90);
      const n = Math.round(nEn(s1 - s0) * 1.25); for (let i = 0; i < n; i++) enemy(s0 + 80 + (i + 0.5) * (s1 - s0 - 160) / Math.max(1, n), gy, 80);
      line(s0 + 60, gy - 60, 4, 70); L.secrets++; x += len; },
    galletas() { ground(x, x + 160, gy); x += 160; const start = x; let py = gy - 60;
      for (let i = 0; i < 4 + Math.round(d * 2); i++) { const w = r.int(110, 150); plat(x, py, w, baby ? "soft" : "crumble"); spark(x + w / 2, py - 60); x += w + r.int(40, 90); py = M.clamp(py + r.int(-60, 50), gy - 220, gy - 30); }
      hole(start, x); ground(x, x + 200, gy); x += 200; },
    viento() {
      ground(x, x + 220, gy); x += 220; const w = r.int(520, 700), start = x; hole(x, x + w);
      L.winds.push({ x1: x + 40, x2: x + w - 40, y1: gy - 700, y2: gy + 200, fx: 380, fy: -1650 });
      arc(x + 40, gy - 260, 7, w - 80, 120); plat(x + w * 0.5 - 70, gy - 90, 140, "soft"); x += w; ground(x, x + 220, gy); x += 220;
      sign(start - 120, gy, "🌬️ ¡Déjate llevar por el viento!"); },
    ascenso() {
      ground(x, x + 900, gy); const base = x; let py = gy, side = 0;
      const floors = 4 + Math.round(d * 3);
      for (let i = 0; i < floors; i++) { py -= r.int(120, 150); side = 1 - side; const px = base + 180 + side * 320 + r.int(-30, 30);
        plat(px, py, r.int(170, 230), has("galletas") && i % 2 ? "crumble" : "normal"); spark(px + 80, py - 60); if (i === floors - 2 && r.chance(0.6)) candy(px + 100, py - 70); }
      block(base + 820, py - 20, 80, gy - py + 20);
      x += 900; gy = M.clamp(py - 20, 150, 640); ground(x, x + 500, gy); enemy(x + 250, gy, 120); line(x + 60, gy - 70, 5, 70); x += 500;
      while (gy < 560) { const w = r.int(160, 220); gy += r.int(70, 100); ground(x, x + w, gy); x += w; } },
    lago() { ground(x, x + 160, gy); x += 160; const w = r.int(700, 1000), start = x;
      ground(x, x + w, gy + 150, "jelly");
      for (let px = x + 60; px < x + w - 120; px += r.int(170, 230)) plat(px, gy - r.int(0, 40), r.int(110, 150), "raft");
      line(x + 80, gy - 110, Math.round(w / 110), 110); x = start + w; ground(x, x + 180, gy); x += 180; },
    hielo() { const len = r.int(700, 1000); ground(x, x + len, gy, "hielo"); sign(x + 60, gy, baby ? "¡Resbala! ⛸️" : "¡Hielo resbaladizo!");
      for (let i = 0; i < nEn(len); i++) enemy(x + 300 + i * 220, gy, 120, r.chance(0.7) ? "helado" : undefined); line(x + 200, gy - 60, 6, 80); x += len; },
    chicle() {
      const len = r.int(900, 1200); ground(x, x + len, gy); block(x, gy - 330, len, 60, "chicle");
      for (let px = x + 220; px < x + len - 200; px += r.int(260, 340)) { block(px, gy - 270 + r.int(0, 60), 50, 180 + r.int(0, 40), "chicle"); enemy(px + 130, gy, 60); }
      line(x + 100, gy - 200, Math.round(len / 120), 120); x += len; },
    caramelos() { const len = r.int(800, 1100); ground(x, x + len, gy); L.spawners.push({ x1: x, x2: x + len, t: 0, every: 1.1 }); candy(x + len / 2, gy - 90);
      for (let i = 0; i < nEn(len); i++) enemy(x + 250 + i * 260, gy, 90); x += len; },
    estampida() { const len = 1000; ground(x, x + len, gy); const n = Math.round((4 + d * 4) * Math.min(1.3, em));
      for (let i = 0; i < n; i++) enemy(x + 150 + i * (len - 250) / n, gy, 70); if (W0 >= 3 && !baby) enemy(x + len - 180, gy, 60, "gordo");
      arc(x + 200, gy - 90, 8, 600, 120); x += len; },
    noche() {
      const len = r.int(700, 900); ground(x, x + len, gy).lamps = true; shroom(x + 200, gy); plat(x + 300, gy - 300, 200); line(x + 320, gy - 360, 3, 60);
      for (let i = 0; i < nEn(len); i++) enemy(x + 450 + i * 180, gy, 80); x += len; },
    gate() { const hasHeat = owned.includes("fuego"), hasBreak = owned.includes("turbo") || owned.includes("gigante");
      const type = hasHeat && (!hasBreak || r.chance(0.5)) ? "azucar" : hasBreak ? "galleta" : r.pick(["azucar", "galleta"]);
      ground(x, x + 820, gy); const w = wall(x + 560, gy, 1100, type);
      if (soft.assist) L.switches.push({ x: x + 420, y: gy, wall: w.id, on: false, big: true });
      else { shroom(x + 150, gy); plat(x + 250, gy - 330, 200); L.switches.push({ x: x + 350, y: gy - 330, wall: w.id, on: false }); line(x + 270, gy - 390, 3, 60); }
      sign(x + 70, gy, M.T ? M.T("gate", soft.id) : "¡Abre la puerta!"); x += 820; },
    giant() { ground(x, x + 900, gy); const pool = o.visitors && o.visitors.length ? o.visitors : ["pompon", "merengue"];
      L.giants.push({ x: x + 460, y: gy, id: r.pick(pool), awake: false, t: 0, wake: 0, squash: 0 }); sign(x + 160, gy, M.T ? M.T("giant", soft.id) : "¡Despiértalo!"); line(x + 380, gy - 330, 3, 60); x += 900; },
    visitor() { ground(x, x + 600, gy); L.visitors.push({ id: r.pick(o.visitors), x: x + 320, y: gy, t: r() * 6, talked: false }); x += 600; },
    bonus() { const ab = r.pick(owned); ground(x, x + 760, gy);
      if (["volar", "burbuja", "modelar"].includes(ab)) { const py = gy - (baby ? 330 : 480); plat(x + 340, py, 220); arc(x + 330, py - 50, 5, 240, 40); spark(x + 450, py - 110, true); sign(x + 120, gy, (M.ABILITIES[ab] ? M.ABILITIES[ab].icon : "✨") + " ¡Allá arriba!"); }
      else { const t = ab === "fuego" || ab === "azucar" ? "azucar" : "galleta"; wall(x + 380, gy, 190, t); wall(x + 620, gy, 190, t);
        block(x + 370, gy - 230, 320, 44); block(x + 250, gy - 110, 90, 110);
        line(x + 470, gy - 60, 3, 50); spark(x + 530, gy - 120, true); sign(x + 120, gy, (M.ABILITIES[ab] ? M.ABILITIES[ab].icon : "✨") + " Algo brilla dentro…"); }
      L.secrets++; x += 760; },

    // ——— calma y respiro ———
    meadow() { const len = r.int(700, 1000), s = ground(x, x + len, gy); s.bloom = 1.4 + bloom;
      arc(x + 150, gy - 80, 6, 400, 90); if (r.chance(0.5)) line(x + len - 300, gy - 70, 4, 60);
      const n = nEn(len, 0.5); for (let i = 0; i < n; i++) enemy(x + len * 0.6 + i * 140, gy, 80, baby ? "plastilina" : undefined);
      if (r.chance(0.25 + bloom * 0.5) || nodeType === "salvaje") wild(x + len * 0.35, gy);
      x += len; },
    rest() { const len = r.int(480, 620); ground(x, x + len, gy); check(x + 220, gy); lastCheck = x + 220; arc(x + 300, gy - 80, 4, 220, 60);
      if (r.chance(0.2 + bloom * 0.35) || nodeType === "salvaje") wild(x + len - 120, gy);
      x += len; },
    village() { const len = r.int(1000, 1300), s = ground(x, x + len, gy); s.bloom = 1.6; reserve.push([x, x + len]);
      const kit = M.KITS.aldea.back; let px = x + 180;
      while (px < x + len - 180) { L.props.push({ layer: "back", key: r.pick(kit), x: px, y: gy + 30, h: 250 + r() * 110, flip: r.chance(0.5) }); px += r.int(260, 360); }
      sign(x + 90, gy, "🏡 Aldea " + r.pick(["Blandita", "de los Salvajes", "Pompón", "del Merengue", "Florida", "Dulce Hogar"]));
      const nw = nodeType === "salvaje" ? 2 : r.int(1, 2); for (let i = 0; i < nw; i++) wild(x + 300 + i * 360, gy);
      arc(x + 200, gy - 80, 8, len - 400, 70); x += len; },

    // ——— secretos ———
    // pared falsa: parece una colina maciza, pero se puede entrar; dentro hay premio
    fake() { const pre = 240, hw = 520, x0 = x; ground(x, x + pre + hw + 220, gy); x += pre;
      const top = gy - 220, rh = 70;
      plat(x - 170, gy - 120, 150);
      block(x, top, hw - 80, rh, "normal", { float: true });
      ground(x + hw - 80, x + hw, top);
      L.fakes.push({ x, y: top + rh - 6, w: hw - 80, h: gy - top - rh + 16, a: 1 });
      spark(x + (hw - 80) / 2, gy - 60, true); rareCandy(x + 90, gy - 80); line(x + 170, gy - 50, 3, 50);
      reserve.push([x - 40, x + hw + 40]); L.secrets++; x = x0 + pre + hw + 220; },
    // zona escondida tras un decorado delantero
    hidden() { const len = r.int(640, 820); ground(x, x + len, gy); const px = x + Math.round(len * 0.55);
      L.dress.push({ key: r.pick(["seta_gorda", "arbol_isla", "seta_columnas", "arbol_conejo"]), x: px, y: gy + 26, h: 300, flip: r.chance(0.5), sy: gy, secret: true });
      rareCandy(px + 10, gy - 70); spark(px - 60, gy - 60, true); reserve.push([px - 200, px + 200]);
      const n = nEn(len, 0.6); for (let i = 0; i < n; i++) enemy(x + 150 + i * 120, gy, 60);
      L.secrets++; x += len; },

    // ——— set pieces ———
    chase() { const len = Math.round(r.int(1500, 1950) * (baby ? 0.8 : 1)), start = x, end = x + len;
      ground(x, x + 280, gy); sign(x + 90, gy, baby ? "😮 ¡Corre, que viene!" : "😱 ¡Corre!"); x += 280;
      while (x < end - 320) { const w = r.int(240, 420); ground(x, x + w, gy); if (r.chance(0.55)) line(x + 40, gy - 70, Math.max(2, Math.round(w / 80)), 70);
        if (r.chance(0.2)) shroom(x + w / 2, gy); x += w;
        if (r.chance(0.4)) { const gw = r.int(90, 140); hole(x, x + gw); arc(x - 10, gy - 70, 3, gw + 20, 70); x += gw; }
        gy = M.clamp(gy + r.pick([-50, 0, 0, 40]), 470, 640); }
      ground(x, x + 320, gy); x += 320;
      L.events.push({ type: "chase", x1: start + 300, x2: x - 160, speed: { baby: 0.5, kids: 0.7, young: 0.8, adult: 0.82 }[soft.id] || 0.7 }); },
    bridge() { ground(x, x + 220, gy); x += 220; const w = r.int(720, 1000), start = x, id = "b" + x;
      let px = x + 10; while (px < x + w - 110) { const pw = r.int(110, 150), p = plat(px, gy - 10 + Math.round(Math.sin((px - x) / 160) * 26), pw, baby ? "soft" : "crumble"); p.bridge = id; px += pw + r.int(18, 50); }
      line(x + 60, gy - 90, Math.round(w / 90), 90); x = Math.max(start + w, px + 40); hole(start, x); ground(x, x + 240, gy); x += 240;
      L.events.push({ type: "collapse", x1: start, x2: x - 240, id }); sign(start - 140, gy, "🌉 ¡No te pares!"); },
    tower() { ground(x, x + 300, gy); sign(x + 90, gy, "🌬️ ¡Salta al viento!"); x += 300;
      const H = r.int(480, 700), colW = 230, top = gy - H;
      ground(x, x + colW, gy);
      L.winds.push({ x1: x + 10, x2: x + colW + 30, y1: top - 240, y2: gy + 20, fx: 0, fy: -1, tower: true });
      for (let i = 1; i <= 5; i++) spark(x + colW / 2, gy - i * H / 6);
      x += colW; ground(x, x + 560, top); enemy(x + 330, top, 110); line(x + 80, top - 70, 4, 70); spark(x + 470, top - 160, true); x += 560; gy = top;
      while (gy < 560) { const w = r.int(170, 230); gy = Math.min(640, gy + r.int(80, 110)); ground(x, x + w, gy); if (r.chance(0.4)) spark(x + w / 2, gy - 60); x += w; } },
    cave() { const len = r.int(1150, 1550), start = x; ground(x, x + len, gy).lamps = true;
      block(x - 40, gy - 470, len + 80, 140, "normal", { under: true, cave: true });
      sign(x + 70, gy, "🔦 Cueva de las setas-farol");
      for (let px = x + 280; px < x + len - 260; px += r.int(300, 420)) {
        if (r.chance(0.5)) { shroom(px, gy); plat(px + 90, gy - 250, 160); line(px + 110, gy - 310, 2, 60); }
        else { enemy(px, gy, 90); spark(px, gy - 80); } }
      x += len; L.events.push({ type: "dark", x1: start + 60, x2: x - 60, k: baby ? 0.42 : 0.6 + d * 0.2 }); },
    flood() { ground(x, x + 180, gy); x += 180; const start = x, w0 = r.int(950, 1250);
      let py = gy - 30, px = x + 40;
      while (px < x + w0 - 200) { const pw = r.int(150, 200); plat(px, py, pw, "normal"); spark(px + pw / 2, py - 60); px += pw + r.int(60, 110); py = Math.max(gy - 360, py - r.int(40, 80)); }
      const endY = py - 60; x = px + 70; ground(start, x, gy + 150, "jelly");
      L.events.push({ type: "flood", x1: start, x2: x, y0: gy + 150, y1: endY + 80, speed: baby ? 22 : 32 + d * 30 });
      sign(start - 110, gy, "🌊 ¡Sube, que sube la gelatina!");
      gy = endY; ground(x, x + 380, gy); line(x + 60, gy - 70, 4, 70); x += 380;
      while (gy < 540) { const w = r.int(170, 230); gy = Math.min(640, gy + r.int(80, 110)); ground(x, x + w, gy); x += w; } },
    arena() { const len = r.int(950, 1150); ground(x, x + len, gy); sign(x + 70, gy, "⚔️ ¡Arena de grumos!");
      shroom(x + 260, gy); shroom(x + len - 260, gy); plat(x + len / 2 - 110, gy - 250, 220);
      const waves = baby ? [2, 2] : [3 + Math.round(d * 2), 4 + Math.round(d * 3)].concat(W0 >= 5 || d > 0.5 ? [5 + Math.round(d * 3)] : []);
      L.events.push({ type: "waves", x1: x + 120, x2: x + len - 120, y: gy, waves, gordo: W0 >= 4 && !baby, rx: x + len / 2, ry: gy - 120 });
      x += len; },
    garden(hidden) { const len = r.int(900, 1200), s = ground(x, x + len, gy); s.bloom = 2;
      const iw = r.int(420, 560), ix = x + Math.round(len / 2 - iw / 2), iy = gy - 400;
      block(ix, iy, iw, 150, "normal", { float: true, under: true, bloom: 2.2 });
      shroom(ix - 90, gy);
      arc(ix + 30, iy - 70, 6, iw - 60, 60); spark(ix + iw / 2, iy - 160, true); rareCandy(ix + iw - 70, iy - 80);
      if (hidden) { L.dress.push({ key: r.pick(["seta_gorda", "arbol_isla", "seta_columnas"]), x: ix - 90, y: gy + 26, h: 300, flip: r.chance(0.5), sy: gy, secret: true }); L.secrets++; }
      else sign(x + 80, gy, "🌷 Jardín secreto");
      reserve.push([ix - 260, ix + 80]);
      if (nodeType === "secreto" || nodeType === "salvaje" || r.chance(0.5)) wild(ix + iw / 2, iy, 1);
      line(x + 80, gy - 60, 3, 60); x += len; },
  };

  // ——— gramática de intensidad ———
  const general = ["gap", "hop", "mover", "stairs", "pillars", "steps", "islands", "tunnel"].concat(W0 >= 2 ? ["split"] : []);
  const calmPool = { run: 3, meadow: 2 + bloom * 3, stairs: 1, islands: d < 0.35 ? 1 : 0.3 };
  const affinity = { setas: ["chase", "garden"], estampida: ["arena", "chase"], galletas: ["bridge"], viento: ["tower"], ascenso: ["tower"], lago: ["flood"],
    hielo: ["chase", "arena"], chicle: ["cave"], caramelos: ["arena", "garden"], noche: ["cave"] };
  const spAvail = Object.keys(M.SETPIECES).filter((k) => M.SETPIECES[k].from <= W0 && !(baby && k === "chase" && W0 < 3));
  const spUsed = [];
  const pickSetpiece = () => {
    const w = {}; spAvail.forEach((k) => { w[k] = spUsed.includes(k) ? 0 : 1; });
    gim.forEach((g, i) => (affinity[g] || []).forEach((k) => { if (w[k]) w[k] += i === 0 ? 3 : 1.5; }));
    if (w.garden) w.garden *= 0.4 + bloom;
    if (w.cave) w.cave *= 1 + bitter + (light === "noche" ? 1 : 0);
    if (w.arena) w.arena *= 1 + bitter;
    const tot = Object.values(w).reduce((a, b) => a + b, 0);
    const k = tot > 0 ? r.weighted(w) : "setas"; spUsed.push(k); return k;
  };
  const forcedSP = o.event && M.SETPIECES[o.event] ? o.event : null;
  const beats = [];   // { k, beat, arg }
  const push = (k, beat, arg) => beats.push({ k, beat, arg });
  const baseLen = (4 + W0 * 0.22) * soft.worldLen + d * 2;
  if (!boss) {
    let nA = M.clamp(Math.round(baseLen / 3.8), 1, 3);
    if (nodeType === "secreto") nA = Math.min(nA, 2);
    for (let a = 0; a < nA; a++) {
      const first = a === 0, finalArc = a === nA - 1;
      // calma
      push(first ? "run" : r.weighted(calmPool), "calma", 0.7);
      // tensión: la mecánica protagonista abre el primer arco
      const nt = 1 + Math.round(d * 1.6 * r.range(0.5, 1.1)) + (nodeType === "evento" ? 1 : 0) - (nodeType === "salvaje" ? 1 : 0);
      for (let i = 0; i < Math.max(1, nt); i++) {
        if (first && i === 0) push(gim[0], "tension");
        else push(r.chance(0.5) ? r.pick(gim) : r.pick(general), "tension");
      }
      // clímax
      if (W0 === 1 && first) push("setas", "climax");
      else if (forcedSP && finalArc) push(forcedSP, "climax");
      else if (nodeType === "secreto" && finalArc) push("garden", "climax", false);
      else if (nodeType === "salvaje" && finalArc) push(r.chance(0.5) ? "village" : "garden", "climax", false);
      else push(pickSetpiece(), "climax");
      // respiro
      push(bloom > 0.45 && r.chance(0.5) && !spUsed.includes("village") ? "village" : r.chance(0.3 + bloom * 0.3) ? "meadow" : "rest", "respiro");
    }
    // especiales: puerta, gigante/visitante, poderes, secretos
    const idxOf = (beat, from) => { const c = beats.map((b, i) => [b, i]).filter(([b, i]) => b.beat === beat && i >= (from || 0)); return c.length ? r.pick(c)[1] : beats.length; };
    beats.splice(idxOf("tension", Math.floor(beats.length * 0.3)), 0, { k: "gate", beat: "tension" });
    if (baby || r.chance(0.65)) beats.splice(idxOf("respiro") + 1, 0, { k: o.visitors && o.visitors.length && r.chance(0.5) ? "visitor" : "giant", beat: "respiro" });
    if (owned.length) beats.splice(idxOf("tension", 2), 0, { k: "bonus", beat: "tension" });
    let ns = (soft.secrets || 0) + (baby ? 1 : 0) + (nodeType === "secreto" ? 2 : 0);
    ns = Math.min(ns, nodeType === "secreto" ? 4 : 2);
    for (let i = 0; i < ns; i++) beats.splice(idxOf(r.chance(0.5) ? "calma" : "respiro", 1) + 1, 0, { k: baby ? "hidden" : r.pick(["fake", "hidden", "fake"]), beat: "secreto" });
    if (nodeType === "salvaje") beats.splice(1, 0, { k: "village", beat: "calma" });
    if (!beats.some((b) => ["gap", "hop", "pillars", "steps", "islands"].includes(b.k))) beats.splice(2, 0, { k: "gap", beat: "tension" });
  } else { push("run", "calma", 0.7); push(r.pick(general.filter((g) => g !== "split" && g !== "tunnel")), "tension"); push(gim[0] === "setas" ? "setas" : "run", "tension"); push("rest", "respiro"); }

  // ——— construir ———
  ground(-500, 700, gy); sign(260, gy, (boss ? "👑 " : M.GIMMICKS[main].icon + " ") + L.name); x = 700;
  if (W0 === 1) { sign(560, gy, baby ? "¡Mantén X y cómete a los grumos! 😋" : "Mantén X para aspirar grumos"); }
  let candyPlaced = false;
  beats.forEach((b, i) => {
    const x1 = x; C[b.k](b.arg); L.chunks.push({ k: b.k, beat: b.beat, x1, x2: x });
    if (!candyPlaced && i >= beats.length / 2 && W0 > 1) { ground(x, x + 260, gy); candy(x + 130, gy - 90); candyPlaced = true; x += 260; }
    if (x - lastCheck > 1500) { ground(x, x + 220, gy); check(x + 110, gy); lastCheck = x; x += 220; }
  });
  L.arc = beats.map((b) => b.beat);

  // ——— final: rescate o jefe ———
  if (gy < 480 || gy > 640) { gy = M.clamp(gy, 480, 640); }
  if (boss) {
    gy = 600; ground(x, x + 1700, gy); block(x - 40, gy - 900, 40, 900); check(x + 120, gy);
    const hp = soft.bossHP + (hard === soft ? 0 : 1) + (bitter > 0.6 ? 1 : 0);
    L.bossData = { x: x + 1100, y: gy, arena: [x + 40, x + 1600], friend: o.friend, hp, maxHp: hp, state: "sleep", t: 0 };
    L.cage = null; L.exit = { x: x + 1500, y: gy }; x += 1700;
  } else {
    ground(x, x + 1100, gy);
    L.cage = { x: x + 450, y: gy - 20, friend: o.friend, open: false, t: 0, wobble: 0 };
    arc(x + 150, gy - 80, 5, 200, 60); L.exit = { x: x + 900, y: gy }; x += 1100;
  }
  ground(x, x + 700, gy); L.end = x + 600;

  // los grumos no andan sobre huecos: su zona x1..x2 se ajusta al trozo de suelo en el que están
  const segAt = (ex, ey) => L.solids.find((s) => s.mat !== "jelly" && Math.abs(s.y - ey) < 2 && ex >= s.x && ex <= s.x + s.w);
  L.enemies = L.enemies.filter((e) => {
    if (e.type === "volador") return true;
    const s = segAt(e.x, e.y); if (!s || s.w < 90) return false;
    e.x1 = Math.max(e.x1, s.x + 30); e.x2 = Math.min(e.x2, s.x + s.w - 30);
    if (e.x1 > e.x2) e.x1 = e.x2 = M.clamp(e.x, s.x + 30, s.x + s.w - 30);
    e.x = M.clamp(e.x, e.x1, e.x2); return true;
  });

  // ——— sorpresas: programadas (L.events) y aleatorias (L.surprise) ———
  if (M.Events && M.Events.plan) M.Events.plan(L, o, r);
  else planSurprises(L, o, r);
  if (L.events.some((e) => e.type && M.SETPIECES[e.type] === undefined && !["chase", "collapse", "flood", "waves", "dark"].includes(e.type)))
    notes.push({ icon: "🎁", k: "Sorpresas en el camino", v: "pasan cosas cuando menos te lo esperas" });
  const sps = spUsed.filter((k) => M.SETPIECES[k]); if (forcedSP && !sps.includes(forcedSP)) sps.push(forcedSP);
  if (sps.length) notes.push({ icon: sps.map((k) => M.SETPIECES[k].icon).join(""), k: "Momentos: " + sps.map((k) => M.SETPIECES[k].name.toLowerCase()).join(", "), v: "cada arco termina a lo grande" });
  if (L.wild.length) notes.push({ icon: "🐾", k: L.wild.length + (L.wild.length > 1 ? " Mash salvajes" : " Mash salvaje"), v: L.wild.some((w) => w.rarity !== "comun") ? "¡alguno es raro!" : "a lo mejor quieren ser tus amigos" });

  dress(L, o, reserve);
  L.sparkTotal = L.sparks.length;
  return L;
};
M.GIMMICKS_NEW = (w) => Object.keys(M.GIMMICKS).find((g) => M.GIMMICKS[g].from === w);

// Plan de sorpresas por defecto (M.Events.plan lo sustituye si existe)
function planSurprises(L) { L.surprise = { every: [45, 80], pool: {} }; }

// ——— vestir un suelo: goterones, flora trasera y delantera. Exportado para islas creadas en tiempo real ———
M.dressSolid = function (s, L, seed, busy) {
  const b = L.biome, rr = M.rng((s.x | 0) + 77 + (seed || 0)), mood = L.mood || { bloom: 0, bitter: 0 };
  s.balls = []; s.drips = []; s.back = []; s.front = [];
  for (let bx = s.x + 24; bx < s.x + s.w - 24; bx += 38 + rr() * 70) s.drips.push({ x: bx, len: 10 + rr() * 26, w: 9 + rr() * 8 });
  if (s.under) { s.under = []; for (let bx = s.x + 30; bx < s.x + s.w - 30; bx += 40 + rr() * 60) s.under.push({ x: bx, len: 14 + rr() * (s.h > 150 ? 50 : 26), w: 10 + rr() * 12 }); }
  if (s.mat === "jelly" || s.mat === "chicle" || s.low || (s.h < 200 && !s.float)) return;
  const ice = s.mat === "hielo", night = L.tod === "night", dens = Math.max(0.5, 1 + mood.bloom * 0.5 - mood.bitter * 0.3 + (s.bloom ? s.bloom * 0.25 : 0));
  const wBack = { mata: 6, flor: 3 + mood.bloom * 3 + (s.bloom || 0) * 2, seta: 1.2, piedra: 1.2 + mood.bitter * 2, arbusto: 1, cristal: 0.3, farol: night ? 1.2 : 0,
    piruleta: 0.3 + mood.bloom * 1.2 + (s.bloom || 0) * 0.6 + (b.kits && b.kits.includes("aldea") ? 0.6 : 0), algodon: 0.4 + mood.bloom * 0.8 + (s.bloom || 0) * 0.5, mustia: mood.bitter * 6 };
  if (s.lamps) wBack.farol = 5;
  for (let px = s.x + 14; px < s.x + s.w - 14; px += (22 + rr() * 46) / dens) {
    const kind = ice ? "cristal" : rr.weighted(wBack);
    const big = kind === "seta" || kind === "arbusto" || kind === "farol" || kind === "algodon";
    s.back.push({ x: px, kind, i: (rr() * 8) | 0, sc: big ? 0.45 + rr() * 0.3 : 0.6 + rr() * 0.35, flip: rr() < 0.5, lamp: !!s.lamps });
  }
  const wFront = { mata: 5, flor: 3 + mood.bloom * 2 + (s.bloom || 0), seta: 0.7, piedra: 1.5 + mood.bitter, farol: night ? 0.5 : 0, piruleta: 0.2 + mood.bloom * 0.6, mustia: mood.bitter * 4 };
  if (s.lamps) wFront.farol = 1.5;
  for (let px = s.x + 30; px < s.x + s.w - 30; px += (70 + rr() * 150) / dens) {
    if (busy && busy(px) && rr() < 0.7) continue;
    const kind = ice ? "cristal" : rr.weighted(wFront);
    s.front.push({ x: px, kind, i: (rr() * 8) | 0, sc: kind === "seta" || kind === "farol" ? 0.45 + rr() * 0.25 : 0.7 + rr() * 0.4, flip: rr() < 0.5, dy: 16 + rr() * 12, lamp: !!s.lamps });
  }
};

// ——— vestir el mundo: capas de decorado, flora por delante y por detrás ———
function dress(L, o, reserve) {
  const b = L.biome, dr = M.rng(o.seed + L.index * 131), res = reserve || [];
  const busy = (px) => L.walls.some((w) => Math.abs(w.x - px) < 160) || L.giants.some((g) => Math.abs(g.x - px) < 260) || (L.cage && Math.abs(L.cage.x - px) < 230) || L.signs.some((s) => Math.abs(s.x - px) < 110) ||
    (L.bossData && px > L.bossData.arena[0] && px < L.bossData.arena[1]) || res.some((q) => px > q[0] && px < q[1]) || L.dress.some((d) => d.secret && Math.abs(d.x - px) < 260);
  const man = (key) => (window.MANIFEST && window.MANIFEST.props ? window.MANIFEST.props[key] : null);
  // capa lejana y media-lejana
  for (let fx = -600; fx < L.end * 0.45 + 1200; fx += 200 + dr() * 220) L.props.push({ layer: "far", key: dr.pick(b.far), x: fx, y: 552 + dr() * 30, h: 170 + dr() * 110, flip: dr() < 0.5 });
  for (let fx = -600; fx < L.end * 0.7 + 1200; fx += 380 + dr() * 380) L.props.push({ layer: "midfar", key: dr.pick(b.back), x: fx, y: 634 + dr() * 34, h: 260 + dr() * 160, flip: dr() < 0.5 });
  L.solids.forEach((s) => {
    M.dressSolid(s, L, o.seed, busy);
    if (s.mat === "jelly" || s.mat === "chicle" || s.h < 200 || s.float || s.cave || s.low) return;
    // decorados grandes detrás del terreno (en las regiones amargas, menos casas)
    if (s.w >= 260) for (let px = s.x + 80 + dr() * 160; px < s.x + s.w - 80; px += 360 + dr() * 380) {
      if (busy(px)) continue;
      let key = dr.pick(b.back); if (L.mood.bitter > 0.5 && key.startsWith("casa") && dr() < 0.7) key = dr.pick(M.KITS.setal.back);
      const h = 230 + dr() * 190, mm = man(key), w = mm ? h * mm[0] / mm[1] : h;
      if (px - w * 0.42 < s.x + 10 || px + w * 0.42 > s.x + s.w - 10) continue;   // no puede sobresalir sobre un hueco
      L.props.push({ layer: "back", key, x: px, y: s.y + 30, h, flip: dr() < 0.5 });
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
