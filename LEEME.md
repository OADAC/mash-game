# Mashmellous · La Gran Tarta

Plataformas 2.5D hechas con el mundo Mashmellous. Nube, un malvavisco pequeñito, recorre 4 zonas para encontrar a los 16 Mashmellous antes de la fiesta.

## Cómo jugar
- Doble clic en **index.html** (no hay que instalar nada; solo necesita internet para la tipografía).
- ← → / A D: moverse · Espacio / ↑ / W: saltar (pulsa otra vez en el aire para el doble salto)
- E / Enter / ↓: saludar a un Mashmellous · Tab: Mashmellopedia · M: sonido · Esc: pausa
- En el móvil aparecen controles en pantalla (con el móvil en horizontal).

## Estructura
- `js/data.js`: los 16 amigos (nombres, descripciones, stats), las zonas y el **diseño del nivel** (fácil de editar).
- `js/game.js`: física, enemigos, cámara, render y pantallas.
- `js/world.js`: terreno de plastilina, capas parallax y decorados.
- `js/audio.js`: música generativa y efectos de sonido sintetizados.
- `assets/`: personajes recortados, decorados, fondos y vídeos (generados automáticamente).

## Regenerar los assets
Desde la carpeta `Mashmellous`: `python juego/tools/build_assets.py`
(requiere `pip install "rembg[cpu]"` y ffmpeg). Para añadir un amigo: añade su vídeo en `FRIENDS` del script, su ficha en `M.FRIENDS` (data.js) y colócalo en el nivel con `friend("id", x, y)`.

`index.publish.html` es la copia con los scripts incrustados que se usa para la versión online.
