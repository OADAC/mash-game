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
  const screens = ["loading", "title", "profiles", "map", "team", "intro", "rescue", "results", "pause", "fusion", "confirm"];
  function show(id) { screens.forEach((s) => $(s) && $(s).classList.toggle("open", s === id)); document.body.classList.toggle("playing", id === null); }
  function setAge(age) {
    M.AGE_ORDER.forEach((a) => document.body.classList.remove("age-" + a)); document.body.classList.add("age-" + age);
    const AG = M.AGES[age]; M.gameCanvas.style.filter = AG.grade === "none" ? "" : AG.grade; $("grain").style.opacity = AG.grain;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const portrait = (id) => id === "nube" && M.nubePortrait ? M.nubePortrait() : `assets/chars/${id}.webp`;
  M.portrait = portrait;
  M.speak = function (text, age) {
    if (age !== "baby" || !S.data.voice || !window.speechSynthesis) return;
    try { const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s¡!¿?,.]/gu, "")); u.lang = "es-ES"; u.rate = 0.95; u.pitch = 1.35; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  };
  const menuMusic = (age) => { A.init(); A.play(M.AGES[age || "kids"].music, 4); };

  // ——— sesión ———
  const sess = { profiles: [], fusion: false, L: null };
  const P1 = () => sess.profiles[0];
  const owned = (p) => [...new Set(p.rescued.map((id) => M.CAST[id].ability).filter(Boolean))];
  const bondLevel = (p, id) => Math.min(5, Math.floor((p.bonds[id] || 0) / 2));
  const nextFriend = (p) => M.RESCUE_ORDER.find((id) => !p.rescued.includes(id)) || M.rng(p.world).pick(p.rescued);
  function buildWorld(p, p2, world, force) {
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
    const d = M.CAST[id], per = M.persona(id, age), mat = M.MATERIALS[d.mat], num = M.CAST_ORDER.indexOf(id), ab = d.ability, bond = opt.bond || 0;
    const el = document.createElement("div");
    el.className = "card3d" + (opt.locked ? " locked" : "") + (opt.big ? " big" : ""); el.dataset.id = id;
    const art = opt.video && !opt.locked && id !== "nube" ? `<video src="${window.MANIFEST.vid[id]}" poster="${portrait(id)}" muted loop playsinline autoplay></video>` : `<img src="${portrait(id)}" alt="">`;
    const abTxt = ab ? M.ABILITIES[ab].icon + " " + esc(M.abilityName(ab, age)) : "🌀 Aspirar";
    el.innerHTML = `<div class="card-inner">
      <div class="face front" style="--mat:${mat.color}"><div class="holo"></div>
        <div class="c-top"><span>#${String(num).padStart(2, "0")}</span><span class="chip">${esc(mat.label)}</span></div>
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
  function enterProfile() { const p = P1(); setAge(p.age); if (!p.introSeen) return openIntro(p); home(); }
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

  // ——— MAPA ———
  function openMap() {
    const p = P1(); setAge(p.age); show("map"); sess.fusion = false; menuMusic(p.age);
    const region = Math.floor((p.world - 1) / 4) % 4;
    $("map-taller").style.display = p.age === "baby" ? "" : "none";
    $("map-who").innerHTML = `${M.AGES[p.age].icon} <b>${esc(p.name)}</b> · ${M.AGES[p.age].label}`;
    $("map-region").textContent = "Región " + (region + 1) + " · " + M.BIOMES[region].region;
    const path = $("map-path"); path.innerHTML = "";
    const total = Math.max(4, Math.ceil((p.world + 1) / 4) * 4);
    for (let w = 1; w <= total; w++) {
      const h = p.history.find((x) => x.world === w), cur = w === p.world, locked = w > p.world, bi = M.BIOMES[Math.floor((w - 1) / 4) % 4], boss = w % 4 === 0;
      const n = document.createElement("div");
      n.className = "node" + (h ? " done" : "") + (cur ? " cur" : "") + (locked ? " locked" : "") + (boss ? " boss" : "");
      n.style.setProperty("--bc", bi.body); n.style.setProperty("--off", (Math.sin(w * 1.7) * 26).toFixed(0) + "px");
      n.innerHTML = `<div class="nb">${h ? `<img src="${portrait(h.friend)}">` : cur ? `<span>▶</span>` : `<span>${boss ? "👑" : "?"}</span>`}</div>
        <b>Mundo ${w}</b><small>${h ? esc(h.name) : boss ? "Grumo Mayor" : cur ? "¡Siguiente!" : "Sin descubrir"}</small>${h ? `<em>${"★".repeat(h.stars)}${"☆".repeat(3 - h.stars)}</em>` : ""}`;
      if (h) n.onclick = () => { A.sfx("pop"); sess.L = buildWorld(p, null, w); sess.replay = w; startWorld(); };
      if (w % 4 === 1 && w > 1) { const sep = document.createElement("div"); sep.className = "regsep"; sep.textContent = bi.region; path.appendChild(sep); }
      path.appendChild(n);
    }
    setTimeout(() => { const cn = path.querySelector(".cur"); cn && cn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }, 50);
    sess.L = buildWorld(p); sess.replay = null;
    const L = sess.L, next = L.cage ? L.cage.friend : L.bossData.friend;
    $("map-next").innerHTML = `<div class="mn-head"><span class="chip" style="background:${L.biome.body}">${L.boss ? "👑 " : ""}${esc(L.name)}</span><small>${L.tod === "night" ? "🌙 noche" : L.tod === "dusk" ? "🌅 atardecer" : "☀️ día"} · semilla ${p.seed}-${p.world}</small></div>
      <div class="mn-body"><img class="sil" src="${portrait(next)}"><div><b>${L.boss ? "Un Grumo Mayor guarda a alguien…" : "Alguien espera en una burbuja…"}</b><p>${esc(M.T("adaptTitle", p.age))}:</p>
      <ul>${L.notes.map((n) => `<li>${n.icon} <b>${esc(n.k)}</b> — ${esc(n.v)}</li>`).join("")}</ul></div></div>`;
    renderTeamMini(); G.attract(L);
  }
  function renderTeamMini() { const p = P1(); const ab = (id) => M.CAST[id].ability ? M.ABILITIES[M.CAST[id].ability].icon : "🌀";
    $("map-team").innerHTML = `<img src="${portrait(p.leader)}"><span class="ti">${ab(p.leader)}</span>${p.companion ? `<img class="c2" src="${portrait(p.companion)}"><span class="ti">${ab(p.companion)}</span>` : ""}<span class="tl">Equipo →</span>`; }
  // Kids: cada mundo empieza con un capítulo del cuento y una decisión que cambia el camino
  $("map-play").onclick = () => {
    sess.replay = null; const p = P1();
    if (p.age !== "kids") return startWorld();
    const avail = Object.keys(M.GIMMICKS).filter((g) => M.GIMMICKS[g].from <= p.world && !(p.recent || []).slice(-2).includes(g));
    const r = M.rng(p.seed * 7 + p.world); avail.sort(() => r() - 0.5);
    sess.force = null; show(""); A.play(M.AGES.kids.music, 4);
    M.Dialog.show(M.Story.chapter(p, avail, (g) => { sess.force = g; }), () => { S.persist(); sess.L = buildWorld(p, null, null, sess.force); startWorld(); });
  };
  const DKEYS = ["Space", "Enter", "KeyE", "KeyX", "ArrowDown", "KeyS"];
  addEventListener("keydown", (e) => { if (M.Dialog.open && DKEYS.includes(e.code)) { e.preventDefault(); e.stopPropagation(); M.Dialog.next(); } }, true);
  $("dialog").onclick = () => M.Dialog.next();
  $("map-team").onclick = () => openTeam(); $("map-cards").onclick = () => openTeam(); $("map-back").onclick = () => openProfiles();

  // ——— EQUIPO ———
  function openTeam() {
    const p = P1(); show("team"); A.sfx("pop");
    const roster = $("team-roster"); roster.innerHTML = "";
    ["nube", ...M.RESCUE_ORDER].forEach((id) => {
      const got = id === "nube" || p.rescued.includes(id), wrap = document.createElement("div"); wrap.className = "rwrap";
      const cd = M.card(id, p.age, { locked: !got, bond: bondLevel(p, id) }); if (p.leader === id) cd.classList.add("is-leader"); if (p.companion === id) cd.classList.add("is-comp");
      wrap.appendChild(cd);
      if (got) { const bt = document.createElement("div"); bt.className = "rbtns";
        bt.innerHTML = `<button class="mini ${p.leader === id ? "on" : ""}">⭐ Líder</button><button class="mini ${p.companion === id ? "on" : ""}">🤝 Compa</button>`;
        bt.children[0].onclick = () => { if (p.companion === id) p.companion = p.leader; p.leader = id; S.persist(); A.sfx("check"); openTeam(); };
        bt.children[1].onclick = () => { if (p.leader === id) return; p.companion = p.companion === id ? null : id; S.persist(); A.sfx("check"); openTeam(); };
        wrap.appendChild(bt); }
      roster.appendChild(wrap);
    });
    $("team-count").textContent = `${p.rescued.length + 1}/17 cartas · tu compañero te acompaña y te presta su poder (C/V)`;
  }
  $("team-close").onclick = () => openMap();

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
    showBanner(L.name, sess.fusion ? "Mundo fusión · " + sess.profiles.map((x) => M.AGES[x.age].label).join(" + ") : "Mundo " + L.index + " · " + L.biome.region, L.gim.map((g) => M.GIMMICKS[g].icon + " " + M.GIMMICKS[g].name).join("   "));
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
  function compRoster() { const p = P1(); return sess.fusion || !p ? [] : p.rescued.filter((id) => id !== G.heroes[0].id); }
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
      return `<button class="cb ${G.comp && G.comp.id === id ? "on" : ""}" data-id="${id}" title="${esc(M.CAST[id].name)}"><img src="${portrait(id)}"><i>${ab ? M.ABILITIES[ab].icon : ""}</i></button>`; }).join("");
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
  function openResults() {
    G.state = "results"; show("results"); $("banner").classList.remove("show");
    const st = G.stats, L = G.L, age = P1().age, ratio = st.sparks / Math.max(1, L.sparkTotal + L.secrets * 4);
    const stars = 1 + (ratio > 0.55 ? 1 : 0) + (st.hits + st.falls <= 2 ? 1 : 0);
    sess.profiles.forEach((p) => {
      if (!sess.replay) { const k = p.skill;
        k.falls = ema(k.falls, st.falls); k.hits = ema(k.hits, st.hits); k.stomps = ema(k.stomps, st.stomps); k.ability = ema(k.ability, st.ability); k.eats = ema(k.eats, st.eats); k.sparks = ema(k.sparks, ratio); k.worlds++;
        p.history.push({ world: p.world, friend: L.cage ? L.cage.friend : L.bossData.friend, name: L.name, stars, sparks: st.sparks, time: Math.round(st.time) });
        p.recent = [...(p.recent || []), L.main].slice(-4); p.world++; }
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
    const nextL = buildWorld(P1(), sess.fusion ? sess.profiles[1] : null);
    $("r-adapt-title").textContent = M.T("adaptTitle", age);
    $("r-adapt").innerHTML = nextL.notes.map((n) => `<li>${n.icon} <b>${esc(n.k)}</b> — ${esc(n.v)}</li>`).join("") + `<li>🗺️ <b>Próximo:</b> ${nextL.boss ? "👑 " : ""}${esc(nextL.name)}</li>`;
    confetti($("results"));
  }
  $("r-next").onclick = () => { A.sfx("pop"); sess.L = sess.fusion ? buildWorld(sess.profiles[0], sess.profiles[1]) : buildWorld(P1()); sess.replay = null; startWorld(); };
  $("r-map").onclick = () => { A.sfx("pop"); document.body.classList.remove("fusion"); sess.fusion ? openTitle() : openMap(); };

  // ——— PAUSA ———
  function togglePause() {
    if (G.state === "play") { G.state = "pause"; show("pause"); A.duck(true); renderPauseHelp(); }
    else if (G.state === "pause") { G.state = "play"; show(null); A.duck(false); }
  }
  function renderPauseHelp() {
    $("pause-keys").innerHTML = sess.fusion
      ? `<div><b>Jugador 1</b><span>A D · W saltar · F aspirar · G poder · S interactuar</span></div><div><b>Jugador 2</b><span>← → · ↑ saltar · K aspirar · L poder · ↓ interactuar</span></div>`
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
  $("fz-go").onclick = () => { const pa = resolve(fz.a), pb = resolve(fz.b); if (pa === pb) return; sess.profiles = [pa, pb]; sess.fusion = true; sess.replay = null; sess.L = buildWorld(pa, pb); startWorld(); };
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
      I.players[0].axis = 0; I.touch(0, "L", false); I.touch(0, "R", false);
    }
    function move(e) {
      let dx = e.clientX - bx, dy = e.clientY - by; const d = Math.hypot(dx, dy);
      if (d > R) { bx = e.clientX - dx / d * R; by = e.clientY - dy / d * R; place(); dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      // analógico: zona muerta pequeña; poco = caminar, mucho = correr
      const dead = 0.16, ax = dx / R, mag = Math.max(0, (Math.abs(ax) - dead) / (1 - dead));
      I.players[0].axis = mag > 0 ? Math.sign(ax) * Math.min(1, 0.35 + mag * 0.9) : 0;
      I.touch(0, "L", ax < -dead); I.touch(0, "R", ax > dead);
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
