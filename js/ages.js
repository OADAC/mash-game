// Perfiles por edad. Cambian reglas, música, tono, color y tipografía; no solo la dificultad.
window.M = window.M || {};

M.AGES = {
  baby: {
    id: "baby", label: "Baby", range: "4 – 7 años", icon: "🍼", color: "#ffb3c7",
    tagline: "Todo es blandito. Nadie pierde, todos juegan.",
    music: "cajita", musicLabel: "Caja de música",
    // masa: la energía del Mash. En Baby nunca baja de la mitad
    massFloor: 0.5, hitCost: 0.08, abilityCost: 0.45, startMass: 0.8,
    pits: false, speed: 330, jump: 1000, djump: 900, coyote: 0.2,
    enemySpeed: 0.55, density: 0.45, worldLen: 0.55, bossHP: 2,
    assist: true, timer: false, combo: false, secrets: 0, voice: true, uiScale: 1.16,
    grade: "saturate(1.12) brightness(1.04)", grain: 0,
  },
  kids: {
    id: "kids", label: "Kids", range: "7 – 13 años", icon: "🚀", color: "#8fd8c0",
    tagline: "Aventura, poderes y un montón de amigos por rescatar.",
    music: "aventura", musicLabel: "Aventura",
    massFloor: 0, hitCost: 0.18, abilityCost: 1, startMass: 0.7,
    pits: true, speed: 410, jump: 1000, djump: 900, coyote: 0.1,
    enemySpeed: 0.85, density: 0.8, worldLen: 0.8, bossHP: 3,
    assist: false, timer: false, combo: false, secrets: 1, voice: false, uiScale: 1,
    grade: "none", grain: 0,
  },
  young: {
    id: "young", label: "Young", range: "14 – 18 años", icon: "⚡", color: "#b9a3ff",
    tagline: "Más rápido, combos, actitud. Los Mash también tienen su drama.",
    music: "synth", musicLabel: "Synth-hop",
    massFloor: 0, hitCost: 0.2, abilityCost: 1, startMass: 0.65,
    pits: true, speed: 460, jump: 1030, djump: 920, coyote: 0.08,
    enemySpeed: 1.05, density: 1.05, worldLen: 0.95, bossHP: 4,
    assist: false, timer: true, combo: true, secrets: 2, voice: false, uiScale: 0.96,
    grade: "contrast(1.07) saturate(1.1)", grain: 0,
  },
  adult: {
    id: "adult", label: "Adult", range: "18+ años", icon: "☕", color: "#ffd98e",
    tagline: "Precisión, secretos y malvaviscos con crisis existencial.",
    music: "jazz", musicLabel: "Jazz ambiental",
    massFloor: 0, hitCost: 0.24, abilityCost: 1.1, startMass: 0.6,
    pits: true, speed: 440, jump: 1020, djump: 880, coyote: 0.07,
    enemySpeed: 1.1, density: 1.15, worldLen: 1, bossHP: 5,
    assist: false, timer: true, combo: false, secrets: 3, voice: false, uiScale: 0.94,
    grade: "saturate(0.9) contrast(1.05) sepia(0.06)", grain: 0.05,
  },
};
M.AGE_ORDER = ["baby", "kids", "young", "adult"];

