// Interfaz v3: perfiles con música por edad, historia con vídeos, mapa por regiones, cartas, HUD de masa, jefe, fusión.
(function () {
  const $ = M.$, A = M.Audio, S = M.Save, G = M.G, I = M.Input;
  M.TOUCH = matchMedia("(pointer: coarse)").matches;
  if (M.TOUCH) document.body.classList.add("touch");

  // ——— sin zoom accidental en móvil (doble toque o pellizco) ———
  (function noZoom() {
    const content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; document.head.appendChild(vp); }
    vp.setAttribute("content", content);
    ["gesturestart", "gesturechange", "gestureend"].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
    let lastEnd = 0;
    document.addEventListener("touchend", (e) => { const now = Date.now(); if (now - lastEnd < 350 && document.body.classList.contains("playing")) e.preventDefault(); lastEnd = now; }, { passive: false });
    document.addEventListener("touchmove", (e) => { if (e.touches.length > 1 || document.body.classList.contains("playing")) e.preventDefault(); }, { passive: false });
  })();
  const screens = ["loading", "title", "profiles", "map", "team", "intro", "rescue", "wild", "results", "pause", "fusion", "confirm"];
  function show(id) { screens.forEach((s) => $(s) && $(s).classList.toggle("open", s === id)); document.body.classList.toggle("playing", id === null); if (id !== "map" && view) view.stop(); }
  function setAge(age) {
    M.AGE_ORDER.forEach((a) => document.body.classList.remove("age-" + a)); document.body.classList.add("age-" + age);
    const AG = M.AGES[age]; M.gameCanvas.style.filter = AG.grade === "none" ? "" : AG.grade; $("grain").style.opacity = AG.grain;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const portrait = (id) => M.castPortrait ? M.castPortrait(id) : id === "nube" && M.nubePortrait ? M.nubePortrait() : `assets/chars/${id}.webp`;
  M.portrait = portrait;
  M.speak = function (text, age) {
    if (age !== "baby" || !S.data.voice || !window.speechSynthesis) return;
    try { const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s¡!¿?,.]/gu, "")); u.lang = "es-ES"; u.rate = 0.95; u.pitch = 1.35; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  };
  const menuMusic = (age) => { A.init(); A.play(M.AGES[age || "kids"].music, 4); };

  // ——— sesión ———
  const sess = { profiles: [], fusion: false, L: null };
  const P1 = () => sess.profiles[0];
  // Mash salvajes del perfil (semillas en p.wild): se registran en M.CAST al cargar el perfil
  const wildIds = (p) => (p && p.wild ? p.wild : []).map((s) => (M.ensureWild ? M.ensureWild(s) : M.CAST["w_" + s] ? "w_" + s : null)).filter(Boolean);
  const team = (p) => [...p.rescued, ...wildIds(p)];
  const owned = (p) => [...new Set(team(p).map((id) => M.CAST[id] && M.CAST[id].ability).filter(Boolean))];
  const OW = () => M.Overworld;
  const bondLevel = (p, id) => Math.min(5, Math.floor((p.bonds[id] || 0) / 2));
  const nextFriend = (p) => M.RESCUE_ORDER.find((id) => !p.rescued.includes(id)) || M.rng(p.world).pick(p.rescued);
  function buildWorld(p, p2, world, force) { // fusión: mundo por índice (sin mapa)
    const friend = p2 ? M.RESCUE_ORDER.find((id) => !p.rescued.includes(id) || !p2.rescued.includes(id)) || nextFriend(p) : nextFriend(p);
    const own = p2 ? [...new Set([...owned(p), ...owned(p2)])] : owned(p);
    const visitors = [...new Set([...p.rescued, ...(p2 ? p2.rescued : [])])];
    return M.generate({ seed: p.seed, index: world || (p2 ? Math.max(p.world, p2.world) : p.world), age: p.age, age2: p2 ? p2.age : null, owned: own, friend, skill: p.skill, visitors, recent: p.recent || [], force });
  }

  // ——— CARTAS DE ROL ———
  function statBars(st, age) {
    const labels = age === "baby" ? ["🏃", "🦘", "🪨", "✨"] : ["Velocidad", "Salto", "Peso", "Poder"];
    return st.map((v, i) => `<div class="sb"><span>${labels[i]}</span><em>${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= v ? "on" : ""}"></i>`).join("")}</em></div>`).join("");
  }
  M.card = function (id, age, opt = {}) {
    const d = M.CAST[id], per = M.persona(id, age), mat = M.MATERIALS[d.mat] || M.MATERIALS.plastilina, ab = d.ability && M.ABILITIES[d.ability] ? d.ability : null, bond = opt.bond || 0;
    const wild = !!d.procgen, rar = d.rarity || (d.creature && d.creature.rarity) || "comun";
    const num = wild ? "S" + String(opt.dex || 0).padStart(2, "0") : "#" + String(M.CAST_ORDER.indexOf(id)).padStart(2, "0");
    const el = document.createElement("div");
    el.className = "card3d" + (opt.locked ? " locked" : "") + (opt.big ? " big" : "") + (wild ? " wild rar-" + rar : ""); el.dataset.id = id;
    const vid = window.MANIFEST && window.MANIFEST.vid && window.MANIFEST.vid[id];
    const art = opt.video && vid && !opt.locked && !wild && id !== "nube" ? `<video src="${vid}" poster="${portrait(id)}" muted loop playsinline autoplay></video>` : `<img src="${portrait(id)}" alt="">`;
    const RAR = { comun: "Común", raro: "Raro ✦", legendario: "Legendario ✦✦" };
    const abTxt = ab ? M.ABILITIES[ab].icon + " " + esc(M.abilityName(ab, age)) : "🌀 Aspirar";
    el.innerHTML = `<div class="card-inner">
      <div class="face front" style="--mat:${mat.color}"><div class="holo"></div>
        <div class="c-top"><span>${num}</span><span class="chip">${wild ? "🐾 " + RAR[rar] : esc(mat.label)}</span></div>
        <div class="c-art">${art}</div>
        <div class="c-name">${opt.locked ? "???" : esc(d.name)}</div><div class="c-kind">${opt.locked ? "Por rescatar" : esc(d.kind)}</div>
        <div class="c-ab">${opt.locked ? "🔒" : abTxt}</div></div>
      <div class="face back" style="--mat:${mat.color}">
        <div class="c-name">${esc(d.name)}</div><p class="c-desc">${esc(per.d)}</p><blockquote>«${esc(per.l)}»</blockquote>
        <div class="c-stats">${statBars(d.stats, age)}</div>
        <div class="c-abdesc"><b>${abTxt}</b> ${esc(M.abilityDesc(ab, age))}${ab ? ` <small>· gasta ${Math.round(M.ABILITIES[ab].cost * 100)}% de masa${M.ABILITIES[ab].kind === "hold" ? "/s" : ""}</small>` : ""}</div>
        <div class="c-mat">🧪 ${esc(mat.label)}: ${esc(mat.note)}</div>
        <div class="c-bond">Vínculo ${"♥".repeat(bond)}${"♡".repeat(5 - bond)}</div></div></div>`;
    if (!opt.locked) {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--rx", ((0.5 - y) * 18).toFixed(1) + "deg"); el.style.setProperty("--ry", ((x - 0.5) * 22).toFixed(1) + "deg"); el.style.setProperty("--hx", (x * 100).toFixed(0) + "%"); el.style.setProperty("--hy", (y * 100).toFixed(0) + "%"); });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
      el.addEventListener("click", (e) => { if (e.target.closest("button")) return; el.classList.toggle("flipped"); A.sfx("pop"); });
    }
    return el;
  };

  // ——— TÍTULO ———
  $("t-play").onclick = () => { A.init(); openProfiles(); };
  $("t-fusion").onclick = () => { A.init(); openFusion(); };
  function openTitle() { show("title"); setAge("kids"); }

  // ——— PERFILES ———
  let newAge = "kids";
  function openProfiles() {
    show("profiles"); menuMusic(newAge);
    const list = $("prof-list"); list.innerHTML = S.profiles().length ? "" : `<div class="empty">Aún no hay nadie por aquí.<br>Crea tu perfil y elige tu edad: cambia la música, la historia y cómo te hablan los Mash. 👉</div>`;
    S.profiles().forEach((p) => {
      const AG = M.AGES[p.age], b = document.createElement("div"); b.className = "prof"; b.style.setProperty("--ac", AG.color);
      b.innerHTML = `<button class="prof-main"><span class="prof-age">${AG.icon} ${AG.label}</span><b>${esc(p.name)}</b><small>Mundo ${p.world} · ${p.rescued.length}/16 amigos</small>
        <span class="prof-faces">${["nube", ...p.rescued.slice(-4)].map((id) => `<img src="${portrait(id)}">`).join("")}</span></button><button class="prof-del" title="Borrar perfil">✕</button>`;
      b.querySelector(".prof-main").onclick = () => { S.data.current = p.id; S.persist(); sess.profiles = [p]; sess.fusion = false; A.sfx("pop"); enterProfile(); };
      b.querySelector(".prof-del").onclick = () => confirmBox(`¿Borrar el perfil de ${esc(p.name)}? Se perderán sus mundos y amigos.`, () => { S.remove(p.id); openProfiles(); });
      list.appendChild(b);
    });
    renderAgePick($("age-pick"), (a) => { newAge = a; renderAgePreview(); menuMusic(a); });
    renderAgePreview();
  }
  function renderAgePick(host, onPick) {
    host.innerHTML = "";
    M.AGE_ORDER.forEach((a) => { const AG = M.AGES[a], b = document.createElement("button"); b.className = "agebtn" + (a === newAge ? " on" : ""); b.style.setProperty("--ac", AG.color);
      b.innerHTML = `<span>${AG.icon}</span><b>${AG.label}</b><small>${AG.range}</small>`;
      b.onclick = () => { host.querySelectorAll(".agebtn").forEach((x) => x.classList.remove("on")); b.classList.add("on"); A.sfx("pop"); onPick(a); }; host.appendChild(b); });
  }
  function renderAgePreview() {
    const AG = M.AGES[newAge], per = M.persona("pompon", newAge);
    $("age-preview").innerHTML = `<img src="${portrait("pompon")}"><div><b>${esc(AG.tagline)}</b><p>Pompón te diría: <i>«${esc(per.l)}»</i></p>
      <small>🎵 ${AG.musicLabel} · ${AG.massFloor ? "tu Mash nunca se derrite · gelatina en los huecos · ayuda automática" : (AG.timer ? "cronómetro · " : "") + (AG.combo ? "combos · " : "") + AG.secrets + " secretos por mundo"}</small></div>`;
  }
  $("prof-create").onclick = () => { const name = $("prof-name").value.trim().slice(0, 16) || "Jugador"; const p = S.create(name, newAge); p.recent = []; $("prof-name").value = ""; sess.profiles = [p]; sess.fusion = false; A.sfx("check"); enterProfile(); };
  $("prof-back").onclick = openTitle;
  // al cargar un perfil se registran sus Mash salvajes (semillas) para que existan como cartas, líder o compañero
  function loadWild(p) { if (!p) return; if (M.allCast) M.allCast(p); else wildIds(p); }
  function enterProfile() { const p = P1(); loadWild(p); setAge(p.age); if (!p.introSeen) return openIntro(p); home(); }
  // cada edad tiene su "casa": Baby empieza en el Taller de Mash; el resto, en el mapa
  function home() { const p = P1(); if (p.age === "baby") openTaller(); else openMap(); }
  function openTaller() { show(""); document.body.classList.remove("playing"); G.state = "idle"; M.Young.stop(); M.Taller.open(P1()); }
  $("tl-home").onclick = () => { M.Taller.close(); openProfiles(); };
  $("tl-walk").onclick = () => { M.Taller.close(); openMap(); };
  $("map-taller").onclick = () => openTaller();

  // ——— HISTORIA (con vídeos) ———
  let introI = 0, introP = null, typeT = null;
  function openIntro(p) { introP = p; introI = 0; show("intro"); setAge(p.age); menuMusic(p.age); typeLine(); }
  function typeLine() {
    const lines = M.T("story", introP.age), L0 = lines[introI], el = $("intro-text"), v = $("intro-video");
    const src = window.MANIFEST.vid[L0.v === "nube" ? "colina" : L0.v]; if (src && !v.src.endsWith(src)) { v.classList.remove("in"); v.src = src; v.play().catch(() => {}); void v.offsetWidth; v.classList.add("in"); }
    el.textContent = ""; let i = 0; clearInterval(typeT);
    typeT = setInterval(() => { el.textContent = L0.t.slice(0, ++i); if (i % 4 === 0) A.sfx("pop"); if (i >= L0.t.length) clearInterval(typeT); }, introP.age === "baby" ? 45 : 24);
    $("intro-dots").innerHTML = lines.map((_, k) => `<i class="${k === introI ? "on" : ""}"></i>`).join("");
    M.speak(L0.t, introP.age);
  }
  function nextIntro() { const lines = M.T("story", introP.age), el = $("intro-text");
    if (el.textContent.length < lines[introI].t.length) { clearInterval(typeT); el.textContent = lines[introI].t; return; }
    if (++introI >= lines.length) return endIntro(); typeLine(); }
  function endIntro() { clearInterval(typeT); $("intro-video").pause(); introP.introSeen = true; S.persist(); home(); }
  $("intro").onclick = (e) => { if (e.target.id !== "intro-skip") nextIntro(); };
  $("intro-skip").onclick = endIntro;

  // ——— MAPA (overworld procedural: ramas, secretos, eventos y niebla) ———
  let view = null, graph = null;
  function mapView() { if (!view && OW()) view = OW().View($("ow-canvas"), (n) => { A.sfx("pop"); selectNode(n); }); return view; }
  function toast(msg) { const t = $("ow-toast"); if (!t) return; t.textContent = msg; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 4200); }
  // el siguiente paso natural desde un nodo: primero mundos jugables disponibles
  function nextFrom(g, n) {
    if (!g || !n) return null;
    const ids = n.links.map((id) => g.byId[id]).filter((x) => x && x.state === "disponible");
    ids.sort((a, b) => (OW().isLevel(b) ? 1 : 0) - (OW().isLevel(a) ? 1 : 0));
    return ids[0] || null;
  }
  function openMap(focusId) {
    const p = P1(); setAge(p.age); show("map"); sess.fusion = false; menuMusic(p.age); document.body.classList.remove("fusion");
    $("map-taller").style.display = p.age === "baby" ? "" : "none";
    $("map-who").innerHTML = `${M.AGES[p.age].icon} <b>${esc(p.name)}</b> · ${M.AGES[p.age].label}`;
    renderTeamMini();
    if (!OW()) { $("map-next").textContent = "Falta js/overworld.js"; return; }
    const found = OW().checkSecrets(p); graph = OW().build(p); S.persist();
    const v = mapView(); v.set(graph, p); v.start();
    renderLegend();
    if (found.length) toast("✨ ¡Has descubierto " + (found.length > 1 ? found.length + " rincones secretos" : "un rincón secreto") + " en el mapa!");
    const at = graph.byId[graph.at];
    const pick = graph.byId[focusId] || nextFrom(graph, at) || graph.byId[graph.avail[0]] || at;
    v.select(pick.id); selectNode(pick);
  }
  function renderLegend() {
    const lg = $("ow-legend"); if (!lg || !graph) return;
    lg.innerHTML = graph.regions.filter((R) => R.reached).map((R) => `<span class="chip" style="background:${R.color}">${R.bloom > 0.45 ? "🌸" : R.bitter > 0.45 ? "🥀" : "🍃"} ${esc(R.name)}</span>`).join("")
      + `<span class="chip ow-help">${M.TOUCH ? "Arrastra para mover · toca un lugar" : "Arrastra o rueda · ← → elige · Enter juega"}</span>`;
  }
  const NODE_TXT = {
    jefe: "Un Grumo Mayor guarda a alguien…", salvaje: "Dicen que aquí viven Mash salvajes que nadie ha visto…",
    secreto: "Un lugar que no sale en ningún mapa…", evento: "¡Algo especial está pasando aquí!", normal: "Alguien espera en una burbuja…",
  };
  function selectNode(n) {
    const p = P1(); if (!n || !graph) return;
    sess.node = n; const R = graph.regions[n.region], O = OW(), ev = n.event && O.EVENTS[n.event], level = O.isLevel(n);
    $("map-region").textContent = R.name + (R.bloom > 0.45 ? " · 🌸 en flor" : R.bitter > 0.45 ? " · 🥀 se está amargando" : "");
    const play = $("map-play");
    play.disabled = n.state === "bloqueado" || (!level && n.done);
    play.textContent = n.state === "bloqueado" ? "🔒 Aún no puedes llegar" : !level ? (n.done ? "Ya lo visitaste ✓" : "¡Visitar! " + ev.icon) : n.done ? "Volver a jugar ↺" : n.type === "jefe" ? "¡A por el jefe! 👑" : "¡Jugar aquí!";
    const stTxt = n.state === "hecho" ? "✓ completado" : n.state === "disponible" ? "▶ puedes ir" : "🔒 bloqueado";
    const head = `<div class="mn-head"><span class="chip" style="background:${R.color}">${O.nodeIcon(n)} ${esc(O.nodeName(n))}</span><small>${esc(R.name)} · ${stTxt}</small></div>`;
    if (n.state === "bloqueado") { $("map-next").innerHTML = head + `<div class="mn-body"><div><b>Todavía está lejos.</b><p>Completa un lugar vecino para abrir el camino.</p></div></div>`; return; }
    if (!level) { $("map-next").innerHTML = head + `<div class="mn-body"><div class="ev-ic">${ev.icon}</div><div><b>${esc(ev.name)}</b><p>${esc(ev.desc)}</p></div></div>`; return; }
    let L = null; try { L = M.generate(O.genOptions(p, n)); L._node = n.id; } catch (e) { console.warn("generate", e); }
    sess.L = L; sess.replay = n.done ? n.id : null;
    if (!L) { $("map-next").innerHTML = head; return; }
    const next = L.cage ? L.cage.friend : L.bossData ? L.bossData.friend : "nube";
    const txt = n.invaded ? "¡Los grumos han vuelto! Límpialo otra vez para que la región florezca." : ev ? ev.desc : NODE_TXT[n.type] || NODE_TXT.normal;
    $("map-next").innerHTML = head.replace("</small>", ` · ${L.tod === "night" ? "🌙" : L.tod === "dusk" ? "🌅" : "☀️"} ${esc(L.name)}</small>`)
      + `<div class="mn-body"><img class="sil" src="${portrait(next)}"><div><b>${esc(txt)}</b><p>${esc(M.T("adaptTitle", p.age))}:</p>
      <ul>${L.notes.map((x) => `<li>${x.icon} <b>${esc(x.k)}</b> — ${esc(x.v)}</li>`).join("")}</ul></div></div>`;
    G.attract(L);
  }
  function renderTeamMini() { const p = P1(); const ab = (id) => M.CAST[id] && M.CAST[id].ability && M.ABILITIES[M.CAST[id].ability] ? M.ABILITIES[M.CAST[id].ability].icon : "🌀";
    $("map-team").innerHTML = `<img src="${portrait(p.leader)}"><span class="ti">${ab(p.leader)}</span>${p.companion ? `<img class="c2" src="${portrait(p.companion)}"><span class="ti">${ab(p.companion)}</span>` : ""}<span class="tl">Equipo →</span>`; }
  // jugar el nodo elegido. Kids: cada mundo empieza con un capítulo del cuento sobre ese lugar
  function playNode(n) {
    const p = P1(); if (!n || !OW() || n.state === "bloqueado") return;
    sess.node = n; sess.fusion = false; sess.met = [];
    if (!OW().isLevel(n)) { if (!n.done) runMapEvent(n); return; }
    sess.replay = n.done ? n.id : null;
    const gen = (force) => { const o = OW().genOptions(p, n); if (force) o.force = force; const L = M.generate(o); L._node = n.id; return L; };
    if (p.age !== "kids" || n.done) { if (!sess.L || sess.L._node !== n.id) sess.L = gen(); return startWorld(); }
    const avail = (n.gimmicks || []).filter((g) => M.GIMMICKS[g]);
    sess.force = null; show(""); A.play(M.AGES.kids.music, 4);
    M.Dialog.show(M.Story.chapter(p, avail, (g) => { sess.force = g; }, n, graph && graph.regions[n.region]), () => { S.persist(); sess.L = gen(sess.force); startWorld(); });
  }
  $("map-play").onclick = () => playNode(sess.node);
  // eventos del mapa que no son mundos: mercader de huevos y visita de un amigo
  function finishEvent(n, extra) {
    const p = P1(), res = OW().complete(p, n.id);
    p.worldState = p.worldState || (M.WorldLife ? M.WorldLife.empty() : { bloom: {}, bitter: {}, grumoPop: {}, wildMet: [], events: [] });
    p.worldState.events = (p.worldState.events || []).concat([{ day: p.worldState.day || 0, region: n.region, type: n.event }]).slice(-40);
    S.persist(); openMap();
    const msg = [extra, res.opened.length ? "🗺️ Se abre" + (res.opened.length > 1 ? "n " + res.opened.length + " caminos nuevos" : " un camino nuevo") : ""].filter(Boolean).join(" · ");
    if (msg) toast(msg);
  }
  function runMapEvent(n) {
    const p = P1(), age = p.age; show(""); A.play(M.AGES[age].music, 4);
    if (n.event === "mercader") {
      const cost = 15 + n.region * 5;
      let who = "narr"; if (M.ProcChar) { const cr = M.ProcChar.generate("mercader" + n.seed, { age }); M.ProcChar.register(cr); who = cr.id; }
      let buy = false;
      M.Dialog.show([
        { who, text: age === "baby" ? "¡Hola! ¡Tengo huevitos! 🥚" : "¡Buenas, viajeros! Vendo huevos de Mash salvaje, recién puestos en " + graph.regions[n.region].name + "." },
        { who, text: "Uno por " + cost + " chispas. Tienes " + p.sparks + ". ¿Te llevas uno?", choices: [
          { t: "🥚 ¡Sí! (" + cost + " ⭐)", pick: () => { buy = true; } }, { t: "Hoy no, gracias", pick: () => { buy = false; } }] },
      ], () => {
        if (buy && p.sparks >= cost) {
          p.sparks -= cost;
          const rr = M.rng(p.seed * 3 + n.seed), rar = rr.weighted({ comun: 60, raro: 32, legendario: 8 });
          const cr = M.ProcChar ? M.ProcChar.generate((p.seed * 7919 + n.seed * 31) % 2147483000, { age, rarity: rar, biome: M.BIOMES[n.region % M.BIOMES.length].id }) : null;
          if (!cr) return finishEvent(n);
          addWild(cr); openWildCard(cr, { hatch: true, after: () => finishEvent(n, "🥚 ¡" + cr.name + " se une a tu Mashdex!") });
        } else if (buy) M.Dialog.show([{ who, text: "¡Vaya! No te llegan las chispas. Busca las secretas, que valen por cinco. ¡Hasta otra!" }], () => finishEvent(n));
        else finishEvent(n);
      });
    } else { // visita de un amigo
      const pool = team(p), fr = pool.length ? M.rng(n.seed).pick(pool) : "nube", sec = OW().revealOne(p);
      p.bonds[fr] = (p.bonds[fr] || 0) + 2; p.sparks += 5;
      M.Dialog.show([
        { who: fr, text: M.persona(fr, age).l },
        { who: fr, text: age === "baby" ? "¡Te traigo un regalito! ⭐" : "¡Os traigo cinco chispas y noticias del valle!" },
        { who: fr, text: sec ? "Me han contado que hay un rincón secreto en " + graph.regions[sec.region].name + ". ¡Ya sale en tu mapa! ✨" : "Por ahora todo está tranquilo. Seguid así, que el valle florece con vosotros." },
      ], () => finishEvent(n, sec ? "✨ Rincón secreto revelado" : "💌 +5 chispas"));
    }
  }
  const DKEYS = ["Space", "Enter", "KeyE", "KeyX", "ArrowDown", "KeyS"];
  addEventListener("keydown", (e) => { if (M.Dialog.open && DKEYS.includes(e.code)) { e.preventDefault(); e.stopPropagation(); M.Dialog.next(); } }, true);
  // teclado en el mapa: ← → recorren los lugares, Enter juega
  addEventListener("keydown", (e) => {
    if (!$("map").classList.contains("open") || M.Dialog.open || !view) return;
    if (e.target && e.target.tagName === "INPUT") return;
    if (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyA" || e.code === "KeyD") { const n = view.cycle(e.code === "ArrowLeft" || e.code === "KeyA" ? -1 : 1); if (n) { A.sfx("pop"); selectNode(n); } }
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); if (!$("map-play").disabled) playNode(sess.node); }
  });
  $("dialog").onclick = () => M.Dialog.next();
  $("map-team").onclick = () => openTeam(); $("map-cards").onclick = () => openTeam(); $("map-back").onclick = () => openProfiles();

  // ——— EQUIPO: cartas del valle, Mash salvajes y Mashdex ———
  let teamTab = "todos";
  function openTeam() {
    const p = P1(); show("team"); A.sfx("pop");
    const roster = $("team-roster"); roster.innerHTML = "";
    const wild = wildIds(p);
    const tabs = [["todos", "Todos"], ["valle", "Amigos del valle"], ["salvajes", "🐾 Salvajes (" + wild.length + ")"]];
    $("team-tabs").innerHTML = tabs.map(([k, t]) => `<button class="mini ${teamTab === k ? "on" : ""}" data-t="${k}">${t}</button>`).join("");
    $("team-tabs").querySelectorAll("button").forEach((b) => (b.onclick = () => { teamTab = b.dataset.t; openTeam(); }));
    const ids = teamTab === "salvajes" ? wild : teamTab === "valle" ? ["nube", ...M.RESCUE_ORDER] : ["nube", ...M.RESCUE_ORDER, ...wild];
    ids.forEach((id) => {
      if (!M.CAST[id]) return;
      const got = id === "nube" || p.rescued.includes(id) || wild.includes(id), wrap = document.createElement("div"); wrap.className = "rwrap";
      const cd = M.card(id, p.age, { locked: !got, bond: bondLevel(p, id), dex: wild.indexOf(id) + 1 }); if (p.leader === id) cd.classList.add("is-leader"); if (p.companion === id) cd.classList.add("is-comp");
      wrap.appendChild(cd);
      if (got) { const bt = document.createElement("div"); bt.className = "rbtns";
        bt.innerHTML = `<button class="mini ${p.leader === id ? "on" : ""}">⭐ Líder</button><button class="mini ${p.companion === id ? "on" : ""}">🤝 Compa</button>`;
        bt.children[0].onclick = () => { if (p.companion === id) p.companion = p.leader; p.leader = id; S.persist(); A.sfx("check"); openTeam(); };
        bt.children[1].onclick = () => { if (p.leader === id) return; p.companion = p.companion === id ? null : id; S.persist(); A.sfx("check"); openTeam(); };
        wrap.appendChild(bt); }
      roster.appendChild(wrap);
    });
    if (teamTab === "salvajes" && !wild.length) roster.innerHTML = `<div class="empty">Aún no conoces a ningún Mash salvaje.<br>Búscalos en los mundos (🐾 en el mapa) y acércate a ellos pulsando ${M.TOUCH ? "👆" : "E"} para haceros amigos.</div>`;
    const rar = (k) => wild.filter((id) => M.CAST[id].rarity === k).length;
    $("team-dex").innerHTML = `📖 Mashdex: <b>${1 + p.rescued.length + wild.length}</b> descubiertos · ${p.rescued.length + 1}/17 del valle · ${wild.length} salvajes${rar("raro") ? " · " + rar("raro") + " raros" : ""}${rar("legendario") ? " · " + rar("legendario") + " legendarios ✦" : ""}`;
    $("team-count").textContent = "Tu compañero te acompaña y te presta su poder (V)";
  }
  $("team-close").onclick = () => openMap();

  // ——— MASH SALVAJES: conocer, carta y colección ———
  function addWild(cr) {
    if (!cr || cr.seed === undefined) return null;
    if (M.ProcChar && !M.CAST[cr.id]) M.ProcChar.register(cr);
    sess.profiles.forEach((pp) => { pp.wild = pp.wild || []; if (!pp.wild.includes(cr.seed)) pp.wild.push(cr.seed); });
    S.persist(); return cr.id;
  }
  function onBefriend(cr) {
    if (!cr || cr.seed === undefined) return;
    sess.met = sess.met || []; if (!sess.met.includes(cr.seed)) sess.met.push(cr.seed);
    addWild(cr);
    setTimeout(() => { if (G.state !== "play") return; G.state = "befriend"; openWildCard(cr, { inGame: true }); }, 750);
  }
  function openWildCard(cr, opt = {}) {
    const p = P1(), age = p.age, id = cr.id; A.duck(true); show("wild"); $("banner").classList.remove("show");
    $("wc-title").textContent = opt.hatch ? "¡Ha salido del huevo!" : { baby: "¡Un amiguito nuevo!", kids: "¡Un Mash salvaje quiere ser tu amigo!", young: "Nuevo Mash desbloqueado", adult: "Un Mash salvaje se une a ti" }[age] || "¡Nuevo amigo!";
    const host = $("wc-card"); host.innerHTML = ""; const cd = M.card(id, age, { big: true, dex: wildIds(p).indexOf(id) + 1 }); cd.classList.add("reveal"); host.appendChild(cd);
    setTimeout(() => cd.classList.add("flipped"), 2600);
    const d = M.CAST[id], ab = d.ability && M.ABILITIES[d.ability] ? d.ability : null, RAR = { comun: "común", raro: "raro ✦", legendario: "¡LEGENDARIO! ✦✦" };
    $("wc-info").innerHTML = `${esc(d.kind)} · <b>${RAR[d.rarity] || "común"}</b>${ab ? ` · ${M.ABILITIES[ab].icon} ${esc(M.abilityName(ab, age))}` : ""}<br><small>Ya está en tus cartas: puede ser líder o compañero.</small>`;
    M.speak(M.persona(id, age).l, age); confetti($("wild")); A.sfx("friend");
    const close = (toTeam) => {
      A.duck(false);
      if (toTeam && !sess.fusion && p.leader !== id) { p.companion = id; S.persist(); }
      if (opt.inGame) { show(null); G.state = "play"; if (toTeam && !sess.fusion) G.setCompanion(id); hud(); }
      else if (opt.after) opt.after();
    };
    $("wc-team").onclick = () => close(true); $("wc-go").onclick = () => close(false);
  }

  // ——— JUGAR ———
  function startWorld() {
    const p = P1(); show(null); setAge(p.age);
    sess.profiles.forEach((pp) => { if (!pp.companion && pp.rescued.length) { const c2 = [...pp.rescued].reverse().find((id) => id !== pp.leader); if (c2) pp.companion = c2; } }); S.persist();
    const players = sess.fusion
      ? sess.profiles.map((pp, i) => ({ profile: pp, age: pp.age, leader: i === 0 ? pp.leader : (pp.leader === sess.profiles[0].leader ? (pp.companion || "pompon") : pp.leader), companion: null }))
      : [{ profile: p, age: p.age, leader: p.leader, companion: p.companion }];
    G.start({ L: sess.L, players, fusion: sess.fusion });
    if (M.AGES[sess.L.hardAge].id === "young") M.Young.start(); else M.Young.stop();
    document.body.classList.toggle("fusion", sess.fusion); $("bossbar").classList.remove("show");
    const L = sess.L;
    const regName = graph && graph.regions[L.region] ? graph.regions[L.region].name : L.biome.region;
    showBanner(L.name, sess.fusion ? "Mundo fusión · " + sess.profiles.map((x) => M.AGES[x.age].label).join(" + ") : (sess.node && OW() ? OW().nodeName(sess.node) : "Mundo " + L.index) + " · " + regName, (L.gim || []).map((g) => M.GIMMICKS[g] ? M.GIMMICKS[g].icon + " " + M.GIMMICKS[g].name : "").join("   "));
    hud();
  }

  // ——— HUD ———
  let bannerT;
  function showBanner(name, sub, extra = "") { const b = $("banner"); b.querySelector("small").textContent = sub; b.querySelector("b").textContent = name; b.querySelector("em").textContent = extra;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove("show"), 3600); }
  function slot(key, icon, label, cls = "") { return `<span class="slot ${cls}"><kbd>${key}</kbd>${icon}<i>${esc(label)}</i></span>`; }
  function heroPanel(h, i) {
    const keys = G.fusion ? (i ? ["K", "L", ""] : ["F", "G", ""]) : ["X", "C", "V"];
    const comp = !i && G.comp ? G.comp.def.ability : null, own = h.def.ability, bAb = own || comp;
    const compImg = G.comp ? `<img src="${portrait(G.comp.id)}">` : "";
    let slots = slot(keys[0], "🌀", "Aspirar");
    if (bAb) slots += slot(keys[1], (own ? "" : compImg) + M.ABILITIES[bAb].icon, M.abilityName(bAb, h.age), own ? "" : "cmp");
    if (comp && keys[2] && own) slots += slot(keys[2], compImg + M.ABILITIES[comp].icon, M.abilityName(comp, h.age), "cmp");
    if (h.candy) slots += `<span class="slot candy">${M.CANDIES[h.candy.type].icon}<i>${Math.ceil(h.candy.t)} s</i></span>`;
    return `<div class="hp ${i ? "p2" : ""}"><div class="por"><img src="${portrait(h.id)}"></div>
      <div class="hcol"><div class="mass"><div class="mfill" data-p="${i}" style="width:${Math.round(h.mass * 100)}%"></div><span>🍡 masa</span></div>
      <div class="slots">${slots}</div></div></div>`;
  }
  // ——— cambiar de compañero en cualquier momento ———
  function compRoster() { const p = P1(); return sess.fusion || !p ? [] : team(p).filter((id) => M.CAST[id] && id !== G.heroes[0].id); }
  function pickComp(id) { if (G.state !== "play") return; if (G.setCompanion(id)) { const p = P1(); p.companion = id; S.persist(); } }
  function cycleComp(dir) {
    const list = compRoster(); if (!list.length) return;
    const i = G.comp ? list.indexOf(G.comp.id) : -1;
    pickComp(list[(i + dir + list.length) % list.length]);
  }
  function renderCompBar() {
    const bar = $("comp-bar"), list = compRoster();
    if (list.length < 2) { bar.innerHTML = ""; bar.classList.remove("show"); return; }
    bar.classList.add("show");
    bar.innerHTML = `<span class="cb-k">${M.TOUCH ? "" : "Tab"} ⇄</span>` + list.map((id) => { const ab = M.CAST[id].ability;
      return `<button class="cb ${G.comp && G.comp.id === id ? "on" : ""}" data-id="${id}" title="${esc(M.CAST[id].name)}"><img src="${portrait(id)}"><i>${ab && M.ABILITIES[ab] ? M.ABILITIES[ab].icon : ""}</i></button>`; }).join("");
    bar.querySelectorAll(".cb").forEach((b) => b.onclick = (e) => { e.stopPropagation(); pickComp(b.dataset.id); });
  }
  const btnT = $("btn-T"); if (btnT) btnT.onclick = (e) => { e.preventDefault(); cycleComp(1); };
  function hud() {
    if (!G.heroes.length) return;
    if ($("comp-bar")) renderCompBar(); if (btnT) btnT.style.display = compRoster().length >= 2 ? "" : "none";
    $("hud-left").innerHTML = heroPanel(G.heroes[0], 0); $("hud-p2").innerHTML = G.heroes[1] ? heroPanel(G.heroes[1], 1) : "";
    $("hud-sparks").textContent = G.stats.sparks; $("hud-minis").textContent = G.stats.minis;
    $("btn-C").style.display = G.comp && G.comp.def.ability && G.heroes[0].def.ability ? "" : "none"; $("btn-S").style.display = G.comp ? "" : "none";
    const bAb = G.heroes[0].def.ability || (G.comp && G.comp.def.ability); const bb = $("btn-B"); if (bb) { bb.style.display = bAb ? "" : "none"; bb.textContent = bAb ? M.ABILITIES[bAb].icon : "✨"; }
    const bc = $("btn-C"); if (bc && G.comp && G.comp.def.ability) bc.textContent = M.ABILITIES[G.comp.def.ability].icon;
  }
  G.onEvent = (name, data) => {
    if (name === "hud") hud();
    if (name === "fx") M.Young.say(data);
    if (name === "rescue") openRescue(data);
    if (name === "worldDone") setTimeout(openResults, 900);
    if (name === "banner" && data) showBanner(data.title || "", data.sub || "", data.extra || "");
    if (name === "befriend") onBefriend(data);
    if (name === "boss") { const B = G.boss; $("bossbar").classList.add("show"); $("boss-fill").style.width = Math.max(0, B.hp / B.maxHp * 100) + "%"; }
  };
  M.UI = { frame() {
    if (G.state !== "play") return;
    const hard = M.AGES[G.L.hardAge], tm = $("hud-time");
    if (hard.timer) { const s = G.stats.time; tm.textContent = Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); tm.style.display = ""; } else tm.style.display = "none";
    const cb = $("hud-combo"); if (hard.combo && G.combo.n >= 2) { cb.textContent = "x" + G.combo.n; cb.style.display = ""; } else cb.style.display = "none";
    document.querySelectorAll(".mfill").forEach((el) => { const h = G.heroes[+el.dataset.p]; if (h) { el.style.width = Math.round(h.mass * 100) + "%"; el.classList.toggle("low", h.mass < 0.3); } });
    document.querySelectorAll(".slot.candy i").forEach((el) => { const h = G.heroes[0]; if (h.candy) el.textContent = Math.ceil(h.candy.t) + " s"; });
    $("hud-minis").textContent = G.stats.minis; $("hud-style").textContent = G.stats.style; M.Young.tick();
    if (G.boss && G.boss.state === "gone") $("bossbar").classList.remove("show");
    $("btn-E").classList.toggle("show", !!G.near);
    if (I.g("P")) togglePause();
    if (I.g("TAB")) cycleComp(1);
    if (I.g("TABB")) cycleComp(-1);
    if (I.g("MUTE")) { A.toggleMute(); syncMute(); }
  } };

  // ——— RESCATE ———
  function openRescue(id) {
    const p0 = P1();
    if (p0.age === "kids" && !sess.fusion && M.Story) { G.state = "dialog"; return M.Dialog.show(M.Story.rescue(id, p0), () => openRescueCard(id)); }
    openRescueCard(id);
  }
  function openRescueCard(id) {
    const p = P1(), age = p.age, fresh = sess.profiles.some((pp) => !pp.rescued.includes(id));
    sess.profiles.forEach((pp) => { if (!pp.rescued.includes(id)) pp.rescued.push(id); if (!pp.companion && pp.leader !== id) pp.companion = id; }); S.persist();
    G.state = "rescue"; A.duck(true); show("rescue"); $("banner").classList.remove("show");
    $("res-title").textContent = fresh ? M.T("rescue", age) : "¡Otra vez juntos!";
    const host = $("res-card"); host.innerHTML = ""; const cd = M.card(id, age, { video: true, big: true, bond: bondLevel(p, id) }); cd.classList.add("reveal"); host.appendChild(cd);
    setTimeout(() => cd.classList.add("flipped"), 2800);
    const ab = M.CAST[id].ability;
    $("res-info").innerHTML = ab ? `Te acompaña y te presta su poder: ${M.ABILITIES[ab].icon} <b>${esc(M.abilityName(ab, age))}</b> — ${esc(M.abilityDesc(ab, age))}` : "";
    M.speak(M.persona(id, age).l, age); confetti($("rescue"));
    $("res-team").onclick = () => { if (!sess.fusion) { p.companion = id; S.persist(); } closeRescue(true, id); };
    $("res-go").onclick = () => closeRescue(false);
  }
  function closeRescue(toTeam, id) {
    show(null); A.duck(false); G.state = "play";
    const at = G.L.cage || G.boss || { x: G.heroes[0].x, y: G.heroes[0].y };
    if (toTeam && !sess.fusion) { G.comp = { id, def: M.CAST[id], x: at.x, y: at.y0 || at.y, face: 1, t: 0, trail: [], hop: 0.5, soft: { jx: 0, jv: 0, sq: 0, sqv: 0, walk: 0, prevVx: 0 }, vx: 0 };
      M.say(G.heroes[0].x, G.heroes[0].y - 130, "¡" + M.CAST[id].name + " se une!", "#ff6f91", true); }
    M.say(G.L.exit.x, G.L.exit.y - 260, "¡El portal se ha abierto! →", "#9c6bff", true); hud();
  }

  // ——— RESULTADOS ———
  const ema = (a, b, k = 0.45) => a * (1 - k) + b * k;
  // memoria evolutiva: tras cada mundo la región limpia florece y las abandonadas se amargan (lo lee el generador)
  const regName = (i) => (graph && graph.regions[i] ? graph.regions[i].name : M.BIOMES[i % M.BIOMES.length].region);
  function moodOf(p, i) { const ws = p.worldState || {}; return { bloom: (ws.bloom && ws.bloom[i]) || 0, bitter: (ws.bitter && ws.bitter[i]) || 0 }; }
  function evolveWorld(p, L, st) {
    const region = L.region || 0, before = moodOf(p, region);
    const cleared = M.clamp(st.stomps / Math.max(1, (L.enemies || []).length), 0, 1);
    let evs = [];
    try { if (M.Events && M.Events.summary) evs = (M.Events.summary(G).events || []).map((e) => (typeof e === "string" ? e : e && e.type)).filter(Boolean); } catch (e) {}
    evs = evs.concat([L.nodeType, sess.node && sess.node.event].filter((x) => typeof x === "string" && x !== "normal"));
    const grumosLeft = (L.enemies || []).filter((e) => e.alive).length;
    const wildMet = (sess.met || []).concat((L.wild || []).filter((w) => w.met).map((w) => w.seed)).filter((v, i, a) => v !== undefined && a.indexOf(v) === i);
    const info = { region, cleared, rescued: !!G.rescued, wildMet, events: evs, nRegions: graph ? graph.regions.length : 4, grumosLeft };
    let news = [];
    if (M.WorldLife) { p.worldState = p.worldState || M.WorldLife.empty(); news = M.WorldLife.afterWorld(p.worldState, info) || []; }
    else { // respaldo mínimo si gen.js no trae M.WorldLife
      const ws = p.worldState = p.worldState || { bloom: {}, bitter: {}, grumoPop: {}, wildMet: [], events: [] };
      ws.bloom[region] = M.clamp((ws.bloom[region] || 0) + 0.08 + cleared * 0.2, 0, 1); ws.bitter[region] = M.clamp((ws.bitter[region] || 0) - 0.1 - cleared * 0.2, 0, 1);
      ws.grumoPop[region] = Math.round((ws.grumoPop[region] || 20) * (1 - cleared * 0.6));
      info.wildMet.forEach((s) => { if (!ws.wildMet.includes(s)) ws.wildMet.push(s); }); ws.grumoPop[region] = grumosLeft;
      ws.events = ws.events.concat(evs.map((t) => ({ region, type: t }))).slice(-40);
    }
    const after = moodOf(p, region), out = [], pc = (v) => Math.round(v * 100) + "%";
    if (after.bloom > before.bloom + 0.005) out.push({ icon: "🌸", text: regName(region) + " florece (" + pc(after.bloom) + ")" });
    if (after.bitter < before.bitter - 0.005) out.push({ icon: "🌬️", text: "El amargor de " + regName(region) + " baja a " + pc(after.bitter) });
    if ((sess.met || []).length) out.push({ icon: "🐾", text: sess.met.length + (sess.met.length > 1 ? " Mash salvajes cuentan" : " Mash salvaje cuenta") + " por el valle que sois amigos" });
    news.forEach((x) => out.push({ icon: x.icon || "🌀", text: x.text }));
    return out;
  }
  function openResults() {
    G.state = "results"; show("results"); $("banner").classList.remove("show");
    const st = G.stats, L = G.L, age = P1().age, ratio = st.sparks / Math.max(1, L.sparkTotal + L.secrets * 4);
    const stars = 1 + (ratio > 0.55 ? 1 : 0) + (st.hits + st.falls <= 2 ? 1 : 0);
    const changes = []; let opened = [], found = [];
    sess.profiles.forEach((p, pi) => {
      const ch = evolveWorld(p, L, st); if (!pi) changes.push(...ch);
      p.secretSparks = (p.secretSparks || 0) + (st.big || 0);
      if (!sess.replay) { const k = p.skill;
        k.falls = ema(k.falls, st.falls); k.hits = ema(k.hits, st.hits); k.stomps = ema(k.stomps, st.stomps); k.ability = ema(k.ability, st.ability); k.eats = ema(k.eats, st.eats); k.sparks = ema(k.sparks, ratio); k.worlds++;
        p.history.push({ world: p.world, node: !sess.fusion && sess.node ? sess.node.id : null, region: L.region, friend: L.cage ? L.cage.friend : L.bossData ? L.bossData.friend : null, name: L.name, stars, sparks: st.sparks, time: Math.round(st.time) });
        p.recent = [...(p.recent || []), L.main].slice(-4); p.world++;
        if (!sess.fusion && sess.node && OW() && !pi) opened = OW().complete(p, sess.node.id).opened; }
      if (!sess.fusion && OW() && !pi) found = OW().checkSecrets(p);
      p.sparks += st.sparks;
      [G.heroes[0] && G.heroes[0].id, G.comp && G.comp.id].forEach((id) => { if (id) p.bonds[id] = (p.bonds[id] || 0) + 1; });
    });
    S.persist();
    $("r-title").textContent = M.T("worldDone", age);
    $("r-rank").innerHTML = M.AGES[L.hardAge].id === "young" ? M.Young.rank(st, L) + `<small>estilo ${st.style}</small>` : "";
    M.Young.stop(); $("r-name").textContent = L.name + " · " + L.gim.map((g) => M.GIMMICKS[g].icon).join(" ");
    $("r-stars").innerHTML = [1, 2, 3].map((k) => `<i class="${k <= stars ? "on" : ""}" style="animation-delay:${0.2 + k * 0.2}s"></i>`).join("");
    const rows = [["🍡 Mini mash", st.minis], ["⭐ Chispas", st.sparks], ["🌀 Grumos ablandados", st.stomps], ["✨ Poderes", Math.round(st.ability)], ["🫧 Caídas", st.falls]];
    if (M.AGES[L.hardAge].timer) rows.unshift(["⏱️ Tiempo", Math.floor(st.time / 60) + ":" + String(Math.floor(st.time % 60)).padStart(2, "0")]);
    if (G.combo.best > 1) rows.push(["🔥 Mejor combo", "x" + G.combo.best]);
    $("r-stats").innerHTML = rows.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("");
    if (opened.length) changes.push({ icon: "🗺️", text: opened.length > 1 ? "Se abren " + opened.length + " caminos nuevos en el mapa" : "Se abre un camino nuevo: " + OW().nodeName(opened[0]) });
    if (found.length) changes.push({ icon: "✨", text: "¡Has descubierto un rincón secreto!" });
    $("r-world").innerHTML = changes.length ? `<h3>${age === "baby" ? "¡El valle cambia!" : "El valle ha cambiado:"}</h3><ul>${changes.map((c) => `<li>${c.icon} ${esc(c.text)}</li>`).join("")}</ul>` : "";
    // próximo paso: en fusión, el mundo siguiente de siempre; en solitario, el siguiente lugar del mapa
    let nextL = null; sess.nextNode = null;
    if (sess.fusion || !OW()) nextL = buildWorld(P1(), sess.fusion ? sess.profiles[1] : null);
    else { graph = OW().build(P1()); const cur = sess.node && graph.byId[sess.node.id]; const nn = nextFrom(graph, cur) || graph.avail.map((id) => graph.byId[id]).find((x) => OW().isLevel(x));
      sess.nextNode = nn || null; if (nn && OW().isLevel(nn)) { try { nextL = M.generate(OW().genOptions(P1(), nn)); nextL._node = nn.id; } catch (e) { nextL = null; } } }
    $("r-next").textContent = sess.fusion ? "Siguiente mundo →" : sess.nextNode ? (OW().isLevel(sess.nextNode) ? "Seguir el camino →" : "Ir a " + OW().nodeName(sess.nextNode) + " →") : "Ver el mapa →";
    $("r-adapt-title").textContent = M.T("adaptTitle", age);
    $("r-adapt").innerHTML = nextL ? nextL.notes.map((n) => `<li>${n.icon} <b>${esc(n.k)}</b> — ${esc(n.v)}</li>`).join("") + `<li>🗺️ <b>Próximo:</b> ${nextL.boss ? "👑 " : ""}${esc(nextL.name)}</li>`
      : sess.nextNode ? `<li>${OW().nodeIcon(sess.nextNode)} <b>Próximo:</b> ${esc(OW().nodeName(sess.nextNode))}</li>` : `<li>🗺️ Elige tu próximo destino en el mapa</li>`;
    sess.nextL = nextL;
    confetti($("results"));
  }
  $("r-next").onclick = () => {
    A.sfx("pop");
    if (sess.fusion) { sess.L = buildWorld(sess.profiles[0], sess.profiles[1]); sess.replay = null; return startWorld(); }
    const n = sess.nextNode; if (!n) return openMap();
    if (!OW().isLevel(n)) return openMap(n.id);
    sess.L = sess.nextL && sess.nextL._node === n.id ? sess.nextL : null; playNode(n);
  };
  $("r-map").onclick = () => { A.sfx("pop"); document.body.classList.remove("fusion"); sess.fusion ? openTitle() : openMap(); };

  // ——— PAUSA ———
  function togglePause() {
    if (G.state === "play") { G.state = "pause"; show("pause"); A.duck(true); renderPauseHelp(); }
    else if (G.state === "pause") { G.state = "play"; show(null); A.duck(false); }
  }
  function renderPauseHelp() {
    $("pause-keys").innerHTML = sess.fusion
      ? `<div><b>Jugador 1</b><span>A D · W saltar · F aspirar · G poder · S interactuar</span></div><div><b>Jugador 2</b><span>← → · ↑ saltar · K aspirar · L poder · ↓ interactuar</span></div>`
      : M.CONTROLS && M.CONTROLS.length ? M.CONTROLS.map((c) => `<div><b>${esc(c.action)}</b><span>${esc(c.keys)}</span></div>`).join("") + `<div><b>La masa</b><span>Los poderes y los golpes gastan masa. Aspira grumos y mini mash para recuperarla.</span></div>`
      : `<div><b>Moverse / saltar</b><span>← → · Espacio (doble salto, y salto en pared)</span></div><div><b>Aspirar grumos (mantener)</b><span>X</span></div>
         <div><b>Poder del líder</b><span>C (si tu líder no tiene, el del compañero)</span></div><div><b>Poder del compañero</b><span>V</span></div><div><b>Caramelos</b><span>Un poder extra y automático durante unos segundos</span></div><div><b>Cambiar de compañero</b><span>Tab / Shift+Tab (o toca su cara abajo)</span></div><div><b>Cambiar líder ↔ compañero</b><span>Shift izquierdo</span></div><div><b>Interactuar</b><span>↓ / E</span></div>
         <div><b>La masa</b><span>Los poderes y los golpes gastan masa. Aspira grumos y mini mash para recuperarla.</span></div>`;
  }
  $("btn-pause").onclick = togglePause; $("p-resume").onclick = togglePause;
  $("p-map").onclick = () => { G.state = "idle"; M.Young.stop(); A.duck(false); document.body.classList.remove("fusion"); sess.fusion ? openTitle() : openMap(); };
  $("p-restart").onclick = () => { A.duck(false); startWorld(); };
  const syncMute = () => $("btn-mute").classList.toggle("off", A.muted);
  $("btn-mute").onclick = () => { A.init(); A.toggleMute(); syncMute(); }; syncMute();

  // ——— FUSIÓN ———
  const fz = { a: null, b: null }, guests = {};
  function openFusion() {
    show("fusion"); setAge("kids"); menuMusic("kids");
    ["a", "b"].forEach((slot) => { const host = $("fz-" + slot); host.innerHTML = "";
      [...S.profiles().map((p) => ({ id: p.id, label: `${M.AGES[p.age].icon} ${p.name}`, sub: `${M.AGES[p.age].label} · mundo ${p.world}` })),
       ...M.AGE_ORDER.map((a) => ({ id: "guest:" + a, label: `${M.AGES[a].icon} Invitado ${M.AGES[a].label}`, sub: M.AGES[a].range }))].forEach((o) => {
        const b = document.createElement("button"); b.className = "fzopt" + (fz[slot] === o.id ? " on" : ""); b.innerHTML = `<b>${esc(o.label)}</b><small>${esc(o.sub)}</small>`;
        b.onclick = () => { fz[slot] = o.id; A.sfx("pop"); openFusion(); }; host.appendChild(b); }); });
    const pa = fz.a && resolve(fz.a), pb = fz.b && resolve(fz.b);
    $("fz-go").disabled = !(pa && pb && pa !== pb);
    $("fz-rules").innerHTML = pa && pb ? fusionRules(pa.age, pb.age) : "Elige un perfil para cada jugador.";
  }
  const resolve = (id) => id.startsWith("guest:") ? (guests[id] || (guests[id] = Object.assign(S.guest(id.slice(6)), { recent: [] }))) : S.get(id);
  function fusionRules(a, b) {
    const ia = M.AGE_ORDER.indexOf(a), ib = M.AGE_ORDER.indexOf(b), soft = ia < ib ? a : b, hard = ia < ib ? b : a;
    return `<b>${M.AGES[a].label} + ${M.AGES[b].label}:</b><ul><li>El camino principal sigue las reglas de <b>${M.AGES[soft].label}</b>: nadie se queda atascado.</li>
      <li>Retos, combos, secretos y música: <b>${M.AGES[hard].label}</b>.</li><li>Cada jugador conserva su masa y sus reglas${M.AGES[soft].massFloor ? " (el de " + M.AGES[soft].label + " nunca se derrite)" : ""}.</li>
      <li>Si alguien se queda atrás, viaja en burbuja.</li><li>El amigo rescatado se une a los dos.</li></ul>`;
  }
  $("fz-go").onclick = () => { const pa = resolve(fz.a), pb = resolve(fz.b); if (pa === pb) return; sess.profiles = [pa, pb]; loadWild(pa); loadWild(pb); sess.fusion = true; sess.replay = null; sess.node = null; sess.L = buildWorld(pa, pb); startWorld(); };
  $("fz-back").onclick = openTitle;

  function confirmBox(msg, ok) { show("confirm"); $("cf-msg").innerHTML = msg; $("cf-yes").onclick = () => ok(); $("cf-no").onclick = () => openProfiles(); }
  function confetti(host) { let box = host.querySelector(".confetti"); if (!box) { box = document.createElement("div"); box.className = "confetti"; host.appendChild(box); } box.innerHTML = "";
    const cols = ["#ff9fb6", "#ffd98e", "#9ff0d4", "#b9a3ff", "#9fd9ff"];
    for (let i = 0; i < 60; i++) { const s = document.createElement("i"); s.style.left = M.rand(10, 90) + "%"; s.style.background = cols[i % 5]; s.style.setProperty("--dx", M.rand(-300, 300) + "px"); s.style.setProperty("--dy", M.rand(-420, -160) + "px"); s.style.setProperty("--r", M.rand(-720, 720) + "deg"); s.style.animationDelay = M.rand(0, 0.15) + "s"; box.appendChild(s); } }
  // ——— joystick flotante: aparece bajo el pulgar, es analógico y te sigue si te sales del círculo ———
  (function joystick() {
    const zone = $("stick-zone"), stick = $("stick"), knob = $("knob"); if (!zone) return;
    const R = 58; let id = null, bx = 0, by = 0, down = false;
    const place = () => { stick.style.left = bx + "px"; stick.style.top = by + "px"; };
    function release() {
      id = null; stick.classList.remove("on"); knob.style.transform = ""; stick.style.left = ""; stick.style.top = "";
      I.players[0].axis = 0; I.touch(0, "L", false); I.touch(0, "R", false); I.touch(0, "D", false);
    }
    function move(e) {
      let dx = e.clientX - bx, dy = e.clientY - by; const d = Math.hypot(dx, dy);
      if (d > R) { bx = e.clientX - dx / d * R; by = e.clientY - dy / d * R; place(); dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      // analógico: zona muerta pequeña; poco = caminar, mucho = correr
      const dead = 0.16, ax = dx / R, mag = Math.max(0, (Math.abs(ax) - dead) / (1 - dead));
      I.players[0].axis = mag > 0 ? Math.sign(ax) * Math.min(1, 0.35 + mag * 0.9) : 0;
      I.touch(0, "L", ax < -dead); I.touch(0, "R", ax > dead); I.touch(0, "D", dy > R * 0.5);
      if (dy > R * 0.75 && Math.abs(dx) < R * 0.6 && !down) { down = true; I.touch(0, "E", true); I.touch(0, "E", false); } else if (dy < R * 0.4) down = false;
    }
    zone.addEventListener("pointerdown", (e) => {
      e.preventDefault(); A.init(); if (id !== null) return;
      id = e.pointerId; try { zone.setPointerCapture(id); } catch (err) {}
      bx = e.clientX; by = e.clientY; place(); stick.classList.add("on"); move(e);
    });
    zone.addEventListener("pointermove", (e) => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
    const end = (e) => { if (e.pointerId === id) release(); };
    zone.addEventListener("pointerup", end); zone.addEventListener("pointercancel", end); zone.addEventListener("lostpointercapture", end);
    addEventListener("blur", () => { if (id !== null) release(); });
  })();
  document.querySelectorAll("[data-key]").forEach((b) => { const k = b.dataset.key;
    const on = (e) => { e.preventDefault(); A.init(); I.touch(0, k, true); b.classList.add("down"); }, off = (e) => { e.preventDefault(); I.touch(0, k, false); b.classList.remove("down"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off); });

  // ——— arranque ———
  M.load((p) => { $("load-bar").style.width = Math.round(p * 100) + "%"; }).then(() => {
    G.attract(M.generate({ seed: 11, index: 6, age: "kids", owned: ["fuego", "volar"], friend: "gluglu", skill: S.guest("kids").skill, visitors: ["pompon"] }));
    $("t-parade").innerHTML = ["nube", ...M.RESCUE_ORDER].map((id, i) => `<img src="${portrait(id)}" style="--i:${i};--h:${10 + ((i * 7) % 5) * 1.5}vh">`).join("");
    openTitle(); G.begin();
  });
  document.addEventListener("pointerdown", () => { A.init(); if (!A._menuStarted && $("title").classList.contains("open")) { A._menuStarted = true; menuMusic("kids"); } }, { once: true });
})();
