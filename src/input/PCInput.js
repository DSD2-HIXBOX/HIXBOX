import * as THREE from 'three';
export class PCInput {
 constructor(camera,canvas,interactions,onLock,posture){this.onLock=onLock;this.dragMode=false;this.dragging=false;this.posture=posture;this.camera=camera;this.canvas=canvas;this.keys=new Set();this.headProtected=false;this.yaw=.65;this.pitch=-.06;this.applyView();
 document.addEventListener('keydown',e=>{if(!this.active)return;if(e.code==='Escape'&&this.dragMode){this.dragMode=false;this.keys.clear();onLock(false);return;}if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyE','KeyF','KeyC','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.code==='KeyF'&&!e.repeat&&!this.onProtection?.())this.headProtected=!this.headProtected;if(['KeyC','ControlLeft','ControlRight'].includes(e.code)&&!e.repeat)posture.toggle();if(e.code==='KeyE'&&!e.repeat&&!this.onPrimary?.())interactions.activate();});
 document.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.keys.clear());
 document.addEventListener('pointerlockchange',()=>{this.keys.clear();if(!this.dragMode)onLock(document.pointerLockElement===canvas);});
 canvas.addEventListener('mousedown',e=>{if(e.button===0)this.dragging=true;});document.addEventListener('mouseup',()=>this.dragging=false);
 document.addEventListener('mousemove',e=>{if(!this.active||(this.dragMode&&!this.dragging))return;this.yaw-=e.movementX*.002;this.pitch=THREE.MathUtils.clamp(this.pitch-e.movementY*.002,-1.45,1.45);this.applyView();});}
 get active(){return document.pointerLockElement===this.canvas||this.dragMode;}
 resetProtection(){this.headProtected=false;}
 applyView(){this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
 async start(){try{await this.canvas.requestPointerLock();this.dragMode=false;return true;}catch{this.dragMode=true;this.onLock(true);return false;}}
 update(dt,rig,collision){if(!this.active)return;this.posture.updatePC(rig.position,this.camera,dt);const x=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')),z=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'));const v=new THREE.Vector3(x,0,z);if(v.lengthSq()>0)v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw).multiplyScalar(dt*(this.posture.crouched?.65:this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?3.4:1.8));collision.move(rig.position,v.x,v.z);}
}
