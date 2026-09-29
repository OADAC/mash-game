// Reparto: cada Mash tiene material, estadísticas, habilidad y una personalidad distinta por edad.
window.M = window.M || {};

// ——— PODERES (transformaciones de TU Mash) ———
// kind: hold = mientras mantienes · tap = pulsación · cost: masa por segundo (hold) o por uso (tap)
M.ABILITIES = {
  gigante:  { icon: "💪", kind: "tap",  cost: 0.22, dur: 6, name: { baby: "¡Grandote!", kids: "Gigante", young: "Modo tanque", adult: "Gigante" },
    desc: { baby: "¡Te haces enorme y aplastas grumos!", kids: "Creces durante 6 s: aplastas grumos y rompes galletas al caer.", young: "Te pones enorme 6 s. Todo lo que pisas, cae.", adult: "Durante un momento, pesar es una virtud." } },
  volar:    { icon: "🪶", kind: "hold", cost: 0.07, name: { baby: "Volar", kids: "Volar", young: "Vuelo", adult: "Vuelo" },
    desc: { baby: "¡Mantén y vuela!", kids: "Mantén el botón para aletear y volar. Gasta masa.", young: "Mantén: vuelas mientras te dure la masa.", adult: "Cada aleteo cuesta un poco de ti." } },
  fuego:    { icon: "🔥", kind: "tap",  cost: 0.05, name: { baby: "Fueguito", kids: "Fuego de caramelo", young: "Caramelo flamígero", adult: "Fuego de caramelo" },
    desc: { baby: "¡Lanza fueguitos dulces!", kids: "Bolas de caramelo ardiente: caramelizan grumos y derriten el hielo.", young: "Disparo de caramelo. Derrite hielo y grumos.", adult: "El azúcar, llevado al límite, se vuelve arma." } },
  turbo:    { icon: "⚡", kind: "hold", cost: 0.16, name: { baby: "¡Rapidísimo!", kids: "Supervelocidad", young: "Turbo", adult: "Supervelocidad" },
    desc: { baby: "¡Corre muy muy rápido!", kids: "Mantén para correr a toda pastilla y romper galletas… pero te desgasta.", young: "Velocidad x2. Rompe todo. Te consume rápido.", adult: "Ir deprisa tiene un precio: se paga en migas." } },
  azucar:   { icon: "✨", kind: "hold", cost: 0.11, name: { baby: "Brillitos", kids: "Forma de azúcar", young: "Modo fantasma", adult: "Forma de azúcar" },
    desc: { baby: "¡Te vuelves de azúcar y nada te hace daño!", kids: "Te conviertes en azúcar: atraviesas grumos y muros de azúcar sin daño.", young: "Intangible. Atraviesas enemigos y muros de azúcar.", adult: "Ser casi nada también es una forma de protegerse." } },
  burbuja:  { icon: "🫧", kind: "tap",  cost: 0.12, dur: 2.5, name: { baby: "Pompa", kids: "Burbuja", young: "Burbuja", adult: "Burbuja" },
    desc: { baby: "¡Sube flotando en una pompa!", kids: "Una pompa te eleva y te protege un momento.", young: "Encapsulado e inmune. Subes.", adult: "Ascender, a veces, es dejarse llevar." } },
  modelar:  { icon: "🧱", kind: "tap",  cost: 0.07, name: { baby: "Hacer camino", kids: "Modelar", young: "Build", adult: "Modelar" },
    desc: { baby: "¡Crea un suelo bajo tus pies!", kids: "Crea una plataforma de plastilina donde la necesites.", young: "Spawnea una plataforma. Dura 6 s.", adult: "Construye un apoyo temporal. Nada dura, pero ayuda." } },
  risa:     { icon: "😂", kind: "tap",  cost: 0.1,  name: { baby: "Risitas", kids: "Carcajada", young: "Meme", adult: "Carcajada" },
    desc: { baby: "¡Los grumos se ríen y se ablandan!", kids: "Los grumos cercanos se parten de risa y se deshacen en mini mash.", young: "Onda de risa: todo lo cercano se deshace.", adult: "La risa desarma. Literalmente." } },
  aspiradora: { icon: "🌪️", kind: "hold", cost: 0.02, name: { baby: "¡Súper ñam!", kids: "Superaspiradora", young: "Aspiradora pro", adult: "Superaspiración" },
    desc: { baby: "¡Se come todo desde lejos!", kids: "Aspira con el doble de alcance y fuerza, y atrae los caramelos.", young: "Rango x2. Nada se escapa.", adult: "Todo lo que se acerca, se queda." } },
};

