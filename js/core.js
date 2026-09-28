// Núcleo: utilidades, entrada (1–2 jugadores: teclado, mando, táctil) y guardado de perfiles.
window.M = window.M || {};

M.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
M.lerp = (a, b, t) => a + (b - a) * t;
M.rand = (a, b) => a + Math.random() * (b - a);
M.rng = function (seed) {
  seed = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  const f = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  f.range = (a, b) => a + f() * (b - a);
  f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.weighted = (obj) => { let t = 0; for (const k in obj) t += Math.max(0, obj[k]); let r = f() * t; for (const k in obj) { r -= Math.max(0, obj[k]); if (r <= 0) return k; } return Object.keys(obj)[0]; };
  return f;
};
M.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
M.canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
M.$ = (id) => document.getElementById(id);

// ——— ENTRADA ———
// Cada jugador tiene: L R J (saltar) A (habilidad) B (habilidad del compañero) E (interactuar) S (cambiar líder)
M.Input = (() => {
  const players = [mk(), mk()];
  function mk() { return { held: {}, hit: {} }; }
  // Juego en solitario: todas las teclas controlan al jugador 1.
  // Modo fusión: set A (WASD) → jugador 1, set B (flechas) → jugador 2.
  // A = aspirar (mantener) · B = poder del líder · C = poder del compañero · S = cambiar líder · E = interactuar
  const SET_A = { KeyA: "L", KeyD: "R", KeyW: "J", Space: "J", KeyS: "E", KeyE: "E", KeyF: "A", KeyG: "B", KeyQ: "C", KeyR: "S" };
  const SET_B = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "J", ArrowDown: "E", KeyK: "A", KeyL: "B", KeyJ: "C", KeyX: "A", KeyC: "B", KeyV: "C", KeyZ: "J", ShiftLeft: "S", Enter: "E", Numpad0: "A" };
  let fusion = false;
  const route = (code) => {
    if (SET_A[code]) return [fusion ? 0 : 0, SET_A[code]];
    if (SET_B[code]) return [fusion ? 1 : 0, SET_B[code]];
    return null;
  };
  const global = {}; // teclas globales (pausa, álbum, sonido)
  addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") global.P = true;
    if (e.code === "Tab") global[e.shiftKey ? "TABB" : "TAB"] = true;
    if (e.code === "KeyM") global.MUTE = true;
    const r = route(e.code); if (!r) return;
    const p = players[r[0]];
    if (!p.held[r[1]]) p.hit[r[1]] = true;
    p.held[r[1]] = true;
    M.Audio && M.Audio.init();
  });
  addEventListener("keyup", (e) => { const r = route(e.code); if (r) players[r[0]].held[r[1]] = false; });
  addEventListener("blur", () => players.forEach((p) => (p.held = {})));

  // mandos: el mando i controla al jugador i (en solitario, cualquiera controla al 1)
  const padPrev = [{}, {}];
  function pollPads() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    pads.slice(0, 2).forEach((gp, i) => {
      const pi = fusion ? i : 0, p = players[pi];
      const ax = gp.axes[0] || 0, b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      const st = { L: ax < -0.35 || b(14), R: ax > 0.35 || b(15), J: b(0), A: b(2) || b(7), B: b(1) || b(6), C: b(3), E: b(5), S: b(4) };
      for (const k in st) {
        if (st[k] && !padPrev[i][k]) { p.hit[k] = true; M.Audio && M.Audio.init(); }
        if (st[k] !== padPrev[i][k]) p.held[k] = st[k];
      }
      if (b(9) && !padPrev[i].START) global.P = true;
      if (b(8) && !padPrev[i].SEL) global.TAB = true;
      padPrev[i] = Object.assign({}, st, { START: b(9), SEL: b(8) });
    });
  }
  return {
    players, global,
    setFusion(v) { fusion = v; },
    get fusion() { return fusion; },
    poll: pollPads,
    consume(pi, k) { const p = players[pi]; const v = p.hit[k]; p.hit[k] = false; return v; },
    held(pi, k) { return !!players[pi].held[k]; },
    g(k) { const v = global[k]; global[k] = false; return v; },
    clear() { players.forEach((p) => { p.hit = {}; }); },
    touch(pi, k, down) { const p = players[pi]; if (down && !p.held[k]) p.hit[k] = true; p.held[k] = down; },
  };
})();

// ——— GUARDADO ———
M.Save = (() => {
  const KEY = "mm2_save";
  let data = { profiles: [], current: null, voice: true };
  try { data = Object.assign(data, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  function newProfile(name, age) {
    return {
      id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4),
      name: name || "Jugador", age,
      world: 1, rescued: [], bonds: {}, sparks: 0, leader: "nube", companion: null,
      // modelo del jugador: el generador lo usa para adaptar los mundos
      skill: { falls: 1, hits: 1, time: 1, sparks: 0.5, stomps: 3, ability: 2, eats: 0.5, worlds: 0 },
      history: [],
      seed: Math.floor(Math.random() * 99999),
    };
  }
  return {
    get data() { return data; },
    persist,
    profiles: () => data.profiles,
    get(id) { return data.profiles.find((p) => p.id === id); },
    create(name, age) { const p = newProfile(name, age); data.profiles.push(p); data.current = p.id; persist(); return p; },
    remove(id) { data.profiles = data.profiles.filter((p) => p.id !== id); if (data.current === id) data.current = null; persist(); },
    guest(age) { return newProfile("Invitado", age); },
  };
})();
