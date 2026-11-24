import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readClassroom,readModel} from '../scripts/read-classroom.mjs';
import {connectSchool} from '../src/world/corridor.js';
import {classroomFloor,reuseFloorMaterial} from '../src/world/floorContinuity.js';
import {CollisionWorld} from '../src/core/CollisionWorld.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
async function setup(){const g=await readClassroom(),corridor=await readModel('corridor/connected/'),source=classroomFloor(g),snapshot=source.geometry.attributes.position.array.slice();const c=new CollisionWorld(),w=connectSchool(g,corridor,c);return {w,c,source,snapshot};}
function floorHit(mesh,x,z){const hits=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh,false);assert.ok(hits.length>0,`floor gap at ${x},${z}`);return hits[0];}
function area(mesh,geometry=mesh.geometry){const p=geometry.attributes.position,index=geometry.index;let sum=0;for(let i=0;i<(index?.count??p.count);i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));sum+=new THREE.Triangle(...v).getArea();}return sum;}
test('classroom shape is untouched; corridor shares the exact original material and texture',async()=>{const {w,source,snapshot}=await setup(),f=w.floorContinuity;assert.equal(f.target.material,source.material);assert.equal(f.target.material.map,source.material.map);assert.deepEqual(source.geometry.attributes.position.array,snapshot);assert.ok(f.triangles<200);});
test('corridor floor footprint and area stay unchanged without enlarging classroom geometry',async()=>{const {w}=await setup(),f=w.floorContinuity;const oldArea=area(f.target,f.sourceGeometry),newArea=area(f.target);assert.ok(Math.abs(newArea-oldArea)<.0002);const original=new THREE.Box3().setFromBufferAttribute(f.sourceGeometry.attributes.position).applyMatrix4(f.target.matrixWorld),current=new THREE.Box3().setFromObject(f.target,true);for(const axis of ['x','z']){assert.ok(Math.abs(original.min[axis]-current.min[axis])<1e-5);assert.ok(Math.abs(original.max[axis]-current.max[axis])<1e-5);}});
test('real rendered floor UVs align across both thresholds, including the original uneven UV rows',async()=>{const {w}=await setup(),f=w.floorContinuity,x=f.projection.bounds.max.x,epsilon=.001;
 for(const d of w.doors)for(let z=d.opening.min.z+.02;z<d.opening.max.z-.02;z+=.073){const left=floorHit(f.source,x-epsilon,z),right=floorHit(f.target,x+epsilon,z);assert.ok(Math.abs(left.point.y-right.point.y)<1e-6);assert.ok(Math.abs(left.uv.y-right.uv.y)<1e-6,`V discontinuity at ${z}`);assert.ok(Math.abs((right.uv.x-left.uv.x)-2*epsilon/(f.projection.bounds.max.x-f.projection.bounds.min.x))<1e-6);}
});
test('corridor render height and upward normals match the collision floor everywhere',async()=>{const {w,c}=await setup(),f=w.floorContinuity,p=f.target.geometry.attributes.position,n=f.target.geometry.attributes.normal;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(f.target.matrixWorld);assert.ok(Math.abs(v.y-3.2)<1e-6);const normal=new THREE.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(f.target.matrixWorld));assert.ok(normal.y>.999999);}for(const z of [-10,-3,0,3,10])assert.equal(c.floorAt(6,z,3.2),3.2);});
test('actual GLTFLoader parses corridor while skipping all three obsolete floor textures',async()=>{
 const dir=new URL('../public/models/corridor/connected/',import.meta.url),json=JSON.parse(fs.readFileSync(new URL('scene.gltf',dir)));
 for(const b of json.buffers)b.uri='data:application/octet-stream;base64,'+fs.readFileSync(new URL(b.uri,dir)).toString('base64');
 const requests=[],material=new THREE.MeshPhysicalMaterial();
 const loader=new GLTFLoader().register(reuseFloorMaterial(material)).register(parser=>({name:'TrackImageRequests',loadTexture(index){requests.push(parser.json.images[parser.json.textures[index].source].uri);return Promise.resolve(new THREE.Texture());}}));
 const model=await loader.parseAsync(JSON.stringify(json),'');
 assert.ok(requests.length>=8);assert.ok(requests.every(uri=>!uri.includes('/Floor_')));
 let floor;model.parser.associations.forEach((a,o)=>{if(a.nodes===6)floor=o;});assert.equal(floor.material,material);
});
