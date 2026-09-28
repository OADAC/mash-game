// Young: modo canalla. Chat de directo con los Mash comentando tus jugadas, trucos en el aire, estilo y rango final.
window.M = window.M || {};

M.Young = (() => {
  const $ = M.$;
  const USERS = {
    pompon: ["@pompon_oficial", "#8fd8c0"], gluglu: ["@gluglu.glu", "#9fd9ff"], solete: ["@solete.caliente", "#ffb347"], trompetin: ["@trompe_tin", "#b9a3ff"],
    canelo: ["@canelo_speedrun", "#e0a070"], orejotas: ["@orejotas_escucha", "#ff9fb6"], merengue: ["@yeti_llorón", "#c9d6ff"], mandarino: ["@mandarino.exe", "#ffa860"],
    narizotas: ["@narizotas_uwu", "#ff8fd0"], risotas: ["@risotas_jajaja", "#ffd36b"], grenas: ["@greñas_inventario", "#a8d99a"], rival: ["@grumete_rival", "#ff5a5a"],
  };
  const LINES = {
    start: ["empieza el directo 🔴", "a ver si hoy no te caes 💀", "chat, apostad: ¿cuántas caídas?", "modo tryhard activado"],
    kill: ["EZ", "limpio 🧼", "ese grumo no lo vio venir", "otro menos lol", "ñam"], eat: ["ASPIRADORA 🌪️", "comió sin pagar", "dieta: grumos"],
    combo: ["COMBOOO 🔥", "está en racha", "no para 😳", "clip it 📸"], hurt: ["F", "auch 💀", "skill issue", "lag, seguro que fue lag"],
    fall: ["JAJAJAJA", "se cayó al vacío 💀", "gravedad 1 – tú 0", "rip"], trick: ["MORTAL 🤸", "estilazo", "que alguien lo grabe", "+100 aura"],
    fail: ["se estampó haciendo el truco 😭", "demasiada confianza", "plof"], power: ["usando skills 🧠", "eso es trampa (me encanta)", "ok ese poder está roto"],
    rescue: ["SQUAD +1 🤝", "el rescate más limpio del valle", "welcome back"], boss: ["BOSS FIGHT 👑", "ahora sí se pone serio", "está enorme 😳"],
    bossHit: ["PEGA MÁS 👊", "le quedan dos telediarios", "dale dale dale"], idle: ["¿estás AFK?", "chat, se ha dormido", "hello?? 👀"],
    rival: ["yo lo haría más rápido 🙄", "qué lento, madre mía", "ni con ayuda lo pasas", "jaja otra vez tú"],
  };
  let on = false, lastIdle = 0, lastMsg = 0;
  const pick = (a) => a[(Math.random() * a.length) | 0];
  function add(user, text) {
    const box = $("chat-list"); if (!box) return;
    const u = USERS[user] || USERS.pompon, row = document.createElement("div"); row.className = "msg";
    row.innerHTML = `<b style="color:${u[1]}">${u[0]}</b> ${text.replace(/</g, "&lt;")}`;
    box.appendChild(row); while (box.children.length > 7) box.removeChild(box.firstChild);
    lastMsg = performance.now();
  }
  function say(kind) {
    if (!on || !LINES[kind]) return;
    const pool = Object.keys(USERS).filter((k) => k !== "rival");
    add(kind === "rival" ? "rival" : pick(pool), pick(LINES[kind]));
    if ((kind === "fall" || kind === "hurt" || kind === "fail") && Math.random() < 0.5) setTimeout(() => add("rival", pick(LINES.rival)), 600);
  }
  function start() { on = true; $("chat").classList.add("show"); $("chat-list").innerHTML = ""; $("style-pill").style.display = ""; say("start"); setTimeout(() => say("rival"), 1500); }
  function stop() { on = false; $("chat").classList.remove("show"); $("style-pill").style.display = "none"; }
  function tick() { if (on && performance.now() - lastMsg > 9000) { say("idle"); } }
  // rango final: tiempo, estilo, caídas
  function rank(st, L) {
    const par = L.end / 380, t = st.time, sc = st.style + st.stomps * 40 + st.minis * 5 - (st.falls + st.hits) * 120 + Math.max(0, (par - t)) * 8;
    return sc > 1400 ? "S" : sc > 800 ? "A" : sc > 350 ? "B" : "C";
  }
  return { start, stop, say, tick, rank, get on() { return on; } };
})();
