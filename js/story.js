// Kids: el juego como un cuento. Conversaciones con los personajes, capítulos y decisiones que cambian el mundo.
window.M = window.M || {};

// ——— caja de diálogo ———
M.Dialog = (() => {
  let queue = [], done = null, typing = null, full = "", resolveChoice = null, cur = null;
  const $ = (id) => document.getElementById(id);
  const portrait = (who) => who === "narr" ? "" : `<img src="${M.portrait ? M.portrait(who) : "assets/chars/" + who + ".webp"}">`;
  function show(lines, onDone) {
    queue = lines.slice(); done = onDone; $("dialog").classList.add("open"); next();
  }
  function next() {
    if (typing) { clearInterval(typing); typing = null; $("dl-text").textContent = full; if (cur && cur.choices) choices(cur); return; }
    if (resolveChoice) return;
    const L = queue.shift(); cur = L;
    if (!L) { $("dialog").classList.remove("open"); const d = done; done = null; d && d(); return; }
    const who = L.who || "narr", info = M.CAST[who];
    $("dl-por").innerHTML = portrait(who); $("dl-por").classList.toggle("narr", who === "narr");
    $("dl-name").textContent = who === "narr" ? "Narrador" : info.name;
    $("dl-box").classList.toggle("narr", who === "narr");
    full = L.text; const el = $("dl-text"); el.textContent = ""; let i = 0;
    typing = setInterval(() => { el.textContent = full.slice(0, ++i); if (i % 4 === 0) M.Audio.sfx("pop"); if (i >= full.length) { clearInterval(typing); typing = null; if (L.choices) choices(L); } }, 22);
    $("dl-choices").innerHTML = ""; $("dl-next").style.visibility = L.choices ? "hidden" : "visible";
    if (L.onShow) L.onShow();
  }
  function choices(L) {
    const box = $("dl-choices"); box.innerHTML = "";
    resolveChoice = true;
    L.choices.forEach((ch) => {
      const b = document.createElement("button"); b.className = "dl-ch"; b.innerHTML = ch.t;
      b.onclick = (e) => { e.stopPropagation(); resolveChoice = null; M.Audio.sfx("check"); box.innerHTML = ""; ch.pick && ch.pick(); if (ch.then) queue.unshift(...ch.then); next(); };
      box.appendChild(b);
    });
  }
  document.addEventListener("DOMContentLoaded", () => {});
  return { show, next, get open() { return $("dialog").classList.contains("open"); } };
})();

