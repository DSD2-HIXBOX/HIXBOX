import * as THREE from 'three';
import {buildSchool} from './procedural.js';

export const CLASSROOM_MODEL='/models/classroom/scene.gltf';
export const CLASSROOM_SCALE=28;
const DOORS=[{id:'front',label:'왼쪽(앞) 문',moving:760,fixed:762},{id:'rear',label:'오른쪽(뒤) 문',moving:764,fixed:766}];

export function integrateClassroom(gltf,collision,options={}){
 const campus=options.campus??buildSchool(collision,{includeClassroom:false});
 const classroom=new THREE.Group();classroom.name='Imported classroom (metres)';classroom.scale.setScalar(CLASSROOM_SCALE);classroom.position.set(5-.1064907*28,3.2,.0018734*28);classroom.add(gltf.scene);campus.root.add(classroom);campus.root.updateMatrixWorld(true);
 const byNode=new Map();gltf.parser.associations.forEach((association,object)=>{if(association.nodes!==undefined)byNode.set(association.nodes,object);});
 const node=index=>{const object=byNode.get(index);if(!object)throw new Error(`교실 모델 노드 ${index}가 없습니다. 모델별 설정을 확인하세요.`);return object;};
 const bounds=object=>new THREE.Box3().setFromObject(object,true);
 const addBox=object=>{const b=bounds(object);for(const axis of ['x','y','z'])if(b.max[axis]-b.min[axis]<.025){b.min[axis]-=.0125;b.max[axis]+=.0125;}return collision.addBox(b.min.clone(),b.max.clone());};
 const floor=bounds(node(3));collision.addSurface(floor.min.x,floor.max.x,floor.min.z,floor.max.z,3.2);
 // Per-piece triangle collision leaves the actual free space under furniture open.
 node(156).traverse(o=>{if(o.isMesh)collision.addMesh(o);});
 for(const index of [5,7,24,786])addBox(node(index));
 for(const index of [768,770,772])addBox(node(index));
 node(773).traverse(o=>{if(o.isMesh)addBox(o);});
 const doors=DOORS.map(spec=>{
  const moving=node(spec.moving),fixed=node(spec.fixed),closed=bounds(moving),fixedBounds=bounds(fixed);
  const opening=closed.clone().union(fixedBounds),distance=closed.max.z-closed.min.z;
  // Convert a world-space slide along -Z into the original parent's coordinates.
  const inverse=moving.parent.matrixWorld.clone().invert();
  const delta=new THREE.Vector3(0,0,-distance).applyMatrix4(inverse).sub(new THREE.Vector3().applyMatrix4(inverse));
  const collider=addBox(moving),fixedCollider=addBox(fixed);
  return {...spec,moving,fixed,opening,closed,collider,fixedCollider,delta,base:moving.position.clone(),progress:0,target:0};
 });
 // Side wall is a single mesh with openings: don't use its enclosing AABB.
 const wall=bounds(node(756)),intervals=doors.map(d=>d.opening).sort((a,b)=>a.min.z-b.min.z);
 let z=wall.min.z;
 for(const opening of intervals){collision.addBox({x:wall.min.x-.015,y:3.2,z},{x:wall.max.x+.015,y:6.5,z:opening.min.z});collision.addBox({x:wall.min.x-.015,y:opening.max.y,z:opening.min.z},{x:wall.max.x+.015,y:6.5,z:opening.max.z});z=opening.max.z;}
 collision.addBox({x:wall.min.x-.015,y:3.2,z},{x:wall.max.x+.015,y:6.5,z:wall.max.z});
 // Thin threshold bridges the authored classroom floor and existing corridor.
 for(const d of doors)collision.addSurface(floor.max.x,5.12,d.opening.min.z,d.opening.max.z,3.2);
 let currentBody=null;
 const chairs=[];
 node(156).traverse(object=>{if(!/^chair17(?:_\d+)?$/.test(object.name))return;
  const chair={object,base:object.position.clone(),pulled:false,colliders:[]};
  object.traverse(mesh=>{if(mesh.isMesh){const old=collision.meshes.find(c=>c.name===mesh.name);if(old)chair.colliders.push(old);}});
  const inverse=object.parent.matrixWorld.clone().invert();
  const delta=new THREE.Vector3(0,0,.65).applyMatrix4(inverse).sub(new THREE.Vector3().applyMatrix4(inverse));
  object.userData.interaction='의자';object.userData.interactionLabel=()=>chair.pulled?'의자 넣기':'의자 빼기';
  object.userData.onInteract=notify=>{
   const oldBounds=bounds(object),shift=chair.pulled?-.65:.65;
   const swept=oldBounds.clone().union(oldBounds.clone().translate(new THREE.Vector3(0,0,shift)));
   if(bodyOverlaps(swept,currentBody,collision.height)){notify('의자 옆으로 이동한 뒤 다시 눌러 주세요.');return;}
   chair.pulled=!chair.pulled;object.position.copy(chair.base).addScaledVector(delta,chair.pulled?1:0);object.updateWorldMatrix(true,true);
   collision.meshes=collision.meshes.filter(c=>!chair.colliders.includes(c));chair.colliders=[];
   object.traverse(mesh=>{if(mesh.isMesh)chair.colliders.push(collision.addMesh(mesh));});
   notify(chair.pulled?'의자를 뺐습니다. C키 또는 VR X버튼으로 숙인 뒤 책상 뒤쪽으로 들어가세요.':'의자를 넣었습니다.');
  };chairs.push(chair);campus.targets.push(object);
 });
 function bodyOverlaps(box,body,height){if(!body||body.y+height<=box.min.y||body.y+.04>=box.max.y)return false;const x=THREE.MathUtils.clamp(body.x,box.min.x,box.max.x),z=THREE.MathUtils.clamp(body.z,box.min.z,box.max.z);return (body.x-x)**2+(body.z-z)**2<(collision.radius+.025)**2;}
 function updateDoor(d,progress){d.progress=progress;d.moving.position.copy(d.base).addScaledVector(d.delta,progress);d.moving.updateWorldMatrix(true,true);const b=bounds(d.moving);d.collider.min.copy(b.min);d.collider.max.copy(b.max);}
 for(const door of doors){for(const object of [door.moving,door.fixed]){object.userData.interaction=`교실 ${door.label}`;object.userData.interactionLabel=()=>`${door.label} ${door.target?'닫기':'열기'}`;object.userData.onInteract=notify=>{if(door.target){const swept=door.closed.clone().union(bounds(door.moving));if(bodyOverlaps(swept,currentBody,collision.height)){notify('문이 닫히는 위치에서 벗어난 뒤 다시 눌러 주세요.');return;}}
 door.target=1-door.target;notify(`${door.label}을 ${door.target?'엽니다. 열린 쪽으로 복도에 나갈 수 있습니다.':'닫습니다.'}`);};campus.targets.push(object);}}
 function update(dt,body){currentBody=body;
  for(const d of doors){if(d.progress===d.target)continue;const next=THREE.MathUtils.clamp(d.progress+Math.sign(d.target-d.progress)*dt*1.6,0,1);
   const proposed=d.closed.clone().translate(new THREE.Vector3(0,0,-(d.closed.max.z-d.closed.min.z)*next));const swept=proposed.clone().union(bounds(d.moving));
   if(bodyOverlaps(swept,body,collision.height)){d.target=d.target===0?1:0;continue;}updateDoor(d,next);if(Math.abs(next-d.target)<.001)updateDoor(d,d.target);
  }
 }
 // Original base colors, maps, UVs, metal/roughness and transparency are untouched.
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=!o.material.transparent;o.receiveShadow=true;}});
 // Aisle beside the rear door, facing the front chalkboard (-Z).
 const spawn=new THREE.Vector3(4.55,3.2,3.35);
 if(collision.blocked(spawn.x,spawn.y,spawn.z))throw new Error('교실 시작 위치가 충돌체와 겹칩니다.');
 return {...campus,spawn,spawnYaw:.55,spawnPitch:0,doors,chairs,classroom,update,
  zone:p=>p.y>2.9&&p.x<5.1?'2층 실제 교실':campus.zone(p),
  modelInfo:{scale:CLASSROOM_SCALE,bounds:bounds(classroom),floor,materials:37,textures:22,doorNodes:DOORS},
 };
}
