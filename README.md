# King Solomon — Temple & Bible Challenge

A standalone static experience based on a web-optimized copy of the Solomon Temple Blender scene. The source `.blend` is retained unchanged.

## Included
- Dedicated King Solomon landing page and Temple explorer.
- Low-poly Three.js viewer loading `assets/solomon_temple.glb` with Meshopt decoding, five exported punctual lights and all 17 embedded animation clips.
- Four additional low-poly sanctuary attendants, warmer gold/cedar PBR response, and warm practical interior lighting.
- Dense decorative rosemary meshes outside the sanctuary are omitted from the web-only export to keep the download light; they remain in the original Blender scene.
- Camera viewpoints: Aerial, Porch, Sanctuary, Holy of Holies and Courts.
- Matching 12-second Solomon Temple film.
- Ten-question Bible quiz covering Solomon's reign, Temple construction, wisdom and legacy. Includes hints, points, streak, ranks, answer feedback and scripture references.

## Run locally
```bash
cd /home/deeone/Applications/SolomonTemple/king-solomon-experience
python3 -m http.server 4174 --bind 0.0.0.0
```
Open `http://localhost:4174`.

This is a separate project; it does not modify the existing Israel Temple Places site or the original Blender file.
