// Datos del mundo: amigos, zonas y diseño del nivel.
window.M = window.M || {};

M.FRIENDS = {
  pompon:     { name: "Pompón y Fresita", kind: "Gigante de Menta",   h: 210, stats: [5, 4, 3],
    desc: "Pompón es tan blandito que los pájaros duermen la siesta en su barriga. Nunca va a ningún sitio sin Fresita, su amiga diminuta." },
  gluglu:     { name: "Gluglú",           kind: "Burbuja Parlanchina", h: 170, stats: [4, 3, 5],
    desc: "Hace gluglú cuando se ríe, cuando se asusta… y cuando está callado también." },
  solete:     { name: "Solete y Chispi",  kind: "Sol de Plastilina",  h: 190, stats: [3, 5, 4],
    desc: "Solete da calorcito a toda la pradera. Chispi, su mascota, colecciona pompas de jabón." },
  trompetin:  { name: "Trompetín",        kind: "Elefante Gominola",  h: 200, stats: [5, 3, 4],
    desc: "Toca la trompa cada mañana para despertar a las setas. Algunas se hacen las dormidas." },
  canelo:     { name: "Canelo",           kind: "Ciervo Canela",      h: 175, stats: [3, 5, 2],
    desc: "Lleva jersey todo el año porque dice que los cuernos le dan frío." },
  orejotas:   { name: "Orejotas",         kind: "Ratón Capuchino",    h: 170, stats: [4, 4, 3],
    desc: "Oye un caramelo desenvolverse a tres bosques de distancia." },
  rayitas:    { name: "Rayitas",          kind: "Dragón Rayado",      h: 180, stats: [3, 4, 4],
    desc: "Le gustan tanto las rayas que se las pintó él mismo… con plastilina de limón." },
  mandarino:  { name: "Mandarino",        kind: "Fruta Curiosa",      h: 140, stats: [4, 5, 5],
    desc: "Nadie sabe si es una mandarina con ojos o unos ojos con mandarina." },
  pinita:     { name: "Piñita",           kind: "Brote Tímido",       h: 165, stats: [5, 5, 2],
    desc: "Se esconde dentro de su abrigo de musgo. Si le haces cosquillas, florece." },
  merengue:   { name: "Yeti Merengue",    kind: "Gigante Glaseado",   h: 220, stats: [5, 4, 3],
    desc: "Parece enorme y temible, pero llora a moco tendido con los finales felices." },
  donbaston:  { name: "Don Bastón",       kind: "Abuelo Sabio",       h: 200, stats: [2, 5, 4],
    desc: "Tiene trescientos años de cuentos y un bastón que sirve para todo. Incluso de bastón." },
  risotas:    { name: "Los Risotas",      kind: "Dúo Esponjoso",      h: 180, stats: [5, 3, 5],
    desc: "Si uno se ríe, el otro también. Llevan riéndose desde el martes pasado." },
  plastilino: { name: "Abuelo Plastilino", kind: "Guardián del Valle", h: 200, stats: [3, 5, 3],
    desc: "Modeló el valle entero con sus manos. Dice que las montañas le quedaron un poco torcidas." },
  grenas:     { name: "Greñas",           kind: "Peludo de Bruma",    h: 200, stats: [5, 3, 3],
    desc: "Su pelo guarda tantas cosas perdidas que tiene su propia oficina de objetos perdidos." },
  narizotas:  { name: "Narizotas",        kind: "Unicornio Chicle",   h: 200, stats: [3, 4, 5],
    desc: "Su cuerno es de caramelo. Por eso nunca le dejan solo en las fiestas." },
  bufandilla: { name: "Bufandilla",       kind: "Llama Acurrucada",   h: 185, stats: [4, 5, 3],
    desc: "Teje bufandas para todo el valle. Esta es la bufanda número 4.812." },
};
M.FRIEND_ORDER = Object.keys(M.FRIENDS);

