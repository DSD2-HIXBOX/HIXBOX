import * as THREE from 'three';
import {CollisionWorld} from '../core/CollisionWorld.js';
import {buildSchool} from './procedural.js';
import {integrateClassroom} from './classroom.js';
import {classroomFloor,matchCorridorFloor} from './floorContinuity.js';
export const CORRIDOR_MODEL='/models/corridor/connected/scene.gltf';
export const CORRIDOR_OFFSET_X=7.322089858604448;
export const CORRIDOR_END_Z=11.62596295119889;

// Reuse the existing evacuation stair/entrance/playground beyond the corridor end.
// Its collision data receives the same rigid transform as its visual geometry.
function evacuationCampus(collision){
 const local=new CollisionWorld(),campus=buildSchool(local,{includeClassroom:false,includeCorridor:false});
 const landingCenterX=CORRIDOR_OFFSET_X+(-2.322089858604448+2.1423699376947436)/2;
 const tx=landingCenterX+9.5,tz=CORRIDOR_END_Z+8;
 campus.root.position.set(tx,0,tz);campus.root.rotation.y=Math.PI;campus.root.updateMatrixWorld(true);
 const matrix=campus.root.matrixWorld.clone();
 for(const b of local.boxes){const box=new THREE.Box3(new THREE.Vector3(b.min.x,b.min.y,b.min.z),new THREE.Vector3(b.max.x,b.max.y,b.max.z)).applyMatrix4(matrix);collision.addBox(box.min,box.max);}
 for(const s of local.surfaces)collision.addSurface(tx-s.x1,tx-s.x0,tz-s.z1,tz-s.z0,typeof s.height==='function'?(x,z)=>s.height(tx-x,tz-z):s.height);
 const originalZone=campus.zone;campus.zone=p=>originalZone(new THREE.Vector3(tx-p.x,p.y,tz-p.z));
 // Wrap the transformed procedural group so imported models keep world coordinates.
 const root=new THREE.Group();root.name='Connected school';root.add(campus.root);
 return {...campus,root,evacuationTransform:{x:tx,z:tz,landingCenterX}};
}
export function connectSchool(classroomGltf,corridorGltf,collision,options={}){
 const campus=evacuationCampus(collision);
 const world=integrateClassroom(classroomGltf,collision,{campus});
 const corridor=new THREE.Group();corridor.name='Japanese corridor · connected derivative';corridor.position.set(CORRIDOR_OFFSET_X,3.2,0);corridor.add(corridorGltf.scene);world.root.add(corridor);world.root.updateMatrixWorld(true);
 const nodes=new Map();corridorGltf.parser.associations.forEach((a,o)=>{if(a.nodes!==undefined)nodes.set(a.nodes,o);});
 const bounds=o=>new THREE.Box3().setFromObject(o,true);
 const floorContinuity=matchCorridorFloor(classroomFloor(classroomGltf),nodes.get(6),options);
 const floor=bounds(nodes.get(6));
 // The source floor has only micrometres of FBX rotation drift; share exact Y=3.2.
 collision.addSurface(floor.min.x,floor.max.x,floor.min.z,floor.max.z,3.2);
 collision.addMesh(nodes.get(5));
 collision.addMesh(corridorGltf.scene.getObjectByName('Shared_facade_returns'));
 const windows=bounds(nodes.get(4));collision.addBox(windows.min.clone(),windows.max.clone());
 // Preserve the opposite original stair and register its actual horizontal treads.
 const stair=nodes.get(8);stair.updateWorldMatrix(true,false);const p=stair.geometry.attributes.position,index=stair.geometry.index;
 let treads=0;
 for(let i=0;i<(index?.count??p.count);i+=3){const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(stair.matrixWorld));const box=new THREE.Box3().setFromPoints(vertices);const normal=new THREE.Vector3().crossVectors(vertices[1].clone().sub(vertices[0]),vertices[2].clone().sub(vertices[0]));
  if(box.max.y-box.min.y<.005&&box.max.z<floor.min.z+.01&&Math.abs(normal.y)>.01){collision.addSurface(box.min.x,box.max.x,box.min.z,box.max.z,(box.min.y+box.max.y)/2);treads++;}
 }
 const originalStair=bounds(stair);
 for(const x of [originalStair.min.x,originalStair.max.x])collision.addBox({x:x-.04,y:3.2,z:originalStair.min.z},{x:x+.04,y:7.7,z:floor.min.z});
 corridorGltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;}});
 const previousZone=world.zone;
 world.zone=p=>p.y>=3.0&&p.x>=floor.min.x-.03&&p.x<=windows.max.x+.03&&p.z>=floor.min.z&&p.z<=floor.max.z?'2층 실제 복도':p.z<floor.min.z&&p.y>=3?'복도 끝 원본 계단':previousZone(p);
 world.corridor=corridor;world.corridorInfo={floor,windows,originalStair,treads,evacuation:campus.evacuationTransform};world.floorContinuity=floorContinuity;
 return world;
}
