import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildSafetyGeometry} from './safetyGeometry.js';
import {SpatialCollider} from '../core/SpatialCollider.js';
const pending=new Map();
function load(kind){if(!pending.has(kind))pending.set(kind,new GLTFLoader().loadAsync(`/models/unified/${kind}/scene.gltf`).catch(e=>{pending.delete(kind);throw e;}));return pending.get(kind);}
export async function loadUnifiedSchool(collision,config={}){
 const root=new T.Group();root.name='Unified school';const targets=[],doors=[],staticMeshes=[],occluders=[];
 const loaded=config.models??await Promise.all(['classroom','hallway','stairs','entrance'].map(load));
 const models=loaded.map(g=>({...g,scene:g.scene.clone(true)}));
 const doorGroups=new Map(),batches=[],storyObjects=[],resized=new Set();
 for(const gltf of models){gltf.scene.updateMatrixWorld(true);const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});for(const o of meshes){const e=o.userData;o.castShadow=false;o.receiveShadow=true;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key]){const texture=m[key];texture.anisotropy=Math.min(config.maxAnisotropy??4,4);if(config.textureSize&&!resized.has(texture)){resized.add(texture);const image=texture.image;if(image?.width>config.textureSize){const canvas=document.createElement('canvas');canvas.width=config.textureSize;canvas.height=Math.round(image.height*config.textureSize/image.width);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);texture.image=canvas;texture.needsUpdate=true;}}}}
  if(e.door){const [id,dir]=e.door,key=id+':'+dir;if(!doorGroups.has(key)){const group=new T.Group();group.name=`교실 ${id===0?'앞':'뒤'}문 ${dir<0?'왼쪽':'오른쪽'} 패널`;group.userData.door=id;group.userData.dir=dir;doorGroups.set(key,group);root.add(group);}doorGroups.get(key).attach(o);}else staticMeshes.push(o);
 }}
 for(let id=0;id<2;id++){const leaves=[...doorGroups.values()].filter(o=>o.userData.door===id),door={id,leaves,progress:0,open:false,colliders:[]};
  for(const leaf of leaves){leaf.userData.interaction='교실 미닫이문';leaf.userData.interactionLabel=()=>`${id===0?'왼쪽 앞':'오른쪽 뒷'}문 ${door.open?'닫기':'열기'}`;leaf.userData.onInteract=notify=>{if(door.open&&doorOccupied(door,world.player)){notify('출입구에서 벗어난 뒤 문을 닫아 주세요.');return;}door.open=!door.open;};targets.push(leaf);const box=new T.Box3().setFromObject(leaf,true);door.colliders.push({box:collision.addBox(box.min.clone(),box.max.clone()),base:box.clone(),dir:leaf.userData.dir});}
  doors.push(door);
 }
 // Use original upward-facing floor polygons, not enclosing rectangles over voids.
 const floorMeshes=staticMeshes.filter(o=>o.userData.kind==='classroom'&&[21,681].includes(o.userData.sourceNode)||o.userData.kind==='hallway'&&o.userData.sourceNode===61||o.userData.kind==='entrance'&&[6,490,492,517,519,521].includes(o.userData.sourceNode));
 const floorTriangles=[];
 for(const o of floorMeshes){const p=o.geometry.attributes.position,idx=o.geometry.index;for(let i=0;i<idx.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,idx.getX(i)).applyMatrix4(o.matrixWorld),b=new T.Vector3().fromBufferAttribute(p,idx.getX(i+1)).applyMatrix4(o.matrixWorld),c=new T.Vector3().fromBufferAttribute(p,idx.getX(i+2)).applyMatrix4(o.matrixWorld);const normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.y<=.00001||Math.max(a.y,b.y,c.y)-Math.min(a.y,b.y,c.y)>.005)continue;const minX=Math.min(a.x,b.x,c.x),maxX=Math.max(a.x,b.x,c.x),minZ=Math.min(a.z,b.z,c.z),maxZ=Math.max(a.z,b.z,c.z);const surface={x0:minX-.006,x1:maxX+.006,z0:minZ-.006,z1:maxZ+.006,height:a.y,triangle:[a,b,c]};collision.surfaces.push(surface);floorTriangles.push(surface);}}
 // Retain the author's 4.4 m storey spacing, with smooth navigation over treads.
 const sx=x=>87.684-x,sz=z=>36.525-z;
 const surface=(x0,x1,z0,z1,h)=>collision.addSurface(sx(x1),sx(x0),sz(z1),sz(z0),typeof h==='function'?(x,z)=>4.395+h(87.684-x,36.525-z):4.395+h);
 surface(90.5037,94.83577,-12.90853,-9.96,.005);
 surface(90.63577,94.63577,-16.411,-12.90853,.005);
 surface(90.63577,92.5689,-19.161,-16.411,(x,z)=>.005-2.2*(-16.411-z)/2.75);
 surface(90.63577,94.63577,-20.66058,-19.161,-2.195);
 surface(92.7689,94.63577,-19.161,-16.411,(x,z)=>-2.195-2.2*(z+19.161)/2.75);
 surface(90.63577,94.63577,-16.411,-12.644,-4.395);
 // Shared seams are 1–6 mm export tolerances; no replacement slabs are overlaid.
 collision.addSurface(-6.9,-3.1,46.47,46.51,4.4);collision.addSurface(-6.9,-3.1,49.15,49.3,0);
 const solid=staticMeshes.filter(o=>{const {kind,role,sourceNode}=o.userData;if(floorMeshes.includes(o))return false;if(kind==='stairs'&&(/floor2_|floor3_|stairs_metal_/.test(role)))return false;return !o.material.transparent||o.material.opacity>.05;});
 const proxies=solid.map(o=>{if(!o.userData.collisionIndices)return o;const g=new T.BufferGeometry();g.setAttribute('position',o.geometry.attributes.position);g.setIndex(o.userData.collisionIndices);const proxy=new T.Mesh(g,o.material);proxy.name=o.name;proxy.matrixWorld.copy(o.matrixWorld);proxy.matrix.copy(o.matrixWorld);proxy.matrixAutoUpdate=false;return proxy;});const collider=new SpatialCollider(proxies);collision.meshes.push(collider);
 // Cell/material batching preserves material UVs and frustum culling along the long hall.
 const safety=buildSafetyGeometry(staticMeshes,collision);
 const groups=new Map();for(const o of staticMeshes){const bounds=new T.Box3().setFromObject(o,true),center=bounds.getCenter(new T.Vector3()),storyRole=o.userData.kind==='classroom'&&/\/(Desk_|Locker_)/.test(o.userData.role)?(/\/Locker_/.test(o.userData.role)?'locker':'desk'):'static',key=storyRole+':'+o.material.uuid+':'+Math.floor(center.x/8)+':'+Math.floor(center.y/4.4)+':'+Math.floor(center.z/8);const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(key))groups.set(key,{material:o.material,kind:o.userData.kind,storyRole,shakePhase:Math.floor(center.x/8)*1.7+Math.floor(center.z/8)*.9,geometries:[]});groups.get(key).geometries.push(g);}
 for(const {material,geometries,kind,storyRole,shakePhase}of groups.values()){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.receiveShadow=true;mesh.name='Static spatial batch';mesh.userData.kind=kind;mesh.userData.shakePhase=shakePhase;batches.push(mesh);mesh.userData.shakeKind=storyRole;if(storyRole!=='static'){if(storyRole==='locker'&&safety.lockers.length){const b=safety.lockers[0],pivot=new T.Vector3((b.min.x+b.max.x)/2,b.min.y,(b.min.z+b.max.z)/2);mesh.geometry.translate(-pivot.x,-pivot.y,-pivot.z);mesh.position.copy(pivot);}storyObjects.push(mesh);}root.add(mesh);occluders.push(mesh);geometries.forEach(g=>g.dispose());}
 const world={root,targets,occluders,doors,storyObjects,safety,resetDoors(){for(const d of doors){d.open=false;d.progress=0;for(let i=0;i<d.leaves.length;i++){d.leaves[i].position.z=0;d.colliders[i].box.min.copy(d.colliders[i].base.min);d.colliders[i].box.max.copy(d.colliders[i].base.max);}}},spawn:new T.Vector3(2,4.4,-8.87),spawnYaw:2.1,spawnPitch:0,player:null,
  zone:p=>p.y<.5?'1층 · 학교 출입구':p.z>46.45?'계단실 · 하행':p.x> -4.1&&p.z<.2?'2층 · 교실':'2층 · 복도',
  navigationHint:p=>p.y<.5?'1층 출입구 · 신발장과 현관으로 이동':p.z>46.45?'왼쪽 하행 계단 ↓ · 중간참에서 반대편 계단으로':p.x> -4.1?'E / 트리거 · 앞문 또는 뒷문 열기':'복도 끝으로 이동 → 계단실',
  update(dt,player){world.player=player;for(const mesh of batches){const kind=mesh.userData.kind;mesh.visible=kind==='stairs'||kind==='classroom'&&player.y>3.6||kind==='hallway'&&player.y>2.8||kind==='entrance'&&player.y<3.8;}for(const door of doors){if(!door.open&&door.progress>.01&&doorOccupied(door,player))door.open=true;door.progress=T.MathUtils.damp(door.progress,door.open?1:0,8,dt);if(Math.abs(door.progress-(door.open?1:0))<.001)door.progress=door.open?1:0;for(let i=0;i<door.leaves.length;i++){const leaf=door.leaves[i],c=door.colliders[i],offset=c.dir*.76*door.progress;leaf.position.z=offset;c.box.min.copy(c.base.min);c.box.max.copy(c.base.max);c.box.min.z+=offset;c.box.max.z+=offset;}}},
  stats:{batches:groups.size,collisionTriangles:collider.triangleCount,floorTriangles:floorTriangles.length},dispose(){root.traverse(o=>o.geometry?.dispose());pending.clear();}};
 return world;
}
function doorOccupied(door,p){if(!p)return false;return door.colliders.some(({base})=>p.y<base.max.y&&p.y+1.7>base.min.y&&p.x>base.min.x-.24&&p.x<base.max.x+.24&&p.z>base.min.z-.24&&p.z<base.max.z+.24);}
