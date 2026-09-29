// Criaturas procedurales: Mash salvajes infinitos con cuerpo de plastilina, rasgos, nombre y personalidad por edad.
// API: M.ProcChar.generate(seed, opts) · draw(ctx, cr, x, y, h, st) · portrait(cr, size) · register(cr) · grumoVariant(seed)
window.M = window.M || {};

M.ProcChar = (() => {
  // ——— azar determinista propio (no depende de core.js) ———
  function rngOf(seed) {
    let a = (typeof seed === "string" ? hashStr(seed) : Math.floor(Math.abs(seed) * 2654435761)) >>> 0;
    const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (x, y) => x + f() * (y - x);
    f.int = (x, y) => Math.floor(x + f() * (y - x + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.weighted = (o) => { let t = 0; for (const k in o) t += Math.max(0, o[k]); let r = f() * t; for (const k in o) { r -= Math.max(0, o[k]); if (r <= 0) return k; } return Object.keys(o)[0]; };
    return f;
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ——— color ———
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (a) => "#" + a.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  // k > 0 aclara hacia blanco, k < 0 oscurece (con un toque cálido para que no quede gris)
  function shade(hex, k) { const c = rgb(hex); return toHex(c.map((v, i) => k > 0 ? v + (255 - v) * k : v * (1 + k) + (i === 0 ? -k * 18 : i === 2 ? k * 6 : 0))); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); }
  const rgba = (hex, al) => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${al})`; };

  // familias pastel del mundo Mashmellous: [tono, saturación, luz, nombre para "de X"]
  const FAM = {
    menta: [158, 50, 79, "Menta"], rosa: [346, 82, 85, "Fresa"], mantequilla: [47, 90, 81, "Mantequilla"], lavanda: [262, 62, 84, "Lavanda"],
    melocoton: [22, 88, 81, "Melocotón"], cielo: [200, 72, 83, "Cielo"], lima: [84, 55, 78, "Lima"], coral: [7, 80, 80, "Coral"],
    nata: [38, 70, 93, "Nata"], lila: [292, 45, 84, "Lila"],
  };
  const FAM_KEYS = Object.keys(FAM);
  const BIOME_FAM = {
    pradera: { menta: 3, mantequilla: 2, lima: 2, rosa: 1.5 }, setas: { rosa: 3, melocoton: 2, coral: 2, nata: 1 },
    aldea: { melocoton: 3, mantequilla: 3, coral: 1.5, menta: 1 }, valle: { lavanda: 3, cielo: 2.5, lila: 2, menta: 1 },
  };
  const INK = "#2a1b22";

  // ——— catálogo de rasgos ———
  const BODIES = { bola: 10, gota: 9, pera: 8, alubia: 7, cubo: 8, alto: 7, bicho: 7, nube: 5 };
  const BODY_DIM = { bola: [88, 84], gota: [80, 94], pera: [84, 98], alubia: [108, 72], cubo: [88, 84], alto: [64, 114], bicho: [120, 74], nube: [106, 76] };
  const EYES = { puntos: 10, ojazos: 10, sueno: 4, uno: 2, tres: 2 };
  const MOUTHS = { sonrisa: 10, abierta: 6, diente: 4, gatito: 4, o: 3, timida: 4 };
  const EARS = { nada: 9, raton: 5, conejo: 4, caidas: 3, gato: 3, oso: 3 };
  const HEADS = { nada: 7, ciervo: 3, cuernitos: 4, antenas: 4, brote: 4, seta: 3, pelo: 3, cuerno: 1.2 };
  const TAILS = { nada: 10, bolita: 4, larga: 3, dragon: 2 };
  const PATTERNS = { nada: 5, motas: 8, rayas: 3, degradado: 5, manchas: 4 };

  // ——— textos ———
  const ROOTS = ["Gom", "Pel", "Truf", "Mel", "Bomb", "Pomp", "Chisp", "Mig", "Nub", "Lun", "Fres", "Ment", "Mor", "Can", "Pip", "Tit", "Cuc", "Rull", "Bal", "Bol", "Lul", "Mim", "Coc", "Ros", "Gus", "Pat", "Tof", "Bizc", "Churr", "Cham", "Flan", "Gal", "Gar", "Mang", "Mof", "Mus", "Nap", "Pan", "Pis", "Pul", "Rab", "Sus", "Tamb", "Tor", "Turr", "Zum", "Bet", "Brum", "Carm", "Dul", "Fid", "Glob", "Lim", "Mant", "Merl", "Oll", "Pach", "Quel", "Ram", "Sal", "Tul", "Vain", "Chup", "Cris", "Fof", "Gin", "Lol", "Moñ", "Ñam", "Nin"];
  const MIDS = ["i", "u", "o", "a", "us", "il", "ol", "ar", "iv", "is", "ur", "ib", "ech", "ub"];
  const END_V = ["ín", "ina", "ito", "ita", "ú", "ilú", "ón", "ona", "illa", "illo", "eta", "ete", "uchi", "ote", "isa", "ela", "osa", "oso", "í", "ino", "ola", "ulo"]; // tras consonante
  const END_C = ["lú", "na", "to", "ta", "chi", "lín", "rín", "ñín", "mí", "tín", "ña", "lo", "la", "sa", "fú", "bú", "cho", "cha"]; // tras vocal
  const SURN = ["Menta", "Fresa", "Nata", "Limón", "Canela", "Vainilla", "Algodón", "Brisa", "Trufa", "Almíbar", "Gominola", "Merengue", "Pompón", "Galleta", "Rocío", "Musgo"];
  const FEM_END = /(a|ina|ita|illa|eta|ona|isa|ela|osa|ola|ña|la|sa|cha|ta|na)$/;

  const HOBBIES = ["coleccionar botones perdidos", "contar las nubes", "hacer pompas con la nariz", "dormir en los sombreros de las setas", "cantarles a los caracoles", "ordenar las piedras por colores", "perseguir mariposas de azúcar", "tejer calcetines para gusanos", "bañarse en charcos de almíbar", "esconderse en tazas de té", "pintar motas a las piedras", "coleccionar hojas con forma de corazón", "silbar canciones que se inventa", "abrazar árboles", "rodar colina abajo", "buscar tesoros en la arena", "hablar con su propia sombra", "hornear galletas imaginarias", "mirar las estrellas desde una hoja", "hacer cosquillas a las flores", "dar nombre a cada gota de lluvia", "construir castillos de migas"];
  const HOB_T = {
    baby: ["¡Le encanta {hob}!", "Su juego favorito es {hob}.", "Siempre quiere {hob}. ¡Qué gracia!"],
    kids: ["Su pasatiempo favorito: {hob}.", "Cuando nadie mira, se dedica a {hob}.", "Dice que de mayor quiere {hob} profesionalmente."],
    young: ["Hobby: {hob}. No lo juzgues.", "Tiene un canal sobre {hob}. Cuatro seguidores.", "Su personalidad entera es {hob}, y le funciona."],
    adult: ["Dedica las tardes a {hob}, como quien cuida un pequeño ritual.", "Ha hecho de {hob} una filosofía discreta.", "Dice que {hob} le ordena el mundo por dentro."],
  };
  // personalidades: d = descripciones, l = frases (género con {o}; {mat} = material)
  const TEMPS = {
    timido: {
      baby: { d: ["Es tímid{o} y se esconde detrás de las flores.", "Habla bajito, bajito. ¡Pero es muy buen{o}!"], l: ["Ho… hola. 🌸", "¿Jugamos… juntitos?"] },
      kids: { d: ["Se pone colorad{o} si le miras mucho rato, pero nunca abandona a un amigo.", "Tan tímid{o} que saluda a los caracoles antes que a nadie."], l: ["¿Puedo… ir contigo? Si no molesto…", "Vale, pero tú vas delante."] },
      young: { d: ["Introvertid{o} nivel experto. Responde en tres días, pero responde.", "Batería social al 3 %. Aun así ha venido."], l: ["…ok. voy. pero sin fotos.", "no hablo mucho. pero estoy."] },
      adult: { d: ["Habla poco porque escucha mucho. Sabe cosas del valle que nadie le ha preguntado.", "Ha hecho del silencio una casa pequeña y cálida."], l: ["No hace falta decirlo todo.", "Estoy aquí. Eso ya es bastante."] },
    },
    curioso: {
      baby: { d: ["¡Todo lo quiere tocar y oler!", "Pregunta «¿por qué?» a todo. ¡A todo!"], l: ["¿Qué es eso? ¿Y eso? 👀", "¡Oooh! ¡Mira!"] },
      kids: { d: ["Ha metido la nariz en todos los agujeros del valle. En dos se quedó atascad{o}.", "Lleva una libreta donde apunta cada bicho raro que ve. Tú ya estás dentro."], l: ["¿Qué hay detrás de esa colina? ¡Vamos a ver!", "Espera, espera… ¿eso de ahí brilla?"] },
      young: { d: ["Modo explorador 24/7. Ha encontrado más secretos que los que caben en un mapa.", "Tiene cuatrocientas pestañas abiertas en la cabeza."], l: ["Vale, pero ¿y si vamos por donde no hay camino?", "Esto tiene lore. Lo sé."] },
      adult: { d: ["Pregunta sin miedo a la respuesta. Es más raro de lo que parece.", "Cree que el mundo es un libro sin índice. Lo lee a saltos."], l: ["Toda pregunta es una puerta.", "Mirar con calma ya es una forma de querer."] },
    },
    gloton: {
      baby: { d: ["¡Siempre tiene hambre! Ñam, ñam.", "Le encantan las galletas. ¡Y los caramelos!"], l: ["¿Tienes un caramelito? 🍬", "¡Ñam! ¡Qué rico!"] },
      kids: { d: ["Se ha comido tres puentes de galleta. Dice que fue sin querer.", "Huele una tarta a dos colinas de distancia."], l: ["¿Eso se come? Pregunto por un amigo.", "¡Primero merendamos, luego salvamos el valle!"] },
      young: { d: ["Su personalidad es la merienda. Y no pide perdón.", "Foodie profesional. Puntúa cada caramelo del valle del 1 al 10."], l: ["Esto es un 7/10. Le falta azúcar.", "Pausa snack. No es negociable."] },
      adult: { d: ["Entiende la vida como una sucesión de meriendas. No se equivoca del todo.", "Sabe que el hambre es otra forma de estar viv{o}."], l: ["Todo sabe mejor compartido. Casi todo.", "La prisa es enemiga del buen almíbar."] },
    },
    dormilon: {
      baby: { d: ["¡Duerme mucho, mucho! Zzz.", "Bosteza todo el rato. ¡Aaaah!"], l: ["Zzz… ¿ya es de día? 😴", "Un ratito más…"] },
      kids: { d: ["Se echa la siesta en cualquier parte: una vez durmió encima de un grumo y ni se enteró.", "Tiene un sueño tan profundo que sueña por capítulos."], l: ["Vale… voy… pero despacito.", "¿Hemos llegado? Avísame cuando lleguemos."] },
      young: { d: ["Energía de lunes permanente. Pero cuando se activa, se activa.", "Duerme catorce horas y lo llama autocuidado."], l: ["cinco minutos más y soy tuy{o}.", "Batería baja. Pero vamos."] },
      adult: { d: ["Ha descubierto que el mundo no se acaba si llegas tarde.", "Duerme mucho porque en los sueños el valle es aún más blando."], l: ["Nada urgente es tan importante.", "Despertar también es un pequeño valor."] },
    },
    bromista: {
      baby: { d: ["¡Pone caras muy graciosas!", "¡Le encanta hacer cosquillas!"], l: ["¡Cucú! ¡Te pillé! 😜", "¡Jijiji!"] },
      kids: { d: ["Ha escondido las setas del vecino tantas veces que ya se esconden solas.", "Cuenta chistes malísimos. Los cuenta dos veces por si acaso."], l: ["¿Qué le dijo un grumo a otro? ¡Nada, estaba de morros!", "¡Tira de mi oreja! No, mejor no."] },
      young: { d: ["Especialista en caos amable. Nadie sabe si va en serio.", "Su vida es un sketch y tú eres el público."], l: ["Ok, esto es contenido.", "No he hecho nada. (Sí.)"] },
      adult: { d: ["Se toma a broma lo que pesa demasiado. Es su manera de levantarlo.", "Hace reír a los demás para que nadie note que también piensa."], l: ["Si no nos reímos, ¿qué nos queda?", "La seriedad está sobrevalorada. Y pesa muchísimo."] },
    },
    valiente: {
      baby: { d: ["¡No tiene miedo de nada! Bueno, un poquito de la oscuridad.", "¡Siempre protege a sus amigos!"], l: ["¡Yo te cuido! 💪", "¡Vamos, vamos!"] },
      kids: { d: ["Se planta delante de los grumos aunque le tiemblen las patitas.", "Quiere ser guardián del valle. Ya practica los saltos heroicos."], l: ["¡Detrás de mí! Bueno… a mi lado.", "¡Ningún grumo nos para!"] },
      young: { d: ["Va de dur{o}, pero es blandit{o}. Literalmente: es de {mat}.", "Entra primer{o} en todos los sitios. Luego ya pregunta."], l: ["Yo voy primer{o}. Obvio.", "¿Miedo? No lo tengo instalado."] },
      adult: { d: ["Valiente no es no tener miedo: es tenerlo y seguir andando. Lo aprendió a la fuerza.", "Ha perdido algunas batallas. Ninguna de las que importan."], l: ["El miedo camina conmigo. Yo elijo el paso.", "Alguien tiene que ir delante."] },
    },
    presumido: {
      baby: { d: ["¡Se mira en los charcos todo el rato!", "¡Le encantan sus colores!"], l: ["¿A que soy bonit{o}? ✨", "¡Mira qué colores!"] },
      kids: { d: ["Se lava la cara con rocío cada mañana. Dice que así brilla más.", "Tiene un espejo de caramelo y lo usa más de lo que admite."], l: ["Vamos, pero que no me despeine.", "¿Has visto qué brillo? Es natural."] },
      young: { d: ["Estética ante todo. Cada paso, una foto.", "Tiene más selfies que pasos dados."], l: ["Esta luz me favorece, no me muevo.", "Icónic{o}. Lo sé."] },
      adult: { d: ["Cuida su aspecto como otros cuidan un jardín: con paciencia y algo de vanidad.", "Sabe que la belleza es breve. Por eso la celebra."], l: ["La elegancia es resistir con estilo.", "Hay que brillar mientras dure el azúcar."] },
    },
    sonador: {
      baby: { d: ["¡Mira las estrellas y pide deseos!", "Sueña con saltar hasta la luna."], l: ["¡Una estrella! ¡Pide un deseo! 🌟", "¿Me cuentas un cuento?"] },
      kids: { d: ["Se pasa el día inventando mundos. En uno, los grumos son pasteleros.", "Dibuja mapas de sitios que aún no existen."], l: ["¿Y si al final del valle hay otro valle?", "Tengo una idea. Bueno, doce."] },
      young: { d: ["Vive en su cabeza y el alquiler es gratis.", "Protagonista de su propio cuento. Aún va por el prólogo."], l: ["Imagina que esto fuera una peli. Ya lo es.", "Tengo un plan. No es realista. Me encanta."] },
      adult: { d: ["Sueña despiert{o} porque despiert{o} es cuando más falta hace.", "Cree que imaginar es tener razón antes de tiempo."], l: ["Todo lo real fue antes un sueño con prisa.", "Mira: las nubes también dudan."] },
    },
    carinoso: {
      baby: { d: ["¡Da los mejores abrazos del mundo!", "¡Quiere a todos, a todos, a todos!"], l: ["¡Abrazo! 🤗", "¡Te quiero mucho!"] },
      kids: { d: ["Reparte abrazos incluso a los grumos. Algunos se ablandan del susto.", "Se sabe el cumpleaños de todos los bichitos del valle."], l: ["¿Estás bien? ¿Necesitas un abrazo?", "¡Juntos es mejor!"] },
      young: { d: ["Energía de abrazo grupal. Te apoya en todo, incluso en tus malas ideas.", "Amig{o} de manual: blandit{o} pero firme."], l: ["Estoy contigo, pase lo que pase.", "Te banco. Siempre."] },
      adult: { d: ["Quiere sin pedir recibo. Ha aprendido que así se vive más.", "Su ternura es una forma de valentía que nadie aplaude."], l: ["Nadie se ablanda sol{o}.", "Quedarse también es un verbo."] },
    },
    mandon: {
      baby: { d: ["¡Siempre dice por dónde ir!", "Es pequeñit{o}, pero manda muchísimo."], l: ["¡Por aquí! ¡Sígueme! 👉", "¡Ahora saltamos todos!"] },
      kids: { d: ["Organiza el valle con una lista. La lista tiene otra lista.", "Tiene un silbato y no teme usarlo."], l: ["Plan A: saltar. Plan B: saltar más alto.", "¡En fila, por favor!"] },
      young: { d: ["Líder nat{o}. O eso dice. El grupo no ha votado.", "Hace hojas de cálculo para las excursiones."], l: ["Escuchad: tengo un plan y es perfecto.", "Yo lidero, tú flipas."] },
      adult: { d: ["Quiere tenerlo todo bajo control porque una vez no lo tuvo.", "Ordena el mundo para que el mundo no le desordene."], l: ["Un plan es una promesa que te haces.", "Alguien tiene que decidir. Suspiro."] },
    },
  };
  const AB_T = {
    volar: { baby: ["¡Vuela con {parte}!", "¡Vuela conmigo!"], kids: ["Usa {parte} para planear sobre los barrancos.", "¡Agárrate, que planeamos!"], young: ["Planea con {parte}. La gravedad es opcional.", "Gravedad: denegada."], adult: ["Ha aprendido a caer despacio gracias a {parte}.", "Caer despacio también es volar."] },
    fuego: { baby: ["¡Echa fueguitos de caramelo!", "¡Fueguito dulce! 🔥"], kids: ["Cuando se enfada un poquito, escupe caramelo ardiente.", "¿Hielo? ¡Yo lo derrito!"], young: ["Escupe caramelo en llamas. Mejor no le piques.", "Esto se va a poner caliente."], adult: ["Guarda un fuego dulce que solo enseña cuando hace falta.", "Todo hielo es agua esperando."] },
    turbo: { baby: ["¡Corre rapidísimo!", "¡Corre, corre! 💨"], kids: ["Corre tan rápido que deja estelas de azúcar.", "¡A que no me pillas!"], young: ["Speedrunner de nacimiento. Nadie le pilla.", "Dash, dash y siguiente."], adult: ["Corre como quien huye de algo que no nombra.", "Si voy rápido, no lo pienso."] },
    azucar: { baby: ["¡Se vuelve de azúcar brillante!", "¡Brillitos! ✨"], kids: ["Puede volverse de azúcar y atravesar a los grumos.", "¡Ahora me ves, ahora brillo!"], young: ["Modo fantasma cuando quiere. Intocable.", "No me tocas ni queriendo."], adult: ["Sabe volverse casi transparente. A veces es lo más sensato.", "Ser casi nada también protege."] },
    burbuja: { baby: ["¡Sube en pompas!", "¡Pompa, pompa! 🫧"], kids: ["Hace pompas enormes y se sube dentro para flotar.", "¿Subimos en una pompa?"], young: ["Burbuja y arriba. Inmune y con estilo.", "Me encapsulo y me voy."], adult: ["Se encierra en una pompa y sube. No es huir: es cambiar de altura.", "Ascender es dejarse llevar."] },
    modelar: { baby: ["¡Hace caminitos blanditos!", "¡Te hago un caminito!"], kids: ["Modela plataformas de plastilina donde haga falta.", "¿Falta suelo? ¡Lo modelo!"], young: ["Construye plataformas de la nada. Modo creativo.", "Build rápido. De nada."], adult: ["Construye apoyos pequeños. Duran lo justo, como casi todo.", "No hace falta mucho para sostener a alguien."] },
    risa: { baby: ["¡Su risa hace cosquillas a los grumos!", "¡Jajaja! 😆"], kids: ["Su carcajada es tan contagiosa que los grumos se deshacen de risa.", "¡Jaja! ¿De qué nos reíamos?"], young: ["Su risa aturde en área. Literal.", "JAJSJAJ no puedo"], adult: ["Se ríe de todo, sobre todo de sí mism{o}. Desarma a cualquiera.", "La risa desarma. Literalmente."] },
    aspiradora: { baby: ["¡Ñam! ¡Se lo come todo!", "¡Súper ñam!"], kids: ["Aspira grumos y caramelos desde lejísimos.", "¿Algún grumo para merendar?"], young: ["Aspiradora nivel pro. Nada escapa.", "Lo que se acerca, me lo quedo."], adult: ["Todo lo que se acerca termina quedándose.", "Nada se pierde. Todo se digiere."] },
    gigante: { baby: ["¡Se hace grandote!", "¡Pum, pum! ¡Grandote!"], kids: ["Puede crecer hasta hacerse gigante y aplastar grumos.", "¡Pisemos fuerte!"], young: ["Se pone XXL y pisa fuerte.", "Modo tanque. Apartaos."], adult: ["A veces ocupar espacio es lo más valiente.", "Hay cosas que solo se resuelven con peso."] },
  };
  const HELLO = { baby: ["¡Hola! ¡Soy {n}!", "¡{n} quiere jugar!"], kids: ["¡Hola! Me llamo {n}. ¿Somos amigos?", "{n}, para servirte. Más o menos."], young: ["{n}. Sí, ese {n}.", "Soy {n}. Apúntatelo."], adult: ["Me llamo {n}. Casi siempre.", "{n}, de paso por aquí. Como todos."] };
  const RARE_T = {
    raro: { baby: "¡Brilla un poquito! ✨", kids: "Dicen que verle trae buena suerte.", young: "Edición rara. Pocos le han visto.", adult: "Pocos le han visto; los que sí, no lo cuentan igual." },
    legendario: { baby: "¡Es mágic{o} y brilla muchísimo! 🌟", kids: "Una leyenda del valle: solo aparece cuando todo florece.", young: "Legendari{o}. Literal. Captura o no pasó.", adult: "Hay criaturas que parecen un rumor hasta que te miran." },
  };
  // sustantivos para el "kind" [palabra, femenino?]
  const NOUN_TRAIT = {
    raton: [["Ratoncito", 0], ["Orejudo", 0]], conejo: [["Conejito", 0], ["Liebrecilla", 1]], caidas: [["Orejitas", 1], ["Perrito Nube", 0]], gato: [["Gatito", 0], ["Minina", 1]], oso: [["Osito", 0], ["Ositito", 0]],
    ciervo: [["Cervatillo", 0], ["Ciervito", 0]], cuernitos: [["Cabrita", 1], ["Diablillo Dulce", 0]], antenas: [["Bichito", 0], ["Polilla", 1]], brote: [["Brote", 0], ["Semillita", 1]],
    seta: [["Setita", 1], ["Champiñón", 0]], pelo: [["Peludo", 0], ["Pelusa", 1]], cuerno: [["Unicornio", 0]], dragon: [["Dragoncito", 0], ["Lagartija", 1]],
  };
  const NOUN_BODY = { bola: [["Bolita", 1], ["Pompón", 0]], gota: [["Gota", 1], ["Gominola", 1]], pera: [["Perita", 1], ["Blandito", 0]], alubia: [["Alubia", 1], ["Judía Tierna", 1]], cubo: [["Malvavisco", 0], ["Cubito", 0]], alto: [["Torrecita", 1], ["Espárrago", 0]], bicho: [["Bichito", 0], ["Corretón", 0]], nube: [["Nubecilla", 1], ["Algodón", 0]] };
  const ADJ = {
    volar: [["Planeador", "Planeadora"], ["Volandero", "Volandera"]], fuego: [["de Caramelo", "de Caramelo"], ["Tostado", "Tostada"]], turbo: [["Saltarín", "Saltarina"], ["Veloz", "Veloz"]],
    azucar: [["de Azúcar", "de Azúcar"], ["Brillante", "Brillante"]], burbuja: [["Burbujeante", "Burbujeante"], ["Pompero", "Pompera"]], modelar: [["Constructor", "Constructora"], ["Modelador", "Modeladora"]],
    risa: [["Risueño", "Risueña"], ["Cosquillero", "Cosquillera"]], aspiradora: [["Glotón", "Glotona"], ["Tragón", "Tragona"]], gigante: [["Gigantón", "Gigantona"], ["Grandullón", "Grandullona"]],
  };

  // ——— geometría del cuerpo (unidades locales; origen en la base, y hacia arriba negativa) ———
  function outline(body, bw, bh, n) {
    n = n || 48; const pts = [];
    const exp = body === "cubo" ? 4.2 : body === "alto" ? 2.8 : body === "alubia" ? 2.5 : 2.2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const e = sa > 0 ? Math.max(exp, 2.9) : exp; // abajo más plano: se apoya en el suelo
      let x = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e), y = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
      const v = (y + 1) / 2; // 0 arriba, 1 abajo
      let w = 1;
      if (body === "gota") w = 0.5 + 0.5 * Math.pow(v, 0.62);
      else if (body === "pera") w = 0.72 + 0.28 * Math.pow(v, 1.4) - 0.07 * Math.exp(-Math.pow((v - 0.42) / 0.14, 2));
      else if (body === "bola") w = 0.94 + 0.08 * v;
      else if (body === "alto") w = 0.92 + 0.1 * v;
      x *= w;
      if (body === "alubia" && y < 0) y *= 1 - 0.13 * Math.exp(-Math.pow(x / 0.3, 2)); // hoyito arriba
      if (body === "bicho" && y < 0) y -= 0.5 * Math.exp(-Math.pow((x - 0.5) / 0.3, 2)) * -y; // joroba de la cabeza delante
      if (body === "nube" && y < 0.2) { const k = 1 + 0.07 * Math.sin(a * 7 + 1) * Math.min(1, (0.2 - y) * 2); x *= k; y *= k; }
      pts.push({ x: x * bw / 2, y: (y - 1) / 2 * bh });
    }
    return pts;
  }
  const topAt = (pts, x) => { let best = null; for (const p of pts) if (p.y < -1 && (best === null || Math.abs(p.x - x) + (p.y > best.y ? 0.01 : 0) < Math.abs(best.x - x))) best = p; for (const p of pts) if (Math.abs(p.x - x) < 4 && p.y < best.y) best = p; return best.y; };
  const widthAt = (pts, y) => { let l = 0, r = 0; for (const p of pts) if (Math.abs(p.y - y) < 6) { l = Math.min(l, p.x); r = Math.max(r, p.x); } return [l, r]; };
  function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
  function pathPts(c, pts) {
    const n = pts.length, mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
    c.beginPath(); let m = mid(pts[n - 1], pts[0]); c.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const p = pts[i]; m = mid(p, pts[(i + 1) % n]); c.quadraticCurveTo(p.x, p.y, m[0], m[1]); }
    c.closePath();
  }

  // ——— GENERACIÓN ———
  function palette(r, biome, rarity) {
    const bias = BIOME_FAM[biome] || {};
    const w = {}; FAM_KEYS.forEach((k) => (w[k] = 1 + (bias[k] || 0)));
    const fb = r.weighted(w), F = FAM[fb];
    const body = hsl(F[0] + r.range(-9, 9), F[1] + r.range(-8, 8), F[2] + r.range(-3, 4));
    const other = (avoid) => { let k, tries = 0; do { k = r.pick(FAM_KEYS); tries++; } while (tries < 20 && avoid.includes(k)); return k; };
    const fa = other([fb, fb === "nata" ? "mantequilla" : "nata"]), fs = other([fb, fa]);
    const A = FAM[fa], Sx = FAM[fs];
    const acc = hsl(A[0] + r.range(-6, 6), A[1] + 8, A[2] - 6);
    const spot = r.chance(0.2) ? "#fff8ef" : hsl(Sx[0] + r.range(-6, 6), Sx[1] + 6, Sx[2] - 2);
    const bellyK = r();
    const belly = bellyK < 0.5 ? hsl(40, 85, 92) : bellyK < 0.8 ? shade(body, 0.42) : hsl(A[0], A[1], A[2] + 5);
    const pal = { fam: fb, famName: F[3], accFam: fa, body, belly, acc, spot, horn: r.chance(0.6) ? hsl(30, 55, 72) : shade(acc, -0.05), leg: body, lid: r.chance(0.18) ? hsl(Sx[0], 45, 76) : null, iris: r.chance(0.35) ? shade(acc, -0.45) : null };
    if (r.chance(0.2)) pal.leg = shade(acc, -0.05); // botitas de color, como Nube
    if (rarity === "legendario") { pal.acc = "#ffd36b"; pal.horn = "#ffd36b"; pal.spot = r.chance(0.5) ? "#fff1b0" : pal.spot; }
    return pal;
  }
  function pickMat(r, look, pal) {
    const w = { malvavisco: 2, plastilina: 3, gominola: 3, merengue: 1, musgo: 1, chicle: 1, fruta: 1, lana: 1.5 };
    if (look.body === "cubo" || look.body === "nube") w.malvavisco += 6;
    if (look.body === "gota") w.gominola += 5;
    if (look.body === "bola") w.fruta += 3;
    if (look.head === "pelo" || look.ears === "caidas") w.lana += 6;
    if (look.head === "brote" || look.head === "seta" || pal.fam === "lima" || pal.fam === "menta") w.musgo += 3;
    if (pal.fam === "rosa" || pal.fam === "lila") w.chicle += 3;
    if (pal.fam === "melocoton" || pal.fam === "coral") w.fruta += 2;
    if (pal.fam === "nata") w.merengue += 4;
    if (look.size > 1.15) w.merengue += 2;
    return r.weighted(w);
  }
  function pickAbility(r, look, pal, mat) {
    const s = { gigante: 1, volar: 1, fuego: 1, turbo: 1, azucar: 0.6, burbuja: 1, modelar: 1, risa: 1, aspiradora: 1 };
    if (["raton", "conejo", "caidas"].includes(look.ears)) s.volar += 5;
    if (look.head === "antenas") s.volar += 2;
    if (mat === "lana") s.volar += 1;
    if (["coral", "melocoton"].includes(pal.fam)) s.fuego += 4;
    if (look.tail === "dragon") s.fuego += 4;
    if (look.head === "cuernitos") s.fuego += 2;
    if (look.head === "ciervo") s.turbo += 5;
    if (look.body === "bicho") s.turbo += 3;
    if (look.body === "alto" || mat === "fruta") s.turbo += 1.5;
    if (look.head === "cuerno") s.azucar += 6;
    if (look.rarity === "legendario") s.azucar += 3;
    if (["lavanda", "lila"].includes(pal.fam)) s.azucar += 1.5;
    if (look.body === "gota" || look.body === "nube") s.burbuja += 3;
    if (pal.fam === "cielo") s.burbuja += 3;
    if (mat === "gominola") s.burbuja += 1;
    if (look.mouth === "o") s.burbuja += 1;
    if (look.head === "brote" || look.head === "seta") s.modelar += 5;
    if (mat === "musgo" || mat === "plastilina") s.modelar += 1.5;
    if (["abierta", "diente"].includes(look.mouth)) s.risa += 2;
    if (look.eyes === "tres") s.risa += 2;
    if (look.head === "pelo") s.aspiradora += 4;
    if (look.nose === "hocico") s.aspiradora += 3;
    if (look.size > 1.14) s.gigante += 4;
    if (look.body === "cubo" || mat === "merengue") s.gigante += 2;
    for (const k in s) s[k] = s[k] * s[k];
    const ab = r.weighted(s);
    return M.ABILITIES && !M.ABILITIES[ab] ? Object.keys(M.ABILITIES)[0] : ab;
  }
  function makeName(r) {
    let s = r.pick(ROOTS);
    if (r.chance(0.42)) s += r.pick(MIDS);
    const endsV = /[aeiouáéíóú]$/.test(s);
    s += r.pick(endsV ? END_C : END_V);
    const fem = FEM_END.test(s);
    let name = s;
    if (r.chance(0.16)) name = s + " " + r.pick(SURN);
    return { name, fem };
  }
  const gfill = (txt, g) => txt.replace(/\{o\}/g, g.fem ? "a" : "o").replace(/\{n\}/g, g.name).replace(/\{mat\}/g, g.mat).replace(/\{hob\}/g, g.hob).replace(/\{parte\}/g, g.parte);

  function generate(seed, opts) {
    opts = opts || {};
    if (seed === undefined || seed === null) seed = Math.floor(Math.random() * 1e9);
    const r = rngOf(typeof seed === "string" ? seed : seed + 0.123);
    const rarity = opts.rarity || r.weighted({ comun: 78, raro: 18, legendario: 4 });
    const look = { rarity };
    look.body = r.weighted(BODIES);
    const dim = BODY_DIM[look.body];
    look.size = rarity === "legendario" ? r.range(1.0, 1.25) : r.range(0.82, 1.24);
    look.bw = dim[0] * r.range(0.92, 1.08); look.bh = dim[1] * r.range(0.93, 1.07);
    look.eyes = r.weighted(rarity === "comun" ? EYES : Object.assign({}, EYES, { uno: 4, tres: 4 }));
    look.mouth = r.weighted(MOUTHS);
    look.cheeks = r.chance(0.8);
    look.nose = r.weighted({ nada: 6, hocico: 2, bolita: 2 });
    const heads = Object.assign({}, HEADS);
    if (opts.biome === "setas") heads.seta += 4;
    if (opts.biome === "pradera") heads.brote += 3;
    if (opts.biome === "valle") heads.antenas += 3;
    if (rarity === "legendario") { heads.cuerno += 5; heads.ciervo += 3; heads.nada = 1; }
    look.ears = r.weighted(EARS);
    look.head = r.weighted(heads);
    // combinaciones que no encajan: orejas de conejo + ciervo, pelo + seta, etc.
    if (look.ears !== "nada" && ["seta", "pelo"].includes(look.head) && r.chance(0.6)) look.ears = "nada";
    if (look.ears === "conejo" && ["ciervo", "cuerno"].includes(look.head)) look.ears = "gato";
    look.tail = r.weighted(look.body === "bicho" ? Object.assign({}, TAILS, { larga: 6, dragon: 4, nada: 3 }) : TAILS);
    look.pattern = r.weighted(PATTERNS);
    look.scarf = look.body !== "bicho" && r.chance(0.16);
    look.legs = look.body === "bicho" ? 4 : look.body === "nube" ? 0 : look.body === "gota" && r.chance(0.5) ? 0 : 2;
    look.legLen = look.legs === 4 ? r.range(22, 30) : look.legs ? r.range(12, look.body === "alto" ? 26 : 20) : 0;
    look.legW = look.legs === 4 ? 13 : r.range(12, 16);
    look.arms = look.body !== "bicho" && r.chance(0.62);
    look.eyeSize = r.range(0.85, 1.25); look.eyeGap = r.range(0.85, 1.25);
    look.blinkPh = r.range(0, 9); look.breathPh = r.range(0, 6.28);
    look.spots = []; // motas en relieve (se colocan dentro del cuerpo)
    look.sparkle = rarity !== "comun";
    look.halo = rarity === "legendario" && r.chance(0.6);
    look.flower = rarity === "raro" && look.head === "nada" && r.chance(0.7);
    const pal = palette(r, opts.biome, rarity); look.pal = pal;
    if (rarity === "legendario" && look.pattern === "nada") look.pattern = "degradado";
    look.iris = rarity === "legendario" || look.pattern === "degradado" && r.chance(0.3);
    // geometría y anclajes
    const pts = outline(look.body, look.bw, look.bh);
    const bw = look.bw, bh = look.bh, bicho = look.body === "bicho";
    look.fx = bicho ? bw * 0.3 : bw * 0.09; look.fy = bicho ? -bh * 0.74 : look.body === "alto" ? -bh * 0.68 : -bh * 0.56;
    look.fs = (bicho ? bh * 0.95 : Math.min(bw, bh)) / 80;
    const headW = bicho ? bw * 0.42 : bw;
    look.earX = headW * (look.ears === "raton" ? 0.3 : 0.27); look.earX2 = bicho ? look.fx : 0; // centro de la cabeza
    look.hornX = headW * (look.ears !== "nada" ? 0.13 : 0.24);
    const hc = look.earX2;
    look.earY = [topAt(pts, hc - look.earX) + 5, topAt(pts, hc + look.earX) + 5];
    look.hornY = [topAt(pts, hc - look.hornX) + 3, topAt(pts, hc + look.hornX) + 3];
    look.topY = topAt(pts, hc) + 3;
    for (let i = 0, n = look.pattern === "motas" ? r.int(9, 18) : r.chance(0.35) ? r.int(3, 7) : 0, tries = 0; i < n && tries < 200; tries++) {
      const x = r.range(-bw / 2, bw / 2), y = r.range(-bh, 0), rr = r.range(2.2, 5.5) * look.fs;
      if (!inPoly(pts, x, y) || !inPoly(pts, x + rr * 1.6, y) || !inPoly(pts, x - rr * 1.6, y) || !inPoly(pts, x, y - rr * 1.6) || !inPoly(pts, x, y + rr * 1.6)) continue;
      if (Math.hypot(x - look.fx, (y - look.fy) * 1.3) < 30 * look.fs) continue; // la cara, limpia
      look.spots.push([x, y, rr, r.chance(0.2) ? 1 : 0]); i++;
    }
    look.blobs = []; for (let i = 0; i < 4; i++) look.blobs.push([r.range(-0.5, 0.5) * bw, r.range(-1, -0.1) * bh, r.range(0.15, 0.28) * bw, r.range(0.6, 1.3)]);
    look.stripes = r.int(3, 5); look.stripeBend = r.range(0.08, 0.22);
    const legVis = look.legLen * 0.62;
    const topExtra = { nada: 0, raton: 26, conejo: 44, caidas: 4, gato: 12, oso: 10 }[look.ears] * look.fs;
    const headExtra = { nada: 0, ciervo: 40, cuernitos: 12, antenas: 30, brote: 28, seta: 24, pelo: 14, cuerno: 30 }[look.head] * look.fs;
    look.H = legVis + bh + Math.max(topExtra, headExtra) * 0.45 + (look.body === "nube" ? 8 : 0);
    look.legVis = legVis;

    const mat = pickMat(r, look, pal);
    const ability = pickAbility(r, look, pal, mat);
    const nm = makeName(r);
    const h = Math.round(clamp(150 * look.size, 118, 215)), ph = Math.round(clamp(h * 0.55, 66, 112));
    // estadísticas [velocidad, salto, peso, poder]
    const base = { bola: [3, 3, 3, 3], gota: [3, 4, 2, 3], pera: [2, 3, 4, 3], alubia: [3, 2, 4, 3], cubo: [3, 3, 3, 3], alto: [3, 4, 2, 3], bicho: [5, 3, 3, 2], nube: [2, 5, 1, 3] }[look.body].slice();
    if (look.size > 1.12) { base[2]++; base[0]--; } else if (look.size < 0.92) { base[0]++; base[2]--; }
    const abBoost = { turbo: 0, volar: 1, gigante: 2, fuego: 3, risa: 3, azucar: 3, burbuja: 1, modelar: 3, aspiradora: 3 }[ability]; base[abBoost]++;
    if (rarity === "raro") base[3]++;
    if (rarity === "legendario") { base[3] += 2; base[r.int(0, 2)]++; }
    if (r.chance(0.5)) { const a = r.int(0, 3), b = r.int(0, 3); if (a !== b && base[a] > 2) { base[a]--; base[b]++; } }
    const stats = base.map((v) => clamp(v, 1, 5));
    // kind
    const tKey = look.head !== "nada" && r.chance(0.55) ? look.head : look.ears !== "nada" && r.chance(0.7) ? look.ears : look.tail === "dragon" ? "dragon" : null;
    const noun = r.pick((tKey && NOUN_TRAIT[tKey]) || NOUN_BODY[look.body]);
    const kind = noun[0] + " " + (r.chance(0.62) ? r.pick(ADJ[ability] || [["Blandito", "Blandita"]])[noun[1]] : "de " + pal.famName);
    // personalidad por edad
    const temp = r.pick(Object.keys(TEMPS)), hob = r.pick(HOBBIES);
    const parte = ["raton", "conejo", "caidas"].includes(look.ears) ? "sus orejotas" : look.head === "antenas" ? "sus antenas" : look.head === "pelo" ? "su pelo esponjoso" : look.body === "nube" ? "su cuerpo de nube" : "su barriga blandita";
    const G = { fem: nm.fem, name: nm.name, mat: (M.MATERIALS && M.MATERIALS[mat] ? M.MATERIALS[mat].label : mat).toLowerCase(), hob, parte };
    const p = {};
    ["baby", "kids", "young", "adult"].forEach((age) => {
      const T = TEMPS[temp][age], ab = AB_T[ability] ? AB_T[ability][age] : null;
      let d = r.pick(T.d);
      const extra = r();
      if (extra < 0.45 && ab) d += " " + ab[0]; else d += " " + r.pick(HOB_T[age]);
      if (RARE_T[rarity]) d += " " + RARE_T[rarity][age];
      const lp = T.l.concat(ab ? [ab[1]] : [], [r.pick(HELLO[age])]);
      p[age] = { d: gfill(d, G), l: gfill(r.pick(lp), G) };
    });
    return {
      id: "w_" + seed, seed, procgen: true, name: nm.name, fem: nm.fem, kind, rarity, mat, stats, ability, nat: 1, h, ph, p,
      temper: temp, hobby: hob, look,
    };
  }

  // ——— CACHÉ DE CAPAS (canvas offscreen por criatura) ———
  const RES = 2.6; // píxeles por unidad en las capas cacheadas
  const cacheMap = new Map();
  const mkCanvas = (w, h) => { if (M.canvas) return M.canvas(w, h); const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
  // sprite: capa dibujada en unidades con el origen en (ox, oy) unidades desde la esquina
  function sprite(wU, hU, ox, oy, fn) {
    const cv = mkCanvas(Math.ceil(wU * RES), Math.ceil(hU * RES)), c = cv.getContext("2d");
    c.scale(RES, RES); c.translate(ox, oy); c.lineCap = "round"; c.lineJoin = "round"; fn(c);
    return { cv, ox, oy, w: wU, h: hU };
  }
  const put = (c, s) => c.drawImage(s.cv, -s.ox, -s.oy, s.w, s.h);
  // bolita de plastilina con volumen (luz arriba-izquierda)
  function clay(c, x, y, rx, ry, col, rot) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    const g = c.createRadialGradient(-rx * 0.35, -ry * 0.4, Math.min(rx, ry) * 0.1, 0, 0, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, shade(col, 0.5)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.2));
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore();
  }
  function tube(c, pts, wd, col) { // "churro" de plastilina (cuernos, colas)
    c.strokeStyle = shade(col, -0.22); c.lineWidth = wd; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); // curva suave
    const e = pts[pts.length - 1]; c.lineTo(e[0], e[1]); c.stroke();
    c.strokeStyle = col; c.lineWidth = wd * 0.72; c.stroke();
    c.save(); c.translate(-wd * 0.12, -wd * 0.14); c.strokeStyle = rgba(shade(col, 0.6), 0.7); c.lineWidth = wd * 0.26; c.stroke(); c.restore();
  }

  function buildLayers(cr) {
    const L = cr.look, P = L.pal, bw = L.bw, bh = L.bh, fs = L.fs;
    const pts = outline(L.body, bw, bh, 56);
    const out = {};
    const bodyCol = cr.rarity === "legendario" ? mix(P.body, "#ffffff", 0.1) : P.body;
    // cuerpo
    out.body = sprite(bw * 1.3 + 12, bh * 1.35 + 16, bw * 0.65 + 6, bh * 1.2 + 8, (c) => {
      pathPts(c, pts);
      c.save(); c.shadowColor = rgba(shade(P.body, -0.6), 0.25); c.shadowBlur = 5; c.shadowOffsetY = 2;
      const g = c.createRadialGradient(-bw * 0.2, -bh * 0.74, 2, -bw * 0.05, -bh * 0.5, Math.max(bw, bh) * 0.78);
      g.addColorStop(0, shade(bodyCol, 0.32)); g.addColorStop(0.45, bodyCol); g.addColorStop(1, shade(bodyCol, -0.16));
      c.fillStyle = g; c.fill(); c.restore();
      c.save(); pathPts(c, pts); c.clip();
      // patrón
      if (L.pattern === "degradado") {
        const lg = c.createLinearGradient(0, -bh, 0, 0);
        const tc = cr.rarity === "legendario" ? P.spot : P.acc;
        if (cr.rarity === "legendario") { lg.addColorStop(0, rgba("#bfe6ff", 0.55)); lg.addColorStop(0.35, rgba("#ffd1f0", 0.3)); lg.addColorStop(0.7, rgba(tc, 0.35)); lg.addColorStop(1, rgba("#fff0a0", 0.6)); }
        else { lg.addColorStop(0, rgba(tc, 0)); lg.addColorStop(0.45, rgba(tc, 0.05)); lg.addColorStop(1, rgba(tc, 0.75)); }
        c.fillStyle = lg; c.fillRect(-bw, -bh * 1.3, bw * 2, bh * 1.4);
      } else if (L.pattern === "manchas") {
        L.blobs.forEach(([x, y, rr, k], i) => { c.fillStyle = rgba(i % 2 ? P.spot : shade(P.acc, 0.1), 0.8); c.beginPath(); c.ellipse(x, y, rr, rr * k * 0.8, i, 0, Math.PI * 2); c.fill(); });
      } else if (L.pattern === "rayas") {
        c.strokeStyle = rgba(P.spot, 0.75); c.lineWidth = bh * 0.075;
        for (let i = 0; i < L.stripes; i++) { const y = -bh * (0.92 - i * 0.14); c.beginPath(); c.moveTo(-bw * 0.7, y + bh * 0.1); c.quadraticCurveTo(0, y - bh * L.stripeBend, bw * 0.7, y + bh * 0.1); c.stroke(); }
      }
      // barriga
      { const bx = L.fx * 0.6, by = L.body === "bicho" ? -bh * 0.22 : -bh * 0.26, rx = (L.body === "bicho" ? bw * 0.34 : bw * 0.3), ry = bh * 0.25;
        const g2 = c.createRadialGradient(bx, by, 1, bx, by, Math.max(rx, ry)); g2.addColorStop(0, rgba(P.belly, 0.95)); g2.addColorStop(0.7, rgba(P.belly, 0.7)); g2.addColorStop(1, rgba(P.belly, 0));
        c.fillStyle = g2; c.beginPath(); c.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
      // oclusión abajo y textura de huellas
      const og = c.createLinearGradient(0, -bh * 0.3, 0, 0); og.addColorStop(0, "rgba(90,40,70,0)"); og.addColorStop(1, "rgba(90,40,70,0.2)");
      c.fillStyle = og; c.fillRect(-bw, -bh * 0.3, bw * 2, bh * 0.32);
      const tr = rngOf(cr.seed + "tex");
      for (let i = 0; i < 70; i++) { c.fillStyle = tr.chance(0.5) ? "rgba(255,255,255,0.07)" : "rgba(80,30,60,0.05)"; c.beginPath(); c.ellipse(tr.range(-bw / 2, bw / 2), tr.range(-bh, 0), tr.range(1, 3.5), tr.range(0.8, 2), tr.range(0, 3), 0, Math.PI * 2); c.fill(); }
      // luz de borde (derecha) — da el volumen redondo
      c.strokeStyle = rgba(shade(P.body, -0.35), 0.12); c.lineWidth = 5; pathPts(c, pts); c.stroke();
      c.restore();
      // motas en relieve
      L.spots.forEach(([x, y, rr, alt]) => {
        const col = alt ? P.acc : P.spot;
        c.fillStyle = rgba(shade(P.body, -0.5), 0.18); c.beginPath(); c.ellipse(x + rr * 0.25, y + rr * 0.35, rr * 1.05, rr, 0, 0, Math.PI * 2); c.fill();
        clay(c, x, y, rr, rr * 0.92, col);
        c.fillStyle = "rgba(255,255,255,0.75)"; c.beginPath(); c.arc(x - rr * 0.35, y - rr * 0.4, rr * 0.25, 0, Math.PI * 2); c.fill();
      });
      // brillo especular
      const hx = -bw * 0.22, hy = -bh * 0.78;
      const sg = c.createRadialGradient(hx, hy, 0, hx, hy, bw * 0.22); sg.addColorStop(0, "rgba(255,255,255,0.32)"); sg.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = sg; c.beginPath(); c.ellipse(hx, hy, bw * 0.22, bh * 0.16, -0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,0.42)"; c.beginPath(); c.ellipse(hx - 2, hy - 1, 3.2 * fs, 2 * fs, -0.6, 0, Math.PI * 2); c.fill();
      // bufanda
      if (L.scarf) {
        const y = L.fy + 30 * fs, [l, r] = widthAt(pts, y), sc = P.acc, th = 11 * fs;
        c.save(); c.shadowColor = "rgba(90,40,70,0.25)"; c.shadowBlur = 4; c.shadowOffsetY = 2;
        c.fillStyle = sc; c.beginPath(); c.moveTo(l - 3, y - th / 2); c.quadraticCurveTo(0, y - th / 2 + 6, r + 3, y - th / 2); c.lineTo(r + 3, y + th / 2); c.quadraticCurveTo(0, y + th / 2 + 7, l - 3, y + th / 2); c.closePath(); c.fill(); c.restore();
        c.strokeStyle = rgba(shade(sc, -0.3), 0.4); c.lineWidth = 1.2;
        for (let x = l + 2; x < r; x += 4.5) { c.beginPath(); c.moveTo(x, y - th / 2 + 2 + 3 * (1 - Math.pow(x / r, 2))); c.lineTo(x + 1.5, y + th / 2 - 1 + 3 * (1 - Math.pow(x / r, 2))); c.stroke(); }
        c.fillStyle = sc; c.save(); c.translate(l + 8, y + th * 0.3); c.rotate(0.15); c.fillRect(-4.5 * fs, 0, 9 * fs, 20 * fs); c.fillStyle = rgba(shade(sc, -0.3), 0.5); c.fillRect(-4.5 * fs, 17 * fs, 9 * fs, 3 * fs); c.restore();
      }
    });
    // silueta para el destello de daño
    out.sil = sprite(bw * 1.3 + 12, bh * 1.35 + 16, bw * 0.65 + 6, bh * 1.2 + 8, (c) => { pathPts(c, pts); c.fillStyle = "#ff8fa6"; c.fill(); });
    // pierna (cápsula vertical, origen arriba al centro)
    if (L.legs) {
      const lw = L.legW, ll = L.legLen + 10;
      const legS = (lc) => sprite(lw + 4, ll + 6, lw / 2 + 2, 2, (c) => {
        const g = c.createLinearGradient(-lw / 2, 0, lw / 2, 0); g.addColorStop(0, shade(lc, 0.25)); g.addColorStop(0.5, lc); g.addColorStop(1, shade(lc, -0.2));
        c.fillStyle = g; c.beginPath(); c.moveTo(-lw / 2, 0); c.lineTo(-lw / 2, ll - lw / 2); c.quadraticCurveTo(-lw / 2, ll + 1, 0, ll + 1); c.quadraticCurveTo(lw / 2 + 1, ll + 1, lw / 2, ll - lw / 2); c.lineTo(lw / 2, 0); c.fill();
        c.fillStyle = rgba(shade(lc, -0.4), 0.25); c.beginPath(); c.ellipse(0, ll - 1, lw * 0.45, 2, 0, 0, Math.PI * 2); c.fill();
      });
      out.leg = legS(P.leg); out.legFar = legS(shade(P.leg, -0.14));
    }
    if (L.arms) {
      const aw = 8 * fs, al = 17 * fs;
      const armS = (col) => sprite(aw + 4, al + 4, aw / 2 + 2, 2, (c) => { clay(c, 0, al / 2, aw / 2, al / 2, col); });
      out.arm = armS(P.body); out.armFar = armS(shade(P.body, -0.14));
    }
    // orejas (derecha; la izquierda se dibuja en espejo). Origen en la base.
    const E = L.ears;
    if (E !== "nada") {
      const inner = shade(mix(P.acc, "#ffb3c7", 0.4), 0.15);
      out.ear = sprite(80 * fs, 90 * fs, 40 * fs, 70 * fs, (c) => {
        c.scale(fs, fs);
        if (E === "raton") { clay(c, 0, -20, 24, 23, P.body); clay(c, 1, -19, 16, 15, inner); }
        else if (E === "conejo") { clay(c, 0, -30, 10, 32, P.body); clay(c, 0.5, -29, 5.5, 24, inner); }
        else if (E === "caidas") { clay(c, 0, 20, 11, 25, shade(P.body, -0.04), 0.1); clay(c, 1, 20, 6, 18, inner, 0.1); }
        else if (E === "gato") { c.fillStyle = shade(P.body, -0.05); c.beginPath(); c.moveTo(-11, 2); c.quadraticCurveTo(-4, -22, 2, -20); c.quadraticCurveTo(10, -10, 11, 2); c.closePath(); c.fill(); c.fillStyle = inner; c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-2, -14, 2, -13); c.quadraticCurveTo(6, -6, 6, 0); c.fill(); }
        else if (E === "oso") { clay(c, 0, -6, 11, 10, P.body); clay(c, 0.5, -5, 6, 5.5, inner); }
      });
    }
    // adornos de cabeza (sprite de un lado o central, origen en la base)
    const Hd = L.head, hornC = P.horn;
    if (Hd === "ciervo") out.horn = sprite(60 * fs, 60 * fs, 20 * fs, 55 * fs, (c) => { c.scale(fs, fs); tube(c, [[0, 0], [2, -16], [6, -34], [4, -46]], 7, hornC); tube(c, [[3, -20], [16, -30], [22, -40]], 6, hornC); tube(c, [[5, -34], [-6, -44]], 5, hornC); });
    else if (Hd === "cuernitos") out.horn = sprite(30 * fs, 30 * fs, 14 * fs, 26 * fs, (c) => { c.scale(fs, fs); c.fillStyle = shade(hornC, -0.1); c.beginPath(); c.moveTo(-6, 2); c.quadraticCurveTo(-4, -14, 3, -18); c.quadraticCurveTo(4, -8, 6, 2); c.fill(); clay(c, -1, -6, 4, 7, hornC, 0.2); });
    else if (Hd === "brote") out.top = sprite(60 * fs, 50 * fs, 30 * fs, 44 * fs, (c) => { c.scale(fs, fs); tube(c, [[0, 2], [0, -14], [1, -22]], 5, "#8fcf8f"); clay(c, -12, -26, 13, 7, "#a9e2a0", -0.4); clay(c, 12, -30, 13, 7, "#a9e2a0", 0.45); if (cr.seed % 3 === 0) clay(c, 1, -30, 5, 5, P.spot); });
    else if (Hd === "seta") out.top = sprite(80 * fs, 50 * fs, 40 * fs, 44 * fs, (c) => { c.scale(fs, fs); clay(c, 0, -8, 9, 11, "#fff4e2"); const cap = P.fam === "coral" || P.fam === "rosa" ? "#ffcf6b" : "#ff9fb2"; c.fillStyle = shade(cap, -0.2); c.beginPath(); c.ellipse(0, -18, 28, 7, 0, 0, Math.PI * 2); c.fill(); c.save(); c.beginPath(); c.ellipse(0, -18, 27, 21, 0, Math.PI, Math.PI * 2); c.clip(); clay(c, 0, -18, 27, 21, cap); c.restore(); [[-12, -26, 4], [5, -32, 4.5], [15, -22, 3.2], [-2, -22, 2.6]].forEach(([x, y, rr]) => clay(c, x, y, rr, rr * 0.8, "#fffaf0")); });
    else if (Hd === "pelo") out.top = sprite(90 * fs, 40 * fs, 45 * fs, 26 * fs, (c) => { c.scale(fs, fs); const pc = shade(P.body, 0.18), tr = rngOf(cr.seed + "pelo"); for (let i = 0; i < 16; i++) { const a = (i / 15) * Math.PI, rr = tr.range(7, 11); clay(c, Math.cos(a) * -26 + tr.range(-3, 3), -Math.sin(a) * 14 + tr.range(-2, 4), rr, rr * 0.9, i % 2 ? pc : shade(pc, 0.1)); } });
    else if (Hd === "cuerno") out.top = sprite(30 * fs, 50 * fs, 15 * fs, 44 * fs, (c) => { c.scale(fs, fs); const g = c.createLinearGradient(-6, 0, 6, 0); g.addColorStop(0, shade(hornC, 0.4)); g.addColorStop(1, shade(hornC, -0.15)); c.fillStyle = g; c.beginPath(); c.moveTo(-7, 2); c.quadraticCurveTo(-2, -24, 1, -38); c.quadraticCurveTo(4, -24, 7, 2); c.fill(); c.strokeStyle = rgba(shade(hornC, -0.35), 0.5); c.lineWidth = 1.5; for (let y = -4; y > -32; y -= 7) { c.beginPath(); c.moveTo(-6 + (-y) * 0.15, y); c.lineTo(6 - (-y) * 0.15, y - 4); c.stroke(); } });
    if (L.flower) out.flower = sprite(30 * fs, 30 * fs, 15 * fs, 15 * fs, (c) => { c.scale(fs, fs); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; clay(c, Math.cos(a) * 6, Math.sin(a) * 6, 5, 5, "#fff3f7"); } clay(c, 0, 0, 3.5, 3.5, "#ffd36b"); });
    // cola (origen en el enganche, apunta hacia -x)
    const T = L.tail;
    if (T === "bolita") out.tail = sprite(30 * fs, 30 * fs, 20 * fs, 15 * fs, (c) => { c.scale(fs, fs); clay(c, -6, -2, 9, 8.5, shade(P.belly, 0.1)); });
    else if (T === "larga") out.tail = sprite(70 * fs, 60 * fs, 64 * fs, 44 * fs, (c) => { c.scale(fs, fs); tube(c, [[4, 0], [-18, 4], [-38, -2], [-48, -18], [-42, -30]], 10, P.body); clay(c, -42, -34, 8, 7, P.acc); });
    else if (T === "dragon") out.tail = sprite(70 * fs, 40 * fs, 64 * fs, 24 * fs, (c) => { c.scale(fs, fs); c.fillStyle = P.acc; [[-14, -6], [-26, -8], [-38, -8]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x, y - 6); c.lineTo(x + 5, y + 4); c.fill(); }); const g = c.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, shade(P.body, 0.3)); g.addColorStop(1, shade(P.body, -0.15)); c.fillStyle = g; c.beginPath(); c.moveTo(6, -9); c.quadraticCurveTo(-24, -10, -52, -2); c.quadraticCurveTo(-24, 8, 6, 9); c.fill(); });
    // aura para legendarios
    if (cr.rarity === "legendario") out.glow = sprite(160, 160, 80, 80, (c) => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 80); g.addColorStop(0, "rgba(255,226,140,0.4)"); g.addColorStop(0.5, "rgba(255,190,225,0.16)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(-80, -80, 160, 160); });
    return out;
  }
  function layers(cr) {
    let o = cacheMap.get(cr.id);
    if (!o) { o = buildLayers(cr); cacheMap.set(cr.id, o); if (cacheMap.size > 80) cacheMap.delete(cacheMap.keys().next().value); }
    return o;
  }

  // ——— ANIMACIÓN ———
  const springs = new WeakMap();
  function spring(st, key, target, dt, k, d) {
    let s = springs.get(st); if (!s) { s = {}; springs.set(st, s); }
    const v = s[key] || { x: target, v: 0 }; s[key] = v;
    const steps = Math.min(4, Math.ceil(dt / 0.017));
    for (let i = 0; i < steps; i++) { const h = dt / steps; v.v += ((target - v.x) * k - v.v * d) * h; v.x += v.v * h; }
    return v.x;
  }
  function pose(cr, st) {
    const L = cr.look, t = st.t || 0, mood = st.mood || "idle", on = st.on !== false, vx = st.vx || 0, vy = st.vy || 0;
    const A = { sx: 1, sy: 1, lift: 0, lean: 0, shake: 0, walk: 0, ph: 0, legLift: 0, earWag: 0, armL: 0.35, armR: 0.35, mouthOpen: 0, eyes: "normal", flash: 0 };
    const br = Math.sin(t * 2.3 + L.breathPh) * 0.022;
    A.sy += br; A.sx -= br * 0.6;
    if (L.body === "nube") A.lift = 5 + Math.sin(t * 2 + L.breathPh) * 2.5;
    const moving = mood === "walk" || (on && Math.abs(vx) > 20 && mood !== "happy");
    if (moving) {
      const spd = clamp(Math.abs(vx) / 380, 0.6, 1.6) || 1;
      A.walk = 1; A.ph = t * 11 * spd;
      const b = Math.abs(Math.sin(A.ph));
      if (L.legs) { A.lift += b * 3.5; A.sy += -Math.cos(A.ph * 2) * 0.025; }
      else { A.lift += b * 9; A.sy += (b < 0.25 ? -0.08 : 0.05); A.sx += (b < 0.25 ? 0.08 : -0.03); } // sin patas: va a saltitos
      A.lean = 0.1 * clamp(Math.abs(vx) / 400, 0.4, 1.2);
      A.armL = 0.35 + Math.sin(A.ph) * 0.55; A.armR = 0.35 - Math.sin(A.ph) * 0.55;
    }
    if (!on || mood === "jump") {
      if (!on) { const up = vy < 0; A.sy *= up ? 1.12 : 1.05; A.sx *= up ? 0.9 : 0.96; A.legLift = 4; A.armL = A.armR = up ? 1.5 : 0.9; A.lean = clamp(vx / 3000, -0.1, 0.1) * (st.face || 1); }
      else { A.sy *= 0.84; A.sx *= 1.14; } // anticipación
    }
    if (mood === "happy") {
      const p = (t * 2.2) % 1; const air = p < 0.62;
      A.lift += air ? Math.sin(p / 0.62 * Math.PI) * 16 : 0;
      if (!air) { const q = Math.sin((p - 0.62) / 0.38 * Math.PI); A.sy *= 1 - q * 0.14; A.sx *= 1 + q * 0.12; } else { A.sy *= 1.05; A.sx *= 0.96; }
      A.armL = A.armR = 2.4 + Math.sin(t * 14) * 0.35; A.eyes = "feliz"; A.mouthOpen = 0.8;
    }
    if (mood === "talk") { A.mouthOpen = Math.abs(Math.sin(t * 13)) * (0.4 + 0.6 * Math.abs(Math.sin(t * 3.1))); A.armR = 0.3 + Math.abs(Math.sin(t * 4)) * 1.2; A.sy += Math.sin(t * 13) * 0.012; }
    if (mood === "scared") { A.shake = Math.sin(t * 55) * 1.1; A.sy *= 0.92; A.sx *= 1.03; A.eyes = "susto"; A.armL = A.armR = 2.7; A.earWag = -0.5; }
    if (mood === "hurt") { A.shake = Math.sin(t * 70) * 3; A.eyes = "dolor"; A.flash = 0.2 + 0.3 * Math.abs(Math.sin(t * 20)); A.sy *= 0.94; A.sx *= 1.05; }
    const sq = st.sq || 0; if (sq) { A.sy *= 1 - sq * 0.35; A.sx *= 1 + sq * 0.35; }
    // muelles para lo secundario (orejas, antenas, cola)
    const last = springs.get(st), dt = last && last._t !== undefined ? clamp(t - last._t, 0, 0.1) : 0;
    if (dt > 0) {
      A.earSpring = spring(st, "ear", -clamp(vx, -600, 600) * 0.0006 * (st.face || 1) + (on ? 0 : clamp(vy * 0.0005, -0.4, 0.4)) + A.earWag, dt, 90, 7);
      A.tailSpring = spring(st, "tail", (moving ? 0.35 : 0) + (on ? 0 : -0.3), dt, 60, 5);
      A.liftS = spring(st, "lift", A.lift, dt, 260, 18);
    } else { spring(st, "ear", 0, 0, 1, 1); A.earSpring = A.earWag + Math.sin(t * 3) * 0.05; A.tailSpring = 0; A.liftS = A.lift; }
    springs.get(st)._t = t;
    return A;
  }

  // ——— CARA ———
  function drawFace(c, cr, A, t) {
    const L = cr.look, P = L.pal, fs = L.fs;
    c.save(); c.translate(L.fx, L.fy); c.scale(fs, fs);
    const ex = 14 * L.eyeGap, esz = L.eyeSize, blinking = ((t + L.blinkPh) % 3.9) < 0.13;
    c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = 2;
    const snout = L.nose === "hocico", my = snout ? 15 : 10;
    const eyeList = L.eyes === "uno" ? [[0, -3, 1.55]] : L.eyes === "tres" ? [[-ex, 0, 0.8], [ex, 0, 0.8], [0, -12, 0.75]] : [[-ex, 0, 1], [ex, 0, 1]];
    if (P.lid && A.eyes === "normal") { c.fillStyle = rgba(P.lid, 0.8); eyeList.forEach(([x, y, k]) => { c.beginPath(); c.ellipse(x, y - 5 * k * esz, 10 * k * esz, 7 * k * esz, 0, Math.PI, Math.PI * 2); c.fill(); }); }
    eyeList.forEach(([x, y, k]) => {
      const s = k * esz; c.save(); c.translate(x, y);
      if (A.eyes === "feliz") { c.lineWidth = 2.4; c.beginPath(); c.arc(0, 2 * s, 5 * s, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      else if (A.eyes === "dolor") { c.lineWidth = 2.4; c.beginPath(); if (x) { c.scale(x < 0 ? 1 : -1, 1); c.moveTo(-4 * s, -4 * s); c.lineTo(3 * s, 0); c.lineTo(-4 * s, 4 * s); } else { c.moveTo(-4 * s, -4 * s); c.lineTo(4 * s, 4 * s); c.moveTo(4 * s, -4 * s); c.lineTo(-4 * s, 4 * s); } c.stroke(); }
      else if (blinking || (L.eyes === "sueno" && A.eyes !== "susto")) {
        if (L.eyes === "sueno" && !blinking) { c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, 0, 7 * s, 7.5 * s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = INK; c.beginPath(); c.ellipse(1.5 * s, 2 * s, 4 * s, 4.5 * s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = shade(P.body, -0.06); c.beginPath(); c.ellipse(0, 0, 7.6 * s, 8 * s, 0, Math.PI, Math.PI * 2); c.lineTo(7.6 * s, 0.5 * s); c.fill(); c.lineWidth = 1.8; c.beginPath(); c.moveTo(-7.6 * s, 0.5 * s); c.lineTo(7.6 * s, 0.5 * s); c.stroke(); }
        else { c.lineWidth = 2.2; c.beginPath(); c.arc(0, -1 * s, 5 * s, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      } else if (L.eyes === "puntos" || (L.eyes === "tres" && k < 0.8)) {
        const big = A.eyes === "susto" ? 1.35 : 1;
        c.fillStyle = INK; c.beginPath(); c.ellipse(1, 0, 4.2 * s * big, 5.6 * s * big, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(2.4 * s, -2.2 * s, 1.6 * s, 0, Math.PI * 2); c.fill();
      } else { // ojazos
        const sus = A.eyes === "susto";
        const g = c.createRadialGradient(-2 * s, -3 * s, 1, 0, 0, 10 * s); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#ece6ee");
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 8.5 * s * (sus ? 1.1 : 1), 9.8 * s * (sus ? 1.15 : 1), 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = rgba(shade(P.body, -0.5), 0.35); c.lineWidth = 1.2; c.stroke(); c.strokeStyle = INK;
        const pr = sus ? 0.5 : 1;
        if (L.iris && !sus) { c.fillStyle = P.iris || shade(P.acc, -0.4); c.beginPath(); c.ellipse(2 * s, 1 * s, 5.8 * s, 6.6 * s, 0, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = INK; c.beginPath(); c.ellipse(2 * s, 1 * s, (L.iris ? 3.6 : 5.2) * s * pr, (L.iris ? 4.2 : 6.2) * s * pr, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(3.6 * s, -2 * s, 2.1 * s, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(0.4 * s, 3.4 * s, 0.9 * s, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    });
    if (L.cheeks) { c.fillStyle = "rgba(255,130,160,0.4)"; const cx = (L.eyes === "uno" ? 13 : ex + 8); [-1, 1].forEach((sd) => { c.beginPath(); c.ellipse(sd * cx + 1, 9, 6.5, 4, 0, 0, Math.PI * 2); c.fill(); }); }
    if (snout) { clay(c, 1, 5, 9, 6.5, shade(mix(P.body, "#ffb3c7", 0.45), 0.05)); c.fillStyle = rgba(shade(P.body, -0.55), 0.7); c.beginPath(); c.ellipse(-2.2, 5, 1.4, 2, 0, 0, Math.PI * 2); c.ellipse(4.2, 5, 1.4, 2, 0, 0, Math.PI * 2); c.fill(); }
    else if (L.nose === "bolita") clay(c, 1.5, 4, 3, 2.5, shade(P.acc, -0.05));
    // boca
    c.save(); c.translate(1.5, my); c.lineWidth = 2;
    const mo = A.mouthOpen, mood = A.eyes;
    if (mood === "dolor") { c.beginPath(); c.moveTo(-5, 1); for (let i = -3; i <= 5; i += 2) c.lineTo(i, i % 4 ? -1 : 1.5); c.stroke(); }
    else if (mood === "susto") { c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(0, 1, 2.8, 3.8, 0, 0, Math.PI * 2); c.fill(); }
    else if (mo > 0.05 || L.mouth === "abierta") {
      const o = Math.max(mo, L.mouth === "abierta" ? 0.55 : 0), w = 5.5 + o * 1.5, hh = 1.5 + o * 5.5;
      c.fillStyle = "#6b2e46"; c.beginPath(); c.moveTo(-w, -1); c.quadraticCurveTo(0, 0, w, -1); c.quadraticCurveTo(w * 0.8, hh * 1.2, 0, hh * 1.3); c.quadraticCurveTo(-w * 0.8, hh * 1.2, -w, -1); c.fill();
      if (hh > 3) { c.save(); c.clip(); c.fillStyle = "#ff8fa3"; c.beginPath(); c.ellipse(0, hh * 1.25, w * 0.6, hh * 0.5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
    else if (L.mouth === "gatito") { c.beginPath(); c.moveTo(-5, -1); c.quadraticCurveTo(-2.5, 3, 0, 0); c.quadraticCurveTo(2.5, 3, 5, -1); c.stroke(); }
    else if (L.mouth === "o") { c.fillStyle = "#6b3448"; c.beginPath(); c.ellipse(0, 1, 2.4, 2.8, 0, 0, Math.PI * 2); c.fill(); }
    else if (L.mouth === "timida") { c.beginPath(); c.arc(0, -2, 3, 0.5, Math.PI - 0.5); c.stroke(); }
    else { c.beginPath(); c.arc(0, -3, 5.5, 0.35, Math.PI - 0.35); c.stroke(); if (L.mouth === "diente") { c.fillStyle = "#fff"; c.fillRect(1, 2, 3, 3.2); c.strokeStyle = rgba(INK, 0.4); c.lineWidth = 0.8; c.strokeRect(1, 2, 3, 3.2); } }
    c.restore();
    c.restore();
  }

  function star(c, x, y, r, a) { c.globalAlpha = a; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); c.globalAlpha = 1; }

  // ——— DIBUJO PRINCIPAL ———
  // Pies en (x, y), altura h en píxeles. st = { t, vx, vy, on, face, mood, sq }
  function draw(ctx, cr, x, y, h, st) {
    if (!cr || !cr.look) return;
    st = st || { t: 0 };
    const L = cr.look, P = L.pal, S = layers(cr), A = pose(cr, st), t = st.t || 0;
    const u = h / L.H, face = st.face < 0 ? -1 : 1, bw = L.bw, bh = L.bh;
    const lift = A.liftS !== undefined ? A.liftS : A.lift;
    ctx.save(); ctx.translate(x, y);
    // sombra de contacto (no sube con el salto)
    const sh = clamp(1 - lift / 40, 0.5, 1) * (st.on === false ? 0.7 : 1);
    ctx.fillStyle = "rgba(70,40,70," + (0.2 * sh).toFixed(3) + ")"; ctx.beginPath(); ctx.ellipse(0, 0, bw * 0.46 * u * sh * A.sx, 5 * u * sh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(A.shake * u, -lift * u); ctx.scale(face * u, u);
    if (S.glow) { ctx.globalCompositeOperation = "lighter"; const gs = bh * 1.9 * (1 + Math.sin(t * 2) * 0.05); ctx.drawImage(S.glow.cv, -gs / 2, -L.legVis - bh * 0.5 - gs / 2, gs, gs); ctx.globalCompositeOperation = "source-over"; }
    // patas
    if (S.leg) {
      const top = -L.legVis - 8, xs = L.legs === 4 ? [[-0.3, 1, 0], [0.26, 1, 1], [-0.22, 0, 1], [0.34, 0, 0]] : [[-0.2, 0, 0], [0.22, 0, 1]];
      xs.forEach(([fx, far, pi]) => {
        const s = A.walk ? Math.sin(A.ph + pi * Math.PI + (far ? 0.6 : 0)) : 0, lf = Math.max(0, s) * 5 + A.legLift, xo = A.walk ? Math.cos(A.ph + pi * Math.PI) * 4 : 0;
        const hh = (-top - lf) + 2;
        ctx.save(); ctx.translate(fx * bw + xo + (far ? -4 : 0), top);
        const sp = far ? S.legFar : S.leg;
        ctx.drawImage(sp.cv, -sp.ox, -sp.oy, sp.w, sp.oy + hh);
        ctx.restore();
      });
    }
    // cuerpo deformable (squash/stretch + inclinación hacia donde va)
    ctx.save(); ctx.translate(0, -L.legVis);
    ctx.transform(1, 0, -A.lean, 1, 0, 0); ctx.scale(A.sx, A.sy);
    const es = A.earSpring || 0, wob = Math.sin(t * 2.6 + L.breathPh) * 0.05;
    // cola (detrás)
    if (S.tail) { ctx.save(); ctx.translate(-bw * 0.44, -bh * 0.2); ctx.rotate(Math.sin(t * (A.walk ? 9 : 3)) * (A.walk ? 0.25 : 0.12) + (A.tailSpring || 0) * 0.5); put(ctx, S.tail); ctx.restore(); }
    // orejas de pie (detrás del cuerpo)
    const hc = L.earX2;
    const earRot = { raton: 0.45, conejo: 0.18, gato: 0.3, oso: 0.35, caidas: 0 }[L.ears];
    const drawEar = (side) => { ctx.save(); ctx.translate(hc + side * L.earX, L.earY[side > 0 ? 1 : 0]); ctx.scale(side, 1); ctx.rotate(earRot + es * side * 0.8 + wob * (side > 0 ? 1 : -0.7) + (L.ears === "caidas" ? -0.15 - es * 0.5 : 0)); put(ctx, S.ear); ctx.restore(); };
    if (S.ear && L.ears !== "caidas") { drawEar(-1); drawEar(1); }
    // cuernos/antenas de ciervo (detrás, salen de la cabeza)
    if (S.horn) [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(hc + sd * L.hornX, L.hornY[sd > 0 ? 1 : 0] + 2); ctx.scale(sd, 1); ctx.rotate(0.2 + es * 0.3); put(ctx, S.horn); ctx.restore(); });
    if (L.head === "antenas") [-1, 1].forEach((sd) => {
      const bx = hc + sd * L.hornX * 0.8, by = L.hornY[sd > 0 ? 1 : 0] + 2, len = 26 * L.fs, sw = Math.sin(t * 3 + sd) * 4 + es * 26 * sd;
      const tx = bx + sd * 10 * L.fs + sw, ty = by - len + Math.abs(sw) * 0.3;
      ctx.strokeStyle = shade(P.body, -0.25); ctx.lineWidth = 3 * L.fs; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sd * 2, by - len * 0.6, tx, ty); ctx.stroke();
      clay(ctx, tx, ty, 5 * L.fs, 5 * L.fs, P.acc);
    });
    // brazo de atrás
    const shY = -bh * (L.body === "alto" ? 0.42 : 0.36), armX = (side) => widthAt(L._pts || (L._pts = outline(L.body, bw, bh)), shY)[side > 0 ? 1 : 0] - side * 3;
    if (S.arm) { ctx.save(); ctx.translate(armX(-1), shY); ctx.rotate(A.armL + 0.1); put(ctx, S.armFar); ctx.restore(); }
    // cuerpo
    put(ctx, S.body);
    if (A.flash) { ctx.globalAlpha = A.flash; put(ctx, S.sil); ctx.globalAlpha = 1; }
    drawFace(ctx, cr, A, t);
    // adornos de encima
    if (S.top) { ctx.save(); ctx.translate(hc, L.topY + (L.head === "pelo" ? 6 : 2)); ctx.rotate(Math.sin(t * 2.2 + 1) * 0.06 + es * 0.4); put(ctx, S.top); ctx.restore(); }
    if (S.flower) { ctx.save(); ctx.translate(hc + L.earX * 0.8, L.earY[1] + 4); ctx.rotate(Math.sin(t * 2) * 0.1); put(ctx, S.flower); ctx.restore(); }
    if (S.ear && L.ears === "caidas") { drawEar(-1); drawEar(1); }
    // brazo de delante
    if (S.arm) { ctx.save(); ctx.translate(armX(1), shY); ctx.rotate(-A.armR - 0.1); put(ctx, S.arm); ctx.restore(); }
    // halo y brillitos
    if (L.halo) { const hy = L.topY - 22 * L.fs + Math.sin(t * 2.4) * 2; ctx.strokeStyle = "rgba(255,214,110,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hc, hy, 16 * L.fs, 4.5 * L.fs, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = "rgba(255,250,220,0.8)"; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
    if (L.sparkle) {
      ctx.fillStyle = cr.rarity === "legendario" ? "#fff2b0" : "#ffffff";
      const n = cr.rarity === "legendario" ? 4 : 2;
      for (let i = 0; i < n; i++) { const p = (t * 0.7 + i / n + L.breathPh) % 1, a = i * 2.4 + L.blinkPh; star(ctx, Math.cos(a) * bw * 0.55, -L.legVis - bh * (0.5 + Math.sin(a) * 0.45) - p * 12, (3 + 3 * Math.sin(p * Math.PI)) , Math.sin(p * Math.PI)); }
    }
    ctx.restore();
  }

  // ——— RETRATO (dataURL en caché) ———
  const portraits = new Map();
  function portrait(cr, size) {
    size = size || 256; const key = cr.id + "@" + size;
    if (portraits.has(key)) return portraits.get(key);
    const cv = mkCanvas(size, size), c = cv.getContext("2d");
    draw(c, cr, size * 0.5, size * 0.93, size * 0.8, { t: 0.5, mood: "idle", on: true, face: 1, vx: 0, vy: 0 });
    let url = ""; try { url = cv.toDataURL("image/png"); } catch (e) {}
    portraits.set(key, url); return url;
  }

  // ——— REGISTRO EN EL REPARTO ———
  function register(cr, opts) {
    if (!cr) return null;
    if (typeof cr === "number" || typeof cr === "string") cr = generate(cr, opts);
    M.CAST = M.CAST || {};
    if (!M.CAST[cr.id]) {
      M.CAST[cr.id] = { nat: 1, name: cr.name, kind: cr.kind, mat: cr.mat, ability: cr.ability, stats: cr.stats, h: cr.h, ph: cr.ph, p: cr.p, procgen: true, rarity: cr.rarity, seed: cr.seed, creature: cr };
      M.WILD_IDS = M.WILD_IDS || []; if (!M.WILD_IDS.includes(cr.id)) M.WILD_IDS.push(cr.id);
    }
    if (opts && opts.order && M.CAST_ORDER && !M.CAST_ORDER.includes(cr.id)) { M.CAST_ORDER.push(cr.id); M.FRIEND_IDS && M.FRIEND_IDS.push(cr.id); }
    return M.CAST[cr.id];
  }

  // ——— GRUMOS MUTANTES (datos + dibujo por encima, sin teñir la imagen base) ———
  function grumoVariant(seed) {
    const r = rngOf("grumo" + seed);
    const aura = r.weighted({ nada: 5, amarga: 3, fria: 1.5, ardiente: 1.5 });
    return {
      seed, scale: r.range(0.85, 1.35),
      spikes: r.chance(0.55) ? { n: r.int(3, 7), len: r.range(0.08, 0.16), color: r.pick(["#b7a3d9", "#9fd0c0", "#f4b3c2", "#ffe19a"]) } : null,
      acc: r.weighted({ nada: 4, gorro: 1.5, cuernos: 1.5, hoja: 1.5, parche: 1, corona: 0.6, lazo: 1 }),
      aura: aura === "nada" ? null : aura, auraColor: { amarga: "rgba(150,110,190,", fria: "rgba(150,210,255,", ardiente: "rgba(255,150,90," }[aura] || null,
      speed: r.range(0.9, 1.2), wobble: r.range(0.5, 1.5), ph: r.range(0, 6),
    };
  }
  // layer "back" (aura, antes del grumo) o "front" (pinchos y accesorios, después). (x, y) = pies, h = alto dibujado del grumo
  function drawGrumoVariant(ctx, v, x, y, h, t, layer, face) {
    if (!v) return; t = t || 0; const w = h * 1.15;
    ctx.save(); ctx.translate(x, y); if (face < 0) ctx.scale(-1, 1);
    if (layer === "back") {
      if (v.aura) { const R = h * (0.85 + Math.sin(t * 3 + v.ph) * 0.06), g = ctx.createRadialGradient(0, -h * 0.5, h * 0.2, 0, -h * 0.5, R); g.addColorStop(0, v.auraColor + "0.35)"); g.addColorStop(1, v.auraColor + "0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -h * 0.5, R, 0, Math.PI * 2); ctx.fill(); }
      if (v.spikes) for (let i = 0; i < v.spikes.n; i++) { const a = Math.PI * (0.12 + 0.76 * (i + 0.5) / v.spikes.n), px = -Math.cos(a) * w * 0.44, py = -h * 0.48 - Math.sin(a) * h * 0.44, L = h * v.spikes.len * (1 + Math.sin(t * 4 + i) * 0.08);
        ctx.save(); ctx.translate(px, py); ctx.rotate(-Math.PI / 2 + (Math.PI / 2 - a)); clay(ctx, 0, -L * 0.3, L * 0.35, L * 0.75, v.spikes.color); ctx.restore(); }
    } else {
      const tx = w * 0.05, ty = -h * 0.93;
      ctx.translate(tx, ty); ctx.rotate(Math.sin(t * 2 + v.ph) * 0.06);
      const s = h / 100;
      ctx.scale(s, s);
      if (v.acc === "gorro") { clay(ctx, 0, -8, 22, 14, "#a58bd6"); clay(ctx, 6, -26, 8, 8, "#fff"); ctx.fillStyle = "#8a70bd"; ctx.fillRect(-22, -2, 44, 6); }
      else if (v.acc === "cuernos") [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(sd * 16, 0); ctx.rotate(sd * 0.3); tube(ctx, [[0, 4], [sd * 3, -10], [sd * 8, -20]], 7, "#9c86b8"); ctx.restore(); });
      else if (v.acc === "hoja") { tube(ctx, [[0, 4], [0, -8]], 3, "#6fa37a"); clay(ctx, 8, -12, 12, 5, "#88c08e", -0.5); }
      else if (v.acc === "parche") { ctx.fillStyle = "#3a2a3a"; ctx.fillRect(-26, 22, 52, 3); ctx.beginPath(); ctx.ellipse(10, 30, 8, 7, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (v.acc === "corona") { ctx.fillStyle = "#c9a74a"; ctx.beginPath(); ctx.moveTo(-18, 4); ctx.lineTo(-16, -14); ctx.lineTo(-6, -4); ctx.lineTo(2, -18); ctx.lineTo(8, -6); ctx.lineTo(18, -12); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill(); }
      else if (v.acc === "lazo") { clay(ctx, -9, -2, 9, 6, "#e98aa3", -0.3); clay(ctx, 9, -2, 9, 6, "#e98aa3", 0.3); clay(ctx, 0, -2, 4, 4, "#d9708c"); }
    }
    ctx.restore();
  }

  return { generate, draw, portrait, register, grumoVariant, drawGrumoVariant, rng: rngOf, shade, _cache: cacheMap };
})();
