import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
export class VRInput {
 constructor(renderer,rig,camera,collision,interaction,notify,posture,trackingOrigin){Object.assign(this,{renderer,rig,camera,collision,interaction,notify,posture,trackingOrigin});this.hands=new Map();this.virtualCrouch=false;this.crouchPressed=false;this.safeHeadHeight=1.65;this.turnReady=true;const factory=new XRControllerModelFactory();
 for(let i=0;i<2;i++){const controller=renderer.xr.getController(i);trackingOrigin.add(controller);controller.addEventListener('selectstart',()=>{if(this.onPrimary?.(controller,i))return;const target=interaction.fromController(controller);interaction.activate(target);});
 const ray=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-2.5)]),new THREE.LineBasicMaterial({color:0xc5d9ae}));controller.add(ray);
 // Fallback grip is visible even when an input profile model cannot load.
 const grip=renderer.xr.getControllerGrip(i);grip.addEventListener('connected',event=>{this.hands.set(i,{grip,source:event.data});});grip.addEventListener('disconnected',()=>this.hands.delete(i));const fallback=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.13,8),new THREE.MeshStandardMaterial({color:0x626d63}));fallback.rotation.x=Math.PI/2;grip.add(fallback);grip.add(factory.createControllerModel(grip));trackingOrigin.add(grip);}
 this.lastSafe=new THREE.Vector3();this.hasSafe=false;
 }
 get rightHand(){return [...this.hands.values()].find(h=>h.source.handedness==='right');}
 dead(v){return Math.abs(v)>.18?v:0;}
 update(dt){const session=this.renderer.xr.getSession();if(!session)return;const xrCamera=this.renderer.xr.getCamera();const head=new THREE.Vector3();xrCamera.getWorldPosition(head);
 // Move the collision body to the tracked head's horizontal position. Prevent
 // physical room-scale motion from slipping through virtual walls.
 // X (left controller button 4) toggles seated-accessible crawling. Real
 // headset crouching is tracked without changing the user's physical floor.
 const left=[...session.inputSources].find(s=>s.handedness==='left');
 const pressed=!!left?.gamepad?.buttons[4]?.pressed;
 if(pressed&&!this.crouchPressed)this.virtualCrouch=!this.virtualCrouch;
 this.crouchPressed=pressed;
 const body=new THREE.Vector3(head.x,this.rig.position.y,head.z);
 const naturalHeight=head.y-this.rig.position.y-this.trackingOrigin.position.y;
 const wanted=this.virtualCrouch?Math.min(naturalHeight,.40):naturalHeight;
 if(this.posture.updateVR(body,wanted))this.safeHeadHeight=wanted;
 // Hold the virtual eye below overhead furniture until it is safe to rise.
 this.trackingOrigin.position.y=Math.min(0,this.safeHeadHeight-naturalHeight);
 if(!this.hasSafe){this.lastSafe.copy(body);this.hasSafe=true;}
 const physical=body.clone().sub(this.lastSafe);const next=this.lastSafe.clone();this.collision.move(next,physical.x,physical.z);
 this.rig.position.x+=next.x-body.x;this.rig.position.z+=next.z-body.z;this.rig.position.y=next.y;this.lastSafe.copy(next);
 for(const source of session.inputSources){const pad=source.gamepad;if(!pad)continue;const axes=pad.axes;const ax=axes.length>=4?axes[2]:axes[0]??0,ay=axes.length>=4?axes[3]:axes[1]??0;
 if(source.handedness==='left'&&this.locomotionEnabled!==false){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(xrCamera.getWorldQuaternion(new THREE.Quaternion()));forward.y=0;forward.normalize();const right=new THREE.Vector3(-forward.z,0,forward.x);const v=forward.multiplyScalar(-this.dead(ay)).addScaledVector(right,this.dead(ax));if(v.length()>1)v.normalize();v.multiplyScalar(dt*(this.collision.height<1?.6:1.5));const moved=next.clone();this.collision.move(moved,v.x,v.z);this.rig.position.add(moved.clone().sub(next));next.copy(moved);this.lastSafe.copy(next);}
 if(source.handedness==='right'){if(Math.abs(ax)<.25)this.turnReady=true;if(Math.abs(ax)>.65&&this.turnReady){this.turnReady=false;const angle=-Math.sign(ax)*Math.PI/6;const pivot=new THREE.Vector3();xrCamera.getWorldPosition(pivot);const offset=this.rig.position.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(0,1,0),angle);this.rig.position.copy(pivot).add(offset);this.rig.rotation.y+=angle;}}}
 }
 reset(){this.hasSafe=false;this.turnReady=true;this.virtualCrouch=false;this.crouchPressed=false;this.safeHeadHeight=1.65;if(this.trackingOrigin)this.trackingOrigin.position.y=0;}
}