// Caramelos de poder: se recogen en el mundo y dan una transformación gratis un rato
M.CANDIES = {
  volar:  { icon: "🪶", color: "#bde8ff", secs: 7 },
  fuego:  { icon: "🔥", color: "#ffb36b", secs: 8 },
  turbo:  { icon: "⚡", color: "#fff08a", secs: 5 },
  azucar: { icon: "✨", color: "#ffd1f0", secs: 6 },
};

// Materiales: cómo se comportan físicamente
M.MATERIALS = {
  malvavisco: { label: "Malvavisco", color: "#fff", bounce: 1.1, note: "Doble salto esponjoso" },
  plastilina: { label: "Plastilina", color: "#ffb08a", reform: true, note: "Se recompone si se aplasta" },
  gominola:   { label: "Gominola",   color: "#9ff0d4", bounce: 1.05, note: "Rebota un poco más" },
  merengue:   { label: "Merengue",   color: "#fff3e0", heavy: true, note: "Pesado: rompe al caer" },
  musgo:      { label: "Musgo",      color: "#b8e6a0", grip: true, note: "No resbala nunca" },
  chicle:     { label: "Chicle",     color: "#ffb3d9", sticky: true, note: "Se pega a las paredes un momento" },
  fruta:      { label: "Fruta",      color: "#ffc07a", round: true, note: "Redondito: corre más en bajada" },
  lana:       { label: "Lana",       color: "#e8d2ff", soft: true, note: "Cae más despacio" },
};