// Paletas de cada zona
M.ZONES = [
  { name: "Pradera de Algodón", x0: 0,     bg: "pradera",   body: "#a9dcc0", body2: "#7fc3a3", frost: "#fff4dc", dots: ["#ffb3c1", "#ffe08a", "#c9b6ff", "#ffffff"],
    tint: "rgba(255,244,220,0.18)", fog: [242, 238, 222], music: 0,
    far: ["arbol_grande", "arbol_isla", "arbol_conejo", "seta_gorda"], mid: ["arbol_isla", "arbol_conejo", "arbol_grande", "seta_gorda", "arbol_setas"], front: ["seta_luz", "cactus"] },
  { name: "Bosque de Setas",    x0: 5400,  bg: "setas",     body: "#f5bfa6", body2: "#e39c86", frost: "#ffe1e6", dots: ["#9ee3cf", "#fff2b3", "#c9b6ff", "#ffffff"],
    tint: "rgba(255,214,220,0.14)", fog: [246, 226, 222], music: 1,
    far: ["seta_arbol", "seta_columnas", "seta_gorda", "seta_luz"], mid: ["seta_arbol", "seta_gorda", "seta_columnas", "arbol_setas", "seta_luz"], front: ["seta_luz", "seta_gorda"] },
  { name: "Aldea Plastilina",   x0: 10800, bg: "atardecer", body: "#f5dc98", body2: "#e2bf6f", frost: "#d8f3e8", dots: ["#ff9fb6", "#9fd9ff", "#c3f0b4", "#ffffff"],
    tint: "rgba(255,210,170,0.16)", fog: [250, 228, 206], music: 2,
    far: ["castillo", "casitas", "casa_torre", "casa_setas"], mid: ["casa_seta", "casa_amarilla", "casa_torre", "casa_setas", "casa_redonda", "casa_blanca", "casa_puerta", "casa_ojos"], front: ["cactus", "seta_luz"] },
  { name: "Valle de las Luces", x0: 16200, bg: "cueva",     body: "#cbb8ea", body2: "#a893d4", frost: "#fdf0ff", dots: ["#fff08a", "#9ff0dc", "#ffb3d9", "#ffffff"],
    tint: "rgba(70,50,110,0.28)", fog: [206, 196, 226], music: 3, night: true,
    far: ["castillo", "seta_arbol", "casa_luz", "seta_columnas"], mid: ["casa_luz", "seta_luz", "seta_columnas", "seta_arbol", "casa_seta"], front: ["seta_luz", "cactus"] },
];
M.LEVEL_END = 22600;

