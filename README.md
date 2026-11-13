# King Solomon — Temple & Bible Challenge

A standalone static experience based on the Solomon Temple scene in `/home/deeone/Applications/SolomonTemple/solomon_temple.blend`.

## Included
- Dedicated King Solomon landing page and Temple explorer.
- Three.js viewer loading `assets/solomon_temple.glb` with Meshopt decoding and embedded animation clips.
- Camera viewpoints: Aerial, Porch, Holy of Holies and Courts.
- Matching 12-second Solomon Temple film.
- Ten-question Bible quiz covering Solomon's reign, Temple construction, wisdom and legacy. Includes hints, points, streak, ranks, answer feedback and scripture references.

## Run locally
```bash
cd /home/deeone/Applications/SolomonTemple/king-solomon-experience
python3 -m http.server 4174 --bind 0.0.0.0
```
Open `http://localhost:4174`.

This is a separate project; it does not modify the existing Israel Temple Places site or the original Blender file. It is not published yet.
