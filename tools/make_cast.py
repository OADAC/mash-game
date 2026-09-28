"""Genera juego3/js/cast.js a partir del reparto de juego2 (personalidades por edad) con los poderes v3."""
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
s = open(os.path.join(ROOT, "juego2/js/cast.js"), encoding="utf-8").read()

POWERS = '''// ——— PODERES (transformaciones de TU Mash) ———
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

'''
a = s.index("// ——— HABILIDADES ———"); b = s.index("// Materiales:")
s = s[:a] + POWERS + s[b:]

AB = {"nube": "null", "pompon": '"gigante"', "gluglu": '"burbuja"', "solete": '"fuego"', "trompetin": '"aspiradora"',
      "canelo": '"turbo"', "orejotas": '"volar"', "rayitas": '"fuego"', "mandarino": '"turbo"', "pinita": '"modelar"',
      "merengue": '"gigante"', "donbaston": '"modelar"', "risotas": '"risa"', "plastilino": '"modelar"',
      "grenas": '"aspiradora"', "narizotas": '"azucar"', "bufandilla": '"volar"'}
NAT = {"bufandilla": 1, "pinita": 1}  # -1 = en la imagen original mira a la izquierda
for k, v in AB.items():
    s, n = re.subn(r'(\n  ' + k + r': \{\n    name: [^\n]*?ability: )(null|"\w+")', lambda m: m.group(1) + v, s)
    assert n == 1, k
    s = s.replace("\n  " + k + ": {\n", "\n  " + k + ": {\n    nat: " + str(NAT.get(k, -1)) + ",\n", 1)

s = s.replace('''M.abilityName = (ab, age) => ab ? (M.ABILITIES[ab].name[age] || M.ABILITIES[ab].name.kids) : "—";''',
              '''M.abilityName = (ab, age) => ab ? (M.ABILITIES[ab].name[age] || M.ABILITIES[ab].name.kids) : "Aspirar";''')
s = s.replace('''M.abilityDesc = (ab, age) => ab ? (M.ABILITIES[ab].desc[age] || M.ABILITIES[ab].desc.kids) : "Doble salto esponjoso";''',
              '''M.abilityDesc = (ab, age) => ab ? (M.ABILITIES[ab].desc[age] || M.ABILITIES[ab].desc.kids) : "Aspira grumos y los convierte en mini mash. Doble salto esponjoso.";
// orden de rescate: cada mundo desbloquea un poder nuevo; el 4º mundo de cada región es un jefe
M.RESCUE_ORDER = ["pompon", "orejotas", "solete", "canelo", "narizotas", "gluglu", "trompetin", "risotas", "pinita", "rayitas", "mandarino", "merengue", "bufandilla", "grenas", "donbaston", "plastilino"];''')
# Nube se dibuja con el sprite de su tarjeta (el cubo blanco del vídeo), no a mano
s = s.replace("h: 110, ph: 62, procedural: true,", "h: 110, ph: 70, procedural: false, // sprite de la tarjeta (el cubo del vídeo)")
open(os.path.join(ROOT, "juego3/js/cast.js"), "w", encoding="utf-8").write(s)
print("ok")
