import * as T from 'three';
import {BagModel} from './BagModel.js';
import {EvacuationAnnouncement,EVACUATION_MESSAGE} from './EvacuationAnnouncement.js';
import {EvacuationState,crossedDoor} from './EvacuationState.js';
import {EvacuationUI} from './EvacuationUI.js';
export class EvacuationStep {
 constructor(options){Object.assign(this,options);this.state=new EvacuationState();this.bag=new BagModel();this.world.root.add(this.bag.root);this.ui=options.ui??new EvacuationUI(this.camera);this.announcement=options.announcement??new EvacuationAnnouncement(this.story.audio);this.collider=this.collision.addBox(new T.Vector3(),new T.Vector3());this.collider.enabled=false;this.previous=new T.Vector3();this.head=new T.Vector3();this.feet=new T.Vector3();this.point=new T.Vector3();this.ray=new T.Raycaster();this.bounds=new T.Box3();this.floorPosition=new T.Vector3();this.raise=0;this.overhead=false;this.hand=null;this.time=0;
  this.bag.root.userData.interaction='가방';this.bag.root.userData.interactionLabel=()=> '가방 집기';this.bag.root.userData.onInteract=()=>this.pickupPC();
 }
 get active(){return this.state.phase!=='idle';}
 reset(){this.announcement.reset();this.state.reset();this.step2.suspended=false;this.collider.enabled=false;this.hand=null;this.overhead=false;this.raise=0;this.time=0;this.bag.root.visible=false;this.world.root.attach(this.bag.root);this.removeTarget();this.ui.update(this.state,'',false,false);try{sessionStorage.removeItem('earthquake-vr-step3');}catch{}}
 removeTarget(){const i=this.world.targets.indexOf(this.bag.root);if(i>=0)this.world.targets.splice(i,1);}
 underDesk(p){return (this.world.safety?.desks??[]).some(d=>p.x>d.minX-.02&&p.x<d.maxX+.02&&p.z>d.minZ-.02&&p.z<d.maxZ+.02&&p.y<d.top+.15);}
 start(){this.state.start();this.step2.suspended=true;this.step2.grab=null;this.pc.resetProtection?.();this.story.quakeScale=0;this.story.restore();this.previous.copy(this.feet);this.time=0;this.hand=null;this.overhead=false;
  const desk=this.world.safety?.desks.find(d=>d.id===this.step2.state.result?.deskId),candidates=[];if(desk){const x=(desk.minX+desk.maxX)/2,z=(desk.minZ+desk.maxZ)/2;for(const dx of [.64,-.64])candidates.push(new T.Vector3(x+dx,desk.floor,z));}candidates.push(this.world.spawn.clone());
  const height=this.collision.height;this.collision.height=1.7;const position=candidates.find(p=>this.collision.floorAt(p.x,p.z,p.y)!==null&&!this.collision.blocked(p.x,p.y,p.z)&&p.x>-3.9&&p.x<3.9)??this.world.spawn;this.collision.height=height;
  this.floorPosition.copy(position).add(new T.Vector3(0,.18,0));this.world.root.attach(this.bag.root);this.bag.root.position.copy(this.floorPosition);this.bag.root.rotation.set(0,0,0);this.bag.root.visible=true;this.collider.min.copy(position).add(new T.Vector3(-.15,0,-.12));this.collider.max.copy(position).add(new T.Vector3(.15,.39,.12));this.collider.enabled=true;this.removeTarget();this.world.targets.push(this.bag.root);this.announcement.start();
 }
 clearRay(from,to){const delta=to.clone().sub(from),distance=delta.length();this.ray.set(from,delta.normalize());this.ray.far=Math.max(0,distance-.04);return !this.ray.intersectObjects(this.world.occluders??[],false).length;}
 canPickup(){this.scene.updateMatrixWorld(true);const xr=this.renderer.xr.isPresenting;(xr?this.renderer.xr.getCamera():this.camera).getWorldPosition(this.head);this.bag.root.getWorldPosition(this.point);return this.state.phase==='classroom'&&!this.state.collected&&!this.underDesk(this.head)&&Math.hypot(this.head.x-this.point.x,this.head.z-this.point.z)<.95&&Math.abs(this.feet.y-4.4)<.2&&this.head.distanceTo(this.point)<1.85&&this.clearRay(this.head,this.point);}
 pickupPC(){if(this.renderer.xr.isPresenting||!this.canPickup())return false;this.state.collected=true;this.collider.enabled=false;this.removeTarget();this.camera.attach(this.bag.root);this.hand=null;this.overhead=false;this.raise=0;return true;}
 handleF(){if(!this.active)return false;if(this.state.phase!=='classroom')return true;if(!this.state.collected){this.notify?.('가방 가까이에서 바라보고 E 키로 집으세요.');return true;}this.overhead=!this.overhead;return true;}
 handleXR(controller,index){if(!this.active)return false;const hand=this.vr.hands.get(index);if(!hand?.grip.visible)return false;
  if(this.hand===hand){this.drop();return true;}if(this.state.collected)return false;hand.grip.getWorldPosition(this.point);const bagPosition=this.bag.root.getWorldPosition(new T.Vector3());if(this.point.distanceTo(bagPosition)>.28||!this.canPickup()||!this.clearRay(hand.grip.getWorldPosition(new T.Vector3()),bagPosition))return false;
  this.state.collected=true;this.collider.enabled=false;this.removeTarget();this.hand=hand;hand.grip.attach(this.bag.root);this.bag.root.position.set(0,.10,-.12);this.bag.root.rotation.set(0,0,0);return true;
 }
 drop(){this.world.root.attach(this.bag.root);this.bag.root.position.copy(this.floorPosition);this.bag.root.rotation.set(0,0,0);this.state.collected=false;this.state.protected=false;this.hand=null;this.overhead=false;this.raise=0;this.collider.enabled=true;this.removeTarget();this.world.targets.push(this.bag.root);}
 get hint(){if(!this.active)return '';if(this.state.phase==='corridor')return 'STEP 04 · 복도 진입 완료 · 다음 안내 대기';return this.state.collected?(this.state.protected?'가방으로 머리 보호 중 · 열린 교실 문으로 이동':this.renderer.xr.isPresenting?'가방을 머리 위로 올려 보호하세요.':'F · 가방을 머리 위로 올리기/내리기'):'';}
 get message(){if(this.state.phase==='corridor')return '복도에 진입했습니다. STEP 04 대피 안내를 준비합니다.';if(this.time<6)return EVACUATION_MESSAGE;if(this.state.protected)return '가방으로 머리를 보호하고 교실 문을 열어 복도로 이동하세요.';if(this.state.collected)return this.renderer.xr.isPresenting?'가방을 머리 위로 올린 뒤 교실 문으로 이동하세요.':'F 키로 가방을 머리 위에 올린 뒤 교실 문으로 이동하세요.';return this.renderer.xr.isPresenting?'책상 아래에서 나와 가까운 가방을 트리거로 집으세요.':'책상 아래에서 나와 가까운 가방을 바라보고 E 키로 집으세요.';}
 update(dt,active){const xr=this.renderer.xr.isPresenting;this.scene.updateMatrixWorld(true);(xr?this.renderer.xr.getCamera():this.camera).getWorldPosition(this.head);this.feet.copy(xr?this.vr.lastSafe:this.rig.position);if(!this.active&&this.step2.state.phase==='ready')this.start();
  if(this.active){if(this.story.phone)this.story.phone.root.visible=false;if(active)this.time+=dt;this.announcement.update(active);
   if(this.state.collected){if(xr){if(this.hand&&(!this.hand.grip.visible||![...this.vr.hands.values()].includes(this.hand)))this.drop();}else{if(this.bag.root.parent!==this.camera)this.camera.attach(this.bag.root);this.raise=T.MathUtils.damp(this.raise,this.overhead?1:0,8,dt);this.bag.root.position.set(T.MathUtils.lerp(.25,0,this.raise),T.MathUtils.lerp(-.25,.20,this.raise),T.MathUtils.lerp(-.60,-.055,this.raise));this.bag.root.rotation.set(this.raise*Math.PI/2,0,0);}}
   this.scene.updateMatrixWorld(true);this.bounds.setFromObject(this.bag.root,true);this.bag.root.getWorldPosition(this.point);const protectedNow=this.state.collected&&(xr?!!this.hand&&this.hand.grip.visible&&this.bounds.min.y>=this.head.y+.04&&this.bounds.min.y<this.head.y+.6&&Math.hypot(this.point.x-this.head.x,this.point.z-this.head.z)<.35:this.overhead&&this.raise>.9);
   if(active){const exitDoor=crossedDoor(this.previous,this.feet,this.step2.doors),completed=this.state.update({protected:protectedNow,exitDoor});if(completed){this.world.trainingState={...this.state.result};try{sessionStorage.setItem('earthquake-vr-step3',JSON.stringify(this.state.result));}catch{}globalThis.dispatchEvent?.(new CustomEvent('step4start',{detail:this.state.result}));}}
   this.previous.copy(this.feet);
  }
  this.ui.update(this.state,this.message,xr,active);
 }
 dispose(){this.announcement.reset();this.removeTarget();this.collider.enabled=false;this.bag.dispose();this.ui.dispose();}
}