// Historia y textos por edad
M.TXT = {
  story: {
    baby: [
      { v: "nube", t: "¡Hola! Soy Nube, un malvavisco blandito. 🤍" },
      { v: "lago", t: "Vivo en el Valle Mash, donde todo es dulce." },
      { v: "grumo", t: "¡Oh, no! Un viento amargo ha puesto gruñones a los Mash…" },
      { v: "pompon", t: "Si me los como, ¡vuelven a ser mini mash felices! ¿Me ayudas?" },
    ],
    kids: [
      { v: "nube", t: "En el Valle Mash, los malvaviscos nacen de las nubes de azúcar. Nube es el más blandito de todos." },
      { v: "lago", t: "Un día sopló el Viento Amargo. Donde tocaba, los Mash se hacían grumos: duros, gruñones y pegajosos." },
      { v: "grumo", t: "Solo Nube puede arreglarlo: si aspira un grumo, lo deshace en mini mash que le dan fuerza." },
      { v: "pompon", t: "Sus 16 amigos están atrapados en burbujas por todo el valle. Cada uno que rescate le prestará su poder." },
    ],
    young: [
      { v: "nube", t: "Nube: cubo, blanco, piernas rojas. Ninguna red social. Leyenda en proceso." },
      { v: "lago", t: "El Viento Amargo pasó por el valle y convirtió a medio pueblo en grumos. Muy tóxico todo." },
      { v: "grumo", t: "Nube aspira grumos y los devuelve a mini mash. Más mini mash = más masa = más poder. Así funciona." },
      { v: "pompon", t: "16 colegas encerrados en burbujas. Rescátalos, róbales el skill y monta el mejor squad del valle." },
    ],
    adult: [
      { v: "nube", t: "Nube es un malvavisco. Sabe que algún día habrá una hoguera. Ha decidido no pensar en ello." },
      { v: "lago", t: "El Viento Amargo no destruye nada: solo endurece. Los Mash que toca se vuelven grumos, cerrados sobre sí mismos." },
      { v: "grumo", t: "Nube puede ablandarlos otra vez. Cada grumo que absorbe se deshace en pequeños Mash que lo sostienen." },
      { v: "pompon", t: "El valle cambia según quien lo camina. Tus amigos esperan en burbujas. Camina con intención." },
    ],
  },
  rescue: { baby: "¡Lo encontraste! 🎉", kids: "¡Amigo rescatado!", young: "¡Squad +1!", adult: "Un reencuentro." },
  worldDone: { baby: "¡Muy bien! 🌟", kids: "¡Mundo completado!", young: "GG. Mundo superado.", adult: "Mundo atravesado." },
  bossIntro: { baby: "¡Un grumo gigante! ¡Aspíralo y salta encima!", kids: "¡Grumo Mayor! Fuego, pisotones y aspirar… ¡y más fuerte cuando esté mareado!", young: "Boss fight. Salta la onda, quémalo y aspíralo cuando se maree.", adult: "El Viento Amargo lo ha endurecido. Cuando se marea, está abierto a todo." },
  bossWin: { baby: "¡Ya está contento!", kids: "¡Grumo Mayor deshecho!", young: "Boss eliminado. Ni sudé.", adult: "Se ablanda. Siempre acaban ablandándose." },
  hurt: { baby: ["¡Ups!", "¡Boing!", "¡Cosquillas!"], kids: ["¡Ay!", "¡Cuidado!"], young: ["F", "Auch.", "Ni lo vi venir"], adult: ["Eso dolió.", "Anotado."] },
  melted: { baby: "¡Otra vez!", kids: "¡Te has derretido!", young: "Derretido. Respawn.", adult: "Te deshaces. Vuelves a empezar." },
  lowMass: { baby: "¡Come mini mash!", kids: "¡Poca masa! Aspira grumos", young: "Masa baja. A farmear.", adult: "Estás gastándote." },
  gate: { baby: "¡Pulsa el botón mágico!", kids: "Usa un poder o busca la palanca", young: "Poder o palanca. Tú eliges.", adult: "Hay más de una forma de abrir esto." },
  giant: { baby: "¡Hazle cosquillas!", kids: "Está dormido… ¡despiértalo!", young: "Está frito. Dale un toque.", adult: "Duerme. Quizá no por mucho." },
  adaptTitle: { baby: "¡El mundo te conoce!", kids: "El valle aprende de ti", young: "El algoritmo del valle", adult: "Lo que el valle ha observado" },
};
M.T = (key, age) => { const v = M.TXT[key]; return v ? (v[age] || v.kids) : key; };
