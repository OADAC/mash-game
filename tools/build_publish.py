"""Genera index.publish.html con todos los scripts incrustados (para publicarlo online).

Uso (desde la carpeta del juego):  python tools/build_publish.py
"""
import json
import os
import re

HERE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(HERE)

html = open("index.html", encoding="utf-8").read()
html = re.sub(r"<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*", "", html)
html = re.sub(r"<meta[^>]*>\s*", "", html)
html = html.replace("</head>\n<body>\n", "").replace("</body>\n</html>", "")
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: "<script>\n" + open(m.group(1), encoding="utf-8").read() + "\n</script>", html)
assert "<head>" not in html and 'src="js/' not in html
open("index.publish.html", "w", encoding="utf-8").write(html)

files = sorted(os.path.join(d, f).replace("\\", "/") for d, _, fs in os.walk("assets") for f in fs if f != "manifest.js")
json.dump(files, open("tools/publish_files.json", "w"))
print(len(html) // 1024, "KB,", len(files), "assets")
