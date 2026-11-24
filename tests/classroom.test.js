import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {readClassroom} from '../scripts/read-classroom.mjs';
import {integrateClassroom} from '../src/world/classroom.js';
import {CollisionWorld} from '../src/core/CollisionWorld.js';
import {PlayerPosture} from '../src/core/PlayerPosture.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
async function setup(){const c=new CollisionWorld(),g=await readClassroom(),w=integrateClassroom(g,c);return {c,w,g};}
function go(c,p,x,z){for(let i=0;i<1600&&Math.hypot(p.x-x,p.z-z)>.025;i++){const dx=x-p.x,dz=z-p.z,l=Math.hypot(dx,dz);c.move(p,dx/l*.04,dz/l*.04);}assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`stopped at ${JSON.stringify(p)} aiming ${x},${z}`);}
test('original asset dependencies exist and front/rear door panels have independent nodes',()=>{const dir=new URL('../public/models/classroom/',import.meta.url),g=JSON.parse(fs.readFileSync(new URL('scene.gltf',dir)));for(const dep of [...g.buffers,...g.images])assert.ok(fs.existsSync(new URL(dep.uri,dir)));assert.equal(g.materials.length,37);assert.equal(g.images.length,22);for(const i of [760,762,764,766])assert.notEqual(g.nodes[i].mesh,g.nodes[756].mesh);assert.equal(g.animations?.length??0,0);});
test('model is metre-scaled and spawn is supported and unobstructed',async()=>{const {c,w}=await setup();const size=w.modelInfo.floor.getSize(new THREE.Vector3());assert.ok(size.x>6&&size.x<6.4);assert.ok(size.z>8.3&&size.z<8.6);assert.equal(c.floorAt(w.spawn.x,w.spawn.z,3.2),3.2);assert.equal(c.blocked(w.spawn.x,w.spawn.y,w.spawn.z),false);assert.equal(w.chairs.length,16);});
test('closed doors block passage; opening enables the full campus route and return',async()=>{const {c,w}=await setup(),p=w.spawn.clone(),door=w.doors[1];go(c,p,4.55,3.5);c.move(p,2,0);assert.ok(p.x<4.8);w.update(0,p);door.moving.userData.onInteract(()=>{});for(let i=0;i<30;i++)w.update(.04,p);assert.equal(door.progress,1);go(c,p,6.5,3.5);go(c,p,6.5,6.5);go(c,p,9.5,6.5);go(c,p,9.5,-12);assert.equal(p.y,0);go(c,p,9.5,6.5);go(c,p,6.5,6.5);go(c,p,6.5,3.5);go(c,p,4.55,3.5);assert.equal(p.y,3.2);});
test('walls remain solid including transparent windows',async()=>{const {c}=await setup();const p=new THREE.Vector3(1,3.2,-3.7);go(c,p,-.4,-3.7);c.move(p,-4,0);assert.ok(p.x>-1.1);c.move(p,0,-4);assert.ok(p.z>-4.2);});
test('pulling a chair creates crawl space; standing under the actual tabletop is rejected',async()=>{const {c,w}=await setup(),p=new THREE.Vector3(.7,3.2,-1.5),posture=new PlayerPosture(c),camera={position:{y:1.65}};
 assert.equal(c.blocked(-.12,3.2,-1.5),true);w.chairs[0].object.userData.onInteract(()=>{});posture.toggle();posture.updatePC(p,camera,.016);assert.equal(camera.position.y,.4);go(c,p,.7,-1.1);go(c,p,-.12,-1.1);go(c,p,-.12,-1.5);assert.equal(c.blocked(p.x,p.y,p.z),false);
 posture.toggle();assert.equal(posture.updatePC(p,camera,.016),false);assert.equal(c.height,.46);assert.equal(camera.position.y,.4);go(c,p,-.12,-1.1);go(c,p,.7,-1.1);assert.equal(posture.updatePC(p,camera,.1),true);assert.equal(c.height,1.7);
});
test('door does not close into the user',async()=>{const {c,w}=await setup(),door=w.doors[1],p=w.spawn.clone();w.update(0,p);door.moving.userData.onInteract(()=>{});w.update(1,p);assert.equal(door.progress,1);const onThreshold=new THREE.Vector3(4.96,3.2,3.5);w.update(0,onThreshold);door.moving.userData.onInteract(()=>{});assert.equal(door.target,1);assert.equal(c.blocked(onThreshold.x,onThreshold.y,onThreshold.z),false);});
test('VR tracked height shares crawl collision and cannot rise through a tabletop',async()=>{const {c,w}=await setup(),posture=new PlayerPosture(c),p=new THREE.Vector3(-.12,3.2,-1.5);w.chairs[0].object.userData.onInteract(()=>{});assert.equal(posture.updateVR(p,.40),true);assert.ok(c.height<.47);assert.equal(posture.updateVR(p,1.65),false);assert.ok(c.height<.47);p.set(.7,3.2,-1.1);assert.equal(posture.updateVR(p,1.65),true);assert.ok(c.height>1.6);});