// ——— capítulos del cuento (Kids) ———
M.Story = (() => {
  const PATHS = {
    setas: "🍄 Por el camino de las setas saltarinas", estampida: "🐾 Por el valle de los grumos gruñones", galletas: "🍪 Por los puentes de galleta",
    viento: "🌬️ Por las cumbres del viento dulce", ascenso: "🧗 Subiendo por la Torre Merengue", lago: "🍮 Cruzando el lago de gelatina",
    hielo: "🧊 Por la cañada escarchada", chicle: "🍬 Por las grutas de chicle", caramelos: "🍭 Bajo la lluvia de caramelos", noche: "🌙 Por el bosque de luciérnagas",
  };
  const OPEN = [
    (f, c) => `Capítulo ${c}. El Viento Amargo seguía soplando, y en el valle se oía un rumor: alguien había visto a ${f} dentro de una burbuja de gelatina.`,
    (f, c) => `Capítulo ${c}. Aquella mañana llegó una nota pegajosa, escrita con sirope: «Soy ${f}. Estoy atrapado. Daos prisa».`,
    (f, c) => `Capítulo ${c}. Las luciérnagas trajeron noticias: la burbuja de ${f} brillaba al otro lado del valle.`,
    (f, c) => `Capítulo ${c}. Nube se despertó con un presentimiento esponjoso: hoy tocaba rescatar a ${f}.`,
  ];
  const HELP = [
    { q: "En el camino, un grumo pequeñito llora sentado en una piedra. ¿Qué hacéis?",
      a: { t: "🌀 Aspirarlo con cariño para que vuelva a ser un mini mash", flag: "abrazo", say: "¡Gracias! Ya no me siento tan duro…" },
      b: { t: "🍬 Dejarle un caramelo y seguir", flag: "caramelo", say: "Snif… ¡está buenísimo! Os debo una." } },
    { q: "Un cartel dice: «Atajo peligroso: solo para valientes». ¿Lo tomáis?",
      a: { t: "💪 ¡Sí! Somos valientes", flag: "valiente", say: "¡Allá vamos! Agárrate fuerte." },
      b: { t: "🐢 Mejor el camino seguro", flag: "prudente", say: "Despacito y con buena letra." } },
    { q: "Encontráis una seta que canta muy desafinada. ¿Qué hacéis?",
      a: { t: "🎵 Cantar con ella", flag: "cantar", say: "¡La-la-laaa! (Los grumos se tapan los oídos)." },
      b: { t: "🤫 Pasar de puntillas", flag: "silencio", say: "Shhh… que no nos oiga el Viento Amargo." } },
  ];
  // Devuelve las líneas del capítulo y aplica las decisiones sobre el perfil (p.story)
  function chapter(p, avail, onPick) {
    const friend = M.RESCUE_ORDER.find((id) => !p.rescued.includes(id)) || "pompon", F = M.CAST[friend].name, cap = p.world;
    const comp = p.companion || "nube", st = p.story = p.story || { flags: [] };
    const r = M.rng(p.seed + cap * 17), open = OPEN[cap % OPEN.length](F, cap);
    const lines = [{ who: "narr", text: open }];
    // recuerdos de decisiones anteriores
    if (st.flags.includes("abrazo") && cap % 3 === 0) lines.push({ who: "narr", text: "El mini mash al que ayudasteis os seguía de lejos, dando saltitos. A veces, ser blandito tiene premio." });
    if (st.flags.includes("valiente") && cap % 4 === 1) lines.push({ who: comp, text: "¿Te acuerdas del atajo peligroso? Aún me tiemblan las piernas. ¡Pero estuvo genial!" });
    lines.push({ who: comp, text: M.persona(comp, "kids").l + " Vamos a por " + F + "." });
    // elige el camino: cambia la mecánica protagonista del mundo
    const opts = r.chance(0.5) ? avail.slice(0, 2) : avail.slice(-2);
    if (opts.length >= 2) lines.push({ who: "nube", text: "Hay dos caminos. ¿Por cuál vamos?", choices: opts.map((g) => ({ t: PATHS[g] || g, pick: () => onPick(g), then: [{ who: comp, text: pathLine(g) }] })) });
    // decisión moral (cambia pequeñas cosas y se recuerda en capítulos futuros)
    if (cap > 1) { const H = HELP[cap % HELP.length];
      lines.push({ who: "narr", text: H.q, choices: [H.a, H.b].map((o) => ({ t: o.t, pick: () => { if (!st.flags.includes(o.flag)) st.flags.push(o.flag); }, then: [{ who: "narr", text: "«" + o.say + "»" }] })) }); }
    lines.push({ who: "narr", text: "Y así empezó la aventura en busca de " + F + "…" });
    return lines;
  }
  const pathLine = (g) => ({ setas: "¡Setas! Rebotaremos hasta las nubes.", estampida: "Hay muchos grumos… ¡pues a aspirar se ha dicho!", galletas: "Pisa rápido, que las galletas crujen.",
    viento: "Déjate llevar por el viento, que empuja hacia arriba.", ascenso: "Arriba, arriba, que la torre es alta.", lago: "Las balsas se hunden si te quedas quieto, ¡ojo!",
    hielo: "Resbala mucho, ve con cuidado.", chicle: "¡Salta de pared en pared, que el chicle pega!", caramelos: "¡Caen caramelos de poder! Coge todos los que puedas.",
    noche: "Está oscuro, pero las setas brillan. No te separes." }[g] || "¡Vamos!");
  // conversación al rescatar a un amigo
  function rescue(id, p) {
    const n = M.CAST[id].name, next = M.RESCUE_ORDER.find((x) => !p.rescued.includes(x) && x !== id);
    return [
      { who: id, text: M.persona(id, "kids").l },
      { who: "nube", text: "¡" + n + "! Te estábamos buscando por todo el valle." },
      { who: id, text: "Gracias por sacarme de la burbuja. ¡Iré contigo y te prestaré mi poder!" },
      ...(next ? [{ who: id, text: "Por cierto… me pareció ver a " + M.CAST[next].name + " cerca de aquí. Seguro que nos necesita." }] : []),
    ];
  }
  function visitor(id, gift) {
    return [
      { who: id, text: M.persona(id, "kids").d },
      { who: id, text: M.persona(id, "kids").l },
      { who: "nube", text: "¿Tienes algo que nos ayude?", },
      { who: id, text: "¡Claro! Toma este caramelo de " + M.abilityName(gift, "kids").toLowerCase() + ". ¡Úsalo bien!" },
    ];
  }
  return { chapter, rescue, visitor };
})();
