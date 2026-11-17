import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Sky } from 'three/addons/objects/Sky.js';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111923');
scene.fog = new THREE.FogExp2('#89999a', .00042);
const camera = new THREE.PerspectiveCamera(42, 1, .1, 1000000);
camera.position.set(-75,72,95);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.82;
$('stage').appendChild(renderer.domElement);

const sky = new Sky();
sky.scale.setScalar(450000);
sky.material.depthWrite = false;
scene.add(sky);
const skyUniforms = sky.material.uniforms;
skyUniforms.turbidity.value = 2.8;
skyUniforms.rayleigh.value = 1.8;
skyUniforms.mieCoefficient.value = .006;
skyUniforms.mieDirectionalG.value = .82;

const hemi = new THREE.HemisphereLight(0xdce3e6, 0x33281f, .12);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe5c0, 0);
sun.position.set(0,100,0); sun.target.position.set(0,0,0); sun.castShadow = false;
scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight(0xa8bddf, 0);
moon.position.set(0,100,0); moon.target.position.set(0,0,0); moon.castShadow = false;
scene.add(moon, moon.target);
// A narrow, quiet Shekinah shaft stays local to the Ark instead of washing the nave.
const arkGlow = new THREE.PointLight(0xffd69a, .12, 13, 2);
arkGlow.position.set(0, 8.1, -26.1);
scene.add(arkGlow);
const arkBeamMaterial = new THREE.MeshBasicMaterial({color:0xf4dfb2,transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
const arkBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.25,.12,8.8,16,1,true),arkBeamMaterial);
arkBeam.position.set(0,12.2,-26.1);
scene.add(arkBeam);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.07; controls.target.set(0,3,-8);
controls.maxDistance=1500; controls.minDistance=.5; controls.maxPolarAngle=Math.PI*.49;
let root=null,mixer=null,clips=[],clock=new THREE.Clock(),filmCamera=null;
let cloudRoots=[],cloudMeshes=[],landscape=null,riverMaterial=null,treeCanopies=null;
const loader=new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('assets/solomon_temple.glb',g=>{
  root=g.scene; scene.add(root);
  root.traverse(o=>{
    if(o.isLight){o.intensity=0;o.visible=false;}
    if(o.name.startsWith('Cloud drift')) cloudRoots.push(o);
    if(o.isMesh && o.name.startsWith('Cloud ')) cloudMeshes.push(o);
  });
  clips=g.animations||[];
  if(clips.length){
    mixer=new THREE.AnimationMixer(root);
    clips.forEach(c=>{
      if(/Camera/.test(c.name)) return;
      if(/Worshipper|Attendant/.test(c.name)){
        c.tracks.forEach(track=>{
          if(!track.name.endsWith('.position') || track.values.length<3) return;
          const v=track.values, base=[v[0],v[1],v[2]];
          for(let i=0;i<v.length;i+=3) for(let axis=0;axis<3;axis++)
            v[i+axis]=base[axis]+(v[i+axis]-base[axis])*2.6;
        });
      }
      const action=mixer.clipAction(c);
      action.setLoop(THREE.LoopRepeat, Infinity); action.play();
    });
  }
  filmCamera=root.getObjectByName('Camera')||root.getObjectByName('Camera.001');
  $('stage').querySelector('.loading')?.remove();
  fitScene(); createLandscape(); setWeather(weatherKind);
},p=>{
  if(p.total){
    const el=$('stage').querySelector('.loading span');
    if(el)el.textContent='Loading sanctuary · '+Math.round(p.loaded/p.total*100)+'%';
  }
},e=>{
  $('stage').querySelector('.loading span').textContent='Could not load the Temple model. Check the local server and asset path.';
  console.error(e);
});
function fitScene(){
  if(!root)return;
  const b=new THREE.Box3().setFromObject(root),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z);
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(-max*.9,max*.85,max*1.1));
  camera.near=Math.max(.05,max/10000); camera.far=1000000;
  camera.updateProjectionMatrix(); sky.position.copy(center); controls.update(); applyEnvironment();
}