// stats: [velocidad, salto, peso, poder] de 1 a 5
M.CAST = {
  nube: {
    nat: -1,
    name: "Nube", kind: "Malvavisco Cuadrado", mat: "malvavisco", ability: null, stats: [3, 4, 2, 2], h: 110, ph: 62, procedural: true, // malvavisco del primer prototipo, sin lazo
    p: {
      baby: { d: "Es un cubito blandito con piernas rojas. ¡Le encantan los abrazos!", l: "¡Hola, amigo! 🤍" },
      kids: { d: "Un malvavisco cuadrado, valiente y un poco despistado. Su doble salto es el más esponjoso del valle.", l: "¡Vamos a por todos!" },
      young: { d: "Cuadrado, blanco y con piernas rojas. No sabe lo que es un filtro. Tampoco lo necesita.", l: "Ok, a ver, plan: saltar. Fin del plan." },
      adult: { d: "Un malvavisco que ha decidido no pensar en la hoguera. Casi siempre lo consigue.", l: "Un paso. Luego otro. Así funciona." },
    },
  },
  pompon: {
    nat: -1,
    name: "Pompón y Fresita", kind: "Gigante de Menta", mat: "gominola", ability: "gigante", stats: [2, 2, 5, 4], h: 210, ph: 104,
    p: {
      baby: { d: "¡Es enorme y blandito! Fresita, su amiguita, va siempre con él.", l: "¡Pum pum! ¡Qué divertido!" },
      kids: { d: "Tan blandito que los pájaros duermen la siesta en su barriga. Fresita dirige, Pompón pisa.", l: "¡Fresita dice que pisemos fuerte!" },
      young: { d: "Parece un tanque, es un peluche. Fresita es la que lleva el grupo y los memes.", l: "Fresita: 'lo tenemos'. Pompón: *pisa*." },
      adult: { d: "Grande, lento, leal. Fresita habla por los dos; él prefiere que el suelo tiemble por él.", l: "Hay cosas que solo se resuelven con peso." },
    },
  },
  gluglu: {
    nat: -1,
    name: "Gluglú", kind: "Burbuja Parlanchina", mat: "gominola", ability: "burbuja", stats: [3, 4, 2, 3], h: 170, ph: 88,
    p: {
      baby: { d: "¡Hace pompas y dice gluglú!", l: "¡Gluglú! ¡Pompas!" },
      kids: { d: "Hace gluglú cuando se ríe, cuando se asusta… y cuando está callado también.", l: "¡Gluglú! ¿Subimos en una pompa?" },
      young: { d: "Habla en burbujas. Literal. Nadie le entiende pero todos le siguen.", l: "gluglú gluglú (traducción: vamos)" },
      adult: { d: "Nadie sabe lo que dice. Quizá por eso todos le cuentan sus secretos.", l: "Glu. (Es una respuesta completa.)" },
    },
  },
  solete: {
    nat: -1,
    name: "Solete y Chispi", kind: "Sol de Plastilina", mat: "plastilina", ability: "fuego", stats: [3, 3, 3, 4], h: 190, ph: 96,
    p: {
      baby: { d: "¡Da calorcito! Chispi es su mascota.", l: "¡Calorcito para todos! ☀️" },
      kids: { d: "Solete calienta la pradera y derrite el hielo. Chispi colecciona pompas de jabón.", l: "¿Hielo? ¡Déjamelo a mí!" },
      young: { d: "Main character energy. Literalmente es un sol. Chispi es su hype man.", l: "Esto se va a poner caliente. Ya sabes." },
      adult: { d: "Irradia sin pedir nada a cambio. Chispi aprendió de él a no apagarse.", l: "Todo hielo es solo agua esperando." },
    },
  },
  trompetin: {
    nat: -1,
    name: "Trompetín", kind: "Elefante Gominola", mat: "gominola", ability: "aspiradora", stats: [2, 3, 4, 4], h: 200, ph: 100,
    p: {
      baby: { d: "¡Aspira con su trompa! ¡Ñam!", l: "¡Tuuut! ¡Ñam ñam!" },
      kids: { d: "Toca la trompa para despertar a las setas y aspira a los grumos para copiar su poder.", l: "¡Tuuut! ¿Algún grumo para merendar?" },
      young: { d: "Aspiradora con patas. Se come a los enemigos y se queda con su power. Sin remordimientos.", l: "Lo que me como, lo uso. Así es el juego." },
      adult: { d: "Todo lo que absorbe lo transforma. Cree que eso es lo más parecido a la sabiduría.", l: "Nada se pierde. Todo se digiere." },
    },
  },
  canelo: {
    nat: -1,
    name: "Canelo", kind: "Ciervo Canela", mat: "lana", ability: "turbo", stats: [5, 3, 3, 3], h: 175, ph: 94,
    p: {
      baby: { d: "¡Corre muy rápido! Lleva jersey siempre.", l: "¡Corre, corre! 🦌" },
      kids: { d: "Lleva jersey todo el año porque dice que los cuernos le dan frío. Embiste las galletas.", l: "¡Aparta, galleta, que voy!" },
      young: { d: "Speedrunner de nacimiento. Dice que el jersey es 'aesthetic'.", l: "Dash, dash, dash. Siguiente." },
      adult: { d: "Siempre con prisa, siempre con frío. Nunca ha preguntado por qué.", l: "Si voy rápido, no lo pienso." },
    },
  },
  orejotas: {
    nat: -1,
    name: "Orejotas", kind: "Ratón Capuchino", mat: "lana", ability: "volar", stats: [4, 3, 1, 2], h: 170, ph: 86,
    p: {
      baby: { d: "¡Vuela con sus orejas grandotas!", l: "¡Mis orejas vuelan! 🐭" },
      kids: { d: "Oye un caramelo desenvolverse a tres bosques. Usa las orejas para planear.", l: "¡Agárrate, que planeamos!" },
      young: { d: "Lo escucha TODO. Sabe todos los cotilleos del valle. Planea con las orejas, obvio.", l: "No he oído nada. (Lo he oído todo.)" },
      adult: { d: "Escucha más de lo que habla. Ha aprendido que caer despacio también es volar.", l: "Escucha el viento. Él sabe dónde vas." },
    },
  },
  rayitas: {
    nat: -1,
    name: "Rayitas", kind: "Dragón Rayado", mat: "gominola", ability: "fuego", stats: [3, 3, 3, 4], h: 180, ph: 92,
    p: {
      baby: { d: "¡Un dragón de rayitas! Se come a los grumos.", l: "¡Grr! ¡Ñam! 🐉" },
      kids: { d: "Se pintó las rayas él mismo con plastilina de limón. Traga grumos y copia su poder.", l: "¡Rayas de limón, poder de dragón!" },
      young: { d: "Dragón autodidacta. Se hizo las rayas en un tuto. Se come a los grumos por el contenido.", l: "Esto va directo a mis stories." },
      adult: { d: "Se dibujó a sí mismo como quería ser. Le salió bastante bien.", l: "Uno es lo que decide pintarse." },
    },
  },
  mandarino: {
    nat: -1,
    name: "Mandarino", kind: "Fruta Curiosa", mat: "fruta", ability: "turbo", stats: [4, 4, 2, 2], h: 140, ph: 78,
    p: {
      baby: { d: "¡Es una mandarina con ojos! ¡Rueda!", l: "¡Ruedo, ruedo! 🍊" },
      kids: { d: "Nadie sabe si es una mandarina con ojos o unos ojos con mandarina. Rueda que da gusto.", l: "¡Soy redondo, soy veloz!" },
      young: { d: "Crisis de identidad nivel fruta. Rueda para no pensarlo.", l: "¿Soy fruta? ¿Soy ojo? ¿Soy dash? Sí." },
      adult: { d: "Ha dejado de preguntarse qué es. Ahora solo rueda, y es más feliz.", l: "Las preguntas pesan. Rodar no." },
    },
  },
  pinita: {
    nat: 1,
    name: "Piñita", kind: "Brote Tímido", mat: "musgo", ability: "modelar", stats: [2, 3, 2, 4], h: 165, ph: 86,
    p: {
      baby: { d: "Es tímida. ¡Hace crecer caminos de musgo!", l: "Ho… hola. 🌱" },
      kids: { d: "Se esconde en su abrigo de musgo. Si le haces cosquillas, florece y crea plataformas.", l: "¿Te… te hago un caminito?" },
      young: { d: "Introvertida pro. Te construye un puente pero no le pidas que hable en público.", l: "…ok. toma. un puente. no me mires." },
      adult: { d: "Crece despacio y sin ruido. Lo que construye, aguanta lo justo para que pases.", l: "No hace falta mucho para sostener a alguien." },
    },
  },
  merengue: {
    nat: -1,
    name: "Yeti Merengue", kind: "Gigante Glaseado", mat: "merengue", ability: "gigante", stats: [2, 2, 5, 5], h: 220, ph: 108,
    p: {
      baby: { d: "¡Parece grande pero es muy bueno!", l: "¡Abrazo de yeti! 🤗" },
      kids: { d: "Parece temible, pero llora a moco tendido con los finales felices. Su pisotón hace temblar el valle.", l: "¡No lloro, es merengue derretido!" },
      young: { d: "Aspecto: jefe final. Personalidad: llora con los vídeos de gatitos.", l: "Estoy bien. Es el glaseado. Déjame." },
      adult: { d: "La dureza por fuera y el azúcar por dentro no son una contradicción. Son un yeti.", l: "Ser grande es saber dónde pisar." },
    },
  },
  donbaston: {
    nat: -1,
    name: "Don Bastón", kind: "Abuelo Sabio", mat: "plastilina", ability: "modelar", stats: [1, 2, 3, 5], h: 200, ph: 100,
    p: {
      baby: { d: "¡Un abuelito que cuenta cuentos!", l: "Había una vez… ¡tú! 👴" },
      kids: { d: "Trescientos años de cuentos y un bastón que sirve para todo. Incluso de bastón. Modela escalones.", l: "Cuando yo era joven, los grumos eran más educados." },
      young: { d: "Abuelo lore. Cada frase suya es una cita para poner en la bio.", l: "Chaval, el camino no se encuentra: se modela." },
      adult: { d: "Ha visto muchas hogueras y ha decidido seguir contando cuentos. Es su forma de resistencia.", l: "Lo que se modela con paciencia no se deshace fácil." },
    },
  },
  risotas: {
    nat: -1,
    name: "Los Risotas", kind: "Dúo Esponjoso", mat: "gominola", ability: "risa", stats: [3, 3, 3, 4], h: 180, ph: 92,
    p: {
      baby: { d: "¡Se ríen muchísimo! Jajaja.", l: "¡Jajajaja! 😆" },
      kids: { d: "Si uno se ríe, el otro también. Llevan riéndose desde el martes pasado. Su risa derrite a los mocos.", l: "¡Jajaja! ¿De qué nos reíamos? ¡Jajaja!" },
      young: { d: "Dúo de humor. Su carcajada es contagiosa a nivel viral. Stun en área garantizado.", l: "JAJSJAJSJ no puedo" },
      adult: { d: "Saben que la risa no arregla nada. También saben que lo arregla casi todo.", l: "Si no nos reímos, ¿entonces qué?" },
    },
  },
  plastilino: {
    nat: -1,
    name: "Abuelo Plastilino", kind: "Guardián del Valle", mat: "plastilina", ability: "modelar", stats: [2, 2, 4, 5], h: 200, ph: 100,
    p: {
      baby: { d: "¡Hizo todo el mundo con sus manos!", l: "¡A modelar! 🧱" },
      kids: { d: "Modeló el valle entero con sus manos. Dice que las montañas le quedaron un poco torcidas.", l: "Si falta suelo, se hace. Así de fácil." },
      young: { d: "Literalmente el dev del valle. Los bugs (montañas torcidas) son features.", l: "No es un bug. Es una montaña con carácter." },
      adult: { d: "Creó un mundo y aprendió que ninguno sale recto. Lo prefiere así.", l: "La imperfección es lo que se puede agarrar." },
    },
  },
  grenas: {
    nat: -1,
    name: "Greñas", kind: "Peludo de Bruma", mat: "lana", ability: "aspiradora", stats: [3, 3, 4, 3], h: 200, ph: 100,
    p: {
      baby: { d: "¡Tiene mucho pelo! ¡Guarda cosas dentro!", l: "¡Tengo un caramelo en el pelo! 🍬" },
      kids: { d: "Su pelo guarda tantas cosas perdidas que tiene su propia oficina de objetos perdidos. Absorbe grumos.", l: "¿Has perdido algo? Mira en mi pelo." },
      young: { d: "Su pelo es un inventario infinito. Nadie sabe qué hay dentro. Él tampoco.", l: "Inventario lleno. Bueno, cabe uno más." },
      adult: { d: "Guarda lo que otros pierden. A veces cree que él también es algo que alguien perdió.", l: "Todo lo perdido está en algún sitio." },
    },
  },
  narizotas: {
    nat: -1,
    name: "Narizotas", kind: "Unicornio Chicle", mat: "chicle", ability: "azucar", stats: [3, 4, 2, 3], h: 200, ph: 100,
    p: {
      baby: { d: "¡Un unicornio de chicle! ¡Hace pompas gigantes!", l: "¡Pompa de chicle! 🦄" },
      kids: { d: "Su cuerno es de caramelo, por eso nunca le dejan solo en las fiestas. Sopla burbujas de chicle.", l: "¿Subimos? ¡Pompa de chicle!" },
      young: { d: "Unicornio y además de chicle. Dice que es 'demasiado' para este valle. Tiene razón.", l: "Soy un unicornio de chicle. Supéralo." },
      adult: { d: "Ha aceptado ser raro. Descubrió que lo raro flota mejor.", l: "Lo ligero no es poco. Solo es ligero." },
    },
  },
  bufandilla: {
    nat: 1,
    name: "Bufandilla", kind: "Llama Acurrucada", mat: "lana", ability: "volar", stats: [3, 4, 2, 3], h: 185, ph: 94,
    p: {
      baby: { d: "¡Hace bufandas! ¡Y vuela con ellas!", l: "¡Toma una bufandita! 🧣" },
      kids: { d: "Teje bufandas para todo el valle. Esta es la número 4.812. La usa para planear.", l: "¡Agárrate a mi bufanda!" },
      young: { d: "Craftea bufandas a lo bestia. Tiene una tienda online que no factura nada.", l: "Bufanda número 4.813. Edición limitada." },
      adult: { d: "Teje para no pensar, y lo que teje abriga a otros. No es mal trato.", l: "Cada vuelta del hilo es una forma de quedarse." },
    },
  },
};
M.CAST_ORDER = Object.keys(M.CAST);
M.FRIEND_IDS = M.CAST_ORDER.filter((k) => k !== "nube");

