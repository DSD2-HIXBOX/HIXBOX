import test from 'node:test';
import assert from 'node:assert/strict';
import {CollisionWorld} from '../src/core/CollisionWorld.js';
import {buildSchool} from '../src/world/procedural.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})};
function go(c,p,x,z){for(let i=0;i<2000&&Math.hypot(p.x-x,p.z-z)>.025;i++){const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);c.move(p,dx/len*.025,dz/len*.025);}assert.ok(Math.hypot(p.x-x,p.z-z)<.05,`blocked near ${JSON.stringify(p)} going to ${x},${z}`);}
test('school route connects classroom, corridor, stairs, entrance and playground in both directions',()=>{const c=new CollisionWorld(),w=buildSchool(c),p=w.spawn.clone();go(c,p,4.1,3.25);go(c,p,6.5,3.25);go(c,p,6.5,6.5);go(c,p,9.5,6.5);go(c,p,9.5,-2);assert.equal(p.y,0);go(c,p,9.5,-12);assert.equal(w.zone(p),'운동장');go(c,p,9.5,6.5);assert.equal(p.y,3.2);go(c,p,6.5,6.5);go(c,p,6.5,3.25);go(c,p,4.1,3.25);assert.equal(w.zone(p),'2층 교실');});
test('walls, desks, chairs and playground boundary block movement',()=>{const c=new CollisionWorld();buildSchool(c);for(const [start,dx,dz] of [[{x:0,y:3.2,z:-4},0,-4],[{x:-3.3,y:3.2,z:-2.7},0,1],[{x:-3.3,y:3.2,z:-.7},0,-.6],[{x:6,y:0,z:-29},0,-8]]){const before={...start};c.move(start,dx,dz);assert.ok(Math.hypot(start.x-before.x,start.z-before.z)<Math.hypot(dx,dz)-.1);}});
test('unsupported floor and diagonal high-speed movement cannot escape or tunnel',()=>{const c=new CollisionWorld();c.addSurface(-5,5,-5,5,0);c.addBox({x:1,y:0,z:-5},{x:1.1,y:3,z:5});const p={x:0,y:0,z:0};c.move(p,20,2);assert.ok(p.x<.8);c.move(p,0,20);assert.ok(p.z<=5);});
