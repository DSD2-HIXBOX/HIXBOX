import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const STAIRS_MODEL='/models/stairs/scene.gltf';
const SOURCE={left:90.6359,right:94.6359,gapLeft:92.5689,gapRight:92.7689,front:-12.9089,rampFront:-16.411,rampBack:-19.161,back:-20.6609,top:.005};

// Add a separate stairwell beside the existing end landing. No classroom,
// corridor, floor/material, original stair, or existing evacuation geometry edits.
export function addSchoolStairs(world,gltf,collision){
 const nodes=new Map();gltf.parser.associations.forEach((a,o)=>{if(a.nodes!==undefined)nodes.set(a.nodes,o);});
 gltf.scene.updateMatrixWorld(true);
 const entry=new THREE.Box3().setFromObject(nodes.get(29),true);
 const topY=entry.max.y,verticalScale=3.2/4.4;
 const dockX=world.corridorInfo.evacuation.landingCenterX+1.5;
 const dockZ=world.corridorInfo.floor.max.z;
 const placement=new THREE.Group();placement.name='School stairs placement';placement.rotation.y=-Math.PI/2;placement.scale.set(1,verticalScale,1);
 placement.position.set(dockX+entry.max.z,3.2-topY*verticalScale,dockZ-entry.min.x);
 placement.add(gltf.scene);world.root.add(placement);world.root.updateMatrixWorld(true);
 const transform=placement.matrixWorld.clone(),inverse=transform.clone().invert();
 const source={...SOURCE,top:topY};
 const surfaces=[];
 function surface(x0,x1,z0,z1,height,name){
  const box=new THREE.Box3().setFromPoints([new THREE.Vector3(x0,0,z0),new THREE.Vector3(x1,0,z1)].map(v=>v.applyMatrix4(transform)));
  const worldHeight=(x,z)=>{const local=new THREE.Vector3(x,0,z).applyMatrix4(inverse),y=typeof height==='function'?height(THREE.MathUtils.clamp(local.x,x0,x1),THREE.MathUtils.clamp(local.z,z0,z1)):height;return 3.2+(y-topY)*verticalScale;};
  // A 1mm navigation seam tolerance avoids floating-point/export gaps; visual
  // surfaces still meet at their original edges and are never overlaid.
  collision.addSurface(box.min.x-.001,box.max.x+.001,box.min.z-.001,box.max.z+.001,worldHeight);surfaces.push({name,box,height:worldHeight});
 }
 surface(entry.min.x,entry.max.x,entry.min.z,entry.max.z,topY,'entrance');
 surface(source.left,source.right,source.rampFront,source.front,topY,'upper landing');
 surface(source.left,source.gapLeft,source.rampBack,source.rampFront,(x,z)=>topY-2.2*(source.rampFront-z)/(source.rampFront-source.rampBack),'descending flight');
 surface(source.left,source.right,source.back,source.rampBack,topY-2.2,'turn landing');
 surface(source.gapRight,source.right,source.rampBack,source.rampFront,(x,z)=>topY-2.2-2.2*(z-source.rampBack)/(source.rampFront-source.rampBack),'return flight');
 surface(source.left,source.right,source.rampFront,-12.644,topY-4.4,'lower landing');
 // Navigation uses smooth ramps over the visible treads. Do not collide the body
 // against individual risers/nosings; retain detailed wall/ceiling/rail collisions.
 let colliderCount=0;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;let ancestor=o.parent,role='';while(ancestor&&ancestor!==gltf.scene){role+='/'+ancestor.name;ancestor=ancestor.parent;}
  if(/floor2_|floor3_|stairs_metal_/.test(role))return;
  collision.addMesh(o);colliderCount++;
 });
 // The source entry is wider than the existing 3m landing. A matching plain
 // end-wall closes the unused edge above the legacy stair, without blocking it.
 const bounds=new THREE.Box3().setFromObject(placement,true),upperEndZ=dockZ+3;
 const wallMaterial=nodes.get(37).material;
 const cap=new THREE.Mesh(new THREE.BoxGeometry(.08,2.18,bounds.max.z-upperEndZ),wallMaterial);
 cap.name='New stair entrance edge return';cap.position.set(dockX,4.29,(upperEndZ+bounds.max.z)/2);cap.castShadow=true;cap.receiveShadow=true;world.root.add(cap);collision.addMesh(cap);
 // Batch only the newly added static model; original school meshes are untouched.
 const groups=new Map(),oldGeometry=new Set();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  // No image maps are present in this model, so UV/tangent data is unused.
  for(const key of Object.keys(g.attributes))if(!['position','normal','color'].includes(key))g.deleteAttribute(key);
  const key=o.material.uuid+'|'+Object.keys(g.attributes).sort().join(',');if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});groups.get(key).geometries.push(g);oldGeometry.add(o.geometry);
 });
 const root=new THREE.Group();root.name='School stairs · static batches';world.root.add(root);
 for(const {material,geometries} of groups.values()){const geometry=mergeGeometries(geometries);if(!geometry)throw new Error('Stair mesh batching failed');const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;root.add(mesh);geometries.forEach(g=>g.dispose());}
 placement.remove(gltf.scene);world.root.remove(placement);oldGeometry.forEach(g=>g.dispose());
 const toWorld=(x,y,z)=>new THREE.Vector3(x,y,z).applyMatrix4(transform);
 // The source front wall already has an opening on its right-hand half.
 // Enter that existing opening, clear the wall's depth, then reach the down flight.
 const route=[toWorld(93,topY,-11.3),toWorld(91.5,topY,-11.3),toWorld(91.5,topY,-15.9),toWorld(91.5,topY-2.2,-19.6),toWorld(93.5,topY-2.2,-19.6),toWorld(93.5,topY-4.4,-15.9)];
 const previousZone=world.zone;
 world.zone=p=>p.x>dockX+.05&&p.x<bounds.max.x&&p.z>bounds.min.z&&p.z<bounds.max.z?(p.y<.3?'추가 계단실 · 아래층':p.y<2.9?'추가 계단실 · 내려가는 중':'추가 계단실 · 계단참'):previousZone(p);
 world.navigationHint=p=>{
  if(p.x>dockX+.05&&p.x<bounds.max.x&&p.z>bounds.min.z&&p.z<bounds.max.z)return p.y>2.9?'왼쪽 하행 계단 ↓ · 중간참에서 돌아 아래층으로 이동':p.y>.3?'중간참에서 반대편 계단으로 이동':'';
  return p.y>3&&p.x<dockX&&p.x>dockX-3.2&&p.z>dockZ-.8&&p.z<dockZ+3?'오른쪽 출입구 → 추가 계단실':'';
 };
 world.stairs={root,cap,bounds,dockX,dockZ,topY:3.2,bottomY:0,verticalScale,route,surfaces,colliderCount,batches:root.children.length,transform};
 return world;
}