M.persona = (id, age) => M.CAST[id].p[age] || M.CAST[id].p.kids;
M.abilityName = (ab, age) => ab ? (M.ABILITIES[ab].name[age] || M.ABILITIES[ab].name.kids) : "Aspirar";
M.abilityDesc = (ab, age) => ab ? (M.ABILITIES[ab].desc[age] || M.ABILITIES[ab].desc.kids) : "Aspira grumos y los convierte en mini mash. Doble salto esponjoso.";
// orden de rescate: cada mundo desbloquea un poder nuevo; el 4º mundo de cada región es un jefe
M.RESCUE_ORDER = ["pompon", "orejotas", "solete", "canelo", "narizotas", "gluglu", "trompetin", "risotas", "pinita", "rayitas", "mandarino", "merengue", "bufandilla", "grenas", "donbaston", "plastilino"];

// ——— Mash salvajes (procedurales, de M.ProcChar) ———
// id "w_<semilla>". Se registran en M.CAST al vuelo para que funcionen como líder, compañero, carta o visitante.
M.wildId = (seed) => "w_" + seed;
M.isWild = (id) => typeof id === "string" && id.slice(0, 2) === "w_";
M.ensureWild = (seed, opts) => {
  const id = M.wildId(seed);
  if (!M.CAST[id] && M.ProcChar) M.ProcChar.register(M.ProcChar.generate(seed, opts));
  return M.CAST[id] ? id : null;
};
// reparto completo del perfil: los fijos + los salvajes conocidos (profile.wild o worldState.wildMet)
M.allCast = (profile) => {
  const seeds = [].concat((profile && profile.wild) || [], (profile && profile.worldState && profile.worldState.wildMet) || []);
  const wild = [];
  seeds.forEach((s) => { const id = M.ensureWild(s); if (id && !wild.includes(id)) wild.push(id); });
  return M.CAST_ORDER.filter((id) => !M.isWild(id)).concat(wild);
};
// retrato de cualquier Mash: imagen fija, Nube procedural o criatura generada
M.castPortrait = (id, size) => {
  const d = M.CAST[id];
  if (d && d.procgen && M.ProcChar) return M.ProcChar.portrait(d.creature, size || 256);
  if (id === "nube" && M.nubePortrait) return M.nubePortrait();
  return "assets/chars/" + id + ".webp";
};