// Diseño del nivel con un pequeño "lenguaje" de construcción.
M.buildLevel = function () {
  const L = { solids: [], plats: [], movers: [], shrooms: [], sparks: [], friends: [], grumos: [], checks: [], props: [], signs: [], goal: null };
  const ground = (x1, x2, y) => L.solids.push({ x: x1, y, w: x2 - x1, h: 1600 - y });
  const plat = (x, y, w) => L.plats.push({ x, y, w, h: 36 });
  const mover = (x, y, w, dx, dy, period, phase = 0) => L.movers.push({ x0: x, y0: y, x, y, w, h: 36, dx, dy, period, phase, vx: 0, vy: 0 });
  const shroom = (x, y) => L.shrooms.push({ x, y, w: 110, squash: 0 });
  const spark = (x, y) => L.sparks.push({ x, y, got: false, t: Math.random() * 6 });
  const line = (x, y, n, dx = 60, dy = 0) => { for (let i = 0; i < n; i++) spark(x + i * dx, y + i * dy); };
  const arc = (x, y, n, w, hgt) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); spark(x + t * w, y - Math.sin(t * Math.PI) * hgt); } };
  const friend = (id, x, y) => L.friends.push({ id, x, y, met: false, t: Math.random() * 6, hop: 0 });
  const grumo = (x, y, range) => L.grumos.push({ x, y, x1: x - range, x2: x + range, dir: Math.random() < 0.5 ? -1 : 1, alive: true, t: Math.random() * 6, hop: 0, squash: 0, dead: 0 });
  const check = (x, y) => L.checks.push({ x, y, on: false, glow: 0 });
  const prop = (layer, key, x, y, h, flip = false) => L.props.push({ layer, key, x, y, h, flip });
  const sign = (x, y, text) => L.signs.push({ x, y, text });

  // ——— ZONA 1 · Pradera de Algodón ———
  ground(-400, 1300, 600);
  sign(420, 600, "← → para moverte · Espacio para saltar");
  line(520, 530, 5);
  friend("pompon", 980, 600);
  sign(1180, 600, "¡Salta dos veces en el aire!");
  arc(1260, 520, 5, 260, 110);
  ground(1480, 2300, 600);
  grumo(1880, 600, 200);
  line(1700, 520, 4, 80);
  ground(2300, 2700, 520);
  plat(2420, 380, 200);
  line(2450, 330, 3, 70);
  ground(2700, 3000, 600);
  check(2800, 600);
  shroom(2940, 600);
  sign(2760, 600, "Las setas rebotan muuucho");
  plat(3060, 250, 260);
  friend("gluglu", 3190, 250);
  line(3000, 180, 4, 70);
  ground(3000, 3900, 600);
  grumo(3450, 600, 220);
  friend("solete", 3780, 600);
  mover(3960, 520, 150, 90, 0, 3.2);
  line(3980, 450, 3, 60);
  ground(4180, 5400, 560);
  line(4300, 490, 6, 60);
  grumo(4500, 560, 150);
  friend("trompetin", 4820, 560);
  check(5150, 560);

  // ——— ZONA 2 · Bosque de Setas ———
  ground(5400, 5950, 560);
  shroom(5560, 560);
  line(5520, 280, 3, 70);
  plat(5980, 470, 180);
  plat(6200, 370, 180);
  plat(6440, 280, 240);
  line(6000, 420, 3, 60); line(6220, 320, 3, 60);
  friend("canelo", 6560, 280);
  ground(6150, 6900, 660);
  grumo(6350, 660, 160); grumo(6700, 660, 140);
  shroom(6830, 660);
  ground(6900, 7450, 400);
  line(6950, 330, 7, 60);
  friend("orejotas", 7260, 400);
  ground(7450, 8250, 610);
  check(7560, 610);
  grumo(7900, 610, 220);
  arc(7650, 540, 6, 420, 90);
  mover(8330, 540, 160, 0, 90, 3.6);
  mover(8620, 470, 150, 130, 0, 4.2, 1.2);
  plat(8950, 420, 170);
  line(8370, 440, 2, 60); line(8660, 380, 3, 60); arc(8960, 360, 3, 130, 30);
  ground(9150, 10800, 580);
  friend("rayitas", 9420, 580);
  grumo(9800, 580, 180);
  shroom(10020, 580);
  plat(10080, 200, 360);
  line(10110, 140, 5, 65);
  friend("mandarino", 10330, 200);
  check(10600, 580);

  // ——— ZONA 3 · Aldea Plastilina ———
  ground(10800, 12000, 580);
  friend("pinita", 11250, 580);
  grumo(11650, 580, 200);
  line(11400, 510, 5, 60);
  ground(12000, 12200, 500);
  ground(12200, 12400, 420);
  ground(12400, 12900, 340);
  line(12040, 440, 2, 70); line(12240, 360, 2, 70);
  friend("merengue", 12700, 340);
  ground(12900, 13700, 610);
  check(13000, 610);
  grumo(13250, 610, 160); grumo(13550, 610, 120);
  plat(13800, 520, 170);
  mover(14060, 440, 160, 0, -110, 3.4);
  plat(14330, 500, 170);
  mover(14600, 430, 150, 110, 0, 3.8, 0.6);
  line(13820, 460, 3, 55); line(14080, 360, 2, 60); line(14350, 440, 3, 55); line(14610, 370, 3, 55);
  ground(14860, 16200, 580);
  friend("donbaston", 15120, 580);
  grumo(15450, 580, 160);
  shroom(15640, 580);
  plat(15700, 230, 280);
  line(15720, 170, 4, 65);
  friend("risotas", 15850, 230);
  check(16050, 580);

  // ——— ZONA 4 · Valle de las Luces ———
  ground(16200, 17100, 600);
  friend("plastilino", 16650, 600);
  line(16300, 530, 4, 70);
  plat(17200, 540, 150);
  plat(17450, 460, 150);
  mover(17720, 420, 150, 150, 0, 3.6);
  plat(18060, 360, 150);
  line(17210, 480, 2, 60); line(17460, 400, 2, 60); line(17730, 360, 3, 60); line(18070, 300, 2, 60);
  ground(18250, 19000, 580);
  grumo(18450, 580, 140); grumo(18800, 580, 130);
  friend("grenas", 18620, 580);
  check(18300, 580);
  shroom(18960, 580);
  ground(19100, 19700, 300);
  line(19150, 240, 8, 65);
  friend("narizotas", 19420, 300);
  ground(19700, 20700, 610);
  grumo(20000, 610, 200); grumo(20400, 610, 160);
  friend("bufandilla", 20560, 610);
  check(19800, 610);
  ground(20700, 23200, 580);
  arc(20820, 500, 9, 700, 120);
  L.goal = { x: 21900, y: 580 };
  sign(21350, 580, "¡La Gran Tarta!");

  return L;
};
