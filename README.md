# King Solomon Temple Experience

A standalone, responsive Three.js reconstruction and Scripture quiz.

## 3D reconstruction
- Separate web-only Blender scene: `/home/deeone/Applications/SolomonTemple/solomon_temple_atmosphere.blend`.
- Focused, restrained shaft of warm light over the Ark of the Covenant; the sanctuary remains dim and atmospheric.
- Five low-poly cloud banks drift slowly beyond the temple roofline.
- Sixteen worshippers/attendants have subtle looping idle/bowing motion.
- 27 glTF animation clips exported, including cloud drift, people, camera and sacrificial smoke.
- Meshopt-compressed GLB is about 584 KiB.
- Original `solomon_temple.blend` and earlier web copy are retained unchanged.

## Interactive seasons and weather
The viewer offers Summer, Spring, Autumn, Winter and Rain. Precipitation and falling leaves/petals are generated as lightweight runtime GPU particles, not thousands of exported meshes. The weather system is designed to remain responsive on desktop and mobile.

## Local preview
```bash
cd /home/deeone/Applications/SolomonTemple/king-solomon-experience
python3 -m http.server 4174 --bind 0.0.0.0
```
Open `http://localhost:4174`.
