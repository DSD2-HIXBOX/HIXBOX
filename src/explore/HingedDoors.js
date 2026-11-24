import * as T from 'three';
export class DoorSlab {
 constructor(pivot,localBox){this.pivot=pivot;this.localBox=localBox;this.inverse=new T.Matrix4();this.p=new T.Vector3();this.enabled=true;}
 intersects(x,y,z,height,radius){if(!this.enabled)return false;this.pivot.updateWorldMatrix(true,false);this.inverse.copy(this.pivot.matrixWorld).invert();this.p.set(x,y,z).applyMatrix4(this.inverse);const b=this.localBox;if(this.p.y+.08>=b.max.y||this.p.y+height<=b.min.y)return false;const nx=T.MathUtils.clamp(this.p.x,b.min.x,b.max.x),nz=T.MathUtils.clamp(this.p.z,b.min.z,b.max.z);return (this.p.x-nx)**2+(this.p.z-nz)**2<radius*radius;}
}
export function installDoors(root,manifest,nodeObjects,collision,notify=()=>{}){
 collision.exits=manifest.doors.filter(d=>d.motion==='hinge');root.updateMatrixWorld(true);const doors=[],targets=[],movingMeshes=new Set();
 for(const cfg of manifest.doors){let parts=cfg.leaves.map(l=>l.nodeIndices.map(i=>nodeObjects.get(i)).filter(Boolean));if(parts.some(p=>!p.length)){notify(`${cfg.id}: 원본 문짝을 찾을 수 없어 고정 상태로 유지합니다.`);continue;}
 const door={id:cfg.id,label:cfg.label??`교실 출입문 ${doors.length+1}`,open:false,progress:0,leaves:[],floor:cfg.floor,config:cfg,blocked:false};
 for(let j=0;j<2;j++){const leafCfg=cfg.leaves[j],pivot=new T.Group();pivot.name=`${cfg.id}-slide-${j}`;pivot.position.fromArray(leafCfg.pivot);root.add(pivot);pivot.updateMatrixWorld(true);for(const o of parts[j]){pivot.attach(o);o.traverse(m=>{if(m.isMesh)movingMeshes.add(m);});}root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(pivot,true).translate(pivot.position.clone().negate()),slab=new DoorSlab(pivot,box);collision.meshes.push(slab);pivot.userData.interaction=door.label;pivot.userData.interactionLabel=()=>`E 키로 문 ${door.open?'닫기':'열기'}`;pivot.userData.onInteract=()=>{door.open=!door.open;door.blocked=false;};const moving=cfg.motion!=='hinge'&&j===(cfg.movingLeaf??0),other=cfg.leaves[1-j],distance=moving?((other.min[cfg.axis==='x'?0:2]+other.max[cfg.axis==='x'?0:2])-(leafCfg.min[cfg.axis==='x'?0:2]+leafCfg.max[cfg.axis==='x'?0:2]))/2:0;door.leaves.push({pivot,slab,closedPosition:pivot.position.clone(),angle:cfg.motion==='hinge'?leafCfg.angle:0,slide:new T.Vector3(cfg.axis==='x'?distance:0,0,cfg.axis==='z'?distance:0)});targets.push(pivot);}
 const aperture=cfg.motion==='hinge'?cfg:cfg.leaves[cfg.movingLeaf??0];door.openingCenter=new T.Vector3(...aperture.min).add(new T.Vector3(...aperture.max)).multiplyScalar(.5);doors.push(door);
 }
 function setProgress(door,p){for(const l of door.leaves){l.pivot.position.copy(l.closedPosition).addScaledVector(l.slide,p);l.pivot.rotation.y=l.angle*p;l.pivot.updateMatrixWorld(true);}}
 return {doors,targets,movingMeshes,update(dt,player){for(const d of doors){const target=d.open?1:0,old=d.progress;if(Math.abs(old-target)<1e-5)continue;let candidate=T.MathUtils.damp(old,target,6,dt);if(Math.abs(candidate-target)<.001)candidate=target;
 // Test the full swept translation in small increments. A closing/opening leaf
 // stops before it can enter the PC or room-scale VR collision body.
 let accepted=old,blocked=false,steps=Math.max(1,Math.ceil(Math.abs(candidate-old)*Math.max(...d.leaves.map(l=>Math.max(l.slide.length(),Math.abs(l.angle)*1.2)))/.02));for(let i=1;i<=steps;i++){const p=T.MathUtils.lerp(old,candidate,i/steps);setProgress(d,p);if(player&&d.leaves.some(l=>l.slab.intersects(player.x,player.y,player.z,collision.height,collision.radius+.025))){blocked=true;break;}accepted=p;}setProgress(d,accepted);d.progress=accepted;if(blocked&&!d.blocked)notify('문이 움직일 공간에서 잠시 벗어나 주세요.');d.blocked=blocked;}
 },reset(){for(const d of doors){d.open=false;d.progress=0;d.blocked=false;setProgress(d,0);}}};
}
