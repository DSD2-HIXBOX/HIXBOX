// Remove only identified exterior tree billboards and Snake Plant leaves.
// Keep every retained geometry buffer, texture, material and node transform exact.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import * as T from 'three';
import {loadGLB,readAccessor} from '../lib/glb.mjs';
const base='public/models/explore/',backup='backups/school-walk-before-1.7';
fs.mkdirSync(backup,{recursive:true});
for(const f of ['render-source.glb','render.glb','collision.bin','collision.bin.gz']) {
  if(fs.existsSync(`${backup}/${f}`))throw Error('Backup exists; refusing to overwrite '+f);
  fs.copyFileSync(base+f,`${backup}/${f}`);
}
const s=loadGLB(base+'render-source.glb'),g=s.g,removed=[],triangleHashes=new Set();
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [i,m] of s.world){
  const n=g.nodes[i];if(n.mesh===undefined)continue;
  const ps=g.meshes[n.mesh].primitives;
  const isPlant=p=>[19,20,21,22,150].includes(p.material);
  if(!ps.some(isPlant))continue;
  if(!ps.every(isPlant))throw Error('Mixed plant/structure node '+i);
  let triangles=0;
  for(const p of ps){
    const a=readAccessor(s,p.attributes.POSITION),ix=p.indices===undefined?Array.from({length:a.length/3},(_,j)=>j):readAccessor(s,p.indices);
    for(let k=0;k<ix.length;k+=3){
      const v=[0,1,2].map(j=>new T.Vector3().fromArray(a,ix[k+j]*3).applyMatrix4(m));
      if(m.determinant()<0)[v[1],v[2]]=[v[2],v[1]];
      const raw=Float32Array.from(v.flatMap(p=>p.toArray()));triangleHashes.add(hash(Buffer.from(raw.buffer)));triangles++;
    }
  }
  removed.push({node:i,name:n.name,materials:ps.map(p=>g.materials[p.material].name),triangles});
  delete n.mesh;n.extras={...n.extras,removed:'v1.7-exterior-vegetation'};
}
// Compact only referenced buffers; retained bytes are copied without conversion.
const usedMeshes=[...new Set(g.nodes.flatMap(n=>n.mesh===undefined?[]:[n.mesh]))],meshMap=new Map(usedMeshes.map((x,i)=>[x,i]));
g.meshes=usedMeshes.map(i=>g.meshes[i]);for(const n of g.nodes)if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);
const usedAcc=[...new Set(g.meshes.flatMap(m=>m.primitives.flatMap(p=>[...Object.values(p.attributes),...(p.indices===undefined?[]:[p.indices])])) )];
const accMap=new Map(usedAcc.map((x,i)=>[x,i]));
g.accessors=usedAcc.map(i=>g.accessors[i]);
for(const m of g.meshes)for(const p of m.primitives){for(const k of Object.keys(p.attributes))p.attributes[k]=accMap.get(p.attributes[k]);if(p.indices!==undefined)p.indices=accMap.get(p.indices);}
const usedViews=[...new Set([...g.accessors.map(a=>a.bufferView),...g.images.map(i=>i.bufferView)])],viewMap=new Map(usedViews.map((x,i)=>[x,i]));
const chunks=[];let size=0;
g.bufferViews=usedViews.map(i=>{const v=g.bufferViews[i],raw=s.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),pad=(-size)&3;chunks.push(Buffer.alloc(pad),raw);size+=pad;const out={...v,buffer:0,byteOffset:size};size+=raw.length;return out;});
for(const a of g.accessors)a.bufferView=viewMap.get(a.bufferView);for(const i of g.images)i.bufferView=viewMap.get(i.bufferView);
g.buffers=[{byteLength:size}];
let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((-json.length)&3,32)]);let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((-bin.length)&3)]);
const h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(base+'render.glb',Buffer.concat([h,json,bh,bin]));
const collision=fs.readFileSync(base+'collision.bin'),keep=[];let removedCollision=0;
for(let k=0;k<collision.length;k+=36){const b=collision.subarray(k,k+36);if(triangleHashes.has(hash(b)))removedCollision++;else keep.push(b);}
const cleaned=Buffer.concat(keep);fs.writeFileSync(base+'collision.bin',cleaned);fs.writeFileSync(base+'collision.bin.gz',gzipSync(cleaned,{level:9}));
const report={version:'1.7',removedNodes:removed.length,removedTriangles:removed.reduce((a,n)=>a+n.triangles,0),removedCollisionTriangles:removedCollision,beforeBytes:fs.statSync(backup+'/render-source.glb').size,afterBytes:fs.statSync(base+'render.glb').size,removed,retainedCollision:'All non-plant collision triangles copied byte-for-byte in original order',preserved:'Indoor plants, grass surfaces, planters, main building, grounds, materials, textures, doors, navigation, PC and VR code'};
fs.mkdirSync('docs/explore/v1.7',{recursive:true});fs.writeFileSync('docs/explore/v1.7/vegetation-removal.json',JSON.stringify(report,null,2));console.log({...report,removed:undefined});
