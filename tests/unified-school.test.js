import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readModel} from '../scripts/read-classroom.mjs';
import {loadUnifiedSchool} from '../src/world/unifiedSchool.js';
import {InteractionSystem} from '../src/core/InteractionSystem.js';
import {CollisionWorld} from '../src/core/CollisionWorld.js';
const models=await Promise.all(['classroom','hallway','stairs','entrance'].map(k=>readModel('unified/'+k+'/')));
const c=new CollisionWorld(),w=await loadUnifiedSchool(c,{models});
function go(p,t){for(let i=0;i<4000&&Math.hypot(p.x-t.x,p.z-t.z)>.035;i++){const dx=t.x-p.x,dz=t.z-p.z,len=Math.hypot(dx,dz),old=p.clone();c.move(p,dx/len*.025,dz/len*.025);assert.ok(Math.abs(p.y-old.y)<.025,'smooth vertical motion');assert.ok(old.distanceTo(p)>1e-7,`blocked at ${p.toArray()} heading ${t.toArray()}`);}assert.ok(p.distanceTo(t)<.05,`${p.toArray()} versus ${t.toArray()}`);}
const route=[[-3,4.4,-1.13],[-5.4,4.4,-1.13],[-5.4,4.4,40],[-5.5,4.4,45.8],[-5.5,4.4,47.8],[-3.8,4.4,47.8],[-3.8,4.4,52.3],[-3.8,2.2,56.2],[-5.8,2.2,56.2],[-5.8,0,52.3],[-5.8,0,48],[-5,0,35]].map(a=>new T.Vector3(...a));
test('spawn is supported and clear',()=>{assert.equal(c.blocked(...w.spawn.toArray()),false);assert.ok(Math.abs(c.floorAt(w.spawn.x,w.spawn.z,4.4)-4.4)<1e-5);});
test('each original two-panel doorway independently blocks, opens, passes and closes',()=>{for(const [id,z]of[-1.13,-8.87].entries()){const d=w.doors[id],p=new T.Vector3(-3,4.4,z);w.update(0,p);assert.equal(d.open,false);c.move(p,-2.4,0);assert.ok(p.x> -4);assert.equal(d.open,false,'closed doors must not open from proximity');d.leaves[0].userData.onInteract(()=>{});w.update(1,new T.Vector3(3.75,4.4,-4.5));go(p,new T.Vector3(-5.4,4.4,z));assert.equal(w.doors[1-id].open,false);go(p,new T.Vector3(-3,4.4,z));d.leaves[1].userData.onInteract(()=>{});w.update(1,p);assert.equal(d.open,false);}});
test('continuous classroom–hallway–two-flight stair–entrance round trip uses shared PC/XR collisions',()=>{w.doors[0].open=true;w.update(1,w.spawn);const p=route[0].clone();for(const t of route.slice(1))go(p,t);assert.ok(Math.abs(p.y)<1e-4);for(const t of route.slice().reverse())go(p,t);assert.ok(Math.abs(p.y-4.4)<1e-4);});
test('walls and rails remain solid; standing under a desk is rejected',()=>{assert.equal(c.blocked(4.14,4.4,-4.5),true);assert.equal(c.blocked(-4.98,2.2,54),true);let shelter=null;for(let x=-2.9;x<3.4&&!shelter;x+=.08)for(let z=-7.7;z<-.9;z+=.08){c.height=.46;if(!c.blocked(x,4.4,z)){c.height=1.7;if(c.blocked(x,4.4,z)){shelter=new T.Vector3(x,4.4,z);break;}}}assert.ok(shelter,'an accessible cavity exists below the furniture');c.height=.46;assert.equal(c.setHeight(shelter,1.7),false);c.height=1.7;});

test('both original doors are selectable from classroom and corridor; spawn reaches the rear aisle',()=>{for(const [id,z]of[-1.13,-8.87].entries()){const d=w.doors[id];d.open=false;w.update(1,w.spawn);for(const x of[-3,-5.4]){const cam=new T.PerspectiveCamera();cam.position.set(x,6.05,z);cam.lookAt(-4.08,6.05,z);cam.updateMatrixWorld(true);w.root.updateMatrixWorld(true);const interaction=new InteractionSystem(w,()=>{});assert.ok(d.leaves.includes(interaction.fromCamera(cam)),`door ${id} visible from ${x}`);}}const p=w.spawn.clone();go(p,new T.Vector3(-3,4.4,-8.87));});
