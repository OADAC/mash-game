"""Genera los assets del juego a partir de la carpeta Mashmellous.

Uso:  python juego/tools/build_assets.py   (desde la carpeta Mashmellous)
Requiere: pip install "rembg[cpu]" pillow numpy  +  ffmpeg en el PATH
"""
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "juego", "assets")
P = "Personal/"
V = P + "magnific_dale-vida-a-este-personaj_"
I = P + "magnific_crea-un-cuadro-inmersive-_"
F = "freepik_dale-vida-a-este-personaje-malvavisco-en-una-escena-de-pelicula"

# Amigos: id -> vídeo (el sprite sale del primer fotograma del propio vídeo)
FRIENDS = {
    "pompon": V + "Kr8f2gmkqp.mp4",
    "gluglu": V + "6RxSj5viJO.mp4",
    "solete": V + "IhzVlPmtvE.mp4",
    "trompetin": F + "-que-el-personaje-camine-con-las-manos-y-los-pies-suspendidos-en-el-aire_0004.mp4",
    "canelo": V + "cVyiZxm0eP.mp4",
    "orejotas": V + "gwEbsqrSXO.mp4",
    "rayitas": V + "jlvFwtmLD0.mp4",
    "mandarino": V + "rLmuiYLxtc.mp4",
    "pinita": V + "otAc3Gh829.mp4",
    "merengue": V + "aE0drLsfSh.mp4",
    "donbaston": F + "-que-tire-el-baston_0001.mp4",
    "risotas": F + "-que-se-rian-a-carcajadas-con-la-boca-pequena_0005.mp4",
    "plastilino": V + "sSfqVUGl8e.mp4",
    "grenas": V + "eB3zN8EdqL.mp4",
    "narizotas": V + "sSfqGfdl8e.mp4",
    "bufandilla": V + "S7u5H4xUb8.mp4",
}
# Enemigo gruñón (sprite desde su vídeo)
GRUMO = V + "bkBhQrI5Y2.mp4"

# Vídeos de cinemáticas
CINE = {
    "intro": V + "xshQzQPjfW.mp4",       # el malvavisco en el bosque brillante
    "colina": V + "0MP34q8TfW.mp4",      # el malvavisco en la colina
    "tarta": V + "lUCqrn1gv9.mp4",       # la gran tarta
    "tarta2": V + "iZjUP4Y3uK.mp4",
    "abrazo": V + "jlvQQa5LD0.mp4",
    "lago": V + "hfWDmyFvqL.mp4",
}

PROPS = {
    "arbol_isla": I + "JPqrdb0Oq4.jpeg",
    "seta_arbol": I + "WTO6HwwcXe.jpeg",
    "seta_gorda": I + "7yH1dGjJAL.jpeg",
    "seta_luz": I + "JPqrd5TOq4.jpeg",
    "casa_seta": I + "bkBhi6V5Y2.jpeg",
    "casa_ojos": I + "bkBhZlN5Y2.jpeg",
    "casa_amarilla": I + "Y0JNHdaWeC.jpeg",
    "casa_luz": I + "maYMOsvhJQ.jpeg",
    "casa_torre": I + "pXiG1oYehw.jpeg",
    "casa_setas": I + "pXiG5z9ehw.jpeg",
    "casa_redonda": I + "rLmEZuIxtc.jpeg",
    "casa_blanca": I + "rLmEnVixtc.jpeg",
    "casitas": I + "doRns3mXSL.jpeg",
    "castillo": I + "UJQKDn3wny.jpeg",
    "seta_columnas": I + "otAcgOv829.jpeg",
    "cactus": I + "otAcldO829.jpeg",
    "arbol_setas": I + "MeN2qAkDCm.jpeg",
    "casa_puerta": I + "LgaFcypswO.jpeg",
    "arbol_grande": I + "nc79FkPYQD.jpeg",
    "arbol_conejo": I + "fuTd4LlCDY.jpeg",
}

BACKDROPS = {
    "pradera": I + "rLmEzY4xtc.jpeg",
    "rio": I + "sSfH0ESl8e.jpeg",
    "setas": I + "Dd6Ajmkpcl.jpeg",
    "atardecer": I + "S7u501yUb8.jpeg",
    "cueva": I + "N3rgIlg6D9.jpeg",
    "valle": I + "WTO6HmmcXe.jpeg",
    "bosque": I + "S7u5VbLUb8.jpeg",
}


def first_frame(video):
    tmp = os.path.join(OUT, "_frame.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ROOT, video),
                    "-frames:v", "1", tmp], check=True)
    im = Image.open(tmp).convert("RGB")
    os.remove(tmp)
    return im


def cutout(im, session, max_side):
    """Recorta el fondo, limpia sombras semitransparentes y ajusta al contenido."""
    out = np.array(remove(im, session=session)).astype(np.float32)
    a = out[..., 3] / 255.0
    a = np.clip((a - 0.4) / 0.45, 0, 1)            # fuera halos y sombras
    out[..., 3] = a * 255
    img = Image.fromarray(out.astype(np.uint8), "RGBA")
    # suaviza un pelín el borde del alfa
    alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
    img.putalpha(alpha)
    bbox = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    img = img.crop(bbox)
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


def main():
    for d in ("chars", "props", "bg", "vid"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    session = new_session("isnet-general-use")
    manifest = {"chars": {}, "props": {}, "bg": [], "vid": {}}

    def add_video(key, src):
        dst = os.path.join(OUT, "vid", key + ".mp4")
        # re-encode ligero con faststart para que arranque al instante
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(ROOT, src), "-an",
                        "-vf", "scale=640:-2", "-c:v", "libx264", "-crf", "24", "-preset", "slow",
                        "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst], check=True)
        manifest["vid"][key] = "assets/vid/" + key + ".mp4"

    for key, video in list(FRIENDS.items()) + [("grumo", GRUMO)]:
        print("char", key)
        img = cutout(first_frame(video), session, 460)
        img.save(os.path.join(OUT, "chars", key + ".webp"), quality=90)
        manifest["chars"][key] = [img.width, img.height]
        add_video(key, video)

    for key, video in CINE.items():
        print("cine", key)
        add_video(key, video)

    for key, src in PROPS.items():
        print("prop", key)
        img = cutout(Image.open(os.path.join(ROOT, src)).convert("RGB"), session, 720)
        img.save(os.path.join(OUT, "props", key + ".webp"), quality=88)
        manifest["props"][key] = [img.width, img.height]

    for key, src in BACKDROPS.items():
        print("bg", key)
        im = Image.open(os.path.join(ROOT, src)).convert("RGB")
        im.thumbnail((1024, 1024), Image.LANCZOS)
        im.save(os.path.join(OUT, "bg", key + ".jpg"), quality=86)
        manifest["bg"].append(key)

    with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as f:
        f.write("window.MANIFEST = " + json.dumps(manifest, indent=1) + ";\n")
    print("listo ->", OUT)


if __name__ == "__main__":
    sys.exit(main())