// A restrained Judean hill-country setting: broad ground, distant ridges,
// a winding brook and clustered olive/cypress trees. All repeated props are instanced.
function createLandscape(){
  if(landscape||!root)return;
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const span=Math.max(size.x,size.z,48),extent=span*2.15,groundY=bounds.min.y-.28;
  landscape=new THREE.Group();landscape.name='Temple landscape';scene.add(landscape);
  const groundGeo=new THREE.PlaneGeometry(extent*2,extent*2,72,72);groundGeo.rotateX(-Math.PI/2);
  const pos=groundGeo.attributes.position,colors=[];
  const cLow=new THREE.Color('#59624a'),cHigh=new THREE.Color('#77745a');
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    const d=Math.min(1,Math.sqrt(x*x+z*z)/(extent*1.1));
    const undulation=(Math.sin(x*.035)*Math.cos(z*.027)*.42+Math.sin((x+z)*.018)*.3)*d;
    pos.setY(i,undulation);
    const col=cLow.clone().lerp(cHigh,THREE.MathUtils.clamp(.25+d*.55+undulation*.12,0,1));
    colors.push(col.r,col.g,col.b);
  }
  groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));groundGeo.computeVertexNormals();
  const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
  ground.position.set(center.x,groundY,center.z);ground.receiveShadow=false;landscape.add(ground);
  const ridgeMat=new THREE.MeshStandardMaterial({color:0x777363,roughness:1,flatShading:true});
  const ridgeGreen=new THREE.MeshStandardMaterial({color:0x68735b,roughness:1,flatShading:true});
  const ridgeSpecs=[[-1.42,-1.05,.52,.42],[-.92,-1.55,.42,.32],[-.25,-1.72,.58,.36],[.48,-1.62,.48,.34],[1.2,-1.28,.58,.43],[1.55,-.45,.46,.36],[-1.58,.28,.5,.4],[-1.25,1.15,.56,.42],[.05,1.72,.6,.4],[1.1,1.4,.5,.38]];
  ridgeSpecs.forEach((v,i)=>{
    const r=span*v[2],h=span*v[3];
    const geo=new THREE.ConeGeometry(r,h,7,2);const mesh=new THREE.Mesh(geo,i%3===0?ridgeMat:ridgeGreen);
    mesh.position.set(center.x+span*v[0],groundY+h*.5,center.z+span*v[1]);mesh.rotation.y=i*.73;landscape.add(mesh);
    const shoulder=new THREE.Mesh(new THREE.IcosahedronGeometry(r*.7,1),ridgeGreen);
    shoulder.position.set(mesh.position.x+(i%2?1:-1)*r*.58,groundY+h*.16,mesh.position.z+r*.2);shoulder.scale.set(1,.5,1.1);landscape.add(shoulder);
  });
  // One meandering stream along the eastern slope, with animated surface highlights.
  const riverPoints=[
    new THREE.Vector3(center.x+span*1.22,groundY+.08,center.z+span*.95),
    new THREE.Vector3(center.x+span*.96,groundY+.12,center.z+span*.62),
    new THREE.Vector3(center.x+span*1.12,groundY+.1,center.z+span*.24),
    new THREE.Vector3(center.x+span*.91,groundY+.12,center.z-span*.15),
    new THREE.Vector3(center.x+span*1.18,groundY+.09,center.z-span*.52),
    new THREE.Vector3(center.x+span*.96,groundY+.12,center.z-span*.96)
  ];
  const riverCurve=new THREE.CatmullRomCurve3(riverPoints,false,'centripetal');
  const riverGeo=new THREE.TubeGeometry(riverCurve,180,Math.max(1.1,span*.027),7,false);
  riverMaterial=new THREE.MeshStandardMaterial({color:0x3d8290,roughness:.2,metalness:.16,transparent:true,opacity:.88});
  riverMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uFlowTime={value:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform float uFlowTime; varying vec3 vBrookWorld;` );
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n vBrookWorld=(modelMatrix*vec4(transformed,1.0)).xyz; transformed.y += sin(position.x*1.8+uFlowTime*2.2)*0.035 + cos(position.z*2.4-uFlowTime*1.5)*0.025;` );
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform float uFlowTime; varying vec3 vBrookWorld;` );
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n float glint=pow(max(0.0,sin(vBrookWorld.x*1.7+vBrookWorld.z*2.1-uFlowTime*3.0)),18.0)*0.22; diffuseColor.rgb += vec3(0.38,0.58,0.62)*glint;` );
    riverMaterial.userData.shader=shader;
  };
  const river=new THREE.Mesh(riverGeo,riverMaterial);river.name='Flowing brook';landscape.add(river);
  // Pebble banks as one low-poly instanced draw call.
  const pebbleGeo=new THREE.IcosahedronGeometry(span*.009,0),pebbleMat=new THREE.MeshStandardMaterial({color:0xaaa18a,roughness:.94,flatShading:true});
  const pebbles=new THREE.InstancedMesh(pebbleGeo,pebbleMat,72),dummy=new THREE.Object3D();
  for(let i=0;i<72;i++){
    const t=(i%36)/35,pt=riverCurve.getPoint(t),side=i<36?-1:1,offset=span*(.035+Math.random()*.025);
    dummy.position.set(pt.x+side*offset,groundY+.18+Math.random()*.12,pt.z+(Math.random()-.5)*span*.025);
    const sc=.45+Math.random()*1.2;dummy.scale.set(sc,sc*.55,sc*.8);dummy.rotation.set(Math.random(),Math.random()*6,Math.random());dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);
  }
  landscape.add(pebbles);
  // Olive-like trees: shared low-poly trunk and layered canopies, instanced for web performance.
  const treePositions=[];
  for(let i=0;i<46;i++){
    const side=i%2?1:-1,along=(Math.floor(i/2)/23-.5)*1.65;
    const x=center.x+side*span*(.72+Math.random()*.48);
    const z=center.z+along*span+(Math.random()-.5)*span*.18;
    if(Math.abs(x-center.x)<span*.62&&Math.abs(z-center.z)<span*.58)continue;
    treePositions.push({x,z,scale:.72+Math.random()*.78,rot:Math.random()*Math.PI*2});
  }
  const trunkGeo=new THREE.CylinderGeometry(span*.009,span*.014,span*.14,6,1);
  const trunkMat=new THREE.MeshStandardMaterial({color:0x66503a,roughness:1,flatShading:true});
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treePositions.length);
  const leafGeo=new THREE.IcosahedronGeometry(span*.075,1);
  const leafMat=new THREE.MeshStandardMaterial({color:0x536b48,roughness:1,flatShading:true});
  leafMat.onBeforeCompile=shader=>{
    shader.uniforms.uBreeze={value:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform float uBreeze;` );
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n transformed.x += sin(instanceMatrix[3].x*0.12+uBreeze*1.4+position.y*2.0)*0.035*position.y;` );
    leafMat.userData.shader=shader;
  };
  treeCanopies=leafMat;
  const leaves=new THREE.InstancedMesh(leafGeo,leafMat,treePositions.length*2);
  treePositions.forEach((t,i)=>{
    dummy.position.set(t.x,groundY+span*.075*t.scale, t.z);dummy.scale.set(t.scale*.72,t.scale*.65,t.scale*.72);dummy.rotation.y=t.rot;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.y+=span*.095*t.scale;dummy.scale.set(t.scale,t.scale*.78,t.scale);dummy.updateMatrix();leaves.setMatrixAt(i*2,dummy.matrix);
    dummy.position.y+=span*.06*t.scale;dummy.scale.set(t.scale*.68,t.scale*.62,t.scale*.68);dummy.updateMatrix();leaves.setMatrixAt(i*2+1,dummy.matrix);
  });
  landscape.add(trunks,leaves);
  landscape.userData.center=center;landscape.userData.span=span;landscape.userData.groundY=groundY;
}
const presets={Aerial:[[-75,72,95],[0,3,-8]],Porch:[[0,10,25],[0,6,0]],Sanctuary:[[0,7,8],[0,4,-13]],'Holy of Holies':[[0,6,-15],[0,4,-24]],Courts:[[-32,18,16],[0,3,-8]]};
const weatherGroup=new THREE.Group(); scene.add(weatherGroup); let weatherKind='summer',weatherObj=null,weatherGeo=null,weatherPositions=null,weatherVelocity=null;
const weatherProfiles={
  summer:{turbidity:2.4,rayleigh:1.8,mie:.004,sun:1,ambient:1,cloud:0xd8dedb,cloudScale:.82,fog:0x87999a,fogDensity:.00034,sunrise:5.5,sunset:19.5},
  spring:{turbidity:3.2,rayleigh:1.75,mie:.007,sun:.92,ambient:.98,cloud:0xd5dedc,cloudScale:.96,fog:0x9aa8a1,fogDensity:.00038,sunrise:6,sunset:18.3},
  autumn:{turbidity:4.6,rayleigh:1.5,mie:.012,sun:.82,ambient:.9,cloud:0xb7a18a,cloudScale:1.12,fog:0x8c796b,fogDensity:.00048,sunrise:6.5,sunset:17.6},
  winter:{turbidity:5.8,rayleigh:1.25,mie:.016,sun:.68,ambient:.82,cloud:0xb8c4cc,cloudScale:1.28,fog:0x8293a1,fogDensity:.00055,sunrise:7,sunset:17},
  rain:{turbidity:9.5,rayleigh:.85,mie:.038,sun:.34,ambient:.62,cloud:0x596875,cloudScale:1.48,fog:0x52616d,fogDensity:.00105,sunrise:6,sunset:18}
};
let timeMinutes=600,timeTarget=600,timePlaying=false;
function timeName(t){
  const p=weatherProfiles[weatherKind]||weatherProfiles.summer,h=t/60;
  if(h<p.sunrise-.7||h>p.sunset+.7)return 'NIGHT';
  if(h<p.sunrise+1)return 'DAWN';
  if(h<p.sunrise+3.5)return 'MORNING';
  if(h<p.sunset-3)return 'DAY';
  if(h<p.sunset-1)return 'GOLDEN HOUR';
  return 'DUSK';
}
function solarPosition(t){
  const p=weatherProfiles[weatherKind]||weatherProfiles.summer,hours=t/60;
  const phase=((hours-p.sunrise)/(p.sunset-p.sunrise))*Math.PI;
  const elevation=60*Math.sin(phase),azimuth=-Math.PI/2+phase;
  const e=THREE.MathUtils.degToRad(elevation),horizontal=Math.cos(e);
  const direction=new THREE.Vector3(Math.sin(azimuth)*horizontal,Math.sin(e),Math.cos(azimuth)*horizontal).normalize();
  return {elevation,direction};
}
function applyEnvironment(){
  const profile=weatherProfiles[weatherKind]||weatherProfiles.summer;
  const solar=solarPosition(timeMinutes);
  const daylight=THREE.MathUtils.smoothstep(solar.elevation,-8,12);
  const warm=THREE.MathUtils.smoothstep(solar.elevation,2,48);
  const sunColor=new THREE.Color(0xffa36b).lerp(new THREE.Color(0xfff0d5),warm);
  skyUniforms.turbidity.value=profile.turbidity;
  skyUniforms.rayleigh.value=profile.rayleigh;
  skyUniforms.mieCoefficient.value=profile.mie;
  skyUniforms.mieDirectionalG.value=.82;
  skyUniforms.sunPosition.value.copy(solar.direction);
  sky.visible=solar.elevation>-9;
  scene.background=sky.visible?null:new THREE.Color('#111a27');
  scene.fog.color.setHex(profile.fog);
  scene.fog.density=profile.fogDensity*(daylight<.05?1.18:1);
  hemi.intensity=THREE.MathUtils.lerp(.055,.43,daylight)*profile.ambient;
  hemi.color.set(daylight>.5?0xdce5e7:0x9aabc2);
  hemi.groundColor.set(weatherKind==='rain'?0x29333a:0x33281f);
  sun.position.copy(controls.target).addScaledVector(solar.direction,320);
  sun.target.position.copy(controls.target); sun.color.copy(sunColor);
  sun.intensity=1.45*daylight*profile.sun;
  const moonDirection=solar.direction.clone().negate();
  moon.position.copy(controls.target).addScaledVector(moonDirection,280);
  moon.target.position.copy(controls.target); moon.intensity=(1-daylight)*.11;
  arkGlow.intensity=.075+(1-daylight)*.07;
  arkBeamMaterial.opacity=.028+(1-daylight)*.016;
}
function setWeather(kind){
  weatherKind=kind;
  const profile=weatherProfiles[kind]||weatherProfiles.summer;
  applyEnvironment();
  updateTimeUI();
  cloudRoots.forEach(o=>o.scale.setScalar(profile.cloudScale));
  if(treeCanopies){const colors={summer:0x536b48,spring:0x668052,autumn:0x9a7042,winter:0x66705d,rain:0x425c4d};treeCanopies.color.setHex(colors[kind]||colors.summer);}
  cloudMeshes.forEach(o=>{
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{if(m&&m.color)m.color.setHex(profile.cloud);if(m&&'roughness' in m)m.roughness=.96;});
  });
  if(weatherObj){
    weatherGroup.remove(weatherObj); weatherObj.geometry.dispose();
    if(Array.isArray(weatherObj.material))weatherObj.material.forEach(m=>m.dispose());
    else weatherObj.material.dispose();
    weatherObj=null;
  }
  const count=kind==='rain'?520:kind==='winter'?380:kind==='autumn'?140:kind==='spring'?110:0;
  if(!count)return;
  const rain=kind==='rain';
  weatherGeo=new THREE.BufferGeometry();
  weatherPositions=new Float32Array(count*(rain?6:3));
  weatherVelocity=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const x=(Math.random()-.5)*95,y=Math.random()*38+3,z=(Math.random()-.5)*110,k=i*(rain?6:3);
    weatherPositions[k]=x;weatherPositions[k+1]=y;weatherPositions[k+2]=z;
    if(rain){weatherPositions[i*6+3]=x-.035;weatherPositions[i*6+4]=y+.55;weatherPositions[i*6+5]=z-.035;}
    weatherVelocity[i*3]=(Math.random()-.5)*(rain?1.8:.35);
    weatherVelocity[i*3+1]=rain?-7:kind==='winter'?-1.0:kind==='autumn'?.4:-.28;
    weatherVelocity[i*3+2]=rain?-1.2:(Math.random()-.5)*.3;
  }
  weatherGeo.setAttribute('position',new THREE.BufferAttribute(weatherPositions,3));
  const isSnow=kind==='winter';
  const material=new THREE.PointsMaterial({color:rain?0xb8c7d5:isSnow?0xe7edf2:kind==='autumn'?0xc98739:0xe8a7ad,size:rain?.065:isSnow?.12:.16,transparent:true,opacity:rain?.42:.82,depthWrite:false,sizeAttenuation:true});
  weatherObj=rain?new THREE.LineSegments(weatherGeo,new THREE.LineBasicMaterial({color:0xb8c7d5,transparent:true,opacity:.36})):new THREE.Points(weatherGeo,material);
  weatherGroup.add(weatherObj);
}
function formatTime(t){const h=Math.floor(t/60),m=t%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function updateTimeUI(){ $('timeSlider').value=String(Math.round(timeTarget/5)*5);$('timeLabel').textContent=formatTime(timeTarget)+' · '+timeName(timeTarget);$('timePlay').textContent=timePlaying?'Ⅱ':'▶';$('timePlay').setAttribute('aria-label',timePlaying?'Pause time cycle':'Start time cycle');document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',Number(b.dataset.time)===Math.round(timeTarget/5)*5));}
$('weatherSelect').addEventListener('change',e=>setWeather(e.target.value));
$('timeSlider').addEventListener('input',e=>{timeTarget=Number(e.target.value);timePlaying=false;updateTimeUI();});
$('timePlay').addEventListener('click',()=>{timePlaying=!timePlaying;updateTimeUI();});
document.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{timeTarget=Number(b.dataset.time);timePlaying=false;updateTimeUI();}));
setWeather('summer');updateTimeUI();
function updateWeather(dt){if(riverMaterial?.userData.shader)riverMaterial.userData.shader.uniforms.uFlowTime.value+=dt;if(treeCanopies?.userData.shader)treeCanopies.userData.shader.uniforms.uBreeze.value+=dt;if(!weatherObj)return;const p=weatherGeo.attributes.position.array;const rain=weatherKind==='rain';const n=weatherVelocity.length/3;for(let i=0;i<n;i++){let k=i*(rain?6:3);p[k]+=weatherVelocity[i*3]*dt;p[k+1]+=weatherVelocity[i*3+1]*dt;p[k+2]+=weatherVelocity[i*3+2]*dt;if(rain){p[k+3]=p[k]-.035;p[k+4]=p[k+1]+.55;p[k+5]=p[k+2]-.035;}if(p[k+1]<.2){p[k]=(Math.random()-.5)*95;p[k+1]=35+Math.random()*10;p[k+2]=(Math.random()-.5)*110;if(rain){p[k+3]=p[k]-.035;p[k+4]=p[k+1]+.55;p[k+5]=p[k+2]-.035;}}}weatherGeo.attributes.position.needsUpdate=true;}

document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>{const [p,t]=presets[b.dataset.camera];camera.position.set(...p);controls.target.set(...t);controls.update();document.querySelectorAll('[data-camera]').forEach(x=>x.classList.toggle('active',x===b));$('viewTitle').textContent=b.dataset.camera+' viewpoint';$('viewHint').textContent=b.dataset.camera==='Sanctuary'?'Inside the nave · Cedar, gold and lampstands':b.dataset.camera==='Holy of Holies'?'The Ark and cherubim · 1 Kings 8:6':'Drag to explore · Scroll to zoom';}));
$('resetView').onclick=()=>{fitScene();document.querySelectorAll('[data-camera]').forEach(x=>x.classList.toggle('active',x.dataset.camera==='Aerial'));};$('fullscreen').onclick=()=>{$('stage').requestFullscreen?.();};
function resize(){const el=$('stage');const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('stage'));resize();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(mixer)mixer.update(dt);if(timePlaying){timeTarget=(timeTarget+dt*12)%1440;updateTimeUI();}const diff=timeTarget-timeMinutes;timeMinutes+=Math.abs(diff)<.35?diff:diff*.055;applyEnvironment();updateWeather(dt);controls.update();renderer.render(scene,camera);});

const questions=[
{level:1,cat:'THE EARLY REIGN',q:'What did Solomon ask God to give him when he became king?',a:['Long life','Wisdom and understanding','A great army','Wealth and silver'],c:1,ref:'1 Kings 3:9–12',why:'Solomon asked for an understanding heart to judge the people and discern between good and evil. God was pleased with this request.',hint:'Think about what a young king needs most to govern people justly.'},
{level:1,cat:'THE EARLY REIGN',q:'At which place did Solomon offer a thousand burnt offerings when God appeared to him in a dream?',a:['Jerusalem','Bethel','Gibeon','Shiloh'],c:2,ref:'1 Kings 3:4–5',why:'Solomon went to Gibeon, the great high place, and offered a thousand burnt offerings. There the LORD appeared to him in a dream.',hint:'The account is in 1 Kings 3, before the Temple was built.'},
{level:1,cat:'THE WISE KING',q:'In the famous judgment between two women, what did Solomon propose to do to the living baby?',a:['Give the child to the priests','Divide the child in two','Send the child to the palace','Ask the elders to decide'],c:1,ref:'1 Kings 3:24–27',why:'Solomon called for a sword and proposed dividing the living child. The true mother revealed herself by pleading for the baby to be spared.',hint:'The king used a startling proposal to reveal the real mother.'},
{level:2,cat:'BUILDING THE TEMPLE',q:'In which year of Solomon’s reign did he begin building the house of the LORD?',a:['First year','Fourth year','Seventh year','Twelfth year'],c:1,ref:'1 Kings 6:1',why:'Solomon began building in the fourth year of his reign, in the month Zif, 480 years after Israel came out of Egypt.',hint:'The date is recorded at the beginning of 1 Kings chapter 6.'},
{level:2,cat:'BUILDING THE TEMPLE',q:'How long did Solomon take to build the Temple, according to 1 Kings 6:38?',a:['Three years','Seven years','Twelve years','Twenty years'],c:1,ref:'1 Kings 6:38',why:'The house was finished in the eighth month of the eleventh year, after seven years of construction.',hint:'The verse gives a duration in years and mentions the month Bul.'},
{level:2,cat:'THE TEMPLE',q:'What sacred object was brought into the inner sanctuary, the Most Holy Place?',a:['The bronze altar','The golden lampstand','The Ark of the Covenant','The bronze sea'],c:2,ref:'1 Kings 8:6',why:'The priests brought the Ark of the Covenant of the LORD into the inner sanctuary, under the wings of the cherubim.',hint:'It was the sacred chest associated with the covenant and the tablets.'},
{level:2,cat:'THE TEMPLE',q:'Which two pillars stood at the porch of Solomon’s Temple?',a:['Boaz and Jachin','Moses and Aaron','Uriah and Nathan','Hiram and Hur'],c:0,ref:'1 Kings 7:21',why:'The two bronze pillars were named Jachin and Boaz. Jachin stood on the right and Boaz on the left.',hint:'Their names are given when the bronze pillars are described.'},
{level:3,cat:'WISDOM & WRITINGS',q:'Which queen travelled to test Solomon with hard questions?',a:['Queen Esther','Queen of Sheba','Queen Athaliah','Queen Vashti'],c:1,ref:'1 Kings 10:1–3',why:'The Queen of Sheba heard of Solomon’s fame concerning the name of the LORD and came to test him with hard questions.',hint:'Her kingdom was renowned for trade and lay to the south of Israel.'},
{level:3,cat:'WISDOM & WRITINGS',q:'According to 1 Kings 4:32, how many proverbs did Solomon speak?',a:['300','777','1,005','3,000'],c:3,ref:'1 Kings 4:32',why:'The text says Solomon spoke three thousand proverbs, and his songs were one thousand and five.',hint:'The number is greater than one thousand and is stated explicitly in 1 Kings 4.'},
{level:3,cat:'THE KING’S LEGACY',q:'What does 1 Kings 11 identify as a cause of Solomon’s heart turning away from the LORD?',a:['A famine in Jerusalem','His many foreign wives turning his heart to other gods','A rebellion led by David’s soldiers','The loss of the Ark'],c:1,ref:'1 Kings 11:1–4',why:'The account says Solomon loved many foreign women, and when he was old his wives turned his heart after other gods.',hint:'Read the opening verses of 1 Kings chapter 11.'}
];
let index=0,score=0,correct=0,streak=0,best=0,selected=null,locked=false,hinted=false,answers=[];
const letters=['A','B','C','D'];
function rank(){const name=score>=500?'Keeper of Wisdom':score>=300?'Royal Counsellor':score>=150?'Temple Scholar':'Seeker';$('rankName').textContent=name;$('rankProgress').style.width=Math.min(100,score%100)+'%';$('rankNext').textContent=`${score} wisdom points`;}
function renderQuestion(){const q=questions[index];selected=null;locked=false;hinted=false;$('levelLabel').textContent=`LEVEL ${['I','II','III'][q.level-1]} · ${['THE KING','THE TEMPLE','THE LEGACY'][q.level-1]}`;$('questionCount').textContent=`QUESTION ${String(index+1).padStart(2,'0')} / ${questions.length}`;$('questionProgress').style.width=`${index/questions.length*100}%`;$('questionCategory').textContent=q.cat;$('questionText').textContent=q.q;$('feedback').textContent='';$('feedback').className='feedback';$('hintText').textContent='';$('hintBtn').disabled=false;$('hintBtn').innerHTML='◎ Reveal a hint <span>(−5 points)</span>';$('nextBtn').disabled=true;$('nextBtn').innerHTML='Lock answer <span>→</span>';$('answers').innerHTML='';q.a.forEach((a,i)=>{const b=document.createElement('button');b.className='answer';b.innerHTML=`<span class="letter">${letters[i]}</span><span>${a}</span>`;b.onclick=()=>choose(i);$('answers').appendChild(b);});}
function choose(i){if(locked)return;selected=i;[...$('answers').children].forEach((b,n)=>b.classList.toggle('selected',n===i));$('nextBtn').disabled=false;$('nextBtn').innerHTML='Submit answer <span>→</span>';}
$('hintBtn').onclick=()=>{if(hinted||locked)return;hinted=true;score=Math.max(0,score-5);rank();$('hintText').textContent='HINT · '+questions[index].hint;$('hintBtn').disabled=true;};
$('nextBtn').onclick=()=>{if(selected===null)return;if(!locked){locked=true;const q=questions[index],ok=selected===q.c;answers.push({q,selected,ok});if(ok){correct++;streak++;best=Math.max(best,streak);score+=hinted?5:10;}else streak=0;[...$('answers').children].forEach((b,n)=>{b.disabled=true;if(n===q.c)b.classList.add('correct');else if(n===selected)b.classList.add('wrong');});$('feedback').className='feedback '+(ok?'good':'bad');$('feedback').textContent=(ok?'✦ Well done. ':'Not quite. ')+q.why+'  Scripture: '+q.ref;$('score').textContent=String(score).padStart(3,'0');$('correctCount').textContent=`${correct} / ${questions.length}`;$('bestStreak').textContent=best+' ✦';rank();$('nextBtn').innerHTML=index===questions.length-1?'See results <span>✦</span>':'Next question <span>→</span>';return;}index++;if(index<questions.length)renderQuestion();else finish();};
function finish(){ $('quizCard').classList.add('hidden');$('resultCard').classList.remove('hidden');$('quizLayout')?.classList.add('complete');$('finalScore').textContent=score;$('finalCorrect').textContent=`${correct}/${questions.length}`;$('finalStreak').textContent=best;$('resultTitle').textContent=correct>=9?'A heart full of wisdom.':correct>=6?'A worthy scholar.':'The journey to wisdom begins.';$('resultMessage').textContent=`You answered ${correct} of ${questions.length} questions correctly. Review the Scripture references and return to strengthen your knowledge.`;$('questionProgress').style.width='100%';}
function restart(){index=0;score=0;correct=0;streak=0;best=0;answers=[];$('score').textContent='000';$('correctCount').textContent='0 / 10';$('bestStreak').textContent='0 ✦';$('quizCard').classList.remove('hidden');$('resultCard').classList.add('hidden');rank();renderQuestion();}
$('restartBtn').onclick=restart;renderQuestion();
function setView(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v+'View'));document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='explore')setTimeout(resize,80);document.querySelector('#'+v+'View').scrollIntoView({behavior:'smooth',block:'start'});}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('soundToggle').onclick=()=>{const on=$('soundToggle').classList.toggle('on');$('soundToggle').innerHTML=on?'♫ <span>Sound on</span>':'♫ <span>Sound off</span>';};
